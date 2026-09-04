import { getSnapshot, scanTransits } from './sky.js'

const API_URL = '/api/mistral'

const STATUS_MESSAGES = {
  400: "the stars couldn't read that request - something's off",
  401: 'no cosmic access - api key missing or invalid',
  403: 'the heavens denied entry - access forbidden',
  404: "lost in the void - couldn't find that",
  422: 'the planets rejected these details - check your input',
  429: 'the cosmos needs a breather - too many questions, try again soon'
}
const statusMessage = status => `${STATUS_MESSAGES[status] || 'the stars are silent'} (${status} from mistral)`

function fmtDate(d) {
  return d.toLocaleDateString('nb-NO', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

export async function getReading(snapshot, natalChart) {
  const planets = snapshot.bodies.map(b =>
    `${b.label} in ${b.zodiac.sign} ${b.zodiac.degree.toFixed(0)}°`
  ).join(', ')

  const moon = `${snapshot.moon.phaseName} (${Math.round(snapshot.moon.illumination * 100)}% lit)`

  let natal = ''
  if (natalChart) {
    const sun = natalChart.bodies.find(b => b.id === 'Sun')
    const moonN = natalChart.bodies.find(b => b.id === 'Moon')
    natal = `their natal chart: sun ${sun?.zodiac.sign}, moon ${moonN?.zodiac.sign}, rising ${natalChart.ascZodiac.sign}.`
  }

  const date = snapshot.date.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  const prompt = `you are a warm, wise astrologer. give a personal reading for ${date}.

sky on that date: ${planets}. moon phase: ${moon}.
${natal}

write 4-6 short punchy paragraphs. each paragraph should:
- name the planet and sign driving the energy
- explain what it does to you in one sentence
- give one concrete piece of advice (do this, avoid that, try this)

end with one sentence overall vibe for the day.

tone: sassy, blunt, lowercase. be honest, funny, a little dramatic. like a brutally honest friend who reads charts. no greetings, no sign-offs. never say "today" - refer to the specific date. keep it under 200 words total.`

  const result = await ask(prompt)
  return `${fmtDate(snapshot.date)}\n${result}`
}

function chartData(natalChart) {
  const planets = natalChart.bodies.map(b =>
    `${b.label} in ${b.zodiac.sign} ${b.zodiac.degree.toFixed(0)}° (house ${b.house})`
  ).join(', ')
  const aspects = natalChart.aspects.map(a =>
    `${a.body1.label} ${a.name} ${a.body2.label} (${a.exact.toFixed(1)}° orb)`
  ).join(', ')
  return `rising: ${natalChart.ascZodiac.sign} ${natalChart.ascZodiac.degree.toFixed(0)}°. planets: ${planets}. aspects: ${aspects}.`
}

export async function analyzeChart(natalChart) {
  const prompt = `you are a warm, insightful astrologer reading a natal birth chart.

chart: ${chartData(natalChart)}

write a personality reading. cover:
- core identity (sun sign + house)
- emotional nature (moon sign + house)
- how others see them (rising sign)
- communication style (mercury)
- love language (venus)
- drive and anger (mars)
- life lessons (saturn)
- biggest strengths and blind spots from the aspects

tone: sassy, blunt, lowercase. lead each point with a punchy one-liner then explain. be honest, funny, a little brutal. like a friend who reads you for filth through your chart. no greetings, no sign-offs. keep each point to 1-2 sentences. under 250 words total.`

  return ask(prompt)
}

export async function askChart(question, natalChart) {
  const prompt = `you are a wise astrologer. someone asks: "${question}"

their natal chart: ${chartData(natalChart)}

answer their question based purely on their chart placements and aspects. be specific - reference the exact planets, signs, houses, and aspects that are relevant. be honest, not just positive.

tone: sassy, blunt, lowercase. open with a punchy verdict, then back it up with the chart details. keep it real. under 150 words.`

  return ask(prompt)
}

const MONTH_NAMES = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
  apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
  aug: 7, august: 7, sep: 8, sept: 8, september: 8, oct: 9, october: 9,
  nov: 10, november: 10, dec: 11, december: 11,
}

function parseDateFromQuestion(question, referenceDate) {
  const q = question.toLowerCase()
  const ref = referenceDate || new Date()
  const year = ref.getFullYear()

  // "march 15", "15 march", "mar 15", "15. mars" etc
  const monthDay = q.match(/(\d{1,2})\.?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)/i)
  const dayMonth = q.match(/(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})/i)

  let month, day
  if (dayMonth) {
    month = MONTH_NAMES[dayMonth[1].toLowerCase()]
    day = parseInt(dayMonth[2])
  } else if (monthDay) {
    day = parseInt(monthDay[1])
    month = MONTH_NAMES[monthDay[2].toLowerCase()]
  }

  if (month !== undefined && day) {
    const d = new Date(year, month, day, 12, 0)
    if (d.getMonth() === month && day >= 1 && day <= 31) return d
  }

  // "tomorrow"
  if (/\btomorrow\b/i.test(q)) {
    const d = new Date(ref)
    d.setDate(d.getDate() + 1)
    d.setHours(12, 0, 0, 0)
    return d
  }

  // "next week" / "next monday" etc
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const nextDay = q.match(/next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i)
  if (nextDay) {
    const target = dayNames.indexOf(nextDay[1].toLowerCase())
    const d = new Date(ref)
    const diff = (target - d.getDay() + 7) % 7 || 7
    d.setDate(d.getDate() + diff)
    d.setHours(12, 0, 0, 0)
    return d
  }

  return null
}

