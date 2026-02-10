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
    throw new Error(`mistral api error: ${response.status}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || ''
}

export async function categorizeHeadlines(articles) {
  if (!API_KEY || articles.length === 0) return { categories: [], summary: null }

  const headlinesData = articles
    .map((a, i) => `${i}. [${a.source}] ${a.title}`)
    .join('\n')

  const prompt = `du er en uformell nyhetsredaktør. snakk som en kompis. analyser overskriftene:

1. lag 4-6 kategorier basert på innhold (f.eks. "utenriks", "politikk", "klima", "drama" osv)
2. plasser hver artikkel i minst én kategori
3. skriv en kort oppsummering (2 setninger, uformelt språk, ingen store bokstaver)

${headlinesData}

svar i json:
{
  "categories": [
    {"name": "utenriks", "symbol": "~>", "articleIds": [0, 5, 12]},
    {"name": "politikk", "symbol": "##", "articleIds": [1, 3, 8]}
  ],
  "summary": "kort oppsummering her uten store bokstaver..."
}

bruk enkle ascii-symboler som ~> ## ** // ++ -- osv. ingen emojis. alle små bokstaver.`

  try {
    const content = await callMistral(prompt)
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return { categories: [], summary: null }

    const result = JSON.parse(jsonMatch[0])
    return {
      categories: result.categories || [],
      summary: result.summary || null
    }
  } catch (err) {
    console.error('categorize error:', err)
    return { categories: [], summary: null }
  }
}

export async function analyzeCategory(articles) {
  if (!API_KEY || articles.length === 0) return { ranked: articles, summary: null }

  const articlesData = articles
    .map((a, i) => `${i}. [${a.source}] "${a.title}"\n${a.content?.slice(0, 600) || a.description || ''}`)
    .join('\n\n---\n\n')

  const prompt = `du er en uformell nyhetsredaktør. analyser disse sakene:

1. ranger etter viktighet/dramatikk. viktigst først.
2. skriv en oppsummering (3-4 setninger, uformelt, ingen store bokstaver)

${articlesData}

svar i json:
{
  "ranking": [2, 0, 5, 1, ...],
  "summary": "oppsummering uten store bokstaver..."
}`

  try {
    const content = await callMistral(prompt)
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return { ranked: articles, summary: null }

    const result = JSON.parse(jsonMatch[0])

    const ranked = result.ranking
      .filter(i => i >= 0 && i < articles.length)
      .map(i => articles[i])

    const rankedIds = new Set(result.ranking)
    const remaining = articles.filter((_, i) => !rankedIds.has(i))

    return {
      ranked: [...ranked, ...remaining],
      summary: result.summary || null
    }
  } catch (err) {
    console.error('analyze error:', err)
    return { ranked: articles, summary: null }
  }
}

export async function answerQuestion(question, articles) {
  if (!API_KEY || !question.trim()) return null

  const context = articles
    .slice(0, 15)
    .map(a => `## [${a.source}] ${a.title}\n${a.content?.slice(0, 800) || a.description || ''}`)
    .join('\n\n---\n\n')

  const prompt = `svar uformelt og direkte. ingen store bokstaver. kort og konsist.

nyheter:
${context}

spørsmål: ${question}`

  try {
    return await callMistral(prompt)
  } catch (err) {
    console.error('answer error:', err)
    return 'beklager, klarte ikke svare på det.'
  }
}
