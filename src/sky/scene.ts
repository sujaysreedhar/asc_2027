/**
 * The signature moment: the real sky over the Agastya campus on night one.
 *
 * Lazy-loaded after first paint (this chunk carries three/webgpu). Everything sits
 * in one "celestial" group whose matrix is the J2000→horizon rotation from astro.ts,
 * so sidereal drift is one matrix update per frame. Shaders are TSL (WGSL on WebGPU,
 * GLSL on the automatic WebGL 2 fallback). No post-processing: star glow and grain
 * are done in the materials, which is cheaper than a bloom pass on mobile.
 */
import * as THREE from 'three/webgpu'
import {
  Fn, uniform, attribute, instancedBufferAttribute, uv, vec2, vec3, vec4, float, mix, smoothstep, length, exp, pow,
  positionLocal, normalize, atan, asin, texture, sin, time, hash, max, clamp, dot, PI, TWO_PI, saturate,
  modelWorldMatrix, instanceIndex, screenCoordinate, fract,
} from 'three/tsl'
import type { BatchEphemeris } from '../content/ephemeris.ts'
import {
  DEG, julianDate, localSiderealDeg, precessionMatrix, worldFromLst, transpose, apply, equatorialVector, altAzToWorld, type Mat3, type Vec3,
} from './astro.ts'
import { CONSTELLATIONS } from './constellations.gen.ts'

export type SkyTier = 'high' | 'mobile'
export type SkyOptions = {
  container: HTMLElement
  labels: HTMLElement
  ephemeris: BatchEphemeris[]
  latitude: number
  longitude: number
  /** Featured azimuth per batch (degrees from north), from the config. */
  viewAzimuth: number[]
  tier: SkyTier
  /** Real asset progress for the preloader: every sky asset goes through one THREE.LoadingManager. */
  onProgress?: (loaded: number, total: number) => void
  forceWebGL?: boolean
  /** Sky-seconds per real second for the idle drift. */
  driftRate?: number
  /** Screen rectangle (viewport px) labels must not overlap, e.g. the hero headline block. */
  labelExclusion?: () => { left: number; top: number; right: number; bottom: number } | null
}

const R = 50 // celestial sphere radius (scene units)
const floatUniform = (v: number) => uniform(v)
type FloatUniform = ReturnType<typeof floatUniform>
const LABELLED = new Set(['Ori', 'Sco', 'Sgr', 'Cru', 'Cen', 'Leo', 'UMa', 'CMa', 'Boo', 'Vir', 'Gem', 'Tau', 'Car', 'Lyr', 'Cyg', 'Aql', 'Crv', 'Cas'])
// Bengaluru lies ~83 km WNW of Kuppam; its light dome is a real feature of the western horizon.
const BENGALURU_AZIMUTH = 287

/** B–V colour index → linear RGB (Ballesteros 2012 temperature, Helland blackbody fit), softened toward white as the eye sees it. */
function bvToRgb(bv: number): [number, number, number] {
  const t = 4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62)) / 100
  let r: number, g: number, b: number
  if (t <= 66) {
    r = 255
    g = 99.47 * Math.log(t) - 161.12
    b = t <= 19 ? 0 : 138.52 * Math.log(t - 10) - 305.04
  } else {
    r = 329.7 * Math.pow(t - 60, -0.1332)
    g = 288.12 * Math.pow(t - 60, -0.0755)
    b = 255
  }
  const c = (v: number) => Math.min(1, Math.max(0, v / 255))
  const mixW = 0.42
  return [c(r) * (1 - mixW) + mixW, c(g) * (1 - mixW) + mixW, c(b) * (1 - mixW) + mixW]
}

/** sRGB hex → linear vec3 node (three's ColorManagement converts on construction). */
function lin(hex: string) {
  const c = new THREE.Color(hex)
  return vec3(c.r, c.g, c.b)
}

function mat3ToMatrix4(m: Mat3, out: THREE.Matrix4): THREE.Matrix4 {
  return out.set(m[0], m[1], m[2], 0, m[3], m[4], m[5], 0, m[6], m[7], m[8], 0, 0, 0, 0, 1)
}

/** Let the browser handle input/paint between chunks of setup work. */
function yieldToMain(): Promise<void> {
  const sched = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler
  return sched?.yield ? sched.yield() : new Promise((r) => setTimeout(r, 0))
}

function loadBinary(manager: THREE.LoadingManager, url: string): Promise<ArrayBuffer> {
  const loader = new THREE.FileLoader(manager).setResponseType('arraybuffer')
  return loader.loadAsync(url) as Promise<ArrayBuffer>
}

