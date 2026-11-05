/**
 * Hero choreography and the bridge between the page and the live sky:
 * entrance timeline, sky reveal, batch-toggle sweep, ascent tilt, pointer parallax, clock.
 */
import { gsap, ScrollTrigger, SplitText } from './setup.ts'
import type { Sky } from '../sky/scene.ts'
import { camp } from '../content/camp.config.ts'

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

/** Headline + meta entrance. Returned as a timeline so the preloader can overlap it. */
export function heroIntro(): gsap.core.Timeline {
  const title = document.querySelector<HTMLElement>('[data-hero-title]')!
  const tl = gsap.timeline()
  const split = SplitText.create(title, { type: 'lines', mask: 'lines' })
  title.classList.add('is-split')
  tl.from(split.lines, { yPercent: 110, duration: 1.2, stagger: 0.09, ease: 'expo.out' })
    .from('[data-hero-meta]', { y: 24, opacity: 0, duration: 0.9, stagger: 0.06, ease: 'expo.out' }, '-=0.95')
    .from('[data-header]', { yPercent: -100, opacity: 0, duration: 0.9, ease: 'expo.out' }, '<0.1')
    .from('[data-hero-readout], .hero__credit', { opacity: 0, duration: 0.8, ease: 'power2.out' }, '-=0.6')
    // Restore the original text so the headline re-wraps naturally on resize/rotation.
    .call(() => split.revert())
  return tl
}

/**
 * 'ignite'    — after the countdown: stars appear brightest-first, constellations draw from the
 *               centre of view outward, the ignition warmth settles into the horizon.
 * 'crossfade' — the poster of the same sky is already on screen (repeat visit, slow network):
 *               the live canvas simply fades in over it, fully drawn, so nothing blinks.
 */
export function skyReveal(sky: Sky, mode: 'ignite' | 'crossfade'): gsap.core.Timeline {
  const u = sky.uniforms
  const tl = gsap.timeline()
  tl.call(() => sky.renderer.domElement.parentElement?.classList.add('is-live'))
  if (mode === 'ignite') {
    tl.fromTo(u.reveal, { value: 0 }, { value: 1, duration: 2.6, ease: 'expo.out' }, 0)
      .fromTo(u.draw, { value: 0 }, { value: 1.4, duration: 3.2, ease: 'power2.inOut' }, 0.5)
      .fromTo(u.ignite, { value: 1 }, { value: 0.22, duration: 2.4, ease: 'power2.out' }, 0)
  } else {
    tl.set(u.reveal, { value: 1 }, 0).set(u.draw, { value: 1.4 }, 0).set(u.ignite, { value: 0.22 }, 0)
  }
  return tl
}

export function bindSky(sky: Sky, lite: boolean) {
  const u = sky.uniforms
  const container = sky.renderer.domElement.parentElement!
  container.classList.add('is-fixed')
  sky.start()
  sky.onTooSlow(() => {
    // The poster is the same sky at the same moment, so the hand-back is a quiet crossfade.
    container.classList.remove('is-live')
    gsap.delayedCall(1.3, () => {
      sky.dispose()
      container.classList.remove('is-fixed')
      if (readout) readout.innerHTML = staticReadout
      const mode = document.querySelector('[data-sky-mode]')
      if (mode) mode.textContent = 'Star positions computed for the campus'
      ScrollTrigger.refresh()
    })
  })

  // Live clock: drift is 60× real time, so the readout ticks one sky-minute per second.
  const readout = document.querySelector<HTMLElement>('[data-sky-clock]')
  const staticReadout = readout?.innerHTML ?? '' // per-batch static dates, restored if the live sky hands back
  let lastText = ''
  sky.onClock((ms) => {
    const d = new Date(ms + 330 * 60_000) // IST, no DST
    const text = `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()} · ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} ${camp.sky.timezoneLabel}`
    if (text !== lastText && readout) {
      readout.textContent = text
      lastText = text
    }
  })

  // Batch toggle: sweep through the sidereal difference between the two nights.
  const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="batch"]'))
  let sweep: gsap.core.Timeline | null = null
  inputs.forEach((input, i) =>
    input.addEventListener('change', () => {
      if (!input.checked) return
      sweep?.progress(1)
      const tr = sky.batchTransition(i)
      const o = { lst: tr.fromLst, yaw: tr.fromYaw }
      sky.state.paused = true
      sweep = gsap
        .timeline({ onComplete: () => void (sky.state.paused = false) })
        .to([u.bodiesOpacity, u.linesOpacity], { value: 0, duration: 0.45, ease: 'power2.in' })
        .to(o, { lst: tr.toLst, yaw: tr.toYaw, duration: 1.6, ease: 'mission', onUpdate: () => (tr.set(o.lst), (sky.state.yaw = o.yaw)) }, '<0.05')
        .call(() => tr.commit(), [], '-=0.25')
        .to(u.bodiesOpacity, { value: 1, duration: 0.7, ease: 'power2.out' })
        .set(u.linesOpacity, { value: 1 }, '<')
        .fromTo(u.draw, { value: 0 }, { value: 1.4, duration: 1.8, ease: 'power2.inOut' }, '<')
    }),
  )

  // Ascent: the camera tilts from the horizon to the zenith through the stats and the four subjects.
  ScrollTrigger.create({
    trigger: '.hero',
    start: 'top top',
    endTrigger: '#subjects',
    end: 'bottom bottom',
    scrub: 1,
    onUpdate: (self) => {
      sky.state.pitch = 18 + self.progress * 66
      sky.state.labelsOpacity = self.progress < 0.15 ? 1 : 0
    },
  })
  gsap.to('.hero__content, .hero__readout, .hero__credit', {
    y: -60, opacity: 0, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom 30%', scrub: 1 },
  })
  // Stop rendering once opaque sections cover the sky.
  ScrollTrigger.create({
    trigger: '#subjects',
    start: 'top bottom',
    end: 'bottom top',
    onLeave: () => (sky.setOnScreen(false), container.classList.add('is-covered')),
    onEnterBack: () => (sky.setOnScreen(true), container.classList.remove('is-covered')),
  })

  // Pointer parallax (desktop): a gentle look-around, ±1.5°.
  if (!lite && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const yawTo = gsap.quickTo(sky.state, 'pointerYaw', { duration: 1.2, ease: 'power3.out' })
    const pitchTo = gsap.quickTo(sky.state, 'pointerPitch', { duration: 1.2, ease: 'power3.out' })
    window.addEventListener('pointermove', (e) => {
      yawTo((e.clientX / innerWidth - 0.5) * 3)
      pitchTo((0.5 - e.clientY / innerHeight) * 2)
    })
  }
}
