# Astro Space Camp 2027 website

The official site for Astro Space Camp 2027 (Genex Space × SSERD). The hero renders **the real night sky above the Agastya campus, Kuppam, at 21:00 IST on night one** of the selected batch. Star positions come from the HYG catalogue, and Moon and planet positions are computed for the actual dates in the config.

- Static site: Vite + TypeScript, three.js (`three/webgpu` + TSL, automatic WebGL 2 fallback), GSAP, Lenis
- Works without JavaScript, with reduced motion, and without WebGL (it shows a still image of the same sky)
- Everything editable lives in **one file**: `src/content/camp.config.ts`

See also: [`research.md`](research.md) (research and design brief), [`motion-script.md`](motion-script.md) (choreography), [`NOTES.md`](NOTES.md) (**read before launch**: placeholders, assumptions, test results).

---

## Quick start

Requires **Node 22** (Vite 8 needs ≥ 20.19).

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:5173.

```bash
npm run build
```

`npm run build` typechecks and builds to `dist/`. Preview the production build with `npm run preview`.

## Editing content (no coding needed)

Open **`src/content/camp.config.ts`**. Every value is commented. Common edits:

| To change… | Edit in `camp.config.ts` | Notes |
|---|---|---|
| Batch dates | `batches[].start`, `batches[].end` (`'YYYY-MM-DD'`) | The hero sky, itinerary dates, moonrise times, batch cards and search-engine data all update. **Re-render posters** (below). |
| "Tentative" badge | `batches[].tentative: false` | Removes the badge everywhere and from the schema.org data |
| Fees | `fees.earlyBird.amount`, `fees.regular.amount` (numbers, e.g. `48000`), `fees.earlyBird.until` | While `null`, the site shows "TBD / Fees announcing soon". Shown as ₹48,000. |
| Register link | `links.register` (or per batch: `batches[].registerUrl`) | While `null`, Register opens WhatsApp with a pre-filled message |
| Pay link | `links.pay` | Adds a "Pay now" button to each batch card |
| WhatsApp | `contact.whatsapp` (digits only, with 91) and `contact.whatsappDisplay` | |
| Stats | `stats` | e.g. `{ value: 2500, suffix: '+', label: 'students', note: '…' }` |
| FAQ | `faq` | Set `confirmed: true` to remove the "To be confirmed" tag |
| Day themes | `itineraryThemes` | Nine entries, `null` shows "Theme to be announced" |
| Hero subline | `heroSubline` | The one line under the headline saying what the camp teaches |
| Subjects (aircraft, rockets, satellites, astronomy) | `disciplines`, `acrossSubjects` | Title, altitude label, one-liner, description, and `activities` chips (only list real activities) |
| Testimonials | `testimonials` | Real quotes only; while empty, an invitation to share stories is shown |
| Newsletter | `links.newsletterEndpoint` | Any endpoint that accepts a POST with an `email` field |
| Logos | `brand.ascLogo`, `organizers[].logo` | Put files in `public/brand/` (see the README there) |
| Photos | `photos.learn/build/launch`, `photos.wall[]` | Put files in `public/photos/`; give each an `alt`, `width` and `height` |
| Live 3D sky on phones | `sky.liveOnMobile` | `false` serves the still image of the same sky to phones (see NOTES.md §5) |

After editing, run `npm run build` (or just save if `npm run dev` is running; the dev server restarts itself).

### When you change dates: re-render the sky posters

The still images of the sky (used for no-WebGL, reduced motion, JS off, slow phones) and the social-share image are rendered from the live sky. After changing dates or `skyViewAzimuth`:

```bash
npm run release
```

`npm run release` builds, renders `public/posters/*` and `public/og.jpg` with headless Chromium, then rebuilds. The first time, install the browser:

```bash
npx playwright install chromium
```

## Deploying

`dist/` is a plain static site. `public/_headers` sets long-lived caching for hashed assets on Cloudflare Pages and Netlify.

- **Cloudflare Pages:** Framework preset *None*. Build command `npm run build`. Output directory `dist`. Environment variable `NODE_VERSION=22`.
- **Netlify:** Build command `npm run build`. Publish directory `dist`. Set `NODE_VERSION=22`.
- **Vercel:** Import the repo. Vite is detected automatically (build `npm run build`, output `dist`). Choose Node 22 in project settings.

Before going live, update `site.url` in the config if the domain isn't `https://www.astrospacecamp.com` (it is used for the canonical URL, Open Graph and the sitemap), and check every item in **NOTES.md §1**.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Typecheck + production build to `dist/` |
| `npm run preview` | Serve `dist/` on :4173 |
| `npm run release` | Build → render posters/OG image → build again |
| `npm run sky:verify` | Checks the sky maths against astronomy-engine; fails if any star is off by > 3′ (currently ≤ 24.5″) |
| `npm run sky:data` | Rebuilds `public/sky/*` from the star catalogues (downloads HYG v3.7 if missing). Only needed if the catalogues change. |
| `npm run fonts` | Re-subsets the fonts (needs `pip install fonttools brotli`) |
| `npm run posters` | Renders posters only (needs a fresh `dist/`) |

## Test switches (append to the URL)

- `?nosky`: skip the live sky (poster only), the no-WebGL experience
- `?webgl`: force three.js's WebGL 2 backend even where WebGPU exists
- `?poster=batch-2`: sky only, used by the poster renderer; add `&og` for the share card

## How it's built

```
src/
  content/camp.config.ts   ← all editable content
  content/render.ts        ← turns the config into static HTML at build time (JS-off readable)
  content/ephemeris.ts     ← Moon/planets/moonrise per batch, computed at build time
  sky/astro.ts             ← sidereal time, precession, horizon transform (verified)
  sky/scene.ts             ← the WebGL sky (TSL shaders), lazy-loaded after first paint
  sky/boot.ts              ← device tiering + fallback to the poster
  motion/*                 ← Lenis + ScrollTrigger choreography, countdown, hero
  ui/basics.ts             ← menu, FAQ, dock, newsletter, clock (works in every mode)
scripts/                   ← sky data, font subsetting, posters, screenshots, maths check
docs/screenshots/          ← delivery screenshots (desktop, mobile, fallbacks)
```

- **The sky is one rotation.** Stars are stored once in J2000 coordinates. Each frame applies a single matrix: precession → local sidereal time → horizon. Sidereal drift runs at 60× (one sky-minute per second), and the HUD clock shows the time you are looking at.
- **Build-time astronomy.** `vite.config.ts` reads the config, computes ephemerides with astronomy-engine and renders all page HTML. Browsers never download astronomy-engine.

## Credits
Stars: HYG database (CC BY-SA, astronexus). Constellation lines and Milky Way: d3-celestial (BSD-3, Olaf Frohn). Ephemeris: Astronomy Engine (MIT). Fonts: Anek Latin (Ek Type) and Inter, SIL OFL.
