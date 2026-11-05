import { defineConfig, type Plugin } from 'vite'
import { camp } from './src/content/camp.config.ts'
import { computeEphemeris } from './src/content/ephemeris.ts'
import { renderHead, renderBody } from './src/content/render.ts'

/**
 * Static generation from src/content/camp.config.ts:
 *  - fills index.html with the full page (readable with JS off),
 *  - exposes `virtual:sky-ephemeris` (Moon/planet positions + nightly darkness)
 *    computed at build time, so browsers never download astronomy-engine.
 * Editing the config restarts the dev server automatically (Vite watches config deps).
 */
function campContent(): Plugin {
  const ephemeris = computeEphemeris(camp)
  const VIRTUAL = 'virtual:sky-ephemeris'
  const RESOLVED = '\0' + VIRTUAL
  return {
    name: 'asc-content',
    resolveId: (id) => (id === VIRTUAL ? RESOLVED : null),
    load: (id) => (id === RESOLVED ? `export const ephemeris = ${JSON.stringify(ephemeris)}` : null),
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        if (!html.includes('<!--asc:head-->') || !html.includes('<!--asc:body-->'))
          throw new Error('index.html is missing the <!--asc:head--> / <!--asc:body--> markers')
        return html.replace('<!--asc:head-->', renderHead(camp, ephemeris)).replace('<!--asc:body-->', renderBody(camp, ephemeris))
      },
    },
  }
}

export default defineConfig({
  plugins: [campContent()],
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    cssMinify: true,
    // The only large chunk is the lazily loaded sky (three/webgpu, ~230 KB gzip), fetched after first
    // paint and counted against the 3D budget, not the 300 KB pre-3D budget. Anything else over this
    // limit should still warn.
    chunkSizeWarningLimit: 900,
  },
})