/** Deterministic hills for the campus horizon (stylised: the real horizon profile is unknown — see NOTES.md). */
function terrainHeightDeg(azDeg: number): number {
  const a = azDeg * DEG
  let h = 1.6
  h += 1.4 * Math.sin(a * 2 + 0.7) + 0.9 * Math.sin(a * 5 + 2.1) + 0.45 * Math.sin(a * 11 + 0.3) + 0.22 * Math.sin(a * 23 + 1.9)
  // A rocky outcrop to the north-east and a ridge to the south-west, typical of Kuppam's granite hills.
  const bump = (centre: number, width: number) => {
    const d = ((azDeg - centre + 540) % 360) - 180 // signed angular distance
    return Math.exp(-(d * d) / width)
  }
  h += 3.2 * bump(62, 90)
  h += 2.0 * bump(238, 260)
  // Tree line: small irregular bumps.
  h += 0.35 * Math.max(0, Math.sin(a * 61 + 4.2)) * Math.max(0, Math.sin(a * 17 + 1.1))
  return Math.max(0.4, h)
}

export async function createSky(opts: SkyOptions) {
  const { container, labels, ephemeris, latitude, longitude, tier } = opts
  const manager = new THREE.LoadingManager()
  manager.onProgress = (_url, loaded, total) => opts.onProgress?.(loaded, total)
  manager.onError = (url) => console.error(`sky: failed to load ${url}`)
  const mobile = tier === 'mobile'
  const driftRate = opts.driftRate ?? 60

  const t0 = performance.now()
  const mark = (label: string) => import.meta.env.DEV && console.debug(`[sky] ${label} +${(performance.now() - t0).toFixed(0)}ms`)
  // ---------- Renderer ----------
  const renderer = new THREE.WebGPURenderer({ antialias: !mobile, alpha: false, forceWebGL: opts.forceWebGL ?? false, powerPreference: 'high-performance' })
  await renderer.init()
  mark('renderer.init')
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2))
  renderer.setClearColor(0x03050b, 1)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  const canvas = renderer.domElement
  canvas.setAttribute('aria-hidden', 'true')
  canvas.style.pointerEvents = 'none'
  container.prepend(canvas)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 400)
  camera.rotation.order = 'YXZ'
  const celestial = new THREE.Group()
  celestial.matrixAutoUpdate = false
  scene.add(celestial)

  // ---------- Shared uniforms (GSAP drives .value) ----------
  const u = {
    reveal: uniform(0), // stars appear brightest-first
    draw: uniform(0), // constellation lines draw in
    linesOpacity: uniform(1),
    ignite: uniform(0), // preloader ignition glow → settles to a warm horizon
    limitMag: uniform(6.5), // naked-eye limit (drops under moonlight)
    milkyWay: uniform(1),
    moonSky: uniform(0), // sky brightening from moonlight
    moonDir: uniform(new THREE.Vector3(0, -1, 0)),
    worldToEq: uniform(new THREE.Matrix3()),
    bengaluru: uniform(new THREE.Vector3(...altAzToWorld(0, BENGALURU_AZIMUTH))),
    viewDir: uniform(new THREE.Vector3(0, 0, -1)),
    bodiesOpacity: uniform(1),
  }

  // ---------- Assets ----------
  const [starBuf, lineBuf, mwTex] = await Promise.all([
    loadBinary(manager, '/sky/stars.bin'),
    loadBinary(manager, '/sky/lines.bin'),
    new THREE.TextureLoader(manager).loadAsync('/sky/milkyway.webp'),
  ])

  mark('assets loaded')
  // ---------- Background dome: night gradient, Milky Way, skyglow, moonlight, grain ----------
  mwTex.colorSpace = THREE.NoColorSpace
  mwTex.wrapS = THREE.RepeatWrapping
  mwTex.generateMipmaps = false // no mips → no seam line where RA wraps at ±180°
  mwTex.minFilter = THREE.LinearFilter
  const domeMat = new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, depthWrite: false })
  domeMat.colorNode = Fn(() => {
    const dir = normalize(positionLocal)
    const sinAlt = dir.y
    const above = smoothstep(-0.02, 0.06, sinAlt)
    // Night gradient: deep zenith → faint airglow at the horizon.
    const horizonMix = pow(saturate(float(1).sub(sinAlt)), 4)
    const night = mix(lin('#020409'), lin('#0b1426'), horizonMix)
    // Milky Way, sampled in J2000 equatorial coordinates.
    const eq = u.worldToEq.mul(dir)
    const ra = atan(eq.y, eq.x)
    const dec = asin(clamp(eq.z, -1, 1))
    const mwUv = vec2(ra.div(TWO_PI).add(0.5), dec.div(PI).add(0.5))
    const mw = texture(mwTex, mwUv).r
    // Fine structure from a second, offset sample of the same texture (far cheaper than procedural noise).
    const mottle = texture(mwTex, mwUv.mul(vec2(3.0, 2.0)).add(vec2(0.37, 0.11))).r.mul(0.9).add(0.55)
    const extinction = smoothstep(0.02, 0.35, sinAlt)
    const milky = lin('#c9d2ec').mul(pow(mw, 1.35)).mul(mottle).mul(extinction).mul(u.milkyWay).mul(0.095)
    // Light dome of Bengaluru to the WNW (real, faint).
    const horizDir = normalize(vec3(dir.x, 0, dir.z))
    const toCity = saturate(dot(horizDir, u.bengaluru))
    const cityGlow = lin('#5a3418').mul(pow(toCity, 8)).mul(exp(sinAlt.mul(-10))).mul(0.18)
    // Ignition seam: the preloader's flash settles into this warm horizon band.
    const toView = saturate(dot(horizDir, normalize(vec3(u.viewDir.x, 0, u.viewDir.z))))
    const ignite = lin('#ff8a1f').mul(u.ignite).mul(exp(sinAlt.mul(-16))).mul(toView.mul(0.7).add(0.3)).mul(0.16)
    // Moonlight: overall brightening plus a halo around the Moon.
    const moonCos = dot(dir, u.moonDir)
    const halo = exp(moonCos.sub(1).mul(40)).mul(0.5).add(exp(moonCos.sub(1).mul(6)).mul(0.16))
    const moonLight = lin('#3a5482').mul(u.moonSky).mul(halo.add(0.3)).mul(smoothstep(-0.05, 0.3, sinAlt).mul(0.6).add(0.4)).mul(0.09)
    // Grain doubles as dithering against gradient banding (interleaved gradient noise — no hash precision streaks).
    const ign = fract(fract(screenCoordinate.x.mul(0.06711056).add(screenCoordinate.y.mul(0.00583715))).mul(52.9829189))
    const grain = ign.sub(0.5).mul(0.0035)
    return night.add(milky.mul(above)).add(cityGlow).add(ignite).add(moonLight).add(grain)
  })()
  const dome = new THREE.Mesh(new THREE.SphereGeometry(R * 3, mobile ? 48 : 64, mobile ? 24 : 32), domeMat)
  dome.frustumCulled = false
  dome.renderOrder = -10
  scene.add(dome)

  // ---------- Stars: instanced sprites sized by magnitude, coloured by B–V ----------
  const view = new DataView(starBuf)
  if (view.getUint32(0, true) !== 0x31435341) throw new Error('sky: stars.bin has an unexpected header — rebuild with npm run sky:data')
  const total = view.getUint32(4, true)
  const magCut = mobile ? 5.5 : 6.5
  let count = 0
  while (count < total && view.getInt16(8 + count * 8 + 4, true) / 1000 <= magCut) count++
  const sPos = new Float32Array(count * 3), sMag = new Float32Array(count), sCol = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const o = 8 + i * 8
    const ra = (view.getUint16(o, true) / 65535) * 360
    const dec = (view.getInt16(o + 2, true) / 32767) * 90
    const v = equatorialVector(ra, dec)
    sPos.set([v[0] * R, v[1] * R, v[2] * R], i * 3)
    sMag[i] = view.getInt16(o + 4, true) / 1000
    sCol.set(bvToRgb(view.getInt16(o + 6, true) / 1000), i * 3)
  }

  function makePointMaterial(pos: THREE.InstancedBufferAttribute, mag: THREE.InstancedBufferAttribute, col: THREE.InstancedBufferAttribute, opacity: FloatUniform, twinkle: boolean) {
    const m = new THREE.PointsNodeMaterial({ transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending, sizeAttenuation: false })
    const iPos = instancedBufferAttribute<'vec3'>(pos, 'vec3')
    const iMag = instancedBufferAttribute<'float'>(mag, 'float')
    const iCol = instancedBufferAttribute<'vec3'>(col, 'vec3')
    const strength = saturate(float(6.5).sub(iMag).div(8)) // 0 for faintest, 1 near mag −1.5
    m.positionNode = iPos
    // CSS-pixel core size; the sprite quad is 3× the core so the glow can fall off smoothly.
    m.sizeNode = float(1.5).add(pow(strength, 1.7).mul(6.0)).mul(3)
    m.colorNode = Fn(() => {
      const d = length(uv().sub(0.5)).mul(2)
      const core = exp(d.mul(d).mul(-4.5))
      const halo = exp(d.mul(d).mul(-1.1)).mul(0.14).mul(saturate(float(1.8).sub(iMag).div(3)))
      const worldY = modelWorldMatrix.mul(vec4(iPos, 1)).y.div(R) // sin(altitude)
      const horizon = smoothstep(-0.015, 0.14, worldY) // atmospheric extinction near the horizon
      const alpha = float(0.32).add(pow(saturate(float(6.5).sub(iMag).div(6)), 1.1).mul(0.68))
      const threshold = iMag.add(2).div(9)
      const revealed = smoothstep(threshold.sub(0.06), threshold.add(0.06), u.reveal)
      const visible = smoothstep(u.limitMag.add(0.4), u.limitMag.sub(0.6), iMag)
      const seed = hash(instanceIndex)
      // Gentle scintillation, stronger near the horizon; < 0.5 Hz, ≤ 18 % amplitude (never "flashing").
      const scint = twinkle
        ? float(1).add(sin(time.mul(seed.mul(1.4).add(1.6)).add(seed.mul(40))).mul(0.18).mul(pow(saturate(float(1).sub(worldY)), 2)))
        : float(1)
      const i = core.add(halo).mul(alpha).mul(horizon).mul(revealed).mul(visible).mul(scint).mul(opacity)
      return vec4(iCol.mul(i), i)
    })()
    return m
  }

  const starPos = new THREE.InstancedBufferAttribute(sPos, 3)
  const stars = new THREE.Sprite(makePointMaterial(starPos, new THREE.InstancedBufferAttribute(sMag, 1), new THREE.InstancedBufferAttribute(sCol, 3), floatUniform(1), true))
  stars.count = count
  stars.frustumCulled = false
  celestial.add(stars)

  // ---------- Planets (from build-time ephemeris) ----------
  const PLANET_BV: Record<string, number> = { Venus: 0.8, Mars: 1.45, Jupiter: 0.85, Saturn: 1.05, Mercury: 0.95 }
  const planetNames = Object.keys(PLANET_BV)
  const pPos = new THREE.InstancedBufferAttribute(new Float32Array(planetNames.length * 3), 3)
  const pMag = new THREE.InstancedBufferAttribute(new Float32Array(planetNames.length), 1)
  const pCol = new THREE.InstancedBufferAttribute(new Float32Array(planetNames.length * 3), 3)
  planetNames.forEach((n, i) => pCol.setXYZ(i, ...bvToRgb(PLANET_BV[n])))
  const planets = new THREE.Sprite(makePointMaterial(pPos, pMag, pCol, u.bodiesOpacity, false))
  planets.count = planetNames.length
  planets.frustumCulled = false
  celestial.add(planets)

  // ---------- Moon: phase-correct disc (drawn 2× true size, labelled) ----------
  const moonLimb = uniform(new THREE.Vector2(1, 0)) // screen-space direction of the bright limb
  const moonPhaseCos = uniform(1) // cos(phase angle)
  const moonSizePx = uniform(14)
  const moonPos = new THREE.InstancedBufferAttribute(new Float32Array(3), 3)
  const moonMat = new THREE.PointsNodeMaterial({ transparent: true, depthWrite: false, depthTest: true, sizeAttenuation: false })
  moonMat.positionNode = instancedBufferAttribute<'vec3'>(moonPos, 'vec3')
  moonMat.sizeNode = moonSizePx.mul(2.6)
  moonMat.colorNode = Fn(() => {
    const p = uv().sub(0.5).mul(2.6) // disc radius = 1
    const r = length(p)
    const x = dot(p, moonLimb)
    const y = dot(p, vec2(moonLimb.y.negate(), moonLimb.x))
    const lit = smoothstep(moonPhaseCos.negate().mul(clamp(float(1).sub(y.mul(y)), 0, 1).sqrt()).sub(0.06), moonPhaseCos.negate().mul(clamp(float(1).sub(y.mul(y)), 0, 1).sqrt()).add(0.06), x)
    const disc = smoothstep(1.0, 0.94, r)
    // Soft limb darkening plus a faint mare-like asymmetry (decorative at 2× size).
    const maria = float(1).sub(r.mul(r).mul(0.18)).sub(smoothstep(0.55, 0.0, length(p.sub(vec2(-0.25, 0.2)))).mul(0.12))
    const glow = exp(r.mul(r).mul(-1.6)).mul(0.25)
    const body = vec3(0.98, 0.96, 0.9).mul(maria).mul(lit).mul(disc).add(vec3(0.05, 0.06, 0.07).mul(disc).mul(float(1).sub(lit)))
    const a = max(disc, glow).mul(u.bodiesOpacity).mul(u.reveal)
    return vec4(body.add(vec3(0.6, 0.65, 0.75).mul(glow)), a)
  })()
  const moon = new THREE.Sprite(moonMat)
  moon.count = 1
  moon.frustumCulled = false
  celestial.add(moon)

  // ---------- Constellation lines (draw themselves in) ----------
  const lv = new Float32Array(lineBuf)
  const nVerts = lv.length / 5
  const lPos = new Float32Array(nVerts * 3), lAlong = new Float32Array(nVerts), lCon = new Uint16Array(nVerts)
  for (let i = 0; i < nVerts; i++) {
    lPos[i * 3] = lv[i * 5] * R * 0.998
    lPos[i * 3 + 1] = lv[i * 5 + 1] * R * 0.998
    lPos[i * 3 + 2] = lv[i * 5 + 2] * R * 0.998
    lAlong[i] = lv[i * 5 + 3]
    lCon[i] = lv[i * 5 + 4]
  }
  const lOrderAttr = new THREE.BufferAttribute(new Float32Array(nVerts), 1)
  const firstVertexOf = new Map<number, number>()
  for (let v = nVerts - 1; v >= 0; v--) firstVertexOf.set(lCon[v], v)
  const lineGeo = new THREE.BufferGeometry()
  lineGeo.setAttribute('position', new THREE.BufferAttribute(lPos, 3))
  lineGeo.setAttribute('aAlong', new THREE.BufferAttribute(lAlong, 1))
  lineGeo.setAttribute('aOrder', lOrderAttr)
  const lineMat = new THREE.LineBasicNodeMaterial({ transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending })
  lineMat.colorNode = lin('#7cc4ff')
  lineMat.opacityNode = Fn(() => {
    const along = attribute('aAlong', 'float')
    const order = attribute('aOrder', 'float')
    // Each constellation starts at its own moment (centre of view first) and takes 0.45 of the timeline to draw.
    const local = u.draw.sub(order.mul(0.75)).div(0.45)
    const drawn = smoothstep(along.sub(0.02), along, local)
    const worldY = modelWorldMatrix.mul(vec4(attribute('position', 'vec3'), 1)).y.div(R)
    return drawn.mul(smoothstep(0.0, 0.12, worldY)).mul(0.2).mul(u.linesOpacity)
  })()
  const lines = new THREE.LineSegments(lineGeo, lineMat)
  lines.frustumCulled = false
  celestial.add(lines)

  // ---------- Terrain silhouette (world frame, static) ----------
  {
    const N = mobile ? 360 : 720
    const pos: number[] = [], top: number[] = [], idx: number[] = []
    for (let i = 0; i <= N; i++) {
      const az = (i / N) * 360
      const h = terrainHeightDeg(az)
      for (const [alt, t] of [[h, 1], [-25, 0]] as const) {
        const v = altAzToWorld(alt, az)
        pos.push(v[0] * R * 0.9, v[1] * R * 0.9, v[2] * R * 0.9)
        top.push(t)
      }
      if (i < N) {
        const a = i * 2
        idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
      }
    }
    // Close the ground below the horizon so nothing shows through when the camera tilts.
    const floor = altAzToWorld(-90, 0)
    const fi = pos.length / 3
    pos.push(floor[0] * R * 0.9, floor[1] * R * 0.9, floor[2] * R * 0.9)
    top.push(0)
    for (let i = 0; i < N; i++) idx.push(i * 2 + 1, i * 2 + 3, fi)
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('aTop', new THREE.Float32BufferAttribute(top, 1))
    g.setIndex(idx)
    const m = new THREE.MeshBasicNodeMaterial({ side: THREE.DoubleSide })
    m.colorNode = Fn(() => {
      const t = attribute('aTop', 'float')
      const rim = pow(smoothstep(0.992, 1.0, t), 3)
      return lin('#010204').add(lin('#ff8a1f').mul(rim).mul(u.ignite.mul(0.12).add(0.006)))
    })()
    const terrain = new THREE.Mesh(g, m)
    terrain.frustumCulled = false
    scene.add(terrain)
  }

  // ---------- State ----------
  const nightOneJd = ephemeris.map((e) => julianDate(e.nightOneMs))
  const precession = nightOneJd.map((jd) => precessionMatrix(jd))
  const baseLst = nightOneJd.map((jd) => localSiderealDeg(jd, longitude))
  const state = {
    batch: 0,
    lstOffset: 0, // degrees added by the idle drift
    lst: baseLst[0],
    skySeconds: 0,
    yaw: opts.viewAzimuth[0],
    pitch: 18,
    pointerYaw: 0,
    layoutYaw: 0, // set in resize(): shifts the camera so the featured azimuth clears the headline
    pointerPitch: 0,
    fovBoost: 0,
    labelsOpacity: 1,
    paused: false, // freezes the drift (poster rendering, batch sweep)
  }
  let worldM: Mat3 = worldFromLst(state.lst, latitude, precession[0])
  // Moonlight-dependent values ease toward these in frame(), so a batch switch never pops.
  const targets = { moonSky: 0, limitMag: 6.5, milkyWay: 1 }
  const tmpM4 = new THREE.Matrix4()
  const tmpM3 = new THREE.Matrix3()

  function applyBodies(i: number) {
    const e = ephemeris[i]
    planetNames.forEach((name, k) => {
      const b = e.bodies.find((x) => x.name === name)
      if (!b) throw new Error(`sky: ephemeris for ${e.id} lacks ${name}`)
      const v = equatorialVector(b.ra, b.dec)
      pPos.setXYZ(k, v[0] * R * 0.996, v[1] * R * 0.996, v[2] * R * 0.996)
      pMag.setX(k, b.mag)
    })
    pPos.needsUpdate = pMag.needsUpdate = true
    const m = e.bodies.find((x) => x.name === 'Moon')!
    const mv = equatorialVector(m.ra, m.dec)
    moonPos.setXYZ(0, mv[0] * R * 0.995, mv[1] * R * 0.995, mv[2] * R * 0.995)
    moonPos.needsUpdate = true
    moonPhaseCos.value = Math.cos((m.phaseAngle ?? 0) * DEG)
    // Moonlight: brighter sky and a lower naked-eye limit when the Moon is up and full-ish.
    const moonUp = Math.max(0, Math.min(1, (m.alt + 4) / 14))
    const lightness = (m.phase ?? 0) * moonUp
    targets.moonSky = lightness
    targets.limitMag = 6.5 - 1.8 * lightness
    targets.milkyWay = 1 - 0.78 * lightness
    computeConstellationOrder(opts.viewAzimuth[i])
  }

  /** Constellations nearest the centre of view draw first; others ripple outward. */
  function computeConstellationOrder(azDeg: number) {
    const centre = altAzToWorld(30, azDeg)
    const dist = CONSTELLATIONS.map((c) => {
      const w = apply(worldM, equatorialVector(c.ra, c.dec))
      return Math.acos(Math.max(-1, Math.min(1, w[0] * centre[0] + w[1] * centre[1] + w[2] * centre[2])))
    })
    const maxD = Math.max(...dist)
    for (let v = 0; v < nVerts; v++) lOrderAttr.setX(v, dist[lCon[v]] / maxD)
    lOrderAttr.needsUpdate = true
  }

  // ---------- Labels (DOM, aria-hidden — the text summary lives in the hero markup) ----------
  type Label = { el: HTMLElement; vec: () => Vec3; minAlt: number; visible: () => boolean }
  const labelList: Label[] = []
  function addLabel(text: string, cls: string, vec: () => Vec3, minAlt: number, visible: () => boolean = () => true) {
    const el = document.createElement('span')
    el.className = `sky-label ${cls}`
    el.textContent = text
    labels.appendChild(el)
    labelList.push({ el, vec, minAlt, visible })
  }
  planetNames.forEach((name, k) =>
    addLabel(name, 'sky-label--planet', () => [pPos.getX(k), pPos.getY(k), pPos.getZ(k)], 2, () => pMag.getX(k) < 1.6),
  )
  addLabel('Moon', 'sky-label--moon', () => [moonPos.getX(0), moonPos.getY(0), moonPos.getZ(0)], 0)
  CONSTELLATIONS.filter((c) => LABELLED.has(c.id)).forEach((c) => {
    const v = equatorialVector(c.ra, c.dec)
    const idx = CONSTELLATIONS.indexOf(c)
    addLabel(c.name, 'sky-label--con', () => [v[0] * R, v[1] * R, v[2] * R], 8, () => {
      // Show once its lines have drawn in.
      const order = lOrderAttr.getX(firstVertexOf.get(idx) ?? 0)
      return u.draw.value > order * 0.75 + 0.35
    })
  })
  const projVec = new THREE.Vector3()
  let viewW = 1, viewH = 1
  function updateLabels() {
    for (const l of labelList) {
      const local = l.vec()
      const w = apply(worldM, [local[0] / R, local[1] / R, local[2] / R])
      const alt = Math.asin(Math.max(-1, Math.min(1, w[1]))) / DEG
      projVec.set(w[0], w[1], w[2]).applyMatrix4(camera.matrixWorldInverse)
      const inFront = projVec.z < 0
      projVec.applyMatrix4(camera.projectionMatrix)
      const x = (projVec.x * 0.5 + 0.5) * viewW, y = (-projVec.y * 0.5 + 0.5) * viewH
      const onScreen = inFront && x > 12 && x < viewW - 120 && y > 70 && y < viewH * 0.62
      // Approximate label box (text is short uppercase); skip any label that would sit on the hero copy.
      const ex = opts.labelExclusion?.()
      const lw = (l.el.textContent?.length ?? 6) * 8 + 30
      const blocked = ex ? x + lw > ex.left - 12 && x < ex.right + 12 && y + 10 > ex.top - 16 && y - 10 < ex.bottom : false
      const show = onScreen && !blocked && alt > l.minAlt && l.visible() && state.labelsOpacity > 0.5 && u.reveal.value > 0.6
      l.el.classList.toggle('is-visible', show)
      if (show) l.el.style.transform = `translate3d(${(x + 10).toFixed(1)}px, ${(y - 6).toFixed(1)}px, 0)`
    }
  }

  // ---------- Frame ----------
  let last = performance.now()
  let running = false
  let clockListener: ((ms: number) => void) | null = null
  const siderealPerSecond = 360.98564736629 / 86400

  function resize() {
    const r = container.getBoundingClientRect()
    viewW = Math.max(1, r.width)
    viewH = Math.max(1, r.height)
    renderer.setSize(viewW, viewH, false)
    camera.aspect = viewW / viewH
    // Portrait screens get a wider vertical field so the horizon and a good slice of sky both fit.
    camera.fov = camera.aspect < 0.8 ? 78 : camera.aspect < 1.2 ? 68 : 56
    camera.updateProjectionMatrix()
    // Wide layouts keep the headline on the left, so the featured azimuth sits at ~68 % of the width.
    const featureX = camera.aspect > 1.2 ? 0.68 : 0.5
    const halfH = Math.atan(Math.tan((camera.fov * DEG) / 2) * camera.aspect)
    state.layoutYaw = -Math.atan((featureX - 0.5) * 2 * Math.tan(halfH)) / DEG
  }

  function frame() {
    const now = performance.now()
    const dt = Math.min(0.1, (now - last) / 1000)
    last = now
    const k = 1 - Math.exp(-dt * 2.5)
    u.moonSky.value += (targets.moonSky - u.moonSky.value) * k
    u.limitMag.value += (targets.limitMag - u.limitMag.value) * k
    u.milkyWay.value += (targets.milkyWay - u.milkyWay.value) * k
    if (!state.paused) state.skySeconds += dt * driftRate
    state.lstOffset = state.skySeconds * siderealPerSecond
    const lst = state.lst + state.lstOffset
    worldM = worldFromLst(lst, latitude, precession[state.batch])
    celestial.matrix.copy(mat3ToMatrix4(worldM, tmpM4))
    celestial.matrixWorldNeedsUpdate = true
    const inv = transpose(worldM)
    u.worldToEq.value.copy(tmpM3.set(inv[0], inv[1], inv[2], inv[3], inv[4], inv[5], inv[6], inv[7], inv[8]))

    camera.rotation.y = -(state.yaw + state.layoutYaw + state.pointerYaw) * DEG
    camera.rotation.x = (state.pitch + state.pointerPitch) * DEG
    camera.updateMatrixWorld()
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
    u.viewDir.value.copy(fwd)

    // Moon: world direction for the sky halo; bright-limb direction in screen space for the phase.
    const mLocal: Vec3 = [moonPos.getX(0) / R, moonPos.getY(0) / R, moonPos.getZ(0) / R]
    const mW = apply(worldM, mLocal)
    u.moonDir.value.set(mW[0], mW[1], mW[2]).normalize()
    const sun = ephemeris[state.batch].bodies.find((b) => b.name === 'Sun')!
    const sW = apply(worldM, equatorialVector(sun.ra, sun.dec))
    const dotMS = sW[0] * mW[0] + sW[1] * mW[1] + sW[2] * mW[2]
    const t = new THREE.Vector3(sW[0] - dotMS * mW[0], sW[1] - dotMS * mW[1], sW[2] - dotMS * mW[2]).normalize()
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion)
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion)
    moonLimb.value.set(t.dot(right), t.dot(up)).normalize()
    moonSizePx.value = ((1.04 * DEG) / (2 * Math.tan((camera.fov * DEG) / 2))) * viewH

    updateLabels()
    renderer.render(scene, camera)
    govern(dt * 1000)
    clockListener?.(ephemeris[state.batch].nightOneMs + state.skySeconds * 1000)
  }

  /**
   * Frame-rate governor. A device that can't hold ~30 fps first loses resolution; one that
   * can't hold ~16 fps gets the poster of the same sky back (via onTooSlow) instead of a janky,
   * battery-draining canvas. Warm-up frames (shader compile, first reveal) are ignored.
   */
  const frameTimes: number[] = []
  let warmup = 12
  let degradeStep = 0
  let tooSlowFired = false
  let onTooSlow: (() => void) | null = null
  const handBack = (median: number) => {
    if (tooSlowFired) return
    tooSlowFired = true
    console.info(`[sky] median frame ${median.toFixed(0)} ms — handing back to the poster`)
    onTooSlow?.()
  }
  function govern(ms: number) {
    if (warmup > 0 || document.hidden) return void warmup--
    frameTimes.push(ms)
    // Fast path: under ~10 fps the canvas only costs battery and input latency.
    if (frameTimes.length === 10) {
      const quick = [...frameTimes].sort((a, b) => a - b)[5]
      if (quick > 100) return handBack(quick)
    }
    if (frameTimes.length < 30) return
    const median = [...frameTimes].sort((a, b) => a - b)[15]
    frameTimes.length = 0
    if (median > 34 && degradeStep === 0) {
      degradeStep = 1
      renderer.setPixelRatio(1)
      resize()
      warmup = 6
      console.info(`[sky] median frame ${median.toFixed(0)} ms — rendering at 1× pixel ratio`)
    } else if (median > 60 && degradeStep === 1) {
      handBack(median)
    }
  }

  let disposed = false
  function setRunning(on: boolean) {
    if (disposed || on === running) return
    running = on
    last = performance.now()
    renderer.setAnimationLoop(on ? frame : null)
  }

  const onResize = () => resize()
  window.addEventListener('resize', onResize)
  const onVisibility = () => setRunning(!document.hidden && visibleOnScreen)
  document.addEventListener('visibilitychange', onVisibility)
  let visibleOnScreen = true

  mark('scene built')
  // Compile one object at a time and yield in between: shader generation is the heaviest
  // main-thread work here, and splitting it keeps every task short (input stays responsive).
  resize()
  camera.rotation.set(18 * DEG, -opts.viewAzimuth[0] * DEG, 0)
  camera.updateMatrixWorld()
  for (const obj of [dome, stars, lines, planets, moon, ...scene.children.filter((o) => o !== dome && o !== celestial)]) {
    await renderer.compileAsync(obj, camera, scene)
    await yieldToMain()
  }
  mark('compiled')
  applyBodies(0)
  u.moonSky.value = targets.moonSky
  u.limitMag.value = targets.limitMag
  u.milkyWay.value = targets.milkyWay
  resize()
  // First frame synchronously so the canvas never shows an empty clear colour when it fades in.
  frame()
  mark('first frame')

  return {
    renderer,
    uniforms: u,
    state,
    isWebGPU: (renderer.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend === true,
    start: () => setRunning(!document.hidden),
    stop: () => setRunning(false),
    /** Called by an IntersectionObserver/ScrollTrigger when the sky is off-screen. */
    setOnScreen(on: boolean) {
      visibleOnScreen = on
      setRunning(on && !document.hidden)
    },
    onClock(fn: (ms: number) => void) {
      clockListener = fn
    },
    /** Called once if this device can't render the sky smoothly (see govern()). */
    onTooSlow(fn: () => void) {
      onTooSlow = fn
    },
    /** Prepare a batch switch: returns the from/to values a GSAP timeline animates. */
    batchTransition(to: number) {
      const from = state.batch
      const fromLst = state.lst + state.lstOffset
      // Shortest signed sidereal sweep to the target night's 21:00 sky (drift reset).
      let delta = (baseLst[to] - fromLst) % 360
      if (delta > 180) delta -= 360
      if (delta < -180) delta += 360
      return {
        from,
        fromLst,
        toLst: fromLst + delta,
        fromYaw: state.yaw,
        toYaw: opts.viewAzimuth[to],
        commit() {
          state.batch = to
          state.lst = baseLst[to]
          state.lstOffset = 0
          state.skySeconds = 0
          applyBodies(to)
        },
        /** During the sweep the drift is paused and lst is driven directly. */
        set(lstDeg: number) {
          state.lst = lstDeg
          state.skySeconds = 0
          state.lstOffset = 0
        },
      }
    },
    dispose() {
      setRunning(false)
      disposed = true
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', onVisibility)
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh
        mesh.geometry?.dispose()
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
        else mat?.dispose()
      })
      mwTex.dispose()
      renderer.dispose()
      canvas.remove()
      labels.replaceChildren()
    },
  }
}

export type Sky = Awaited<ReturnType<typeof createSky>>
