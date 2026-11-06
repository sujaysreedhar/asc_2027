/**
 * BUILD-TIME static renderer: turns camp.config.ts (+ computed ephemeris) into the
 * page's HTML, so every word is readable with JavaScript disabled and is the
 * reduced-motion base. Used by the Vite plugin in vite.config.ts.
 */
import type { Camp, Photo } from './camp.config.ts'
import type { BatchEphemeris } from './ephemeris.ts'

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const parts = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) throw new Error(`render: bad date "${iso}". Use YYYY-MM-DD in camp.config.ts`)
  return { y, m, d, wd: WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] }
}
export function formatRange(start: string, end: string): string {
  const a = parts(start), b = parts(end)
  if (a.y !== b.y) return `${a.d} ${MONTHS[a.m - 1]} ${a.y} – ${b.d} ${MONTHS[b.m - 1]} ${b.y}`
  if (a.m !== b.m) return `${a.d} ${MONTHS[a.m - 1]} – ${b.d} ${MONTHS[b.m - 1]} ${b.y}`
  return `${a.d} – ${b.d} ${MONTHS[b.m - 1]} ${b.y}`
}
const longDate = (iso: string) => {
  const p = parts(iso)
  return `${p.d} ${MONTHS_LONG[p.m - 1]} ${p.y}`
}
const shortDate = (iso: string) => {
  const p = parts(iso)
  return `${p.wd} ${p.d} ${MONTHS[p.m - 1]}`
}
const inr = (n: number) => '₹' + n.toLocaleString('en-IN')

export function whatsappHref(camp: Camp, message: string): string {
  return `https://wa.me/${camp.contact.whatsapp}?text=${encodeURIComponent(message)}`
}
export function registerHref(camp: Camp, batchId?: string): { href: string; external: boolean } {
  const batch = camp.batches.find((b) => b.id === batchId)
  const url = batch?.registerUrl ?? camp.links.register
  if (url) return { href: url, external: true }
  const label = batch ? ` (${batch.label}, ${formatRange(batch.start, batch.end)})` : ''
  return { href: whatsappHref(camp, `Hi! I'd like to register interest for ${camp.name}${label}.`), external: true }
}

const tentativeBadge = (on: boolean) =>
  on ? `<span class="badge badge--tentative" title="Dates to be confirmed">Tentative<span class="sr-only">, dates to be confirmed</span></span>` : ''

const ext = (external: boolean) => (external ? ' target="_blank" rel="noopener"' : '')

const icon = {
  whatsapp: `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.8-1.2.2-.6.2-1.1.1-1.2l-.4-.2Z"/></svg>`,
  arrow: `<svg class="icon icon--arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="1.8" d="M5 12h13M13 6l6 6-6 6"/></svg>`,
}

function photo(p: Photo, slot: string, extraClass = '', sizes = '(min-width: 800px) 40vw, 100vw'): string {
  if (p.src) {
    const dims = p.width && p.height ? ` width="${p.width}" height="${p.height}"` : ''
    return `<figure class="photo ${extraClass}"><img src="${esc(p.src)}" alt="${esc(p.alt)}"${dims} loading="lazy" decoding="async" sizes="${sizes}"><figcaption>${esc(p.caption)}</figcaption></figure>`
  }
  // Labelled slot: honest placeholder until real camp photos are supplied (see NOTES.md).
  return `<figure class="photo photo--slot ${extraClass}" data-slot="${esc(slot)}">
    <div class="photo__frame" aria-hidden="true"><span class="photo__cross"></span><span class="photo__tag">Photo slot · ${esc(slot)}</span></div>
    <figcaption>${esc(p.caption)} <span class="photo__pending">(camp photo to be added)</span></figcaption>
  </figure>`
}

function logoImg(camp: Camp, cls: string, alt: string, extra = ''): string {
  const { width, height } = camp.brand.ascLogoSize
  return `<img class="${cls}" src="${esc(camp.brand.ascLogo ?? '')}" alt="${esc(alt)}" width="${width}" height="${height}"${extra}>`
}

function brandMark(camp: Camp): string {
  return camp.brand.ascLogo
    ? `${logoImg(camp, 'brand__logo', camp.shortName)}<span class="brand__year"> ${camp.year}</span>`
    : `<span class="brand__mark" aria-hidden="true"></span><span class="brand__word">Astro Space Camp <span class="brand__year">${camp.year}</span></span>`
}

function orgMarks(camp: Camp): string {
  return camp.organizers
    .map((o) =>
      o.logo
        ? `<a class="org" href="${esc(o.url)}"${ext(true)}><img src="${esc(o.logo)}" alt="${esc(o.name)}" height="40" loading="lazy"><span class="org__role">${esc(o.role)}</span></a>`
        : `<a class="org org--text" href="${esc(o.url)}"${ext(true)}><span class="org__name">${esc(o.name)}</span><span class="org__role">${esc(o.role)}</span></a>`,
    )
    .join('<span class="org__x" aria-hidden="true">×</span>')
}