export async function askDay(question, snapshot, natalChart) {
  // if user mentions a specific date, compute sky for that date
  const parsedDate = parseDateFromQuestion(question, snapshot.date)
  const targetSnapshot = parsedDate ? getSnapshot(parsedDate) : snapshot

  const planets = targetSnapshot.bodies.map(b =>
    `${b.label} in ${b.zodiac.sign} ${b.zodiac.degree.toFixed(0)}°`
  ).join(', ')

  const moon = `${targetSnapshot.moon.phaseName} (${Math.round(targetSnapshot.moon.illumination * 100)}% lit)`

  const date = targetSnapshot.date.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  let natal = ''
  if (natalChart) {
    natal = `their natal chart: ${chartData(natalChart)}`
  }

  const prompt = `you are a wise astrologer. someone asks about ${date}: "${question}"

date: ${date}. sky on that date: ${planets}. moon phase: ${moon}.
${natal}

answer based on the exact transits for ${date} and how they interact with their natal chart. the planetary positions given are computed for that specific date. be specific - name the planets and signs driving the answer. be honest, not just positive. never say "today" - refer to the specific date.

tone: sassy, blunt, lowercase. keep it real. under 150 words.`

  const result = await ask(prompt)
  return `${fmtDate(targetSnapshot.date)}\n${result}`
}

function fmtShort(d) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export async function getForecast(natalChart, startDate, days) {
  const step = days > 60 ? 3 : 1
  const events = scanTransits(natalChart, startDate, days, step)

  const transitsText = events.map(e =>
    `${fmtShort(e.startDate)}-${fmtShort(e.endDate)}: transiting ${e.transit} ${e.aspect} natal ${e.natal} (${e.natalSign}, house ${e.natalHouse})`
  ).join('\n')

  const sun = natalChart.bodies.find(b => b.id === 'Sun')
  const moon = natalChart.bodies.find(b => b.id === 'Moon')
  const period = days <= 60 ? 'next 30 days' : 'next 6 months'

  const prompt = `you are a wise astrologer giving a ${period} transit forecast.

person: sun ${sun?.zodiac.sign}, moon ${moon?.zodiac.sign}, rising ${natalChart.ascZodiac.sign}.
natal chart: ${chartData(natalChart)}

upcoming transits to their natal planets (computed positions):
${transitsText}

write a forecast organized by theme (love, career, energy, growth, challenges). for each theme pick the most important transits, give specific date ranges, and say what to expect. prioritize conjunctions, squares, and oppositions. mention if multiple transits overlap for amplified effects.

tone: sassy, blunt, lowercase. keep it real. under 300 words.`

  const result = await ask(prompt)
  return `${period} from ${fmtShort(startDate)}\n${result}`
}

