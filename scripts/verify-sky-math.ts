/**
 * Cross-checks src/sky/astro.ts against astronomy-engine (independent, MIT,
 * full nutation/aberration model). Run: npm run sky:verify
 * Fails (exit 1) if any star differs by more than the tolerance.
 */
import * as Astronomy from 'astronomy-engine'
import { equatorialToWorld, equatorialVector, apply, worldToAltAz, localTimeToMs, julianDate, gmstDeg } from '../src/sky/astro.ts'

const LAT = 12.75, LON = 78.34 // Kuppam, from the brief
const TOLERANCE_DEG = 0.05

// J2000 positions (ICRS ≈ J2000 to <0.1″): RA hours, Dec degrees.
const stars: Array<[string, number, number]> = [
  ['Sirius', 6.752477, -16.716116],
  ['Antares', 16.490128, -26.432003],
  ['Polaris', 2.529750, 89.264109],
  ['Arcturus', 14.261020, 19.182410],
  ['Canopus', 6.399195, -52.695661],
  ['Acrux', 12.443311, -63.099092],
]

const instants = [
  ['Batch 1 night one 21:00 IST', '2027-04-23', '21:00'],
  ['Batch 2 night one 21:00 IST', '2027-06-25', '21:00'],
  ['Batch 1 pre-dawn 04:30 IST', '2027-04-24', '04:30'],
] as const

const observer = new Astronomy.Observer(LAT, LON, 0)
let worst = 0
let failures = 0

for (const [label, date, time] of instants) {
  const ms = localTimeToMs(date, time, '+05:30')
  const jd = julianDate(ms)
  const when = new Date(ms)
  const m = equatorialToWorld(jd, LAT, LON)

  // GMST vs astronomy-engine's sidereal time (which is apparent: includes equation of equinoxes ≤1.2 s).
  const gastHours = Astronomy.SiderealTime(when)
  const gmstHours = gmstDeg(jd) / 15
  const dtSec = ((gastHours - gmstHours + 36) % 24 - 12) * 3600
  console.log(`\n${label}  (${when.toISOString()})  GMST−GAST = ${(-dtSec).toFixed(2)} s`)

  for (const [name, raH, dec] of stars) {
    const ours = worldToAltAz(apply(m, equatorialVector(raH * 15, dec)))
    // astronomy-engine: J2000 → equator of date (with nutation+aberration) → horizon without refraction.
    const star = Astronomy.DefineStar(Astronomy.Body.Star1, raH, dec, 1000)
    const eq = Astronomy.Equator(Astronomy.Body.Star1, when, observer, true, true)
    const hor = Astronomy.Horizon(when, observer, eq.ra, eq.dec)
    void star
    const dAlt = ours.alt - hor.altitude
    const dAz = ((ours.az - hor.azimuth + 540) % 360) - 180
    const err = Math.hypot(dAlt, dAz * Math.cos((hor.altitude * Math.PI) / 180))
    worst = Math.max(worst, err)
    const ok = err <= TOLERANCE_DEG
    if (!ok) failures++
    console.log(
      `  ${name.padEnd(9)} ours alt ${ours.alt.toFixed(3).padStart(8)} az ${ours.az.toFixed(3).padStart(8)} | ` +
        `ref alt ${hor.altitude.toFixed(3).padStart(8)} az ${hor.azimuth.toFixed(3).padStart(8)} | err ${(err * 3600).toFixed(1)}″ ${ok ? 'ok' : 'FAIL'}`,
    )
  }
}

console.log(`\nWorst on-sky error: ${(worst * 3600).toFixed(1)}″ (tolerance ${TOLERANCE_DEG * 3600}″)`)
if (failures) {
  console.error(`${failures} position(s) out of tolerance — sky maths is wrong, do not ship.`)
  process.exit(1)
}