// ───────────────────────────────── Sections ─────────────────────────────────

function header(camp: Camp): string {
  const reg = registerHref(camp)
  return `<header class="site-header" data-header>
  <a class="brand" href="#top">${brandMark(camp)}<span class="sr-only">, back to top</span></a>
  <nav class="site-nav" id="site-nav" aria-label="Sections">
    <ul>
      <li><a class="link" href="#subjects">Subjects</a></li>
      <li><a class="link" href="#lbl">Method</a></li>
      <li><a class="link" href="#mission-log">Itinerary</a></li>
      <li><a class="link" href="#ground-station">Venue &amp; safety</a></li>
      <li><a class="link" href="#batches">Batches &amp; fees</a></li>
      <li><a class="link" href="#faq">FAQ</a></li>
    </ul>
  </nav>
  <div class="site-header__actions">
    <a class="btn btn--ignite btn--sm" href="${esc(reg.href)}"${ext(reg.external)} data-magnetic data-register>Register<span class="hide-sm"> interest</span></a>
    <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-nav" data-menu-toggle hidden>
      <span class="menu-toggle__bars" aria-hidden="true"></span><span class="menu-toggle__label">Menu</span>
    </button>
  </div>
</header>`
}

function preloader(camp: Camp): string {
  const g = camp.grades
  return `<div class="preloader" data-preloader aria-hidden="true">
  <div class="preloader__inner">
    ${camp.brand.ascLogo ? logoImg(camp, 'preloader__logo', '') : ''}
    <p class="preloader__hud">${camp.brand.ascLogo ? camp.year : esc(camp.name)} · Grades ${g.from}–${g.to} · ${esc(camp.venue.town)}</p>
    <p class="preloader__count"><span class="preloader__t">T</span><span class="preloader__minus">−</span><span class="preloader__num" data-count>10</span></p>
    <div class="preloader__bar"><span data-progress></span></div>
    <p class="preloader__status" data-status>Aligning star catalogue</p>
  </div>
  <div class="preloader__ignition" data-ignition></div>
</div>`
}

function hero(camp: Camp, eph: BatchEphemeris[]): string {
  const g = camp.grades
  const batchToggle = camp.batches
    .map(
      (b, i) => `<input class="batch-toggle__input" type="radio" name="batch" id="pick-${b.id}" value="${b.id}"${i === 0 ? ' checked' : ''}>
      <label class="batch-toggle__option" for="pick-${b.id}">
        <span class="batch-toggle__name">${esc(b.label)}</span>
        <span class="batch-toggle__dates">${formatRange(b.start, b.end)}</span>
        ${tentativeBadge(b.tentative)}
      </label>`,
    )
    .join('\n')
  const reg = registerHref(camp)
  const readouts = camp.batches
    .map((b) => {
      const p = parts(b.start)
      return `<span data-batch="${b.id}">${p.d} ${MONTHS[p.m - 1].toUpperCase()} ${p.y} · ${camp.sky.nightOneTime} ${camp.sky.timezoneLabel}</span>`
    })
    .join('')
  const summaries = eph.map((e) => `<span data-batch="${e.id}">${esc(e.summary)}</span>`).join('')
  return `<section class="hero" id="top" aria-labelledby="hero-title">
  <div class="hero__sky" data-sky aria-hidden="true">
    ${camp.batches
      .map(
        (b, i) => `<picture class="hero__poster" data-poster="${b.id}">
      <source media="(max-aspect-ratio: 4/5)" type="image/avif" srcset="/posters/sky-${b.id}-portrait.avif">
      <source media="(max-aspect-ratio: 4/5)" type="image/jpeg" srcset="/posters/sky-${b.id}-portrait.jpg">
      <source type="image/avif" srcset="/posters/sky-${b.id}-800.avif 800w, /posters/sky-${b.id}-1600.avif 1600w" sizes="100vw">
      <img src="/posters/sky-${b.id}-1600.jpg" srcset="/posters/sky-${b.id}-800.jpg 800w, /posters/sky-${b.id}-1600.jpg 1600w" sizes="100vw" alt="" width="1600" height="1000"${i === 0 ? ' fetchpriority="high"' : ''} decoding="async">
    </picture>`,
      )
      .join('\n')}
    <div class="hero__labels" data-sky-labels></div>
  </div>
  <div class="hero__scrim" aria-hidden="true"></div>
  <div class="hero__content">
    <p class="eyebrow" data-hero-meta>${esc(camp.name)} <span class="eyebrow__sep">·</span> ${camp.edition}th year</p>
    <h1 class="hero__title" id="hero-title" data-hero-title>This is the sky your child will see on night&nbsp;one.</h1>
    <p class="hero__sub" data-hero-meta>${esc(camp.heroSubline)}</p>
    <ul class="hero__facts" data-hero-meta>
      <li><strong>Grades ${g.from}–${g.to}</strong></li>
      <li>${camp.format.days} days · ${camp.format.nights} nights, residential</li>
      <li>${esc(camp.venue.town)}, ${esc(camp.venue.state)}</li>
    </ul>
    <fieldset class="batch-toggle" data-hero-meta>
      <legend class="batch-toggle__legend">Pick a batch to see its sky</legend>
      <div class="batch-toggle__track">${batchToggle}</div>
    </fieldset>
    <div class="hero__ctas" data-hero-meta>
      <a class="btn btn--ignite" href="${esc(reg.href)}"${ext(reg.external)} data-magnetic data-register>Register interest ${icon.arrow}</a>
      <a class="btn btn--ghost" href="${esc(whatsappHref(camp, `Hi! I have a question about ${camp.name}.`))}"${ext(true)}>${icon.whatsapp} Ask on WhatsApp</a>
    </div>
  </div>
  <p class="hero__readout" data-hero-readout aria-hidden="true">
    <span class="hero__readout-live" data-sky-clock>${readouts}</span>
    <span class="hero__coords">${Math.abs(camp.venue.latitude).toFixed(2)}° N ${camp.venue.longitude.toFixed(2)}° E · Kuppam</span>
  </p>
  <p class="sr-only" id="sky-summary">Background: the real night sky over the camp. ${summaries}</p>
  <p class="hero__credit"><span data-sky-mode>Star positions computed for the campus</span> · <a class="link" href="#sky-credits">data</a></p>
</section>`
}

