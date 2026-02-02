const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions'
const API_KEY = import.meta.env.VITE_MISTRAL_API_KEY

async function callMistral(prompt) {
  const response = await fetch(MISTRAL_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: 'mistral-small-latest',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3
    })
  })

  if (!response.ok) {
    throw new Error(`Mistral API error: ${response.status}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || ''
}

export async function generateSummary(articles) {
  if (!API_KEY || articles.length === 0) return null

  const articleTexts = articles
    .slice(0, 10)
    .map(a => `${a.title}: ${a.content?.slice(0, 500) || a.description || ''}`)
    .join('\n\n')

  const prompt = `Skriv en sammenhengende oppsummering av nyhetene i 2-3 setninger. Ikke bruk lister, nummerering eller formatering. Bare flytende tekst.

${articleTexts}`

  try {
    return await callMistral(prompt)
  } catch (err) {
    console.error('Summary error:', err)
    return null
  }
}

export async function answerQuestion(question, articles) {
  if (!API_KEY || !question.trim()) return null

  const context = articles
    .slice(0, 15)
    .map((a, i) => `## ${a.title}\n${a.content?.slice(0, 800) || a.description || ''}`)
    .join('\n\n---\n\n')

  const prompt = `Svar direkte på spørsmålet. Bare ren tekst, ingen formatering, ingen tall, ingen punktlister. Kort og konsist.

NYHETER:
${context}

SPØRSMÅL: ${question}`

  try {
    return await callMistral(prompt)
  } catch (err) {
    console.error('Answer error:', err)
    return 'Beklager, kunne ikke svare på spørsmålet.'
  }
}

export async function rewriteHeadlines(articles) {
  if (!API_KEY || articles.length === 0) return articles

  const articlesData = articles
    .slice(0, 15)
    .map((a, i) => `${i}: "${a.title}"\nInnhold: ${a.content?.slice(0, 300) || a.description || ''}`)
    .join('\n\n')

  const prompt = `Du er en nyhetsredaktør. Les disse nyhetene og skriv NYE overskrifter som er mer beskrivende og informative. Overskriften skal fortelle leseren HVA som skjedde, ikke bare hint om temaet. Inkluder viktige detaljer som navn, tall, steder når relevant.

${articlesData}

Regler:
- Vær spesifikk og konkret, ikke vag
- Inkluder nøkkelinfo fra artikkelen
- Maks 12 ord per overskrift
- Unngå clickbait

Svar BARE med JSON-array: [{"index": 0, "headline": "ny overskrift"}, ...]`

  try {
    const content = await callMistral(prompt)
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return articles

    const rewrites = JSON.parse(jsonMatch[0])
    const rewriteMap = new Map(rewrites.map(r => [r.index, r.headline]))

    return articles.map((article, i) => ({
      ...article,
      shortTitle: rewriteMap.get(i) || article.title
    }))
  } catch (err) {
    console.error('Rewrite error:', err)
    return articles
  }
}
