/**
 * Scroll choreography for everything below the hero. Built inside gsap.matchMedia so
 * mobile gets a lighter version and breakpoints clean up after themselves. Reduced
 * motion never reaches this file (see main.ts).
 */
import { gsap, ScrollTrigger, SplitText, Flip, headerOffset } from './setup.ts'

const $ = <T extends Element = HTMLElement>(s: string, root: ParentNode = document) => root.querySelector<T>(s)
const $$ = <T extends Element = HTMLElement>(s: string, root: ParentNode = document) => Array.from(root.querySelectorAll<T>(s))

/** Headlines: masked line reveals (split after fonts load; autoSplit re-splits on resize). */
function splitHeadings() {
  $$('[data-split]').forEach((el) => {
    SplitText.create(el, {
      type: 'lines',
      mask: 'lines',
      autoSplit: true,
      onSplit(self) {
        el.classList.add('is-split')
        return gsap.from(self.lines, {
          yPercent: 110,
          duration: 1.2,
          stagger: 0.09,
          ease: 'expo.out',
          scrollTrigger: { trigger: el, start: 'top 86%', once: true },
        })
      },
    })
  })
}

function reveals() {
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 88%',
    once: true,
    onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 1.1, stagger: 0.08, ease: 'expo.out', overwrite: true }),
  })
}

/** Stats tick up like altitude readouts. The real number stays available to screen readers. */
function countUps() {
  $$('[data-count-to]').forEach((el) => {
    const to = Number(el.dataset.countTo)
    const sr = document.createElement('span')
    sr.className = 'sr-only'
    sr.textContent = el.textContent ?? ''
    el.after(sr)
    el.setAttribute('aria-hidden', 'true')
    const o = { v: 0 }
    el.textContent = '0'
    gsap.to(o, {
      v: to,
      duration: 1.4,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      onUpdate: () => (el.textContent = Math.round(o.v).toLocaleString('en-IN')),
    })
  })
}

/** LBL: the one pinned chapter — stages separate like a rocket (desktop); stacked reveals on mobile. */
function lbl(lite: boolean) {
  const section = $('#lbl')
  const stages = $$('.stage', section!)
  if (!section || stages.length < 2) return
  if (lite) {
    stages.forEach((s) => {
      gsap.from($('.photo__frame, .photo img', s), { clipPath: 'inset(100% 0% 0% 0%)', duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: s, start: 'top 82%', once: true } })
      gsap.from($$('.stage__copy > *', s), { y: 28, opacity: 0, stagger: 0.07, duration: 1, scrollTrigger: { trigger: s, start: 'top 75%', once: true } })
    })
    return
  }
  section.classList.add('is-staged')
  const cleanup = () => section.classList.remove('is-staged')
  const rail = $('.lbl__rail', section)!
  const railItems = $$('li', rail)
  gsap.set(stages[1], { scale: 0.95, yPercent: 5 })
  if (stages[2]) gsap.set(stages[2], { scale: 0.9, yPercent: 10 })
  const setActive = (i: number) => railItems.forEach((li, k) => li.classList.toggle('is-active', k === i))
  setActive(0)
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: $('.lbl__pin', section),
      start: () => `top top+=${headerOffset() - 8}`,
      end: '+=200%', // < 3 viewport heights; plain scrolling exits at any time
      pin: true,
      scrub: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        rail.style.setProperty('--rail', self.progress.toFixed(3))
        setActive(Math.min(stages.length - 1, Math.floor(self.progress * stages.length * 0.999)))
      },
    },
  })
  // The first stage's photo reveals as the chapter arrives (not scrubbed), so the pinned card is never empty.
  gsap.from($('.photo__frame, .photo img', stages[0]), { clipPath: 'inset(100% 0% 0% 0%)', duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: section, start: 'top 45%', once: true } })
  tl.to({}, { duration: 0.15 })
  stages.slice(0, -1).forEach((stage, i) => {
    const next = stages[i + 1]
    const after = stages[i + 2]
    tl.to(stage, { yPercent: 118, rotation: i % 2 ? 3 : -3.5, opacity: 0.2, duration: 1 }, '+=0.25')
      .to(next, { scale: 1, yPercent: 0, duration: 0.8 }, '<0.15')
      .from($$('.stage__copy > *', next), { y: 30, opacity: 0, stagger: 0.05, duration: 0.5 }, '<0.3')
    if (after) tl.to(after, { scale: 0.95, yPercent: 5, duration: 0.8 }, '<')
  })
  tl.to({}, { duration: 0.3 })
  return cleanup
}

/** Mission log: horizontal orbit (desktop pins & scrubs; mobile keeps native thumb scrolling). */
function missionLog(lite: boolean) {
  const section = $('#mission-log')
  const viewport = $('[data-log-viewport]', section!)
  const track = $('[data-log-track]', section!)
  const orbit = $<SVGPathElement>('[data-orbit]', section!)
  if (!section || !viewport || !track || !orbit) return
  if (lite) {
    gsap.from(orbit, { drawSVG: '0%', duration: 2, ease: 'power2.inOut', scrollTrigger: { trigger: viewport, start: 'top 80%', once: true } })
    return () => {}
  }
  section.classList.add('is-scrubbed')
  viewport.removeAttribute('tabindex') // no native scroll in this mode — page scroll drives it
  viewport.removeAttribute('role')
  const distance = () => Math.max(0, track.scrollWidth - viewport.clientWidth + parseFloat(getComputedStyle(viewport).paddingLeft) * 2)
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: viewport, start: 'center center', end: () => `+=${distance()}`, pin: true, scrub: 1, invalidateOnRefresh: true },
  })
  tl.to(track, { x: () => -distance(), duration: 1 }).fromTo(orbit, { drawSVG: '0%' }, { drawSVG: '100%', duration: 1 }, 0)
  return () => {
    section.classList.remove('is-scrubbed')
    viewport.setAttribute('tabindex', '0')
    viewport.setAttribute('role', 'region')
  }
}

