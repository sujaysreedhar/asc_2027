# Astro Space Camp 2027: Research report & design brief

*Phase 0, 4 Nov 2026. Detailed notes with every citation live in `research/notes/` (awards, competitors, history, sky, stack). This report synthesises them. Facts marked "computed" come from code in this repo; "brief" means the client's source-of-truth list.*

## What limited this research

This session's network policy blocked page fetches for the camp's own sites (`astrospacecamp.com`, `astrospacecamp.pages.dev`), the Wayback Machine, `sserd.org`, `genex.space` and the award sites. Findings therefore come from search-engine extracts (cited), the npm registry, GitHub raw files and our own computation. **No logos or camp photos could be downloaded**, so the site ships with labelled slots for both (see `NOTES.md`). Nothing below is invented to fill those gaps.

## 1. What wins juries now

The Site-of-the-Year-level work in the window (Lando Norris and Messenger in 2025; Igloo Inc in 2024) is built around **one object or world, executed with extreme craft** ([awards notes](research/notes/awards.md)):

- Lando Norris has a helmet. Its team bought smoothness by **removing drop shadows, filters and gradients** ([stack breakdown](https://recapio.com/digest/this-website-is-insane-stack-explained-by-syntax)).
- Messenger is a single planet you walk around ([80.lv](https://80.lv/articles/deliver-mail-on-tiny-colorful-planet-in-this-relaxing-web-game)).
- Igloo's jury singled out **"blending a 3D experience with easy scroll navigation"** ([Awwwards 2024](https://awwwards.com/annual-awards-2024/developer-site-of-the-year)).
- OceanX's 2025 review keeps its ship **always moving forward** ([CommArts](https://www.commarts.com/webpicks/oceanx-2025)). That is the closest structural analogue to our launch-sequence scroll.

Space-themed sites in 2025 (Oakley × Axiom, Portal Space Systems) collected Honorable Mentions, not SOTDs ([Awwwards](https://www.awwwards.com/inspiration_search/space/)). *Inference:* a black page with a starfield is table stakes. A starfield that is **verifiably the real sky on a specific night** is not.

## 2. What parents need, and what they skip

Parents decide mostly on logistics. A University of Michigan poll found fewer than half rate safety policies as essential, and only half feel confident judging camp safety ([Michigan Medicine](https://www.michiganmedicine.org/health-lab/safety-isnt-always-top-mind-parents-when-choosing-summer-camps)). So safety information must be *easy to find* rather than *the pitch*. Huntsville publishes its supervision ratio (≤16:1, with separate day and night leaders: [Rocket Center](https://www.rocketcenter.com/docs/SpaceCampQA.pdf)). We don't know ours, so the FAQ says "to be confirmed" and routes to WhatsApp instead of inventing a number.

In India, the comparison set is ISRO's YUVIKA: free, Class 9 only, selection-based ([space-india](https://space-india.com/isro-yuvika-2026/)). Our honest differentiators are Grades 7–12, open registration, residential, and hands-on Learn→Build→Launch every day ([competitors notes](research/notes/competitors.md)).

## 3. What our own history gives us

The brief's stats (50+ camps, 2,000+ students, 20+ scholarships) match the 2025 site. SSERD's brochure corroborates "launched in 2017" and "2000+ students across 5 states" ([sserd.pdf](https://sserd.org/sserd.pdf)). No newer figures were found, so the brief's numbers stand. ISRO lists SSERD as a Space Tutor ([ISRO](https://www.isro.gov.in/spacetutor.html)). I found no ISRO page naming Genex Space; that claim is brief-given.

Previous editions varied in length (7 days), grades (6–12) and fee (₹20k in 2022 → ₹32–37k in 2025 → ₹48–50k in 2026). **The fee history is not published**: the brief says 2027 fees are TBD.

Two conflicts are logged in NOTES.md:
- **Campus size:** 200 acres (brief and camp copy) vs ~172 acres (Wikipedia).
- **2026 venue and dates:** one listing gives Bengaluru, 8–16 May; the camp site gives Kuppam, 22–28 June.

No residential-camp testimonials exist in any reachable source, so **the site ships no quotes** until the organisers supply them ([history notes](research/notes/history.md)).

## 4. The real sky, verified

HYG v3.7 (CC BY-SA) supplies 8,900+ naked-eye stars with magnitude and B–V colour. d3-celestial (BSD-3) supplies constellation stick figures and Milky Way contours. The maths (Meeus GMST → LST → IAU 1976 precession → horizontal frame) reduces to **one rotation matrix per frame**. It matches astronomy-engine to **≤24.5″** across 18 test cases ([sky notes](research/notes/sky.md)).

The computation also produced content the brief didn't anticipate:
- **Night one, Batch 1 (27 Apr, 21:00 IST)** is moonless. Jupiter (mag −2.2) and Mars are high in the west, and the Southern Cross clears the southern horizon by 12°.
- **Night one, Batch 2 (20 Jun)** has a **98 % full Moon**. The faithful render brightens the sky, and the copy says so.
- Across the week, Batch 1's evenings stay moonless. In Batch 2 the dark window after dusk grows to ~3 h by night six. These per-night numbers appear in the itinerary, computed from the config dates at build time.

## 5. Decisions (with the case against each)

**Vanilla TypeScript, not React.**
- *Best case for React:* component reuse for batch cards and the FAQ, and R3F's ecosystem.
- *Why it loses here:* one page, no client state beyond a batch toggle, and React would cost ~45 KB gzipped of the 300 KB budget for no user-facing gain. The skill guidance agrees: "never introduce React just for the 3D."

**`three/webgpu` + TSL with automatic WebGL 2 fallback, not a WebGL-only renderer.**
- *Best case for WebGL-only:* `WebGPURenderer` is heavier (the `three.webgpu.js` build is 1.3 MB unminified), and WebGL 1-pixel points are simpler.
- *Why it loses:* the brief mandates it; TSL gives one shader source for both backends; and the bundle is code-split behind first paint, outside the 300 KB pre-3D budget.
- *Mitigation:* the sky module loads only after the hero is painted, and low-tier devices never download it (poster only).

**Build-time ephemeris, not runtime.** astronomy-engine (~45 KB gzipped) runs in a Vite plugin that reads `camp.config.ts`. Moon and planet positions are therefore baked per build from whatever dates the config holds. Editing a date and rebuilding updates the sky. Browsers get only the numbers.

---

# Scope update, 5 Nov 2026 (from the client)

The camp teaches **rockets, satellites and aircraft as well as astronomy**; aircraft was not in the original brief. The first build leaned on the sky and read as a stargazing camp. Changes:
- The hero subline names all four subjects.
- A new "Subjects" section orders them by altitude, which fits the ascent metaphor.
- Nav, title, meta description, JSON-LD and the share image name the four subjects.

The signature stays the real sky: it is the shared stage that aircraft, rockets and satellites all fly through. Aircraft copy covers the principles of flight only. Specific aviation activities are not yet known (see NOTES.md).

# Design brief (one page)

**Concept: "Your child's sky."** The site is a mission briefing. The scroll is a launch sequence from the ground at Kuppam to orbit and back. The single signature moment is the hero: the **actual sky above the Agastya campus at 21:00 IST on night one** of the selected batch, with real stars from HYG, constellations drawing themselves in, the Milky Way where it will be, and the Moon and planets where astronomy-engine puts them. A batch toggle (April ↔ June) sweeps the sky through the ~53° of sidereal rotation between the two dates. Line: *"This is the sky your child will see on night one."* Everything else stays quiet (§1: one world, executed perfectly).

**Audience order:**
1. Parents deciding: they need dates, grades and venue in 5 s, and the Register button at every scroll position.
2. Students getting excited.
3. Juries: craft, continuity, and real data they can check.

**Palette (CSS tokens).**
- Deep-space base `#05070d` / surface `#0b1222` / raised `#121a2e`.
- Ink `#eef2fb`, muted `#a3aec6` (AA on base).
- One warm **ignition** accent, saffron `#ff8a1f`, used only for CTAs, the countdown and re-entry heat.
- One cool **telemetry** accent `#7cc4ff` for focus rings, toggles and data readouts.
- No gradients on UI chrome. The only glow is the ignition and the re-entry (Lando lesson, §1).

**Type.**
- **Anek Latin** (Ek Type, Indian foundry; variable `wdth` 75–125, `wght` 100–800) for display. Wide for headlines, condensed uppercase for HUD labels; its width axis is the kinetic-type lever.
- **Inter** for text.
- Both are verified to contain ₹ (U+20B9) in the font file. Instrument Sans was rejected because it lacks the glyph despite its CSS claim.
- Self-hosted, subset, preloaded, with `size-adjust` fallbacks.

**Photography.** Real camp photos only. None were retrievable, so every image slot is a designed, captioned placeholder ("Build stage: rocket assembly (camp photo to be added)") driven from config, and swapping in real files is one line each. No stock images, no AI people.

**Conversion.**
- Sticky "Register" pill (saffron) is always visible.
- The hero shows dates with a **Tentative** badge, Grades 7–12, and the Kuppam venue above the fold on a 360 px screen.
- Fees render as "Announcing soon" until config holds numbers.
- WhatsApp is the secondary action everywhere.

**Motion system.**
- House ease `CustomEase('mission', '0.9, 0, 0.1, 1')` for transitions.
- `expo.out` for entrances (0.8–1.4 s), `power2.in` for exits, `scrub: 1` for scroll.
- One timeline per moment.
- Reduced motion gets a designed still: a poster of the same sky, instant content, no pinning.

**Performance and access.**
- Hero text is DOM.
- Three.js is code-split after first paint, with DPR ≤ 1.5 on mobile, star count tiered by device, and no post-processing on mobile.
- Poster fallback for no-WebGL and JS-off.
- WCAG 2.2 AA: designed focus states, skip link, accessible accordion, and keyboard paths through the pinned and horizontal sections.
