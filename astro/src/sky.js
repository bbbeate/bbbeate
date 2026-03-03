import * as Astronomy from 'astronomy-engine'

const BODIES = [
  { id: 'Sun', label: 'sun', symbol: '\u2609\uFE0E', color: '#ffdd44', size: 14 },
  { id: 'Moon', label: 'moon', symbol: '\u263D\uFE0E', color: '#cccccc', size: 10 },
  { id: 'Mercury', label: 'mercury', symbol: '\u263F\uFE0E', color: '#b5a7a7', size: 4 },
  { id: 'Venus', label: 'venus', symbol: '\u2640\uFE0E', color: '#e8cda0', size: 6 },
  { id: 'Mars', label: 'mars', symbol: '\u2642\uFE0E', color: '#c1440e', size: 5 },
  { id: 'Jupiter', label: 'jupiter', symbol: '\u2643\uFE0E', color: '#c8a55a', size: 9 },
  { id: 'Saturn', label: 'saturn', symbol: '\u2644\uFE0E', color: '#d4b980', size: 8 },
  { id: 'Uranus', label: 'uranus', symbol: '\u2645\uFE0E', color: '#7ec8e3', size: 5 },
  { id: 'Neptune', label: 'neptune', symbol: '\u2646\uFE0E', color: '#4b70dd', size: 5 },
  { id: 'Pluto', label: 'pluto', symbol: '\u2647\uFE0E', color: '#9d8b7e', size: 3 },
]

const ZODIAC_SIGNS = [
  'aries', 'taurus', 'gemini', 'cancer',
  'leo', 'virgo', 'libra', 'scorpio',
  'sagittarius', 'capricorn', 'aquarius', 'pisces'
]

const ZODIAC_SYMBOLS = [
  '\u2648\uFE0E', '\u2649\uFE0E', '\u264A\uFE0E', '\u264B\uFE0E',
  '\u264C\uFE0E', '\u264D\uFE0E', '\u264E\uFE0E', '\u264F\uFE0E',
  '\u2650\uFE0E', '\u2651\uFE0E', '\u2652\uFE0E', '\u2653\uFE0E'
]

function getZodiacSign(lon) {
  const idx = Math.floor(lon / 30) % 12
  return { sign: ZODIAC_SIGNS[idx], symbol: ZODIAC_SYMBOLS[idx], degree: lon % 30 }
}

export function getSnapshot(date) {
  const t = Astronomy.MakeTime(date)

  const bodies = BODIES.map(body => {
    let lon, lat

    if (body.id === 'Sun') {
      const ecl = Astronomy.SunPosition(t)
      lon = ecl.elon
      lat = ecl.elat
    } else if (body.id === 'Moon') {
      const ecl = Astronomy.EclipticGeoMoon(t)
      lon = ecl.lon
      lat = ecl.lat
    } else {
      const geo = Astronomy.GeoVector(body.id, t, true)
      const ecl = Astronomy.Ecliptic(geo)
      lon = ecl.elon
      lat = ecl.elat
    }

    return { ...body, lon, lat, zodiac: getZodiacSign(lon) }
  })

  const moonPhase = Astronomy.MoonPhase(t)
  const moonIllum = Astronomy.Illumination('Moon', t)

  return {
    date,
    bodies,
    moon: {
      phase: moonPhase,
      illumination: moonIllum.phase_fraction,
      phaseName: getMoonPhaseName(moonPhase)
    }
  }
}

function getMoonPhaseName(phase) {
  if (phase < 22.5) return 'new moon'
  if (phase < 67.5) return 'waxing crescent'
  if (phase < 112.5) return 'first quarter'
  if (phase < 157.5) return 'waxing gibbous'
  if (phase < 202.5) return 'full moon'
  if (phase < 247.5) return 'waning gibbous'
  if (phase < 292.5) return 'last quarter'
  if (phase < 337.5) return 'waning crescent'
  return 'new moon'
}

// ascendant = the ecliptic longitude rising on eastern horizon
function calcAscendant(date, lat, lng) {
  const t = Astronomy.MakeTime(date)
  const gast = Astronomy.SiderealTime(t)
  // local sidereal time in degrees
  const lst = (gast * 15 + lng) % 360
  const lstRad = lst * Math.PI / 180
  const latRad = lat * Math.PI / 180
  // obliquity of ecliptic ~23.44 degrees
  const obl = 23.4393 * Math.PI / 180

  // ascendant formula
  const asc = Math.atan2(
    Math.cos(lstRad),
    -(Math.sin(lstRad) * Math.cos(obl) + Math.tan(latRad) * Math.sin(obl))
  )
  let ascDeg = (asc * 180 / Math.PI + 360) % 360
  return ascDeg
}

