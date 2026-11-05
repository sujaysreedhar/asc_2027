# Motion script — "Your child's sky"

One continuous flight: **ground → orbit → ground**. The camera only ever moves forward, and the scroll never reverses the story (the OceanX lesson). One signature moment, the real sky, lives in the hero. Every later section is quiet and reuses the same vocabulary.

## Vocabulary (used everywhere, nothing else)

| Token | Value | Used for |
|---|---|---|
| `mission` | `CustomEase '0.9, 0, 0.1, 1'` | Section/state transitions, preloader wipe, batch toggle sweep |
| enter | `expo.out` 1.1 s (lines 1.2 s, meta 0.9 s) | Every reveal |
| exit | `power2.in` 0.5 s | Preloader content leaving, menu closing |
| micro | `power3.out` 0.25 s in / `power2.out` 0.35 s out | Hovers, toggles, accordion |
| scrub | `ease: 'none'`, `scrub: 1` | Ascent tilt, LBL stages, mission log track |
| stagger | 0.06 (meta), 0.09 (lines), 0.12 (cards), `{ from: 'center' }` (photo grid) | |

Animate only `transform`, `opacity`, `clip-path` (plus WebGL uniforms). Initial states live in CSS under `.js-ready`. JS-off never hides anything.

## 0 · Preloader — "T-10" (first visit only)
- **0.0 s** — The page paints with the hero underneath (DOM text, so LCP is the real headline). Over it sits the preloader: black, with a HUD line `ASTRO SPACE CAMP 2027 · GRADES 7–12 · KUPPAM` and a huge countdown `T-10`. The key facts are readable before anything loads.
- **Progress:** one `THREE.LoadingManager` tracks fonts, the star catalogue, the Milky Way texture, the ephemeris and the three.js chunk. Displayed `T-n = 10 − round(progress × 10)`, tweened (`power2.out` 0.6 s) so it never jumps. A thin saffron line under the number scales X with progress.
- **Hold rules:** minimum 1.2 s on screen. If assets aren't ready after 4 s, the countdown completes anyway, the hero shows the poster sky, and the live sky crossfades in when ready. Parents on slow 4G are never held hostage.
- **Ignition (T-0):** the number exits up (`yPercent -100`, `power2.in` 0.45 s). A saffron radial bloom grows from the bottom centre: a single pulse of opacity 0 → 0.9 → 0 over 0.9 s, so nothing flashes. The preloader then wipes away `clip-path: inset(0 0 100% 0)` (`mission`, 1.0 s). **The seam:** the bloom doesn't vanish. It settles into the warm horizon glow behind the campus silhouette, so the ignition *becomes* the hero's horizon.
- Hero timeline starts at `-=0.35` into the wipe. `lenis.start()` runs when it completes.
- **Repeat visit** (sessionStorage): no countdown; a 0.4 s fade from black.
- **Reduced motion:** no countdown and no bloom; the poster is visible immediately.

## 1 · Hero — the real sky (signature)
- **Scene:** camera at the campus, 1.6 m above ground, looking toward the batch's chosen azimuth about 20° above the horizon, field of view 60° on desktop and 75° in portrait. Stars are instanced sprites sized by magnitude and coloured by B–V. Milky Way texture; Moon (with lit fraction) and planets with tiny labels. Dark terrain ring and horizon glow.
- **Entrance (after preloader):**
  - `uReveal` 0 → 1 (stars fade in brightest-first: a star appears when `uReveal > (mag + 1.5) / 8`). 2.4 s `expo.out`.
  - Constellation lines draw themselves (`uDraw` 0 → 1.4, 2.8 s, `power2.inOut`), starting at the centre of view and spreading outward.
  - Headline lines rise from masks (SplitText, `yPercent 110 → 0`, 1.2 s, stagger 0.09) at `<0.2`.
  - Meta (dates, grades, venue, CTA) at `-=0.9`, stagger 0.06.
  - HUD readout (`27 APR 2027 · 21:00 IST · 12.75° N 78.34° E`) fades in last (0.8 s).
  - The headline's split is reverted when the intro completes, so it re-wraps naturally on rotation or resize.
- **Idle:** sidereal drift at 120× real time (one sky-minute every 0.5 s), clock readout ticking. Pointer parallax ±1.5° (desktop only, `quickTo` 0.8 s).
- **Batch toggle (April ↔ June):** Moon, planets and lines fade out (0.45 s `power2.in`). The sky sweeps through the shortest sidereal difference between the two nights while the camera pans to the new featured azimuth (`mission`, 1.6 s). Bodies fade back in and the constellations redraw (1.8 s). The date readout switches to the new night. Built without a scramble effect, which would have been a second signature.
- **Composition:** on wide screens the featured azimuth sits at about 68 % of the width so the headline never covers it. Portrait screens centre it.
- **Copy:** h1 "This is the sky your child will see on night one." Subline (scope update): "They'll build rockets, design satellites, learn how aircraft fly — and learn to read this sky." This makes the camp read as aerospace within five seconds, not stargazing. Then Grades 7–12, 9 days / 8 nights residential, Kuppam. Dates with "Tentative" badges. Primary CTA "Register interest" plus WhatsApp.
- **Labels never sit on the copy:** sky labels skip the hero text block, whose rectangle is re-read only on scroll/resize. The posters use the same rule.

