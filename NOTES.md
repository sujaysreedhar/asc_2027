# NOTES: assumptions, unverified facts, open items

Read this before launch. Items are ordered by how much they matter to a parent reading the site.

## 1. Must resolve before launch

| # | Item | Status | Where to fix |
|---|------|--------|--------------|
| 1 | **Fees** | Not decided. Every price shows **TBD** and "Fees announcing soon". No number is published anywhere, including the schema.org data. | `fees` in `src/content/camp.config.ts` |
| 2 | **Dates** | Set from the client's batch sheet on 6 Nov 2026: Batch 1 **23 Apr – 1 May 2027**, Batch 2 **25 Jun – 3 Jul 2027** (both Fri → Sat, 9 days / 8 nights). Still flagged tentative: a "Tentative" badge appears everywhere dates do, and the JSON-LD name/description say so. Flip `tentative` to `false` once the organisers sign off. | `batches[].start/end`, `batches[].tentative` |
| 3 | **WhatsApp +91 81476 19141** | Taken from the brief and **not verified**. Every Register button opens WhatsApp with a pre-filled message until a registration URL exists. | `contact.whatsapp`, `links.register` |
| 4 | **Organiser logos** (Genex Space, SSERD) | **Missing.** The network policy blocked the organisers' sites, so the footer shows text wordmarks. The **ASC logo is in place** (supplied 5 Nov 2026, `public/brand/asc-logo.svg`): header, countdown, footer and share image. Only Illustrator export clutter was removed (DOCTYPE, an empty layer, a stray 12-unit "™" text element); every shape and colour is unchanged. The favicon is the logo's own crescent and stars on the site's dark background. | Drop files in `public/brand/` and set `organizers[].logo` in the config |
| 5 | **Camp photos** | **Missing**, for the same reason. 11 labelled "Photo slot" frames say "camp photo to be added". No stock or AI images were used. | `public/photos/` and `photos` in the config |
| 6 | **Testimonials** | None found in any reachable source; the only one surfaced belonged to an unrelated London camp. The Crew section shows an invitation to share a story instead of quotes. | `testimonials` in the config |
| 7 | **FAQ answers marked "To be confirmed"** | Supervision ratio, phone policy, medical support, refunds and the packing list are not in the brief, so they say "to be confirmed" and route to WhatsApp. **No ratio or policy was invented.** | `faq[].confirmed` |
| 8 | **Register / Pay links, newsletter endpoint** | Placeholders (`null`). The newsletter form is shown disabled with an explanation. | `links` in the config |
| 9 | ~~**Day themes**~~ | **Resolved 6 Nov 2026.** All nine days now carry a real theme plus the Advanced/Basic split, from the client's batch sheet. | `itinerary`, `tracks` |
| 10 | ~~**Aircraft activities**~~ | **Resolved 6 Nov 2026.** The batch sheet names them: RC plane (Advanced) and chuck glider (Basic), both on day 5. Chips are now shown on the Aircraft card. | `disciplines[0].activities` |
| 11 | ~~**Highlights labelled "from previous editions"**~~ | **Resolved 6 Nov 2026.** The highlights are now this edition's actual nine-day programme, so the list is labelled simply "Camp highlights" and the previous-editions claim is gone. | `highlights`, `missionLog` in `src/content/render.ts` |

## 2. Conflicts between the brief and research

- **Campus size.** The brief and the camp's own previous copy say **200 acres**; Wikipedia says **~172 acres** ([Wikipedia](https://en.wikipedia.org/wiki/Agastya_International_Foundation)). The site uses 200 (brief = source of truth). The value is `venue.campusArea` if you want to change it.
- **2026 edition details** (history only, not used on the site). One listing says Bengaluru, 8–16 May 2026, 9 days; the camp site says Kuppam, 22–28 June 2026. Recorded in `research/notes/history.md`.
- **Genex Space as "ISRO educational content partner".** This is brief-given. I found no ISRO page naming Genex. SSERD *is* on ISRO's Space Tutor list ([ISRO](https://www.isro.gov.in/spacetutor.html)).
- **"India's longest-running residential space camp".** This claim comes from the brief. SSERD's brochure says "India's first Astro Space Camp" (2017); no source confirms "longest-running".

None of these stopped the build. The brief's facts were used and the conflicts are flagged here.

## 3. Found in research but deliberately not published
- An email address, `astrospacecamp@sserd.org`, appears in one search extract. It is not in the brief, so it was left out; `contact.email` is ready if you want it.
- Past fees: ₹20,000 in 2022, ₹30–37k in 2025, ₹48–50k in 2026. Not shown, because 2027 fees are TBD.
- Social links: only the Facebook page (`facebook.com/astrospacecamp.sserd`) was confirmed by search, so only that is listed.

