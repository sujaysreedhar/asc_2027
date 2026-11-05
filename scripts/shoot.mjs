/**
 * Screenshot helper (Playwright, pre-installed Chromium).
 * node scripts/shoot.mjs <url> <out.png> <width> <height> [--nojs] [--reduced] [--full] [--wait=ms] [--scroll=px] [--dpr=n]
 */
import { createRequire } from 'node:module'
// Playwright is pre-installed globally in this environment; resolve it via require (NODE_PATH), not ESM.
const { chromium } = createRequire(import.meta.url)('playwright')
const [url, out, w = '1440', h = '900', ...flags] = process.argv.slice(2)
const has = (f) => flags.includes(f)
const opt = (k, d) => (flags.find((f) => f.startsWith(`--${k}=`))?.split('=')[1] ?? d)
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] })
const ctx = await browser.newContext({
  viewport: { width: +w, height: +h },
  deviceScaleFactor: +opt('dpr', '1'),
  javaScriptEnabled: !has('--nojs'),
  reducedMotion: has('--reduced') ? 'reduce' : 'no-preference',
})
const page = await ctx.newPage()
const logs = []
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`))
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))
await page.goto(url, { waitUntil: 'load' })
await page.waitForTimeout(+opt('wait', '500'))
const sc = +opt('scroll', '0')
if (sc) { await page.mouse.wheel(0, sc); await page.waitForTimeout(+opt('after', '1500')) }
await page.screenshot({ path: out, fullPage: has('--full') })
if (logs.length) console.log(logs.join('\n'))
await browser.close()
