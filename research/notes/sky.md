# Subtopic 4 — The real sky over Kuppam

**Method.** 2 searches, plus downloads from raw.githubusercontent.com (allowed by the network policy) and **computation**: `scripts/verify-sky-math.ts` checks our maths against astronomy-engine, an independent library.

## Q1. Which public bright-star catalogue?

**Takeaway:** HYG v3.7 is the star source and d3-celestial supplies constellation lines and the Milky Way outline. All of it is downloadable and licensed for reuse with attribution.

**Cited findings**
- **HYG** (Hipparcos + Yale BSC + Gliese) is maintained by astronexus. Current development moved to Codeberg ([GitHub README](https://raw.githubusercontent.com/astronexus/HYG-Database/main/README.md), [Codeberg](https://codeberg.org/astronexus/hyg)). Codeberg was not reachable here, so we use **v3.7** from the GitHub archive. That file has 119,626 rows with columns `ra` (hours, J2000), `dec`, `mag`, `ci` (B–V colour index), `proper`, `con` (verified by reading the CSV header).
- **Licence:** CC BY-SA. Sources conflict on the exact version: v4.0+ is CC BY-SA 4.0 and earlier versions are CC BY-SA 2.5 per astronexus, while the AT-HYG page says 4.0 applies from v3.0 ([astronexus HYG](https://astronexus.com/hyg), [AT-HYG](https://www.astronexus.com/projects/at-hyg)). Both require attribution and share-alike for the derived star file. Credited in the footer and README.
- **Yale BSC5** as JSON (9,110 stars) was also retrieved as a cross-check ([brettonw/YaleBrightStarCatalog](https://raw.githubusercontent.com/brettonw/YaleBrightStarCatalog/master/README.md)).
- **Constellation stick figures and Milky Way contours:** d3-celestial by Olaf Frohn, BSD-3-Clause. `constellations.lines.json` holds J2000 RA/Dec polylines and `mw.json` holds Milky Way brightness contours `ol1…ol5` as GeoJSON MultiPolygons (formats verified by reading the files).

## Q2. What maths renders the sky for a given date and time?

**Takeaway:** Five matrix steps, one rotation per frame on the GPU. The implementation matches astronomy-engine to within **24.5″ worst case** across 18 star/time combinations, against a 180″ tolerance.

1. JD = ms / 86,400,000 + 2,440,587.5.
2. GMST (degrees) = 280.46061837 + 360.98564736629·d + 0.000387933·T² − T³/38,710,000, with d = JD − 2451545 and T = d/36525 (Meeus eq. 12.4). The USNO gives the equivalent hours form and notes that the T² term can be dropped and that UT1 matters only for sub-second work ([USNO GAST FAQ](https://aa.usno.navy.mil/faq/GAST)).
3. LST = GMST + east longitude (78.34°) ([USNO](https://aa.usno.navy.mil/faq/GAST)).
4. IAU 1976 precession J2000 → date: P = R3(−z)·R2(θ)·R3(−ζ). This is about 0.38° over 27 years, so it is worth including.
5. Horizontal frame: sin a = sin φ sin δ + cos φ cos δ cos H; east = −cos δ sin H; north = cos φ sin δ − sin φ cos δ cos H, with φ = 12.75°.

Because steps 2–5 are pure rotations, the whole sky is **one 3×3 matrix** applied to a static J2000 star buffer. Sidereal drift costs one matrix update per frame.

**Deliberately omitted:** nutation (≤17″), aberration (≤20″) and refraction (≤0.5°, only near the horizon, where the terrain silhouette covers it). The measured 24.5″ residual matches the first two.

## Q3. What will the sky actually look like on night one? (computed with astronomy-engine)

| | Batch 1 — 27 Apr 2027, 21:00 IST | Batch 2 — 20 Jun 2027, 21:00 IST |
|---|---|---|
| Moon | Below horizon; rises 00:08, 61 % lit | **Up, 98 % lit**, 12° ESE (rose 19:58) |
| Planets | Mars 72° (mag 0.2), **Jupiter 64° (mag −2.2)**, both WNW | Mars 39°, Jupiter 19°, both W |
| Notables | Southern Cross 12° S; Antares just rising ESE | Antares 42° SE; Arcturus near zenith |
| Rest of week | Moonless evenings every night; new Moon at the end | Dark window after dusk grows from 0 h to ~3 h by night six |

**Inference (mine):** The June batch's night one is moonlit, so a faithful render must brighten the sky and dim the Milky Way. The copy should turn that into a feature (the Moon through a telescope on night one, dark skies later in the week) rather than hide it. Astronomical darkness starts about 19:44 (April) and 20:03 (June).

## Gaps
- No light-pollution (Bortle) measurement for the Agastya campus found, so the render assumes a rural sky with a limiting magnitude of about 6.5.
- The campus horizon profile is unknown, so the terrain silhouette is stylised and labelled as such.
