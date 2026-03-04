const API_KEY = import.meta.env.VITE_MISTRAL_API_KEY
const API_URL = 'https://api.mistral.ai/v1/chat/completions'

function fmtDate(d) {
  return d.toLocaleDateString('nb-NO', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

export async function getReading(snapshot, natalChart) {
  if (!API_KEY) return 'missing api key'

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

tone: sassy, blunt, lowercase. lead each paragraph with a punchy one-liner like "moon says no" or "venus is flirting with trouble" then explain why. be honest, funny, a little dramatic. like a brutally honest friend who reads charts. no greetings, no sign-offs. never say "today" - refer to the specific date. keep it under 200 words total.`

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
  if (!API_KEY) return 'missing api key'

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
  if (!API_KEY) return 'missing api key'

  const prompt = `you are a wise astrologer. someone asks: "${question}"

their natal chart: ${chartData(natalChart)}

answer their question based purely on their chart placements and aspects. be specific - reference the exact planets, signs, houses, and aspects that are relevant. be honest, not just positive.

tone: sassy, blunt, lowercase. open with a punchy verdict, then back it up with the chart details. be funny but real. under 150 words.`

  return ask(prompt)
}

export async function askDay(question, snapshot, natalChart) {
  if (!API_KEY) return 'missing api key'

  const planets = snapshot.bodies.map(b =>
    `${b.label} in ${b.zodiac.sign} ${b.zodiac.degree.toFixed(0)}°`
  ).join(', ')

  const moon = `${snapshot.moon.phaseName} (${Math.round(snapshot.moon.illumination * 100)}% lit)`

  const date = snapshot.date.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  let natal = ''
  if (natalChart) {
    natal = `their natal chart: ${chartData(natalChart)}`
  }

  const prompt = `you are a wise astrologer. someone asks about ${date}: "${question}"

date: ${date}. sky on that date: ${planets}. moon phase: ${moon}.
${natal}

answer based on the transits for that date and how they interact with their natal chart. be specific - name the planets and signs driving the answer. be honest, not just positive. never say "today" - refer to the specific date.

tone: sassy, blunt, lowercase. open with a punchy verdict like "saturn says sit down" then explain. be funny but real. under 150 words.`

  const result = await ask(prompt)
  return `${fmtDate(snapshot.date)}\n${result}`
}

async function ask(prompt) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7
      })
    })
    if (!res.ok) throw new Error(`mistral ${res.status}`)
    const data = await res.json()
    return (data.choices[0]?.message?.content || 'no response').replace(/\*+/g, '')
  } catch (e) {
    return `error: ${e.message}`
  }
}
