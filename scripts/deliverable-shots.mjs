/**
 * Captures the README/delivery screenshots from the production build (vite preview on :4173).
 * node scripts/deliverable-shots.mjs
 */
import { createRequire } from 'node:module'
const { chromium } = createRequire(import.meta.url)('playwright')
const BASE = 'http://localhost:4173'
const OUT = 'docs/screenshots'
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })

async function session({ width, height, dpr = 2, mobile = false, reduced = false, js = true }) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dpr, isMobile: mobile, hasTouch: mobile, reducedMotion: reduced ? 'reduce' : 'no-preference', javaScriptEnabled: js })
  const page = await ctx.newPage()
  page.setDefaultTimeout(180_000) // software-rendered WebGL at 2× is slow in CI containers
  return page
}
// JPEG keeps the committed screenshots small (the 2× PNGs were ~3.5 MB each).
const shot = (page, name) => page.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: 82 })

async function wheelTo(page, id, extra = 0) {
  const target = await page.evaluate(([id, extra]) => document.getElementById(id).getBoundingClientRect().top + scrollY + extra * innerHeight, [id, extra])
  for (let n = 0; n < 200; n++) {
    const d = target - (await page.evaluate(() => scrollY))
    if (Math.abs(d) < 8) break
    await page.mouse.wheel(0, Math.sign(d) * Math.min(Math.abs(d), 600))
    await page.waitForTimeout(80)
  }
  await page.waitForTimeout(1800)
}

// Desktop: preloader, hero (both batches), LBL pinned stage, itinerary, batches, footer
let p = await session({ width: 1440, height: 900 })
await p.goto(BASE + '/', { waitUntil: 'commit' })
await p.waitForTimeout(700)
await shot(p, '01-preloader-desktop')
await p.waitForTimeout(5500)
await shot(p, '02-hero-desktop-batch1')
await p.click('label[for="pick-batch-2"]')
await p.waitForTimeout(3200)
await shot(p, '03-hero-desktop-batch2')
await p.click('label[for="pick-batch-1"]')
await p.waitForTimeout(2500)
await wheelTo(p, 'subjects', -0.02)
await shot(p, '04-subjects-desktop')
await wheelTo(p, 'lbl', 0.55) // Learn stage fully seated, before it drops away
await shot(p, '05-lbl-desktop')
await wheelTo(p, 'mission-log', 0.7)
await shot(p, '06-itinerary-desktop')
await wheelTo(p, 'batches')
await shot(p, '07-batches-desktop')
await wheelTo(p, 'contact', 0.15)
await shot(p, '08-footer-desktop')
await p.context().close()

// Mobile (390×844, a typical Android width)
p = await session({ width: 390, height: 844, mobile: true })
await p.goto(BASE + '/', { waitUntil: 'load' })
await p.waitForTimeout(12000) // countdown + intro are slow under 2× software rendering
await shot(p, '09-hero-mobile')
for (const [id, extra, name] of [['subjects', 0.45, '10-subjects-mobile'], ['lbl', 0.4, '11-lbl-mobile'], ['mission-log', 0.55, '12-itinerary-mobile'], ['ground-station', 0, '13-ground-station-mobile'], ['batches', 0.1, '14-batches-mobile']]) {
  await p.evaluate(([id, extra]) => window.scrollTo(0, document.getElementById(id).getBoundingClientRect().top + scrollY + extra * innerHeight), [id, extra])
  await p.waitForTimeout(2200)
  await shot(p, name)
}
await p.context().close()

// Fallback states
p = await session({ width: 390, height: 844, mobile: true, reduced: true })
await p.goto(BASE + '/', { waitUntil: 'load' }); await p.waitForTimeout(1500)
await shot(p, '15-reduced-motion-mobile')
await p.context().close()
p = await session({ width: 1440, height: 900, js: false })
await p.goto(BASE + '/', { waitUntil: 'load' }); await p.waitForTimeout(800)
await shot(p, '16-no-js-desktop')
await p.context().close()
await browser.close()
console.log('screenshots written to', OUT)
