import Anthropic from '@anthropic-ai/sdk'
import { Webpage, QuizInsert, QuizItem, Quiz } from './db/schema'

const anthropic = new Anthropic({ apiKey: process.env.QF_ANTHROPIC_API_KEY })

export async function createQuiz(webpage: Webpage): Promise<QuizInsert> {
  const prompt = `Create a BuzzFeed-style multiple-choice quiz with exactly 10 questions based on the following webpage content:

Title: ${webpage.title}
Content: ${webpage.text}

Your quiz should highlight the most surprising, thought-provoking, revealing, or shocking details about the content. Each question should have 4 multiple choice options (A, B, C, D) with exactly one correct answer.

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

  // Combine items to delete with previously deleted items
  const allDeletedItems = [...quiz.deletedItems, ...itemsToDelete]

  const deletedQuestionsContext = allDeletedItems.length > 0
    ? `\n\nPreviously deleted questions to avoid repeating:\n${allDeletedItems.map((item, i) => `${i + 1}. ${item.stem}`).join('\n')}`
    : ''

  const existingQuestionsContext = existingItems.length > 0
    ? `\n\nExisting questions in the quiz:\n${existingItems.map((item, i) => `${i + 1}. ${item.stem}`).join('\n')}`
    : ''

  const additionalInstructionsContext = additionalInstructions
    ? `\n\nAdditional instructions for the new questions: ${additionalInstructions}`
    : ''

  const prompt = `Create ${newItemsNeeded} new BuzzFeed-style multiple-choice questions to add to an existing quiz based on the following webpage content:

Title: ${webpage.title}
Content: ${webpage.text}${existingQuestionsContext}${deletedQuestionsContext}${additionalInstructionsContext}

Your new questions should:
- Highlight the most surprising, thought-provoking, revealing, or shocking details about the content
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

  const newItems = JSON.parse(responseText) as QuizItem[]
  const quizToUpdate = {
    ...quiz,
    items: [...existingItems, ...newItems],
    deletedItems: allDeletedItems,
  } as QuizInsert
  return quizToUpdate
}
