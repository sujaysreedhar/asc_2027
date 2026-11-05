/**
 * Behaviour that must work for everyone, including reduced motion and the poster-only tier:
 * mobile menu, FAQ keyboard close, batch-switch links, newsletter, IST clock, console note.
 */
import { camp } from '../content/camp.config.ts'
import { localSiderealDeg, julianDate } from '../sky/astro.ts'

function menu(onOpenChange?: (open: boolean) => void) {
  const btn = document.querySelector<HTMLButtonElement>('[data-menu-toggle]')
  const nav = document.getElementById('site-nav')
  if (!btn || !nav) return
  btn.hidden = false
  const mq = matchMedia('(min-width: 64em)')
  const header = btn.closest('header') ?? document.body
  // Everything focusable in the header stays reachable (brand, links, Register, Close); nothing behind the overlay is.
  const focusables = () => Array.from(header.querySelectorAll<HTMLElement>('a[href], button:not([hidden])'))
  const set = (open: boolean, restoreFocus = true) => {
    btn.setAttribute('aria-expanded', String(open))
    btn.querySelector('.menu-toggle__label')!.textContent = open ? 'Close' : 'Menu'
    nav.classList.toggle('is-open', open)
    onOpenChange?.(open)
    if (open) nav.querySelector('a')?.focus()
    else if (restoreFocus) btn.focus()
  }
  btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'))
  nav.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('a') && nav.classList.contains('is-open')) set(false, false)
  })
  document.addEventListener('keydown', (e) => {
    if (!nav.classList.contains('is-open')) return
    if (e.key === 'Escape') return set(false)
    if (e.key === 'Tab') {
      // Trap focus inside the open menu (toggle button + links).
      e.preventDefault()
      const f = focusables()
      const i = f.indexOf(document.activeElement as HTMLElement)
      f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus()
    }
  })
  mq.addEventListener('change', () => mq.matches && nav.classList.contains('is-open') && set(false, false))
}

function faq() {
  document.querySelectorAll<HTMLDetailsElement>('[data-qa]').forEach((d) =>
    d.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && d.open) {
        d.open = false
        d.querySelector('summary')?.focus()
      }
    }),
  )
}

/** "Switch batch" links flip the hero's radio group in place (no scroll jump). */
function batchSwitch() {
  document.querySelectorAll<HTMLAnchorElement>('[data-batch-switch]').forEach((a) =>
    a.addEventListener('click', (e) => {
      e.preventDefault()
      const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="batch"]'))
      const i = inputs.findIndex((x) => x.checked)
      const next = inputs[(i + 1) % inputs.length]
      next.checked = true
      next.dispatchEvent(new Event('change', { bubbles: true }))
    }),
  )
}

function newsletter() {
  const form = document.querySelector<HTMLFormElement>('[data-newsletter]')
  const endpoint = camp.links.newsletterEndpoint
  if (!form || !endpoint) return
  const status = form.querySelector<HTMLElement>('.newsletter__status')!
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const input = form.querySelector<HTMLInputElement>('input[type="email"]')!
    if (!input.checkValidity()) {
      status.textContent = 'Please enter a valid email address.'
      input.focus()
      return
    }
    status.textContent = 'Sending…'
    try {
      const res = await fetch(endpoint, { method: 'POST', body: new FormData(form) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      status.textContent = 'You’re on the list. We’ll write when dates are confirmed.'
      form.reset()
    } catch (err) {
      console.error('[newsletter] submit failed:', err)
      status.textContent = `Couldn’t subscribe right now. Please WhatsApp us at ${camp.contact.whatsappDisplay}.`
    }
  })
}

function istClock() {
  const el = document.querySelector<HTMLElement>('[data-ist-clock]')
  if (!el) return
  const fmt = new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' })
  const tick = () => (el.textContent = `Kuppam now: ${fmt.format(new Date())} ${camp.sky.timezoneLabel}`)
  tick()
  setInterval(tick, 30_000)
}

/** The mobile Register dock appears once the hero's own buttons have scrolled away (works in every mode). */
function dock() {
  const el = document.querySelector<HTMLElement>('[data-dock]')
  const heroCtas = document.querySelector<HTMLElement>('.hero__ctas')
  if (!el || !heroCtas || !('IntersectionObserver' in window)) return
  el.classList.add('is-hidden')
  new IntersectionObserver(([entry]) => {
    const above = entry.boundingClientRect.bottom < 0
    el.classList.toggle('is-hidden', entry.isIntersecting || !above)
  }).observe(heroCtas)
}

function consoleNote() {
  const lst = localSiderealDeg(julianDate(Date.now()), camp.venue.longitude) / 15
  const h = Math.floor(lst), m = Math.floor((lst - h) * 60)
  console.log(
    '%c   /\\\n  |==|   Astro Space Camp 2027\n  |  |   Local sidereal time over Kuppam right now: %s\n /|##|\\  Curious how the sky is computed? See src/sky/astro.ts.\n   ^^',
    'color:#ff8a1f;font-family:monospace;line-height:1.3',
    `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`,
  )
}

export function initBasics(opts: { onMenu?: (open: boolean) => void } = {}) {
  menu(opts.onMenu)
  faq()
  batchSwitch()
  newsletter()
  istClock()
  dock()
  consoleNote()
}