/** Subjects: cards rise in altitude order and their line icons draw themselves (the constellation motif). */
function subjects() {
  const ladder = $('[data-subjects]')
  if (!ladder) return
  const cards = $$('.subject', ladder)
  const tl = gsap.timeline({ scrollTrigger: { trigger: ladder, start: 'top 82%', once: true } })
  tl.from(cards, { y: 50, opacity: 0, duration: 1.1, stagger: 0.1, ease: 'expo.out' })
    .from($$('.subject__icon path, .subject__icon circle', ladder), { drawSVG: '0%', duration: 1.4, stagger: 0.04, ease: 'power2.inOut' }, '-=0.9')
}

function groundStation() {
  const route = $<SVGPathElement>('.map__route')
  if (route) gsap.from(route, { drawSVG: '0%', duration: 2.2, ease: 'power2.inOut', scrollTrigger: { trigger: route, start: 'top 80%', once: true } })
  const pulse = $('.map__pulse')
  if (pulse)
    gsap.fromTo(pulse, { scale: 1, opacity: 0.9 }, {
      scale: 2.6, opacity: 0, duration: 2.4, ease: 'power2.out', repeat: -1,
      scrollTrigger: { trigger: pulse, start: 'top bottom', end: 'bottom top', toggleActions: 'play pause resume pause' },
    })
}

function crew() {
  const items = $$('.crew__wall li')
  if (!items.length) return
  gsap.from(items, {
    clipPath: 'inset(100% 0% 0% 0%)',
    duration: 1.2,
    ease: 'expo.out',
    stagger: { each: 0.07, from: 'center' },
    scrollTrigger: { trigger: '.crew__wall', start: 'top 82%', once: true },
  })
}

/** Batch cards rise; the selected batch's highlight Flips from card to card (continuity with the hero toggle). */
function patches() {
  const cards = $$('.patch')
  gsap.from(cards, { y: 60, opacity: 0, duration: 1.1, stagger: 0.12, scrollTrigger: { trigger: '.patches', start: 'top 85%', once: true } })
  const ring = document.createElement('span')
  ring.className = 'patch__highlight'
  ring.setAttribute('aria-hidden', 'true')
  const place = (animate: boolean) => {
    const id = $<HTMLInputElement>('input[name="batch"]:checked')?.value
    const card = cards.find((c) => c.dataset.patch === id)
    if (!card) return
    const state = animate ? Flip.getState(ring) : null
    card.appendChild(ring)
    if (state) Flip.from(state, { duration: 0.9, ease: 'mission' })
  }
  place(false)
  document.addEventListener('change', (e) => {
    if ((e.target as HTMLInputElement).name === 'batch') place(ScrollTrigger.isInViewport(cards[0], 0.1) || ScrollTrigger.isInViewport(cards[1], 0.1))
  })
}

function reentry() {
  const glow = $('.reentry__glow')
  if (!glow) return
  gsap.fromTo(glow, { scaleY: 0.35, opacity: 0.25 }, { scaleY: 1, opacity: 1, ease: 'none', scrollTrigger: { trigger: '.reentry', start: 'top bottom', end: 'top 25%', scrub: 1 } })
}

function chrome() {
  const header = $('[data-header]')
  ScrollTrigger.create({ start: 40, end: 'max', onToggle: (self) => header?.classList.toggle('is-solid', self.isActive) })
}

/** Desktop pointer only: buttons lean toward the cursor (≤ ~18 % of their size), elastic on release. */
function magnetic() {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return
  $$('[data-magnetic]').forEach((el) => {
    const xTo = gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3.out' })
    const yTo = gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3.out' })
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect()
      xTo((e.clientX - (r.left + r.width / 2)) * 0.35)
      yTo((e.clientY - (r.top + r.height / 2)) * 0.35)
    })
    el.addEventListener('pointerleave', () => gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.4)', overwrite: true }))
  })
}

const yieldToMain = () => new Promise<void>((r) => setTimeout(r, 0))

/** Built in short phases (yielding between them) so setup never becomes one long task. Order is DOM order, so pin spacing stays correct. */
export async function buildSections() {
  chrome()
  reveals()
  await yieldToMain()
  splitHeadings()
  await yieldToMain()
  countUps()
  magnetic()
  await yieldToMain()
  const mm = gsap.matchMedia()
  mm.add({ desktop: '(min-width: 900px) and (min-height: 600px)', mobile: '(max-width: 899px), (max-height: 599px)' }, (ctx) => {
    const lite = Boolean(ctx.conditions?.mobile)
    const undoLbl = lbl(lite)
    const undoLog = missionLog(lite)
    return () => {
      undoLbl?.()
      undoLog?.()
    }
  })
  await yieldToMain()
  subjects()
  groundStation()
  crew()
  patches()
  reentry()
  ScrollTrigger.sort()
  ScrollTrigger.refresh()
  // Late fonts/images shift trigger positions.
  window.addEventListener('load', () => ScrollTrigger.refresh())
  document.fonts?.ready.then(() => ScrollTrigger.refresh())
  return mm
}
