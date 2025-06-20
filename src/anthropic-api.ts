import Anthropic from '@anthropic-ai/sdk'
import { randomBytes } from 'node:crypto'
import { Webpage, QuizInsert, Quiz } from './db/schema'
import { QuizItem } from './shared/api-types'

const anthropic = new Anthropic({ apiKey: process.env.QF_ANTHROPIC_API_KEY })

function cachedQuizPrompt(title: string, text: string): string {
  return `Generate BuzzFeed-style multiple-choice quiz questions based on the following webpage content:

Title: ${title}
Content: ${text}
`
}

export async function createQuiz(webpage: Webpage): Promise<QuizInsert> {
  const cachedPromptPart = cachedQuizPrompt(webpage.title, webpage.text)

  const dynamicPromptPart = `
Create exactly 10 questions for a complete quiz. Your quiz should highlight the most surprising, thought-provoking, or revealing details about the content. Each question should have 4 multiple choice options (A, B, C, D) with exactly one correct answer.

Return your response as valid JSON in this exact format:
{
  "title": "Quiz title here"
  "slug": "quiz-url-slug-here"
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
- Make the quiz slug 4 lower-case words separated by hyphens, related to the title
- Return ONLY the JSON, no other text`

  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    messages: [{
      role: 'user',
      content: [{
        type: 'text',
        text: cachedPromptPart,
        cache_control: { type: 'ephemeral' },
      }, {
        type: 'text',
        text: dynamicPromptPart,
      }],
    }],
  })
  if (res.content[0].type !== 'text') {
    throw new Error(`Unexpected response from Anthropic API: {res}`)
  }
  let responseText = res.content[0].text
  // Strip JSON code block wrapper if it exists
  responseText = responseText.replace(/^```(?:json)?\n?|\n?```$/g, '')

  const parsedQuiz = {
    sourceId: webpage.id,
    ...JSON.parse(responseText),
  } as QuizInsert

  // Make slug URL-safe and add random hash
  const urlSafeSlug = parsedQuiz.slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  const randomHash = randomBytes(3).toString('hex')

  const quizToInsert = {
    ...parsedQuiz,
    slug: `${urlSafeSlug}-${randomHash}`,
  }
  return quizToInsert
}

export async function editQuiz(
  webpage: Webpage,
  quiz: Quiz,
  deletedItemIdxs: number[],
  additionalInstructions: string,
): Promise<QuizInsert> {
  // Get items to delete and items to keep
  const itemsToDelete = deletedItemIdxs.map(index => quiz.items[index])
  const existingItems = quiz.items.filter((_, index) => !deletedItemIdxs.includes(index))
  const newItemsNeeded = 10 - existingItems.length

  if (newItemsNeeded <= 0) {
    throw new Error('Quiz already has 10 or more items')
  }

  const cachedPromptPart = cachedQuizPrompt(webpage.title, webpage.text)

  const existingQuestionsContext = existingItems.length > 0
    ? `\nExisting questions in the quiz:\n${existingItems.map((item, i) => `${i + 1}. ${item.stem}`).join('\n')}\n`
    : ''

  const allDeletedItems = [...quiz.deletedItems, ...itemsToDelete]
  const deletedQuestionsContext = allDeletedItems.length > 0
    ? `\nPreviously deleted questions to avoid repeating:\n${allDeletedItems.map((item, i) => `${i + 1}. ${item.stem}`).join('\n')}\n`
    : ''

  const dynamicPromptPart = `${existingQuestionsContext}${deletedQuestionsContext}
Create exactly ${newItemsNeeded} new questions to add to the existing quiz. Your new questions should:
- Highlight the most surprising, thought-provoking, or revealing details about the content
- NOT repeat or be too similar to the existing questions
- NOT repeat or be too similar to the previously deleted questions
- Each question should have 4 multiple choice options (A, B, C, D) with exactly one correct answer${additionalInstructions ? `
- Follow the additional instructions provided: ${additionalInstructions}` : ''}

Return your response as valid JSON in this exact format:
[
  {
    "stem": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctOption": 0,
    "sourceSnippet": "Relevant snippet from the source content that supports this question"
  }
]

Important requirements:
- Exactly ${newItemsNeeded} questions in the items array
- correctOption should be the index (0-3) of the correct answer
- Each question should be based on actual content from the webpage
- Include a relevant sourceSnippet for each question, copied exactly from the webpage
- Return ONLY the JSON, no other text`

  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    messages: [{
      role: 'user',
      content: [{
        type: 'text',
        text: cachedPromptPart,
        cache_control: { type: 'ephemeral' },
      }, {
        type: 'text',
        text: dynamicPromptPart,
      }],
    }],
  })
  if (res.content[0].type !== 'text') {
    throw new Error(`Unexpected response from Anthropic API: {res}`)
  }
  let responseText = res.content[0].text
  // Strip JSON code block wrapper if it exists
  responseText = responseText.replace(/^```(?:json)?\n?|\n?```$/g, '')

  const newItems = JSON.parse(responseText) as QuizItem[]

  // Strip old hash from slug and add new random hash
  const baseSlug = quiz.slug.replace(/-[^-]*$/, '')
  const randomHash = randomBytes(3).toString('hex')

  const quizToInsert = {
    title: quiz.title,
    slug: `${baseSlug}-${randomHash}`,
    items: [...existingItems, ...newItems],
    deletedItems: allDeletedItems,
    sourceId: quiz.sourceId,
    parentId: quiz.id,
  } as QuizInsert
  return quizToInsert
}