function buildTransitsText(natalChart, startDate, days) {
  const step = days > 60 ? 3 : 1
  const events = scanTransits(natalChart, startDate, days, step)
  return events.map(e =>
    `${fmtShort(e.startDate)}-${fmtShort(e.endDate)}: transiting ${e.transit} ${e.aspect} natal ${e.natal} (${e.natalSign}, house ${e.natalHouse})`
  ).join('\n')
}

export async function askForecast(question, natalChart, startDate, days) {
  const transitsText = buildTransitsText(natalChart, startDate, days)
  const sun = natalChart.bodies.find(b => b.id === 'Sun')
  const moon = natalChart.bodies.find(b => b.id === 'Moon')
  const period = days <= 60 ? 'next 27 days' : 'next 180 days'
  const endDate = new Date(startDate.getTime() + days * 86400000)

  const prompt = `you are a wise astrologer. someone asks about the ${period} (${fmtShort(startDate)} to ${fmtShort(endDate)}): "${question}"

person: sun ${sun?.zodiac.sign}, moon ${moon?.zodiac.sign}, rising ${natalChart.ascZodiac.sign}.
natal chart: ${chartData(natalChart)}

upcoming transits to their natal planets (computed positions):
${transitsText}

answer based on the specific transits and dates above. be specific - reference exact dates and planet aspects. be honest, not just positive.

tone: sassy, blunt, lowercase. keep it real. under 150 words.`

  return ask(prompt)
}

// --- group / synastry readings ---
// people: [{ name, chart }], groupSynastry: output of getGroupSynastry

function peopleData(people) {
  return people.map(p => `${p.name}: ${chartData(p.chart)}`).join('\n\n')
}

function synastryData(groupSynastry) {
  return groupSynastry.map(pair => {
    const lines = pair.aspects.length
      ? pair.aspects.map(a => `  ${pair.a}'s ${a.a.label} ${a.name} ${pair.b}'s ${a.b.label} (${a.exact.toFixed(1)}°)`).join('\n')
      : '  no major aspects'
    return `${pair.a} & ${pair.b}:\n${lines}`
  }).join('\n\n')
}

const GROUP_TONE = 'tone: sassy, blunt, lowercase. be honest, funny, a little brutal. always refer to people by name. never assume anyone\'s gender - use their name or they/them, never he/she/him/her. no greetings, no sign-offs.'

export async function analyzeGroup(people, groupSynastry) {
  const names = people.map(p => p.name).join(', ')
  const prompt = `you are a warm, insightful astrologer reading the dynamics of a group: ${names}.

each person's natal chart:
${peopleData(people)}

synastry (cross-aspects between their charts):
${synastryData(groupSynastry)}

write a reading about how these people work together. cover the key bonds, the friction points, and who balances who. reference the specific synastry aspects and whose planets are involved. be honest, not just positive.

${GROUP_TONE} lead each point with a punchy one-liner then explain. under 300 words.`
  return ask(prompt)
}

export async function askGroupChart(question, people, groupSynastry) {
  const names = people.map(p => p.name).join(', ')
  const prompt = `you are a wise astrologer. the group is: ${names}. someone asks: "${question}"

each person's natal chart:
${peopleData(people)}

synastry (cross-aspects):
${synastryData(groupSynastry)}

answer based purely on their charts and the synastry between them. be specific - reference exact planets, signs, and aspects, and whose they are. be honest, not just positive.

${GROUP_TONE} open with a punchy verdict, then back it up. under 200 words.`
  return ask(prompt)
}