## 3b. Batch 1 kit costing: INTERNAL, do not publish

From the client's batch sheet (6 Nov 2026). These are **cost of delivery per student**, not the camp fee.
They are recorded here only; **nothing in `src/` reads them and no figure reaches the page or the
schema.org data**. Publishing them would expose the margin between cost and fee (past fees were
₹48–50k in 2026, see §3).

The sheet is dated 8–16 May 2026 (last edition's run). The **activities carried over unchanged**;
only the dates were moved to the 2027 batches the client confirmed.

| Day | Advanced | Per kit | Per student | Basic | Per kit | Per student |
|-----|----------|--------:|------------:|-------|--------:|------------:|
| 1 | Experience centre / field trip | ₹0 | ₹0 | Experience centre / field trip | ₹0 | ₹0 |
| 2 | Astrophotography | ₹600 | ₹600 | Sky gazing / astronomical instruments | ₹500 | ₹500 |
| 3 | Rest | n/a | n/a | Rest | n/a | n/a |
| 4 | Astronaut | ₹2,125.00 | ₹2,125.00 | Astronaut | ₹2,125.00 | ₹2,125.00 |
| 5 | RC plane | ₹5,727 | ₹1,431.75 | Chuck glider | ₹800 | ₹800 |
| 6 | Meteorite hunting | ₹434.00 | ₹434.00 | Meteorite hunting | ₹434.00 | ₹434.00 |
| 7 | Recovery rockets | ₹1,000.00 | ₹1,000.00 | C-class rockets | ₹600 | ₹600 |
| 8 | Ground station | ₹1,500 | ₹1,500 | CubeSat | ₹2,565.36 | ₹1,282.68 |
| 9 | Closing day | n/a | n/a | Closing day | n/a | n/a |
| **Total per student** | | | **₹4,965.75** | | | **₹3,616.68** |

Two figures in the sheet imply kit sharing rather than one kit per student: the RC plane
(₹5,727 ÷ 4 = ₹1,431.75) and the CubeSat (₹2,565.36 ÷ 2 = ₹1,282.68). Worth confirming the
intended group sizes before these numbers are used for pricing.

## 4. Assumptions I made
- **Altitude labels in Subjects** are general reference figures, not from the research notes: airliner cruise ≈ 11 km (~35,000–40,000 ft); the Kármán line at 100 km (the FAI's boundary of space); low Earth orbit ≈ 400 km (the ISS's altitude); orbital speed in LEO ≈ 7.7 km/s, shown as "7–8 km every second". Edit them in `disciplines` if the team prefers other figures.
- **"Night one" means 21:00 IST** on each batch's first date (`sky.nightOneTime`): 23 Apr 2027 and 25 Jun 2027. Astronomical darkness begins about 19:44 in late April and about 20:03 in late June (computed).
- **The terrain silhouette is stylised.** The real campus horizon profile is unknown; the hills are procedural and labelled as such in code.
- **Featured sky direction:** Batch 1 looks at 172° (Southern Cross and Centaurus); Batch 2 at 130° (the rising full Moon and Scorpius). Change with `batches[].skyViewAzimuth`.
- **Moon drawn at 2× true size** so it reads on a phone; positions are true.
- **Bengaluru light dome** drawn faintly toward 287° (WNW), the computed bearing from Kuppam.
- **Schema.org has no "tentative" event status.** The JSON-LD uses `EventScheduled` and puts "(tentative dates)" in the name plus "Tentative dates, to be confirmed" in the description. Change it when dates are final.
- **`typicalAgeRange` 12–18** is inferred from Grades 7–12.
- **JSON-LD start/end times** use 09:00 on the first day and 17:00 on the last day (IST) because schema.org needs a time. The real arrival and departure times are unknown (`renderHead` in `src/content/render.ts`).
- **"About 2 hours by road from Bengaluru"** (Wikipedia) was *not* put on the site, because no number was in the brief. The map is labelled "schematic, not to scale".

## 5. What was tested, and how

| Check | Result | How |
|---|---|---|
| Sky maths | **≤ 24.5″** worst error vs astronomy-engine across 18 star/time cases | `npm run sky:verify` (fails the run if any error exceeds 3′) |
| Moon/planet positions, moonrise, darkness | Computed by astronomy-engine at build time from the config dates | `src/content/ephemeris.ts` |
| `npm run build` | Clean: typecheck + Vite, no warnings | |
| `npm run dev` | Starts clean | |
| Lighthouse desktop | **Perf 76–100, A11y 100, Best Practices 100, SEO 100**; LCP 0.2 s, CLS 0 | Lighthouse 13.6 against `vite preview` |
| Lighthouse mobile, live sky | **Perf 72–78, A11y 100, BP 100, SEO 100**; LCP 0.8–1.1 s, CLS 0.003, TBT 1.0–2.1 s | Same |
| Lighthouse mobile, no live sky (`?nosky`) or reduced motion | **Perf 97–100**, A11y/BP/SEO **100**, TBT 0–110 ms | Same |
| JS before 3D | **≈ 80 KB gzip** (budget 300 KB). The 3D chunk is 230 KB gzip; sky data 113 KB; total 3D < 2 MB | Build output |
| Widths 360 / 390 / 768 / 1440 | Dates, grades, venue, Register and WhatsApp are all above the fold at 360×740 | Playwright screenshots (`docs/screenshots/`) |
| Reduced motion | Designed static version: poster sky, no preloader, no Lenis/pins/scrub, poster crossfade on batch switch | Playwright `reducedMotion: 'reduce'` |
| JS disabled | Full content readable; batch switching still works (radio inputs + CSS `:has()`); FAQ works (`<details>`) | Playwright `javaScriptEnabled: false` |
| WebGL unavailable / failure | Poster of the same sky stays; a console error explains why | `?nosky`, and the code path on init failure |
| Slow GPU | Frame governor drops to 1× pixel ratio, then hands back to the poster | Observed live in this container |
| Keyboard | Logical tab order; visible focus; arrow keys switch batch; FAQ Escape returns focus; mobile menu traps focus and Escape closes | Scripted Playwright checks |

### Why Lighthouse mobile is below 90 with the live sky (read this)
This container has **no GPU**. Chromium renders WebGL through SwiftShader, a software rasteriser, so WebGL context creation, shader linking and every frame run on the CPU. That shows up as main-thread blocking. Evidence that the cost is the software GPU, not the page:
- Our JavaScript per frame measured **0.3–6 ms** under 4× throttle; the ~140 ms frame tasks are native GL work.
- The same page with `?nosky` scores **100** (TBT 20 ms).

Part of the cost is **real** on low-end phones, though: evaluating the three.js WebGPU build (~840 KB minified) under a 4× CPU slowdown. Mitigations already in place:
- The sky loads behind the countdown, while no one is interacting.
- Shaders compile one object at a time with yields between them.
- The governor hands slow devices back to the poster.
- Low-memory, Save-Data and 2G devices never download three.js at all.

**Decision lever:** set `sky.liveOnMobile: false` and phones get the poster of the same computed sky, which scored 97–100. The default follows the brief (live sky on mid-range Android). **Please run Lighthouse on a machine with a real GPU** and on a real ₹15k Android before deciding.

### Not tested (could not be, here)
- **The WebGPU backend.** Headless Chromium here has no WebGPU adapter, so everything ran on three.js's automatic **WebGL 2 fallback**. That covers the brief's "test once with `forceWebGL: true`" (also available as `?webgl`). The WebGPU path is untested.
- Real Android devices, real 4G, Safari and Firefox. `:has()` and `::details-content` degrade gracefully, but this is unverified on those engines.
- Frame rate at 60 fps on a mid-range phone, and the 6× throttle scroll test with a real GPU.

## 6. Brief items not built, or built differently
- **Crew photo wall: WebGL hover distortion is not built.** There are no real photos to distort, and building it against placeholders would be untestable decoration. Slots get a CSS hover instead. It's worth adding once real photos land; the DOM-synced plane technique is in the motion notes.
- **No post-processing pass.** Star glow and film grain are done inside the materials (the brief allowed "at most subtle bloom + grain"). This is cheaper on mobile and avoids a full-screen pass.
- **No sound.** Optional per the brief; nothing to make opt-in.
- **Date readout "scramble" on batch switch** was replaced with a plain switch, to keep one signature moment.

## 7. Data credits and licences
- Stars: HYG database v3.7, CC BY-SA ([astronexus](https://astronexus.com/hyg)). The derived `public/sky/stars.bin` is under the same licence.
- Constellation lines and Milky Way contours: d3-celestial, BSD-3-Clause, Olaf Frohn.
- Ephemeris: Astronomy Engine, MIT (build time only).
- Fonts: Anek Latin (Ek Type) and Inter, SIL OFL 1.1. Licences are in `public/fonts/`.
Credits are shown in the site footer.