## 2 · Ascent
- The hero scrolls away while the camera **tilts up** from 20° to 85° (to the zenith), scrubbed by the hero's exit. The terrain drops out of frame and stars stream downward.
- Stats tick past as altitude readouts: `ALT 11 YRS`, `2,000+ STUDENTS`, `50+ CAMPS`, `20+ SCHOLARSHIPS`. Numbers count up once on enter (1.4 s, `power3.out`), set in condensed Anek with a telemetry-blue tick ruler.
- Text sits on a scrim so contrast holds mid-tilt.

## 2b · Subjects — "From the runway to the stars" (scope update)
- Four cards in **altitude order**: Aircraft (≈ 11 km, where airliners cruise) → Rockets (100 km, the Kármán line) → Satellites (≈ 400 km, low Earth orbit) → Astronomy (light-years). On wide screens they form a rising staircase, like an altitude chart.
- The ascent continues through this section: the live sky keeps tilting toward the zenith behind it, and the section's scrim keeps text AA.
- Entrance: cards rise (stagger 0.1, `expo.out`), then each line icon **draws itself** with DrawSVG (1.4 s, `power2.inOut`). The constellation lines' motif returns in a quieter register.
- Activities show as chips, only ones the camp really runs (from the config). Cross-cutting items (astronaut-style training, experiments, guest speakers) sit on one line underneath.

## 3 · LBL — staging (the one pinned chapter, ≤ 2.5 viewport heights)
- Pinned. Three stacked "stages" (Learn, Build, Launch) start joined like a rocket stack. As you scroll, each stage separates (`yPercent` and a small rotation) and its panel expands: photo slot clip-reveals (`inset(100% 0 0 0) → inset(0)`) and copy rises.
- The progress rail at left fills with telemetry blue.
- Keyboard: each stage heading is in normal tab order and the pin never traps focus. Reduced motion: three stacked cards, no pin.

## 4 · Mission log (itinerary)
- Horizontal track, nine "orbit" cards (Day 1 … Day 9) along a thin orbital arc (DrawSVG draws as you scroll). Scroll-mapped `x` on desktop; on mobile, native horizontal scroll-snap (no pin, thumb-friendly).
- Each card shows the day number, theme ("To be announced" until the schedule is final) and a **computed** line: *Moonrise 00:50 · dark sky until then*.
- The track is a focusable region with arrow-key scrolling. Reduced motion: a plain vertical list.

## 5 · Ground station (venue, travel, safety) — calm
- **No scroll effects beyond a single fade-up.** This is where parents decide.
- Two-column facts grid: Venue (Agastya campus, Kuppam, AP), Getting there (BLR airport, Kuppam KPN rail, Bengaluru pickup on request), Stay (boarding, vegetarian meals), Safety (24/7 security, supervision details "to be confirmed"). A schematic SVG route map (Bengaluru → campus, Kuppam station), labelled "not to scale". No distances are given, because none were verified.

## 6 · Crew
- Photo wall from previous camps (masonry, all placeholders until real photos arrive), revealed with `clip-path` from centre (stagger `{ from: 'center' }`). **Not built:** the WebGL hover distortion. With no real photos yet there is nothing to distort; placeholder slots get a CSS `scale(1.03)` hover. See NOTES.md.
- Testimonials: render only when config has entries. Until then an invitation: "Were you at a previous camp? Share your story on WhatsApp."

## 7 · Mission patch — batches & fees
- Two batch cards like mission patches: Batch 1 / Batch 2, tentative badge, dates, grades, price block (early bird / regular, "Announcing soon" until set), inclusions list, Register CTA.
- Cards rise (stagger 0.12). The selected hero batch is highlighted with a Flip-animated outline (continuity with the hero toggle).

## 8 · FAQ
- Native `<details>`/`<summary>` (works with JS off). The open/close height animates in CSS with `::details-content` + `interpolate-size` (0.4 s), with no JS. Browsers without support snap open, which is fine. Escape closes and returns focus to the question.

## 9 · Re-entry footer
- As the footer enters, a heat-shield glow (saffron → deep red radial gradient on a pseudo-element, opacity and `scaleY` only) rises from the bottom edge, the same warm light as the ignition. The flight ends where it began.
- Organiser logos (slots), WhatsApp, socials, newsletter field (submits to a configurable endpoint; disabled with a clear message while unset), credits for HYG and d3-celestial, a big "See you under the Kuppam sky" sign-off, and a live IST clock.

## Performance governor (added during build)
- If the median frame time exceeds ~34 ms, the sky drops to 1× pixel ratio. If it then exceeds ~60 ms, it crossfades back to the poster of the same sky and stops rendering. A phone that can't hold ~16 fps gets a perfect still instead of a janky, battery-draining canvas.

## Persistent UI
- Header: ASC logo (slot) left; Register pill (saffron, magnetic on desktop pointer devices only, max 30 % travel, `elastic.out(1, 0.4)` on leave) right. After the hero, the pill stays; on mobile it becomes a bottom-docked bar with Register + WhatsApp.
- Link underlines draw in from left and exit to the right. `::selection` in saffron.
- Console easter egg: a tiny ASCII rocket and the LST over Kuppam right now.
