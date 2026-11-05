/**
 * Scrolls through the page like a visitor (wheel events → Lenis) and screenshots each stop.
 * node scripts/journey.mjs <url> <outPrefix> <width> <height> [--reduced] [--mobile] [--dpr=n]
 */
import { createRequire } from 'node:module'
const { chromium, devices } = createRequire(import.meta.url)('playwright')
const [url, prefix, w = '1440', h = '900', ...flags] = process.argv.slice(2)
const has = (f) => flags.includes(f)
const dpr = +(flags.find((f) => f.startsWith('--dpr='))?.split('=')[1] ?? 1)
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const ctx = await browser.newContext({
  viewport: { width: +w, height: +h }, deviceScaleFactor: dpr,
  reducedMotion: has('--reduced') ? 'reduce' : 'no-preference',
  hasTouch: has('--mobile'), isMobile: has('--mobile'),
})
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
await page.goto(url, { waitUntil: 'load' })
await page.waitForTimeout(7000)
const stops = ['top', 'ascent', 'lbl', 'lbl+0.5', 'lbl+1.2', 'mission-log', 'mission-log+0.6', 'ground-station', 'crew', 'batches', 'faq', 'contact']
let i = 0
for (const stop of stops) {
  const [id, extra] = stop.split('+')
  const target = await page.evaluate(([id, extra]) => {
    const el = document.getElementById(id)
    const y = id === 'top' ? 0 : el.getBoundingClientRect().top + scrollY
    return y + (extra ? +extra * innerHeight : 0)
  }, [id, extra])
  // Wheel toward the target in steps (Lenis + ScrollTrigger see real input).
  for (let n = 0; n < 200; n++) {
    const cur = await page.evaluate(() => scrollY)
    const d = target - cur
    if (Math.abs(d) < 8) break
    await page.mouse.move(+w / 2, +h / 2)
    await page.mouse.wheel(0, Math.sign(d) * Math.min(Math.abs(d), 600))
    await page.waitForTimeout(90)
  }
  await page.waitForTimeout(1800)
  await page.screenshot({ path: `${prefix}-${String(i++).padStart(2, '0')}-${stop.replace('+', '_')}.png` })
}
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors')
await browser.close()