export async function getGroupReading(people, snapshot, groupSynastry) {
  const names = people.map(p => p.name).join(', ')
  const planets = snapshot.bodies.map(b => `${b.label} in ${b.zodiac.sign} ${b.zodiac.degree.toFixed(0)}°`).join(', ')
  const moon = `${snapshot.moon.phaseName} (${Math.round(snapshot.moon.illumination * 100)}% lit)`
  const date = snapshot.date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const prompt = `you are a warm, wise astrologer. give a group reading for ${date} about: ${names}.

sky on that date: ${planets}. moon phase: ${moon}.

each person's natal chart:
${peopleData(people)}

synastry between them:
${synastryData(groupSynastry)}

write how this specific day's transits play out for the group - who's energized, who's tense, how they can support each other, and any friction to watch. reference the transiting planets and whose natal placements they hit.

${GROUP_TONE} never say "today" - refer to the specific date. under 250 words.`
  const result = await ask(prompt)
  return `${fmtDate(snapshot.date)}\n${result}`
}

export async function askGroupDay(question, snapshot, people, groupSynastry) {
  const names = people.map(p => p.name).join(', ')
  const parsedDate = parseDateFromQuestion(question, snapshot.date)
  const targetSnapshot = parsedDate ? getSnapshot(parsedDate) : snapshot
  const planets = targetSnapshot.bodies.map(b => `${b.label} in ${b.zodiac.sign} ${b.zodiac.degree.toFixed(0)}°`).join(', ')
  const moon = `${targetSnapshot.moon.phaseName} (${Math.round(targetSnapshot.moon.illumination * 100)}% lit)`
  const date = targetSnapshot.date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const prompt = `you are a wise astrologer. the group is: ${names}. someone asks about ${date}: "${question}"

date: ${date}. sky on that date: ${planets}. moon phase: ${moon}.

each person's natal chart:
${peopleData(people)}

synastry:
${synastryData(groupSynastry)}

answer based on the transits for ${date}, how they hit each person's chart, and the synastry between them. be specific - name the planets and whose chart they touch. be honest, not just positive.

${GROUP_TONE} never say "today" - refer to the specific date. under 200 words.`
  const result = await ask(prompt)
  return `${fmtDate(targetSnapshot.date)}\n${result}`
}

export async function getGroupForecast(people, startDate, days, groupSynastry) {
  const names = people.map(p => p.name).join(', ')
  const period = days <= 60 ? 'next 27 days' : 'next 6 months'
  const perPerson = people.map(p => `${p.name}:\n${buildTransitsText(p.chart, startDate, days)}`).join('\n\n')
  const prompt = `you are a wise astrologer giving a ${period} group forecast for: ${names}.

each person's upcoming transits (computed positions):
${perPerson}

synastry between them:
${synastryData(groupSynastry)}

write a forecast for the group by theme (who's rising, who's struggling, when they clash or click). give specific date ranges. prioritize conjunctions, squares, and oppositions.

${GROUP_TONE} under 350 words.`
  const result = await ask(prompt)
  return `${period} from ${fmtShort(startDate)}\n${result}`
}

export async function askGroupForecast(question, people, startDate, days, groupSynastry) {
  const names = people.map(p => p.name).join(', ')
  const period = days <= 60 ? 'next 27 days' : 'next 180 days'
  const endDate = new Date(startDate.getTime() + days * 86400000)
  const perPerson = people.map(p => `${p.name}:\n${buildTransitsText(p.chart, startDate, days)}`).join('\n\n')
  const prompt = `you are a wise astrologer. the group is: ${names}. someone asks about the ${period} (${fmtShort(startDate)} to ${fmtShort(endDate)}): "${question}"

each person's upcoming transits (computed positions):
${perPerson}

synastry between them:
${synastryData(groupSynastry)}

answer based on the specific transits, dates, and the synastry between them. reference exact dates and whose chart is affected. be honest, not just positive.

${GROUP_TONE} under 200 words.`
  return ask(prompt)
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function ask(prompt) {
  const maxRetries = 3
  try {
    for (let attempt = 0; ; attempt++) {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7
        })
      })
      if (res.status === 429 && attempt < maxRetries) {
        const retryAfter = Number(res.headers.get('retry-after'))
        const wait = retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 1000
        await sleep(wait)
        continue
      }
      if (!res.ok) return statusMessage(res.status)
      const data = await res.json()
      return (data.choices[0]?.message?.content || 'no response').replace(/\*+/g, '').replace(/—/g, ' - ').replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '')
    }
  } catch (e) {
    return `something drifted off course - ${e.message}`
  }
}
