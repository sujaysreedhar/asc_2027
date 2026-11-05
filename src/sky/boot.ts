/**
 * Decides whether this device gets the live sky, then lazy-loads it after first paint.
 * Low tier / save-data / reduced motion / WebGL failure → the poster stays (never a black screen).
 */
import { ephemeris } from 'virtual:sky-ephemeris'
import { camp } from '../content/camp.config.ts'
import type { Progress } from '../motion/progress.ts'
import type { Sky, SkyTier } from './scene.ts'

type Nav = Navigator & { deviceMemory?: number; connection?: { saveData?: boolean; effectiveType?: string } }

export function skyTier(): SkyTier | null {
  const params = new URLSearchParams(location.search)
  if (params.has('nosky')) return null
  if (params.has('poster')) return 'high'
  const nav = navigator as Nav
  if (nav.connection?.saveData) return null
  if (/(^|-)2g$/.test(nav.connection?.effectiveType ?? '')) return null
  if ((nav.deviceMemory ?? 8) <= 2 || (nav.hardwareConcurrency ?? 8) <= 2) return null
  const small = matchMedia('(max-width: 799px), (pointer: coarse)').matches
  if (small && !camp.sky.liveOnMobile) return null
  return small ? 'mobile' : 'high'
}

type Rect = { left: number; top: number; right: number; bottom: number }

/** The hero copy's rectangle, re-read only on scroll/resize (never per frame). */
function heroCopyRect(): () => Rect | null {
  const el = document.querySelector<HTMLElement>('.hero__content')
  if (!el) return () => null
  let rect: Rect | null = el.getBoundingClientRect()
  const update = () => (rect = el.offsetParent ? el.getBoundingClientRect() : null)
  addEventListener('scroll', update, { passive: true })
  addEventListener('resize', update)
  document.fonts?.ready.then(update)
  return () => rect
}

export async function bootSky(tier: SkyTier, progress: Progress | null, labelExclusion?: () => Rect | null): Promise<Sky | null> {
  const container = document.querySelector<HTMLElement>('[data-sky]')
  const labels = document.querySelector<HTMLElement>('[data-sky-labels]')
  if (!container || !labels) throw new Error('sky: [data-sky] / [data-sky-labels] missing from the hero')
  progress?.add('sky-code', 2, 'Loading flight software')
  progress?.add('sky-assets', 3, 'Aligning star catalogue')
  progress?.add('sky-gpu', 1, 'Plotting tonight’s sky')
  try {
    const mod = await (progress ? progress.track('sky-code', import('./scene.ts')) : import('./scene.ts'))
    const params = new URLSearchParams(location.search)
    const sky = await mod.createSky({
      container,
      labels,
      ephemeris,
      latitude: camp.venue.latitude,
      longitude: camp.venue.longitude,
      viewAzimuth: camp.batches.map((b) => b.skyViewAzimuth),
      tier,
      forceWebGL: params.has('webgl'),
      onProgress: (loaded, total) => progress?.set('sky-assets', total ? loaded / total : 0),
      labelExclusion: labelExclusion ?? heroCopyRect(),
    })
    progress?.set('sky-assets', 1)
    progress?.set('sky-gpu', 1)
    const mode = document.querySelector('[data-sky-mode]')
    if (mode) mode.textContent = `Live sky computed for the campus (${sky.isWebGPU ? 'WebGPU' : 'WebGL 2'})`
    return sky
  } catch (err) {
    // Fail loudly in the console, gracefully on screen: the poster of the same sky stays.
    console.error('[sky] live render unavailable, keeping the poster:', err)
    progress?.remove('sky-code')
    progress?.remove('sky-assets')
    progress?.remove('sky-gpu')
    container.querySelector('canvas')?.remove()
    return null
  }
}
