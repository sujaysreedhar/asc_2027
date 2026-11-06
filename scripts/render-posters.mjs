/**
 * Renders the live sky to still images — the poster fallback (no WebGL, reduced motion,
 * JS off, low-tier devices) and the Open Graph image — so every fallback shows the same
 * real sky. Run after any change to dates/azimuths:  npm run build && npm run posters
 * Uses `vite preview` on :4173 (started automatically if not running).
 */
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const { chromium } = createRequire(import.meta.url)('playwright')
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.join(root, 'public/posters')
fs.mkdirSync(out, { recursive: true })
const BASE = process.env.POSTER_BASE ?? 'http://localhost:4173'

async function up() {
  try { return (await fetch(BASE)).ok } catch { return false }
}
let server = null
if (!(await up())) {
  // shell: true on Windows — npm ships npx as npx.cmd, which bare spawn() cannot find (ENOENT).
  server = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], { cwd: root, stdio: 'ignore', shell: process.platform === 'win32' })
  for (let i = 0; i < 50 && !(await up()); i++) await new Promise((r) => setTimeout(r, 200))
  if (!(await up())) throw new Error(`render-posters: preview server did not start at ${BASE} — run npm run build first`)
}

const configSrc = fs.readFileSync(path.join(root, 'src/content/camp.config.ts'), 'utf8')
const batchIds = [...configSrc.matchAll(/id: '(batch-[^']+)'/g)].map((m) => m[1])
if (!batchIds.length) throw new Error('render-posters: no batch ids found in camp.config.ts')

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
async function shoot(url, width, height, dpr) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: dpr })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(url, { waitUntil: 'load' })
  await page.waitForFunction(() => window.__skyReady === true, null, { timeout: 60_000 }).catch(() => {
    throw new Error(`render-posters: sky never became ready at ${url}. Page errors: ${errors.join(' | ') || 'none'}`)
  })
  const buf = await page.screenshot({ type: 'png' })
  await page.close()
  return buf
}

for (const id of batchIds) {
  const land = await shoot(`${BASE}/?poster=${id}`, 1600, 1000, 1)
  for (const w of [1600, 800]) {
    const img = sharp(land).resize(w)
    await img.clone().avif({ quality: 58, effort: 6 }).toFile(path.join(out, `sky-${id}-${w}.avif`))
    await img.clone().jpeg({ quality: 82, mozjpeg: true, progressive: true }).toFile(path.join(out, `sky-${id}-${w}.jpg`))
  }
  const portrait = await shoot(`${BASE}/?poster=${id}`, 540, 960, 2)
  await sharp(portrait).avif({ quality: 58, effort: 6 }).toFile(path.join(out, `sky-${id}-portrait.avif`))
  await sharp(portrait).jpeg({ quality: 82, mozjpeg: true, progressive: true }).toFile(path.join(out, `sky-${id}-portrait.jpg`))
  console.log(`posters: ${id} ✓`)
}
const og = await shoot(`${BASE}/?poster=${batchIds[0]}&og`, 1200, 630, 1)
await sharp(og).jpeg({ quality: 86, mozjpeg: true }).toFile(path.join(root, 'public/og.jpg'))
console.log('og.jpg ✓')
await browser.close()
server?.kill()
for (const f of fs.readdirSync(out)) console.log(`  ${f}  ${(fs.statSync(path.join(out, f)).size / 1024).toFixed(1)} KB`)
