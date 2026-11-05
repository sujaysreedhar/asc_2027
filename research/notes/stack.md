# Subtopic 5 — Stack versions & capabilities (verify items)

**Method.** npm registry queries (Nov 4 2026), reading the installed packages' source, font file inspection with fontTools, and 1 search.

## Versions pinned (npm registry, publish dates)
| Package | Version | Published | Why this one |
|---|---|---|---|
| three | 0.187.0 | 2026-10-30 | Latest. `three/webgpu` + `three/tsl` builds present in `node_modules/three/build` |
| gsap | **3.15.0** | 2026-04-13 | 3.15.1 was published *today*, so 3.15.0 is used to avoid same-day regressions. All plugins ship in the package (`dist/SplitText.js`, `DrawSVGPlugin.js`, `Flip.js`, `CustomEase.js` verified) |
| lenis | 1.3.27 | 2026-10-15 | Latest |
| vite | 8.3.5 | 2026-10-21 | Latest |
| typescript | 7.0.2 | 2026-07-08 | Latest; used for `tsc --noEmit` only |
| astronomy-engine | 2.1.19 | 2023-12-14 | **Build time only** (Moon and planet ephemeris + maths verification). MIT. Not shipped to browsers |
| sharp | 0.35.5 | 2026-09-27 | Build-time image encoding (Milky Way texture, posters, OG image) |

## Capabilities checked
- **WebGPU point size:** the PointsNodeMaterial docs say WebGPU supports only 1-pixel point primitives and `sizeNode` has no effect with `Points`; use the material with **Sprite + instancing** for larger points ([three.js docs](https://threejs.org/docs/pages/PointsNodeMaterial.html)). → Stars render as instanced sprites.
- **Fonts with ₹ (U+20B9)**, checked in the actual woff2 cmap tables, not the CSS `unicode-range`:
  - Anek Latin ✔ (variable `wght` 100–800, `wdth` 75–125; by Indian foundry Ek Type)
  - Inter ✔ · Space Grotesk ✔ · Unbounded ✔ · Bricolage Grotesque ✔ · Mukta ✔
  - **Instrument Sans ✘**: its CSS `unicode-range` covers U+20B9 but the font has no glyph, so it would fall back mid-price.

## Gaps
- WebGPU on the target device class (₹15k Android) can't be tested here. The WebGL 2 fallback path is tested with `forceWebGL: true`.
