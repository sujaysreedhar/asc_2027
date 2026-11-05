/**
 * GSAP + Lenis wiring. Lenis and ScrollTrigger share GSAP's ticker so scroll,
 * scrubbed timelines and the WebGL frame never drift apart.
 */
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { Flip } from 'gsap/Flip'
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin'
import { CustomEase } from 'gsap/CustomEase'
import Lenis from 'lenis'

gsap.registerPlugin(ScrollTrigger, SplitText, Flip, DrawSVGPlugin, CustomEase)
// The house ease: used for every state transition (preloader wipe, batch sweep, menus).
CustomEase.create('mission', '0.9, 0, 0.1, 1')
gsap.defaults({ ease: 'expo.out', duration: 1.1 })

export { gsap, ScrollTrigger, SplitText, Flip }

export function headerOffset(): number {
  return (document.querySelector<HTMLElement>('[data-header]')?.offsetHeight ?? 64) + 8
}

export function createLenis(): Lenis {
  const lenis = new Lenis({ lerp: 0.1, autoRaf: false, anchors: false })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((t) => lenis.raf(t * 1000))
  gsap.ticker.lagSmoothing(0)
  return lenis
}

/** In-page links scroll smoothly (Lenis when present) and move keyboard focus to the target. */
export function wireAnchors(lenis: Lenis | null) {
  document.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]')
    if (!a || a.hasAttribute('data-batch-switch')) return
    const id = a.getAttribute('href')!.slice(1)
    const target = id ? document.getElementById(id) : null
    if (!target) return
    e.preventDefault()
    const focusTarget = () => {
      if (!target.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|SUMMARY)$/.test(target.tagName)) target.setAttribute('tabindex', '-1')
      target.focus({ preventScroll: true })
    }
    if (lenis) lenis.scrollTo(target, { offset: id === 'top' || id === 'main' ? 0 : -headerOffset(), duration: 1.3, onComplete: focusTarget })
    else {
      target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
      focusTarget()
    }
    history.replaceState(null, '', `#${id}`)
  })
}
