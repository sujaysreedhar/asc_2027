/**
 * BUILD-TIME ONLY (imported by vite.config.ts). Computes, for each batch in the
 * config, where the Moon and bright planets are on night one, and the moonrise /
 * darkness times for every night of the camp. Browsers receive only the numbers
 * via the `virtual:sky-ephemeris` module, never astronomy-engine itself.
 */
import * as A from 'astronomy-engine'
import type { Camp } from './camp.config.ts'
import { localTimeToMs } from '../sky/astro.ts'

export type BodyEphemeris = {
  name: string
  /** J2000 RA/Dec (degrees): the client applies the same precession+sidereal matrix as for stars. */
  ra: number
  dec: number
  mag: number
  /** Altitude / azimuth at night-one time, for copy & accessibility text. */
  alt: number
  az: number
  /** Moon only: illuminated fraction 0..1 and position angle-free phase angle (deg). */
  phase?: number
  phaseAngle?: number
}

export type NightInfo = {
  date: string // YYYY-MM-DD (evening of)
  astroDark: string | null // HH:MM local, Sun reaches −18°
  moonrise: string | null
  moonset: string | null
  moonIllum: number // at 21:00 local
  /** Minutes of moonless astronomical darkness between astroDark and midnight. */
  darkMinutesBeforeMidnight: number
}

export type BatchEphemeris = {
  id: string
  nightOneMs: number
  bodies: BodyEphemeris[]
  nights: NightInfo[]
  summary: string
}

// Sun is included only so the client can orient the Moon's lit limb; it is always below the horizon at night.
const BODIES = [A.Body.Sun, A.Body.Moon, A.Body.Venus, A.Body.Mars, A.Body.Jupiter, A.Body.Saturn, A.Body.Mercury] as const
const COMPASS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west']
const compass = (az: number) => COMPASS[Math.round(az / 45) % 8]

function hhmm(t: A.AstroTime | null, offsetMin: number): string | null {
  if (!t) return null
  return new Date(t.date.getTime() + offsetMin * 60_000).toISOString().slice(11, 16)
}

function offsetMinutes(utcOffset: string): number {
  const m = /^([+-])(\d\d):(\d\d)$/.exec(utcOffset)
  if (!m) throw new Error(`ephemeris: bad utcOffset "${utcOffset}". Expected a value like +05:30`)
  return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]))
}

function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export function computeEphemeris(camp: Camp): BatchEphemeris[] {
  const { latitude, longitude } = camp.venue
  const obs = new A.Observer(latitude, longitude, 0)
  const off = offsetMinutes(camp.sky.utcOffset)

  return camp.batches.map((batch) => {
    const nightOneMs = localTimeToMs(batch.start, camp.sky.nightOneTime, camp.sky.utcOffset)
    const when = new Date(nightOneMs)
    const bodies: BodyEphemeris[] = BODIES.map((name) => {
      // J2000 astrometric equatorial coordinates (no aberration), consistent with the star catalogue.
      const j2000 = A.Equator(name, when, obs, false, false)
      const ofDate = A.Equator(name, when, obs, true, true)
      const hor = A.Horizon(when, obs, ofDate.ra, ofDate.dec, 'normal')
      const ill = A.Illumination(name, when)
      const b: BodyEphemeris = {
        name,
        ra: +(j2000.ra * 15).toFixed(4),
        dec: +j2000.dec.toFixed(4),
        mag: +ill.mag.toFixed(2),
        alt: +hor.altitude.toFixed(2),
        az: +hor.azimuth.toFixed(2),
      }
      if (name === 'Moon') {
        b.phase = +ill.phase_fraction.toFixed(3)
        b.phaseAngle = +ill.phase_angle.toFixed(1)
      }
      return b
    })

    const nights: NightInfo[] = []
    const startMs = Date.parse(`${batch.start}T00:00:00Z`)
    const endMs = Date.parse(`${batch.end}T00:00:00Z`)
    const count = Math.round((endMs - startMs) / 86_400_000) // nights = days − 1
    if (!(count > 0 && count < 40)) throw new Error(`ephemeris: ${batch.id} has ${count} nights. Check start/end dates`)
    for (let i = 0; i < count; i++) {
      const date = addDays(batch.start, i)
      const noon = new Date(localTimeToMs(date, '12:00', camp.sky.utcOffset))
      const midnight = localTimeToMs(addDays(date, 1), '00:00', camp.sky.utcOffset)
      const dark = A.SearchAltitude(A.Body.Sun, obs, -1, noon, 1, -18)
      const rise = A.SearchRiseSet(A.Body.Moon, obs, +1, noon, 1)
      const set = A.SearchRiseSet(A.Body.Moon, obs, -1, noon, 1)
      const nine = new Date(localTimeToMs(date, '21:00', camp.sky.utcOffset))
      // Moonless darkness before midnight: from astro-dark until moonrise (if the Moon is down at dusk).
      let darkMin = 0
      if (dark) {
        const d0 = dark.date.getTime()
        const moonAltAtDark = A.Horizon(dark.date, obs, A.Equator(A.Body.Moon, dark.date, obs, true, true).ra, A.Equator(A.Body.Moon, dark.date, obs, true, true).dec).altitude
        if (moonAltAtDark < 0) {
          const r = rise && rise.date.getTime() > d0 ? rise.date.getTime() : Infinity
          darkMin = Math.max(0, Math.round((Math.min(r, midnight) - d0) / 60_000))
        } else if (set && set.date.getTime() < midnight) {
          darkMin = Math.max(0, Math.round((midnight - Math.max(set.date.getTime(), d0)) / 60_000))
        }
      }
      nights.push({
        date,
        astroDark: hhmm(dark, off),
        moonrise: hhmm(rise, off),
        moonset: hhmm(set, off),
        moonIllum: +A.Illumination(A.Body.Moon, nine).phase_fraction.toFixed(2),
        darkMinutesBeforeMidnight: darkMin,
      })
    }

    // Plain-language description of the rendered sky (screen readers, no-JS, SEO).
    const up = bodies.filter((b) => b.name !== 'Sun' && b.alt > 3 && (b.name === 'Moon' || b.mag < 1.5))
    const moon = bodies.find((b) => b.name === 'Moon')!
    const parts: string[] = []
    const planets = up.filter((b) => b.name !== 'Moon')
    if (planets.length)
      parts.push(planets.map((p) => `${p.name} ${p.alt > 55 ? 'high' : p.alt > 25 ? 'well up' : 'low'} in the ${compass(p.az)}`).join(', '))
    if (moon.alt > 0) parts.push(`a ${moon.phase! > 0.9 ? 'nearly full' : moon.phase! > 0.55 ? 'gibbous' : moon.phase! > 0.45 ? 'half' : 'crescent'} Moon in the ${compass(moon.az)}`)
    else parts.push(`no Moon until ${hhmm(A.SearchRiseSet(A.Body.Moon, obs, +1, when, 1), off) ?? 'after dawn'}`)
    const summary = `At ${camp.sky.nightOneTime} ${camp.sky.timezoneLabel} on night one: ${parts.join('; ')}.`

    return { id: batch.id, nightOneMs, bodies, nights, summary }
  })
}
