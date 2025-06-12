import Anthropic from '@anthropic-ai/sdk'
import { Webpage, QuizInsert } from './db/schema'

const anthropic = new Anthropic({ apiKey: process.env.QF_ANTHROPIC_API_KEY })

export async function createQuiz(webpage: Webpage): Promise<QuizInsert> {
  const prompt = `Create a BuzzFeed-style multiple-choice quiz with exactly 10 questions based on the following webpage content:

Title: ${webpage.title}
Content: ${webpage.text}

Your quiz should be engaging, fun, and test knowledge about the content. Each question should have 4 multiple choice options (A, B, C, D) with exactly one correct answer.

Return your response as valid JSON in this exact format:
{
  "title": "Quiz title here"
  "items": [
    {
      "stem": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctOption": 0,
      "sourceSnippet": "Relevant snippet from the source content that supports this question"
    }
  ]
}

Important requirements:
- Exactly 10 questions in the quizItems array
- correctOption should be the index (0-3) of the correct answer
- Each question should be based on actual content from the webpage
- Include a relevant sourceSnippet for each question, copied exactly from the webpage
- Make the quiz title catchy and BuzzFeed-style
- Return ONLY the JSON, no other text`

  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  })
  if (res.content[0].type !== 'text') {
    throw new Error(`Unexpected response from Anthropic API: {res}`)
  }
  let responseText = res.content[0].text
  // Strip JSON code block wrapper if it exists
  responseText = responseText.replace(/^```(?:json)?\n?|\n?```$/g, '')

  console.log(responseText)

  const quizToInsert = {
    sourceId: webpage.id,
    ...JSON.parse(responseText),
  } as QuizInsert
  return quizToInsert
}