function ascent(camp: Camp): string {
  const items = camp.stats
    .map(
      (s, i) => `<li class="stat" data-reveal style="--i:${i}">
        <span class="stat__alt" aria-hidden="true">Log ${String(i + 1).padStart(2, '0')}</span>
        <span class="stat__value"><span data-count-to="${s.value}">${s.value.toLocaleString('en-IN')}</span>${esc(s.suffix)}</span>
        <span class="stat__label">${esc(s.label)}</span>
        <span class="stat__note">${esc(s.note)}</span>
      </li>`,
    )
    .join('')
  return `<section class="ascent" id="ascent" aria-labelledby="ascent-title">
  <div class="ascent__inner">
    <p class="kicker" data-reveal>Ascent</p>
    <h2 class="h2" id="ascent-title" data-split>India’s longest-running residential space camp for school students.</h2>
    <p class="lede" data-reveal>Rockets, satellites, aircraft and astronomy, taught hands-on. Organised by ${esc(camp.organizers[0].name)} × ${esc(camp.organizers[1].name)}: an ${esc(camp.organizers[0].role)} and an ${esc(camp.organizers[1].role)}.</p>
    <ul class="stats" aria-label="Track record">${items}</ul>
  </div>
</section>`
}

/** Line icons (drawn in with DrawSVG as the section arrives). */
const subjectIcon: Record<string, string> = {
  aircraft: `<path d="M24 4.5c1.5 0 2.4 1.5 2.4 3.8v9.4l14.6 7.9v3.6l-14.6-4.4v8.6l4 3v3.1l-6.4-1.9-6.4 1.9v-3.1l4-3v-8.6L7 31.2v-3.6l14.6-7.9V8.3c0-2.3.9-3.8 2.4-3.8Z"/>`,
  rockets: `<path d="M24 4c5 4.2 7.6 10.2 7.6 17.6V32l-2.8 3.6h-9.6L16.4 32V21.6C16.4 14.2 19 8.2 24 4Z"/><circle cx="24" cy="17" r="3.2"/><path d="M16.4 26.5 11 33v6.5l5.4-3.2M31.6 26.5 37 33v6.5l-5.4-3.2M21 39.5l3 5 3-5"/>`,
  satellites: `<path d="M18 18h12v13H18zM2.5 19h12v11h-12zM33.5 19h12v11h-12zM14.5 24.5H18M30 24.5h3.5M8.5 19v11M39.5 19v11M2.5 24.5h12M33.5 24.5h12M24 18v-6M18 8.5a8 8 0 0 0 12 0M21 31l-2 6h10l-2-6"/>`,
  astronomy: `<path d="M7 31.5 32.5 17l3.3 5.8L10.3 37.3zM21.5 30.5l-5.5 13M24.5 29l5.5 14.5M38.5 5.5l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z"/>`,
}