const ASPECT_DEFS = [
  { name: 'conjunction', angle: 0, orb: 8, symbol: '\u260C\uFE0E' },
  { name: 'sextile', angle: 60, orb: 6, symbol: '\u26B9\uFE0E' },
  { name: 'square', angle: 90, orb: 7, symbol: '\u25A1\uFE0E' },
  { name: 'trine', angle: 120, orb: 8, symbol: '\u25B3\uFE0E' },
  { name: 'opposition', angle: 180, orb: 8, symbol: '\u260D\uFE0E' },
]

function findAspects(bodies) {
  const aspects = []
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      let diff = Math.abs(bodies[i].lon - bodies[j].lon)
      if (diff > 180) diff = 360 - diff
      for (const asp of ASPECT_DEFS) {
        if (Math.abs(diff - asp.angle) <= asp.orb) {
          aspects.push({
            body1: bodies[i],
            body2: bodies[j],
            ...asp,
            exact: Math.abs(diff - asp.angle),
          })
          break
        }
      }
    }
  }
  return aspects
}

export function getNatalChart(date, lat, lng) {
  const snapshot = getSnapshot(date)
  const ascendant = calcAscendant(date, lat, lng)
  const ascZodiac = getZodiacSign(ascendant)

  // whole sign houses: each house = 30 degrees starting from ascendant's sign
  const houseStart = Math.floor(ascendant / 30) * 30
  const houses = Array.from({ length: 12 }, (_, i) => {
    const cusp = (houseStart + i * 30) % 360
    return { number: i + 1, cusp, zodiac: getZodiacSign(cusp) }
  })

  // place bodies in houses
  const bodiesWithHouses = snapshot.bodies.map(b => {
    let house = 1
    for (let i = 0; i < 12; i++) {
      const start = houses[i].cusp
      const end = houses[(i + 1) % 12].cusp
      const lon = b.lon
      const inHouse = end > start
        ? lon >= start && lon < end
        : lon >= start || lon < end
      if (inHouse) { house = i + 1; break }
    }
    return { ...b, house }
  })

  const aspects = findAspects(snapshot.bodies)

  return {
    ...snapshot,
    bodies: bodiesWithHouses,
    ascendant,
    ascZodiac,
    houses,
    aspects,
  }
}

// get ecliptic longitude for a body at a given date
function getLon(bodyId, date) {
  const t = Astronomy.MakeTime(date)
  if (bodyId === 'Sun') return Astronomy.SunPosition(t).elon
  if (bodyId === 'Moon') return Astronomy.EclipticGeoMoon(t).lon
  return Astronomy.Ecliptic(Astronomy.GeoVector(bodyId, t, true)).elon
}

// rough step sizes (days) per body for sign boundary search
const STEP = {
  Moon: 0.25, Sun: 1, Mercury: 0.5, Venus: 1,
  Mars: 2, Jupiter: 7, Saturn: 14,
  Uranus: 30, Neptune: 60, Pluto: 90,
}

function signOf(lon) { return Math.floor(((lon % 360) + 360) % 360 / 30) }

// binary search for the moment longitude crosses a sign boundary
function refine(bodyId, d1, d2) {
  let lo = d1.getTime(), hi = d2.getTime()
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2
    const lonMid = getLon(bodyId, new Date(mid))
    const lonLo = getLon(bodyId, new Date(lo))
    if (signOf(lonMid) === signOf(lonLo)) lo = mid; else hi = mid
  }
  return new Date((lo + hi) / 2)
}

// find when body entered and will leave its current sign
export function getSignTransit(bodyId, date) {
  const lon = getLon(bodyId, date)
  const currentSign = signOf(lon)
  const step = (STEP[bodyId] || 1) * 86400000

  // search backwards for entry
  let entered = null
  let prev = date
  for (let i = 1; i < 500; i++) {
    const check = new Date(date.getTime() - i * step)
    const checkLon = getLon(bodyId, check)
    if (signOf(checkLon) !== currentSign) {
      entered = refine(bodyId, check, prev)
      break
    }
    prev = check
  }

  // search forwards for exit
  let exits = null
  prev = date
  for (let i = 1; i < 500; i++) {
    const check = new Date(date.getTime() + i * step)
    const checkLon = getLon(bodyId, check)
    if (signOf(checkLon) !== currentSign) {
      exits = refine(bodyId, prev, check)
      break
    }
    prev = check
  }

  return { entered, exits }
}

export { ZODIAC_SIGNS, ZODIAC_SYMBOLS, ASPECT_DEFS }
