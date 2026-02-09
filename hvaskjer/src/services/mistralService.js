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

export async function rankAndSummarize(articles) {
  if (!API_KEY || articles.length === 0) return { ranked: articles, summary: null }

  const articlesData = articles
    .slice(0, 20)
    .map((a, i) => `${i}. [${a.source}] "${a.title}"\n${a.content?.slice(0, 400) || a.description || ''}`)
    .join('\n\n---\n\n')

  const prompt = `Du er en nyhetsredaktør. Analyser disse nyhetene og gjør to ting:

1. RANGER artiklene etter viktighet/dramatikk/størst samfunnsendring. Viktigst først.
2. Skriv en kort oppsummering (2-3 setninger) av det viktigste som skjer akkurat nå.

${articlesData}

Svar i dette JSON-formatet:
{
  "ranking": [5, 2, 0, 8, ...],
  "summary": "Kort oppsummering her..."
}

Ranking er en liste med artikkel-indekser sortert etter viktighet (viktigst først).
Oppsummeringen skal være ren tekst, ingen lister eller formatering.`

  try {
    const content = await callMistral(prompt)
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return { ranked: articles, summary: null }

    const result = JSON.parse(jsonMatch[0])

    // Reorder articles by ranking
    const ranked = result.ranking
      .filter(i => i >= 0 && i < articles.length)
      .map(i => articles[i])

    // Add any articles not in ranking to the end
    const rankedIds = new Set(result.ranking)
    const remaining = articles.filter((_, i) => !rankedIds.has(i))

    return {
      ranked: [...ranked, ...remaining],
      summary: result.summary || null
    }
  } catch (err) {
    console.error('Rank/summary error:', err)
    return { ranked: articles, summary: null }
  }
}

export async function answerQuestion(question, articles) {
  if (!API_KEY || !question.trim()) return null

  const context = articles
    .slice(0, 15)
    .map((a, i) => `## [${a.source}] ${a.title}\n${a.content?.slice(0, 800) || a.description || ''}`)
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