function subjects(camp: Camp): string {
  const cards = camp.disciplines
    .map(
      (d, i) => `<li class="subject subject--${d.key}" style="--i:${i}">
        <p class="subject__alt"><span class="subject__alt-value">${esc(d.altitude)}</span> <span class="subject__alt-note">${esc(d.altitudeNote)}</span></p>
        <svg class="subject__icon" viewBox="0 0 48 48" aria-hidden="true" focusable="false">${subjectIcon[d.key] ?? ''}</svg>
        <h3 class="subject__title">${esc(d.title)}</h3>
        <p class="subject__line">${esc(d.line)}</p>
        <p class="subject__body">${esc(d.body)}</p>
        ${d.activities.length ? `<ul class="subject__acts" aria-label="${esc(d.title)} activities">${d.activities.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}
      </li>`,
    )
    .join('')
  return `<section class="subjects" id="subjects" aria-labelledby="subjects-title">
  <div class="subjects__head">
    <p class="kicker" data-reveal>What they’ll learn</p>
    <h2 class="h2" id="subjects-title" data-split>From the runway to the stars.</h2>
    <p class="lede" data-reveal>An aerospace camp, not just a stargazing one. Four subjects, in order of altitude, each taught the same way: learn it, build it, launch it.</p>
  </div>
  <ol class="subjects__ladder" data-subjects>${cards}</ol>
  <p class="subjects__across" data-reveal><span>Across all four</span> ${camp.acrossSubjects.map((a) => esc(a)).join(' · ')}</p>
</section>`
}

function lbl(camp: Camp): string {
  const stages = camp.lbl
    .map(
      (s, i) => `<article class="stage stage--${s.key}" data-stage="${i}">
      <div class="stage__media">${photo(camp.photos[s.key as 'learn' | 'build' | 'launch'], s.title + ' stage', 'stage__photo')}</div>
      <div class="stage__copy">
        <p class="stage__index" aria-hidden="true">Stage ${i + 1} / ${camp.lbl.length}</p>
        <h3 class="stage__title">${esc(s.title)}</h3>
        <p class="stage__line">${esc(s.line)}</p>
        <p class="stage__body">${esc(s.body)}</p>
      </div>
    </article>`,
    )
    .join('')
  return `<section class="lbl" id="lbl" aria-labelledby="lbl-title">
  <div class="lbl__head">
    <p class="kicker" data-reveal>The method</p>
    <h2 class="h2" id="lbl-title" data-split>Learn <span aria-hidden="true">→</span><span class="sr-only">, then</span> Build <span aria-hidden="true">→</span><span class="sr-only">, then</span> Launch.</h2>
    <p class="lede" data-reveal>Every activity at camp runs in three stages, like a rocket.</p>
  </div>
  <div class="lbl__pin" data-lbl-pin>
    <ol class="lbl__rail" aria-hidden="true">${camp.lbl.map((s) => `<li>${esc(s.title)}</li>`).join('')}</ol>
    <div class="lbl__stages">${stages}</div>
  </div>
</section>`
}

/** A day card's lower half: the shared theme, plus the per-track split on the days the tracks differ. */
function dayTheme(camp: Camp, day: Camp['itinerary'][number]): string {
  const split = camp.tracks
    .map((t) => {
      const activity = day[t.id as 'advanced' | 'basic']
      return activity
        ? `<li><span class="day__track">${esc(t.label)}</span> ${esc(activity)}</li>`
        : ''
    })
    .join('')
  return `<div class="day__theme">
        <p class="day__theme-title">${esc(day.theme)}</p>
        ${split ? `<ul class="day__split" aria-label="What each track does on this day">${split}</ul>` : ''}
      </div>`
}

function missionLog(camp: Camp, eph: BatchEphemeris[]): string {
  const days = camp.format.days
  const cards: string[] = []
  for (let d = 0; d < days; d++) {
    const day = camp.itinerary[d]
    const perBatch = camp.batches
      .map((b, bi) => {
        const date = new Date(Date.parse(`${b.start}T12:00:00Z`) + d * 86_400_000).toISOString().slice(0, 10)
        const n = eph[bi].nights[d]
        let sky = ''
        if (n) {
          const dark = n.darkMinutesBeforeMidnight
          sky =
            dark >= 180
              ? `Moonless from ${n.astroDark} until moonrise at ${n.moonrise ?? 'dawn'}`
              : dark > 0
                ? `${Math.floor(dark / 60) ? Math.floor(dark / 60) + ' h ' : ''}${dark % 60} min of dark sky before moonrise (${n.moonrise})`
                : `Moon up at dusk, ${Math.round(n.moonIllum * 100)}% lit`
        } else sky = 'Last day of camp'
        return `<p class="day__date" data-batch="${b.id}"><time datetime="${date}">${shortDate(date)}</time></p>
          <p class="day__sky" data-batch="${b.id}"><span class="day__sky-icon" aria-hidden="true"></span>${esc(sky)}</p>`
      })
      .join('')
    cards.push(`<li class="day" style="--d:${d}">
      <p class="day__num">Day ${String(d + 1).padStart(2, '0')}</p>
      ${perBatch}
      ${day ? dayTheme(camp, day) : '<p class="day__theme"><span class="tbc">Theme to be announced</span></p>'}
    </li>`)
  }
  const highlights = camp.highlights.map((h) => `<li>${esc(h)}</li>`).join('')
  return `<section class="log" id="mission-log" aria-labelledby="log-title">
  <div class="log__head">
    <p class="kicker" data-reveal>Mission log</p>
    <h2 class="h2" id="log-title" data-split>Nine days, eight nights under a real sky.</h2>
    <p class="lede" data-reveal>Nine days, two tracks running side by side (${camp.tracks.map((t) => `<b>${esc(t.label)}</b>`).join(' and ')}), splitting only on the four build days. Each night’s darkness and moonrise below is computed for the campus.
      <span class="log__showing">Showing ${camp.batches.map((b) => `<span data-batch="${b.id}">${esc(b.label)}</span>`).join('')}. <a class="link" href="#top" data-batch-switch>Switch batch</a>.</span></p>
    <ul class="highlights" aria-label="Camp highlights">${highlights}</ul>
    <dl class="tracks" aria-label="The two tracks">${camp.tracks
      .map((t) => `<div class="tracks__item"><dt>${esc(t.label)}</dt><dd>${esc(t.line)}</dd></div>`)
      .join('')}</dl>
  </div>
  <div class="log__viewport" data-log-viewport tabindex="0" role="region" aria-label="Nine-day itinerary, scrolls sideways">
    <svg class="log__orbit" viewBox="0 0 1000 120" preserveAspectRatio="none" aria-hidden="true"><path data-orbit d="M0 100 C 250 10, 750 10, 1000 100"/></svg>
    <ol class="log__track" data-log-track>${cards.join('')}</ol>
  </div>
</section>`
}

function groundStation(camp: Camp): string {
  const v = camp.venue
  return `<section class="ground" id="ground-station" aria-labelledby="ground-title">
  <div class="ground__head">
    <p class="kicker" data-reveal>Ground station</p>
    <h2 class="h2" id="ground-title" data-split>Where your child will live for nine days.</h2>
    <p class="lede" data-reveal>The ${esc(v.name)} in ${esc(v.town)}, ${esc(v.state)}: a ${esc(v.campusArea)} far from city lights, with its own astronomy centre.</p>
  </div>
  <div class="ground__grid">
    <div class="ground__map" data-reveal>
      <svg viewBox="0 0 520 360" role="img" aria-labelledby="map-title map-desc">
        <title id="map-title">How to reach the campus</title>
        <desc id="map-desc">Schematic, not to scale: fly into Bengaluru (BLR) or take the train to Kuppam (KPN). Pickup and drop from Bengaluru is available on request.</desc>
        <defs><pattern id="grid" width="26" height="26" patternUnits="userSpaceOnUse"><path d="M26 0H0V26" fill="none" class="map__grid"/></pattern></defs>
        <rect width="520" height="360" fill="url(#grid)"/>
        <path class="map__route" d="M92 112 C 190 96, 250 200, 330 214 S 420 250, 430 262"/>
        <path class="map__rail" d="M300 320 L 412 266"/>
        <g class="map__node"><circle cx="92" cy="112" r="7"/><text x="92" y="86" text-anchor="middle">Bengaluru</text><text class="map__sub" x="92" y="140" text-anchor="middle">${esc(v.airport.code)} airport</text></g>
        <g class="map__node map__node--rail"><circle cx="300" cy="320" r="6"/><text x="300" y="346" text-anchor="middle">${esc(v.rail.code)} · Kuppam station</text></g>
        <g class="map__node map__node--camp"><circle cx="430" cy="262" r="11"/><circle class="map__pulse" cx="430" cy="262" r="11"/><text x="430" y="234" text-anchor="middle">Agastya campus</text></g>
        <text class="map__note" x="210" y="150" text-anchor="middle">pickup &amp; drop on request</text>
        <g class="map__compass" transform="translate(470 54)"><path d="M0 -18 L5 0 L0 18 L-5 0Z"/><text y="-24" text-anchor="middle">N</text></g>
      </svg>
      <p class="ground__mapnote">Schematic map, not to scale.</p>
    </div>
    <dl class="facts">
      <div class="fact" data-reveal><dt>Venue</dt><dd>${esc(v.name)}, ${esc(v.town)}, ${esc(v.district)} district, ${esc(v.state)}. ${esc(v.campusArea[0].toUpperCase() + v.campusArea.slice(1))} with dark skies.</dd></div>
      <div class="fact" data-reveal><dt>Getting there</dt><dd>${esc(v.pickup)}. Nearest airport: ${esc(v.airport.name)} (${esc(v.airport.code)}). Nearest railway station: ${esc(v.rail.name)} (${esc(v.rail.code)}).</dd></div>
      <div class="fact" data-reveal><dt>Stay &amp; food</dt><dd>Residential: boarding on campus for all ${camp.format.nights} nights. All meals are vegetarian and included.</dd></div>
      <div class="fact" data-reveal><dt>Safety</dt><dd>24/7 security on campus. Safety is taught first in every activity (the Learn stage). Supervision ratio, medical support and phone policy: <a class="link" href="#faq">see FAQ</a>.</dd></div>
      <div class="fact" data-reveal><dt>What’s included</dt><dd><ul class="ticks">${camp.inclusions.map((i) => `<li>${esc(i)}</li>`).join('')}</ul></dd></div>
    </dl>
  </div>
</section>`
}

function crew(camp: Camp): string {
  const wall = camp.photos.wall.map((p, i) => `<li style="--i:${i}">${photo(p, `Crew ${i + 1}`, 'crew__photo', '(min-width: 800px) 25vw, 50vw')}</li>`).join('')
  const quotes = camp.testimonials.length
    ? `<ul class="quotes">${camp.testimonials
        .map((t) => `<li><blockquote><p>“${esc(t.quote)}”</p></blockquote><p class="quote__who">${esc(t.name)} <span>${esc(t.detail)}</span></p></li>`)
        .join('')}</ul>`
    : `<div class="crew__invite" data-reveal>
        <p class="crew__invite-title">Were you at a previous Astro Space Camp?</p>
        <p>We’re collecting stories from the ${camp.stats.find((s) => s.label === 'students')?.value.toLocaleString('en-IN') ?? ''}+ students and their parents who came before. Send yours and it may appear here.</p>
        <a class="btn btn--ghost" href="${esc(whatsappHref(camp, `Hi! I attended Astro Space Camp and would like to share my story.`))}"${ext(true)}>${icon.whatsapp} Share your story</a>
      </div>`
  return `<section class="crew" id="crew" aria-labelledby="crew-title">
  <div class="crew__head">
    <p class="kicker" data-reveal>Crew</p>
    <h2 class="h2" id="crew-title" data-split>A decade of crews before yours.</h2>
  </div>
  <ul class="crew__wall" data-crew-wall aria-label="Photos from previous camps">${wall}</ul>
  ${quotes}
</section>`
}

function batches(camp: Camp): string {
  const fee = camp.fees
  /** One price table per track: the two tracks are priced separately. */
  const priceBlock = () => {
    const groups = camp.tracks
      .map((t) => {
        const rows = [t.earlyBird, t.regular]
          .map((p) => {
            const amount = p.amount != null ? `<span class="price__amount">${inr(p.amount)}</span>` : `<span class="price__amount price__amount--tbd">TBD</span>`
            const until = p.until ? `<span class="price__until">until ${longDate(p.until)}</span>` : ''
            return `<div class="price"><span class="price__label">${esc(p.label)}</span>${amount}${until}</div>`
          })
          .join('')
        return `<div class="prices__track"><p class="prices__track-label">${esc(t.label)}</p><div class="prices">${rows}</div></div>`
      })
      .join('')
    const noneSet = camp.tracks.every((t) => t.earlyBird.amount == null && t.regular.amount == null)
    const pending = noneSet ? `<p class="price__pending">${esc(fee.pendingMessage)}. Register interest and we’ll message you first.</p>` : ''
    return `<div class="prices__tracks">${groups}</div>${pending}`
  }
  const cards = camp.batches
    .map((b, i) => {
      const reg = registerHref(camp, b.id)
      const pay = camp.links.pay ? `<a class="btn btn--ghost" href="${esc(camp.links.pay)}"${ext(true)}>Pay now</a>` : ''
      return `<article class="patch" data-patch="${b.id}" style="--i:${i}">
        <svg class="patch__emblem" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
          <defs><path id="ring-${b.id}" d="M60 60m-44 0a44 44 0 1 1 88 0a44 44 0 1 1-88 0"/></defs>
          <circle class="patch__ring" cx="60" cy="60" r="57"/><circle class="patch__ring patch__ring--inner" cx="60" cy="60" r="34"/>
          <text class="patch__ringtext"><textPath href="#ring-${b.id}" textLength="272">${esc(b.label.toUpperCase())} · ASC ${camp.year} · ${esc(camp.venue.town.toUpperCase())} ·</textPath></text>
          <text class="patch__num" x="60" y="70" text-anchor="middle">${String(i + 1).padStart(2, '0')}</text>
        </svg>
        <header class="patch__head">
          <h3 class="patch__title">${esc(b.label)}</h3>
          ${tentativeBadge(b.tentative)}
        </header>
        <p class="patch__dates"><time datetime="${b.start}">${longDate(b.start)}</time> – <time datetime="${b.end}">${longDate(b.end)}</time></p>
        <p class="patch__meta">Grades ${camp.grades.from}–${camp.grades.to} · ${camp.format.days} days / ${camp.format.nights} nights · ${esc(camp.venue.town)}</p>
        ${priceBlock()}
        <div class="patch__ctas">
          <a class="btn btn--ignite" href="${esc(reg.href)}"${ext(reg.external)} data-magnetic data-register>Register for ${esc(b.label)} ${icon.arrow}</a>
          ${pay}
        </div>
      </article>`
    })
    .join('')
  return `<section class="batches" id="batches" aria-labelledby="batches-title">
  <div class="batches__head">
    <p class="kicker" data-reveal>Batches &amp; fees</p>
    <h2 class="h2" id="batches-title" data-split>Choose your mission.</h2>
    <p class="lede" data-reveal>${camp.batches.some((b) => b.tentative) ? 'Both batches are tentative until the organisers confirm them. ' : 'Both batches are confirmed. '}Same programme, different sky.</p>
  </div>
  <div class="patches">${cards}</div>
  <div class="inclusions" data-reveal>
    <h3 class="h3">Every batch includes</h3>
    <ul class="ticks ticks--grid">${camp.inclusions.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
  </div>
</section>`
}

function faq(camp: Camp): string {
  const items = camp.faq
    .map(
      (f, i) => `<details class="qa" data-qa>
      <summary class="qa__q" id="faq-q-${i}"><span>${esc(f.q)}</span><span class="qa__icon" aria-hidden="true"></span></summary>
      <div class="qa__a"><div class="qa__inner"><p>${esc(f.a)}</p>${f.confirmed ? '' : '<p class="tbc">To be confirmed by the organisers</p>'}</div></div>
    </details>`,
    )
    .join('')
  return `<section class="faq" id="faq" aria-labelledby="faq-title">
  <div class="faq__head">
    <p class="kicker" data-reveal>Questions parents ask</p>
    <h2 class="h2" id="faq-title" data-split>Before you say yes.</h2>
    <p class="lede" data-reveal>Can’t find it? <a class="link" href="${esc(whatsappHref(camp, `Hi! I have a question about ${camp.name}.`))}"${ext(true)}>Message us on WhatsApp</a> at ${esc(camp.contact.whatsappDisplay)}.</p>
  </div>
  <div class="faq__list">${items}</div>
</section>`
}

function footer(camp: Camp): string {
  const socials = camp.links.socials.map((s) => `<li><a class="link" href="${esc(s.url)}"${ext(true)}>${esc(s.label)}</a></li>`).join('')
  const nl = camp.links.newsletterEndpoint
  return `<footer class="reentry" id="contact" aria-labelledby="footer-title">
  <div class="reentry__glow" aria-hidden="true"></div>
  <div class="reentry__inner">
    <h2 class="reentry__title" id="footer-title" data-split>See you under the Kuppam sky.</h2>
    <div class="reentry__ctas">
      <a class="btn btn--ignite btn--lg" href="${esc(registerHref(camp).href)}"${ext(true)} data-magnetic data-register>Register interest ${icon.arrow}</a>
      <a class="btn btn--ghost btn--lg" href="${esc(whatsappHref(camp, `Hi! I have a question about ${camp.name}.`))}"${ext(true)}>${icon.whatsapp} ${esc(camp.contact.whatsappDisplay)}</a>
    </div>
    <div class="reentry__grid">
      <div class="reentry__orgs"><p class="reentry__label">Organised by</p><div class="orgs">${orgMarks(camp)}</div></div>
      <form class="newsletter" data-newsletter${nl ? ` action="${esc(nl)}" method="post"` : ''} novalidate>
        <label class="reentry__label" for="nl-email">Mission updates by email</label>
        <div class="newsletter__row">
          <input id="nl-email" name="email" type="email" autocomplete="email" placeholder="parent@example.com" required${nl ? '' : ' disabled aria-describedby="nl-status"'}>
          <button class="btn btn--ghost" type="submit"${nl ? '' : ' disabled'}>Subscribe</button>
        </div>
        <p class="newsletter__status" id="nl-status" role="status">${nl ? '' : 'Email sign-up opens soon. Until then, WhatsApp us for updates.'}</p>
      </form>
      <div class="reentry__social"><p class="reentry__label">Follow</p><ul>${socials}</ul></div>
    </div>
    <div class="reentry__base">
      ${camp.brand.ascLogo ? logoImg(camp, 'reentry__logo', camp.shortName, ' loading="lazy" decoding="async"') : ''}
      <p>© ${camp.year} ${esc(camp.organizers.map((o) => o.name).join(' × '))} · <span class="reentry__clock" data-ist-clock>Kuppam, ${camp.sky.timezoneLabel}</span></p>
      <p id="sky-credits" class="reentry__credits">Sky: stars from the <a class="link" href="https://codeberg.org/astronexus/hyg"${ext(true)}>HYG database</a> (CC BY-SA), constellation lines &amp; Milky Way from <a class="link" href="https://github.com/ofrohn/d3-celestial"${ext(true)}>d3-celestial</a> (BSD-3), Moon &amp; planets via <a class="link" href="https://github.com/cosinekitty/astronomy"${ext(true)}>Astronomy Engine</a> (MIT). Positions computed for ${camp.venue.latitude}° N, ${camp.venue.longitude}° E.</p>
    </div>
  </div>
</footer>`
}

function dock(camp: Camp): string {
  const reg = registerHref(camp)
  return `<div class="dock" data-dock>
  <a class="btn btn--ignite" href="${esc(reg.href)}"${ext(reg.external)} data-register>Register interest</a>
  <a class="btn btn--icon" href="${esc(whatsappHref(camp, `Hi! I have a question about ${camp.name}.`))}"${ext(true)} aria-label="Ask on WhatsApp">${icon.whatsapp}</a>
</div>`
}

// ───────────────────────────────── Head ─────────────────────────────────

export function renderHead(camp: Camp, eph: BatchEphemeris[]): string {
  const s = camp.site
  const og = s.url + s.ogImage
  const events = camp.batches.map((b, i) => {
    // One Offer per track that has a regular price; no price set means no offers key at all.
    const trackOffers = camp.tracks
      .filter((t) => t.regular.amount != null)
      .map((t) => ({
        '@type': 'Offer',
        name: `${t.label} track`,
        price: t.regular.amount,
        priceCurrency: camp.fees.currency,
        url: registerHref(camp, b.id).href,
        availability: 'https://schema.org/InStock',
      }))
    const offers = trackOffers.length ? { offers: trackOffers } : {}
    return {
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: `${camp.name}: ${b.label}${b.tentative ? ' (tentative dates)' : ''}`,
      description: `${b.tentative ? 'Tentative dates, to be confirmed by the organisers. ' : ''}Residential ${camp.format.days}-day space camp for students in Grades ${camp.grades.from}–${camp.grades.to}: ${camp.disciplines.map((d) => d.title.toLowerCase()).join(', ').replace(/, ([^,]*)$/, ' and $1')}. ${eph[i].summary}`,
      startDate: `${b.start}T09:00:00${camp.sky.utcOffset}`,
      endDate: `${b.end}T17:00:00${camp.sky.utcOffset}`,
      // schema.org has no "tentative" status; EventScheduled + explicit description/name is the closest honest encoding.
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      location: {
        '@type': 'Place',
        name: camp.venue.name,
        address: { '@type': 'PostalAddress', addressLocality: camp.venue.town, addressRegion: camp.venue.state, addressCountry: camp.venue.country },
        geo: { '@type': 'GeoCoordinates', latitude: camp.venue.latitude, longitude: camp.venue.longitude },
      },
      image: [og],
      organizer: camp.organizers.map((o) => ({ '@type': 'Organization', name: o.name, url: o.url })),
      typicalAgeRange: '12-18',
      ...offers,
    }
  })
  // Batch visibility without JS: the hero radios drive every [data-batch] element via :has().
  const batchCss = camp.batches
    .map(
      (b) =>
        `body:has(#pick-${b.id}:checked) [data-batch]:not([data-batch="${b.id}"]){display:none!important}` +
        `body:has(#pick-${b.id}:checked) .patch[data-patch="${b.id}"]{border-color:rgb(124 196 255 / .55)}`,
    )
    .join('')
  const firstHide = camp.batches.slice(1).map((b) => `[data-batch="${b.id}"]`).join(',')
  const posterCss =
    camp.batches.slice(1).map((b) => `[data-poster="${b.id}"]`).join(',') + '{opacity:0}' +
    camp.batches.map((b) => `body:has(#pick-${b.id}:checked) [data-poster="${b.id}"]{opacity:1}body:has(#pick-${b.id}:checked) [data-poster]:not([data-poster="${b.id}"]){opacity:0}`).join('')
  return `<title>${esc(s.title)}</title>
    <meta name="description" content="${esc(s.description)}">
    <link rel="canonical" href="${esc(s.url)}/">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="${esc(camp.shortName)}">
    <meta property="og:title" content="${esc(camp.name)}: the sky your child will see on night one">
    <meta property="og:description" content="${esc(s.description)}">
    <meta property="og:url" content="${esc(s.url)}/">
    <meta property="og:image" content="${esc(og)}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="The real night sky over the Agastya campus, Kuppam, on night one of ${esc(camp.name)}">
    <meta property="og:locale" content="${esc(s.locale)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="theme-color" content="#05070d">
    <script type="application/ld+json">${JSON.stringify(events.length === 1 ? events[0] : events).replace(/</g, '\\u003c')}</script>
    <style>@supports not selector(:has(a)){${firstHide}{display:none}}${batchCss}${posterCss}</style>`
}

export function renderBody(camp: Camp, eph: BatchEphemeris[]): string {
  return [
    `<a class="skip-link" href="#main">Skip to content</a>`,
    preloader(camp),
    header(camp),
    `<main id="main" tabindex="-1">`,
    hero(camp, eph),
    ascent(camp),
    subjects(camp),
    lbl(camp),
    missionLog(camp, eph),
    groundStation(camp),
    crew(camp),
    batches(camp),
    faq(camp),
    `</main>`,
    footer(camp),
    dock(camp),
  ].join('\n')
}
