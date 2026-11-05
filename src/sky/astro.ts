/**
 * Positional astronomy for "the sky your child will see on night one".
 *
 * Pure functions, no DOM, so the app, the build-time ephemeris plugin and
 * scripts/verify-sky-math.ts all run the same code.
 *
 * Model: J2000 catalogue → IAU 1976 precession to date → GMST (Meeus 12.4)
 * → local horizontal frame. Nutation (≤17″), aberration (≤20″) and refraction
 * (≤0.5° at the horizon, hidden by the terrain silhouette) are deliberately
 * omitted; the verify script measures the total error against astronomy-engine.
 */

export const DEG = Math.PI / 180
export const ARCSEC = DEG / 3600

/** 3×3 rotation matrix, row-major. */
export type Mat3 = [number, number, number, number, number, number, number, number, number]
export type Vec3 = [number, number, number]

export function julianDate(ms: number): number {
  return ms / 86_400_000 + 2_440_587.5
}

/** Greenwich mean sidereal time in degrees [0, 360). Meeus, Astronomical Algorithms, eq. 12.4. */
export function gmstDeg(jd: number): number {
  const d = jd - 2_451_545.0
  const t = d / 36_525
  const theta = 280.46061837 + 360.98564736629 * d + 0.000387933 * t * t - (t * t * t) / 38_710_000
  return ((theta % 360) + 360) % 360
}

export function localSiderealDeg(jd: number, lonEastDeg: number): number {
  return (((gmstDeg(jd) + lonEastDeg) % 360) + 360) % 360
}

export function mul(a: Mat3, b: Mat3): Mat3 {
  const r = new Array(9) as Mat3
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j]
  return r
}

export function apply(m: Mat3, v: Vec3): Vec3 {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ]
}

/** Rotation of the coordinate frame about z by angle a (radians). */
export function rotZ(a: number): Mat3 {
  const c = Math.cos(a), s = Math.sin(a)
  return [c, s, 0, -s, c, 0, 0, 0, 1]
}
function rotY(a: number): Mat3 {
  const c = Math.cos(a), s = Math.sin(a)
  return [c, 0, -s, 0, 1, 0, s, 0, c]
}

/**
 * IAU 1976 precession matrix, J2000 mean equator → mean equator of date.
 * Meeus eq. 21.3 angles; P = R3(−z) · R2(θ) · R3(−ζ).
 */
export function precessionMatrix(jd: number): Mat3 {
  const t = (jd - 2_451_545.0) / 36_525
  const zeta = (2306.2181 * t + 0.30188 * t * t + 0.017998 * t ** 3) * ARCSEC
  const z = (2306.2181 * t + 1.09468 * t * t + 0.018203 * t ** 3) * ARCSEC
  const theta = (2004.3109 * t - 0.42665 * t * t - 0.041833 * t ** 3) * ARCSEC
  return mul(rotZ(-z), mul(rotY(theta), rotZ(-zeta)))
}

/** Unit vector in the equatorial frame (x → RA 0h, z → north celestial pole). */
export function equatorialVector(raDeg: number, decDeg: number): Vec3 {
  const a = raDeg * DEG, d = decDeg * DEG
  return [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)]
}

/**
 * Full transform from J2000 equatorial unit vectors to the three.js world frame
 * used by the hero scene: +x = east, +y = up (zenith), −z = north.
 *
 * Derivation: after the frame rotation R3(LST) about the pole, a star's vector is
 * (cos δ cos H, −cos δ sin H, sin δ) with H the hour angle. The textbook
 * horizontal relations then give
 *   east  = −cos δ sin H                     = y
 *   north = cos φ sin δ − sin φ cos δ cos H  = cos φ·z − sin φ·x
 *   up    = sin φ sin δ + cos φ cos δ cos H  = sin φ·z + cos φ·x
 * and world = (east, up, −north). det(M_hor) = +1, so the sky is never mirrored.
 */
export function equatorialToWorld(jd: number, latDeg: number, lonEastDeg: number): Mat3 {
  const phi = latDeg * DEG
  const c = Math.cos(phi), s = Math.sin(phi)
  const mHor: Mat3 = [0, 1, 0, c, 0, s, s, 0, -c]
  const lst = localSiderealDeg(jd, lonEastDeg) * DEG
  return mul(mHor, mul(rotZ(lst), precessionMatrix(jd)))
}

/**
 * Same transform as equatorialToWorld but with the local sidereal angle supplied directly,
 * so the batch toggle can sweep the sky through the short sidereal difference between two
 * dates instead of spinning it through every intervening day.
 */
export function worldFromLst(lstDeg: number, latDeg: number, precession: Mat3): Mat3 {
  const phi = latDeg * DEG
  const c = Math.cos(phi), s = Math.sin(phi)
  const mHor: Mat3 = [0, 1, 0, c, 0, s, s, 0, -c]
  return mul(mHor, mul(rotZ(lstDeg * DEG), precession))
}

export function transpose(m: Mat3): Mat3 {
  return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]]
}

/** Altitude / azimuth (degrees, azimuth from north through east) of a world-frame vector. */
export function worldToAltAz(v: Vec3): { alt: number; az: number } {
  const [east, up, negNorth] = v
  const alt = Math.asin(Math.max(-1, Math.min(1, up))) / DEG
  const az = ((Math.atan2(east, -negNorth) / DEG) % 360 + 360) % 360
  return { alt, az }
}

/** World-frame unit vector for a given altitude/azimuth (degrees). */
export function altAzToWorld(altDeg: number, azDeg: number): Vec3 {
  const a = altDeg * DEG, z = azDeg * DEG
  return [Math.cos(a) * Math.sin(z), Math.sin(a), -Math.cos(a) * Math.cos(z)]
}

/** Angular separation in degrees between two unit vectors. */
export function separationDeg(a: Vec3, b: Vec3): number {
  const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
  return Math.acos(Math.max(-1, Math.min(1, dot))) / DEG
}

/**
 * Parse a local wall-clock time at a fixed UTC offset into epoch ms.
 * `date` is YYYY-MM-DD, `time` is HH:MM, offset like "+05:30" (IST has no DST).
 */
export function localTimeToMs(date: string, time: string, utcOffset: string): number {
  const ms = Date.parse(`${date}T${time}:00${utcOffset}`)
  if (Number.isNaN(ms)) throw new Error(`astro: cannot parse local time "${date} ${time} ${utcOffset}"`)
  return ms
}
