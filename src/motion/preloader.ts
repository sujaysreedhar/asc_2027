/**
 * "T-10" countdown tied to real asset progress. Ends in an ignition flash whose
 * warmth is handed to the sky's horizon (the seam), then wipes up into the hero.
 */
import { gsap } from './setup.ts'
import type { Progress } from './progress.ts'

const MIN_MS = 1200 // never flash by
const MAX_MS = 4000 // never hold a parent on slow 4G hostage; the live sky fades in later if needed

export function runPreloader(progress: Progress, onIgnite: () => void): Promise<gsap.core.Timeline> {
  const root = document.querySelector<HTMLElement>('[data-preloader]')
  if (!root) throw new Error('preloader: [data-preloader] missing from the page')
  root.classList.add('is-managed') // JS owns it now; disables the CSS failsafe
  const num = root.querySelector<HTMLElement>('[data-count]')!
  const bar = root.querySelector<HTMLElement>('[data-progress]')!
  const status = root.querySelector<HTMLElement>('[data-status]')!
  const ignition = root.querySelector<HTMLElement>('[data-ignition]')!
  const shown = { v: 0 }
  const render = () => {
    num.textContent = String(10 - Math.floor(shown.v * 10 + 1e-6)).padStart(2, '0')
    bar.style.transform = `scaleX(${shown.v})`
  }
  render()
  const off = progress.on((v, label) => {
    gsap.to(shown, { v, duration: 0.6, ease: 'power2.out', overwrite: true, onUpdate: render })
    status.textContent = label
  })
  const start = performance.now()

  return new Promise((resolve) => {
    const finish = () => {
      off()
      status.textContent = 'Ignition'
      const tl = gsap.timeline()
      tl.to(shown, { v: 1, duration: 0.35, ease: 'power2.out', overwrite: true, onUpdate: render })
        .to(root.querySelector('.preloader__inner'), { yPercent: -18, autoAlpha: 0, duration: 0.5, ease: 'power2.in' }, '+=0.05')
        // A single soft pulse (no strobing): 0 → 0.9 → handed to the horizon glow.
        .to(ignition, { opacity: 0.9, scale: 1, duration: 0.5, ease: 'power2.out' }, '-=0.2')
        .call(onIgnite, [], '<0.15')
        .to(root, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.0, ease: 'mission' }, '-=0.05')
        .to(ignition, { opacity: 0, duration: 0.8, ease: 'power2.in' }, '<')
        .set(root, { display: 'none' })
      resolve(tl)
    }
    const check = () => {
      const elapsed = performance.now() - start
      if ((progress.complete && elapsed >= MIN_MS) || elapsed >= MAX_MS) finish()
      else setTimeout(check, 80)
    }
    check()
  })
}
