/**
 * Entry. Order of operations (see motion-script.md):
 *  1. Basic behaviour for everyone.
 *  2. Reduced motion → designed static version: poster sky, native scroll, no pins. Done.
 *  3. Otherwise: Lenis + section choreography, countdown preloader on first visit,
 *     and the live sky loaded after first paint (poster stays if it can't run).
 */
import './styles/main.css'
import { initBasics } from './ui/basics.ts'
import { skyTier, bootSky } from './sky/boot.ts'
import { camp } from './content/camp.config.ts'

const root = document.documentElement
const params = new URLSearchParams(location.search)
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
const firstVisit = !root.classList.contains('is-repeat')
try {
  sessionStorage.setItem('asc-visited', '1')
} catch {
  /* storage blocked (private mode): the countdown simply plays again next time */
}

if (params.has('poster')) {
  void posterMode(params.get('poster') || '')
} else if (reduced) {
  initBasics()
} else {
  void full()
}

async function full() {
  root.classList.add('js-ready')
  try {
    // Loaded in parallel (not a waterfall); reduced-motion visitors never download any of it.
    const [{ gsap, createLenis, wireAnchors, ScrollTrigger }, { buildSections }, { heroIntro, skyReveal, bindSky }, { Progress }, { runPreloader }] =
      await Promise.all([import('./motion/setup.ts'), import('./motion/sections.ts'), import('./motion/hero.ts'), import('./motion/progress.ts'), import('./motion/preloader.ts')])

    const lenis = createLenis()
    wireAnchors(lenis)
    initBasics({ onMenu: (open) => (open ? lenis.stop() : lenis.start()) })

    const tier = skyTier()
    const progress = firstVisit ? new Progress() : null
    if (progress) {
      lenis.stop()
      progress.add('fonts', 1, 'Loading type')
      progress.add('poster', 1, 'Developing star chart')
      progress.track('fonts', document.fonts.ready)
      const poster = document.querySelector<HTMLImageElement>('.hero__poster img')
      if (poster && !poster.complete) {
        progress.track(
          'poster',
          new Promise<void>((resolve) => {
            poster.addEventListener('load', () => resolve(), { once: true })
            poster.addEventListener('error', () => resolve(), { once: true }) // a missing poster must not stall the countdown
          }),
        )
      } else progress.set('poster', 1)
    }

    let sky: Awaited<ReturnType<typeof bootSky>> = null
    let ignited = false
    const skyPromise = tier
      ? bootSky(tier, progress).then((s) => {
          sky = s
          if (import.meta.env.DEV) (window as unknown as { __sky: unknown }).__sky = s
          if (s) {
            bindSky(s, tier === 'mobile')
            // If the countdown already finished (slow network), the live sky fades in over the poster now.
            if (!progress || ignited) skyReveal(s, 'crossfade')
          }
          ScrollTrigger.refresh()
          return s
        })
      : Promise.resolve(null)

    await document.fonts.ready
    // Not awaited: the countdown starts immediately while below-the-fold choreography builds in phases.
    const sectionsReady = buildSections()

    if (progress) {
      const tl = await runPreloader(progress, () => {
        ignited = true
        if (sky) skyReveal(sky, 'ignite')
      })
      tl.add(heroIntro(), '-=0.35').call(() => lenis.start())
    } else {
      gsap.from('.hero__content, [data-hero-readout]', { opacity: 0, duration: 0.6, ease: 'power2.out' })
      heroIntro().progress(1) // headline split for consistency, no replay on repeat visits
    }
    await Promise.all([skyPromise, sectionsReady])
  } catch (err) {
    // Never leave content hidden behind a failed animation layer.
    root.classList.remove('js-ready')
    document.querySelector<HTMLElement>('[data-preloader]')?.remove()
    console.error('[motion] setup failed; showing the static page:', err)
  }
}

/** ?poster=<batch-id>: renders the sky alone for scripts/render-posters.mjs (fallback images + OG image). */
async function posterMode(batchId: string) {
  root.classList.add('is-poster')
  const index = Math.max(0, camp.batches.findIndex((b) => b.id === batchId))
  const input = document.querySelectorAll<HTMLInputElement>('input[name="batch"]')[index]
  if (input) input.checked = true
  // Posters sit behind the same hero layout, so keep labels clear of where the copy will be.
  const posterExclusion = () => {
    const w = innerWidth, h = innerHeight
    return w / h < 0.8 ? { left: 0, top: h * 0.33, right: w, bottom: h } : { left: 0, top: h * 0.3, right: w * 0.56, bottom: h }
  }
  const sky = await bootSky('high', null, posterExclusion)
  if (!sky) throw new Error('poster mode: live sky failed to start')
  const tr = sky.batchTransition(index)
  tr.commit()
  sky.state.yaw = camp.batches[index].skyViewAzimuth
  sky.state.paused = true
  sky.uniforms.reveal.value = 1
  sky.uniforms.draw.value = 1.4
  sky.uniforms.ignite.value = 0.22
  sky.renderer.domElement.parentElement?.classList.add('is-live')
  sky.start()
  if (params.has('og')) {
    // Open Graph card: the rendered sky + wordmark + the line, in the site's own type.
    const card = document.createElement('div')
    card.className = 'og-card'
    card.innerHTML = `<p class="og-card__brand"><span class="brand__mark"></span>${camp.name}</p>
      <p class="og-card__title">This is the sky your child will see on night one.</p>
      <p class="og-card__subjects">${camp.disciplines.map((d) => d.title).join(' · ')}</p>
      <p class="og-card__meta">Grades ${camp.grades.from}–${camp.grades.to} · ${camp.format.days}-day residential camp · ${camp.venue.town}, ${camp.venue.state}</p>`
    document.body.appendChild(card)
  }
  await document.fonts.ready
  setTimeout(() => ((window as unknown as { __skyReady: boolean }).__skyReady = true), 1500)
}
