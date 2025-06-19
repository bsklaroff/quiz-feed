import express from 'express'
import morgan from 'morgan'
import { createServer } from 'node:http'
import { parseArgs } from 'node:util'
import ViteExpress from 'vite-express'
import { eq, desc, isNotNull } from 'drizzle-orm'
import Exa from 'exa-js'

import db from './db/engine.ts'
import { webpageTable, quizTable } from './db/schema.ts'
import { CreateQuizReq, CreateQuizRes, EditQuizReq, EditQuizRes, GetQuizRes, GetQuizzesRes, PublishQuizReq, PublishQuizRes } from './shared/api-types.ts'
import { createQuiz, editQuiz } from './anthropic-api.ts'

const exa = new Exa(process.env.QF_EXA_API_KEY)

const args = parseArgs({ options: { prod: { type: 'boolean' } } })
if (args.values.prod) {
  ViteExpress.config({ mode: 'production' })
}

const PORT = 3000
const app = express()
const server = createServer((req, res) => { void app(req, res) })

app.use(express.json())
app.use(morgan('dev'))

app.get('/api/quizzes', async (_req, res) => {
  try {
    const results = await db.select({
      quiz: quizTable,
      webpage: webpageTable,
    })
    .from(quizTable)
    .innerJoin(webpageTable, eq(quizTable.sourceId, webpageTable.id))
    .where(isNotNull(quizTable.publishedAt))
    .orderBy(desc(quizTable.createdAt))

    const quizzes = results.map((result) => ({
      ...result.quiz,
      source: {
        url: result.webpage.url,
        title: result.webpage.title,
        favicon: result.webpage.favicon,
      },
    }))

    res.json(quizzes as GetQuizzesRes)
  } catch (error) {
    console.error('Error fetching quizzes:', error)
    res.status(500).json({ error: 'Failed to fetch quizzes' })
  }
})

app.get('/api/quiz/:quizSlug', async (req, res) => {
  try {
    const { quizSlug } = req.params
    if (!quizSlug) {
      res.status(400).json({ error: 'quizSlug is required' })
      return
    }

    const [result] = (
      await db.select({ quiz: quizTable, webpage: webpageTable })
      .from(quizTable)
      .innerJoin(webpageTable, eq(quizTable.sourceId, webpageTable.id))
      .where(eq(quizTable.slug, quizSlug))
      .limit(1)
    )
    if (!result) {
      res.status(404).json({ error: 'Quiz not found' })
      return
    }

    res.json({
      ...result.quiz,
      source: {
        url: result.webpage.url,
        title: result.webpage.title,
        favicon: result.webpage.favicon,
      },
    } as GetQuizRes)
  } catch (error) {
    console.error('Error fetching quiz:', error)
    res.status(500).json({ error: 'Failed to fetch quiz' })
  }
})

app.post('/api/create_quiz', async (req, res) => {
  try {
    const { url } = req.body as CreateQuizReq
    if (!url) {
      res.status(400).json({ error: 'URL is required' })
      return
    }

    let [webpage] = (
      await db.select()
      .from(webpageTable)
      .where(eq(webpageTable.url, url))
      .limit(1)
    )
    if (!webpage) {
      const [pageContent] = (await exa.getContents(url)).results
      const [insertedWebpage] = (
        await db.insert(webpageTable)
        .values({
          url: url,
          title: pageContent.title!,
          text: pageContent.text,
          favicon: pageContent.favicon!,
        }).returning()
      )
      webpage = insertedWebpage
    }

    const [existingQuiz] = (
      await db.select()
      .from(quizTable)
      .where(eq(quizTable.sourceId, webpage.id))
      .limit(1)
    )
    let quizSlug = existingQuiz?.slug
    if (!quizSlug) {
      const quizToInsert = await createQuiz(webpage)
      const [insertedQuiz] = (
        await db.insert(quizTable)
        .values(quizToInsert)
        .returning()
      )
      quizSlug = insertedQuiz.slug
    }

    res.json({ quizSlug } as CreateQuizRes)
  } catch (error) {
    console.error('Error creating quiz:', error)
    res.status(500).json({ error: 'Failed to create quiz' })
  }
})

app.post('/api/edit_quiz', async (req, res) => {
  try {
    const { quizId, deletedItemIdxs, additionalInstructions } = req.body as EditQuizReq
    if (!quizId || !deletedItemIdxs) {
      res.status(400).json({ error: 'quizId and deletedItemIdxs are required' })
      return
    }

    const [result] = (
      await db.select({ quiz: quizTable, webpage: webpageTable })
      .from(quizTable)
      .innerJoin(webpageTable, eq(quizTable.sourceId, webpageTable.id))
      .where(eq(quizTable.id, quizId))
      .limit(1)
    )
    if (!result) {
      res.status(404).json({ error: 'Quiz not found' })
      return
    }

    const quizToInsert = await editQuiz(result.webpage, result.quiz, deletedItemIdxs, additionalInstructions)
    const [insertedQuiz] = (
      await db.insert(quizTable)
      .values(quizToInsert)
      .returning()
    )

    res.json({ quizSlug: insertedQuiz.slug } as EditQuizRes)
  } catch (error) {
    console.error('Error editing quiz:', error)
    res.status(500).json({ error: 'Failed to edit quiz' })
  }
})

app.post('/api/toggle_publish_quiz', async (req, res) => {
  try {
    const { quizId } = req.body as PublishQuizReq
    if (!quizId) {
      res.status(400).json({ error: 'quizId is required' })
      return
    }

    const [quiz] = (
      await db.select()
      .from(quizTable)
      .where(eq(quizTable.id, quizId))
      .limit(1)
    )
    if (!quiz) {
      res.status(404).json({ error: 'Quiz not found' })
      return
    }

    const newPublishedAt = quiz.publishedAt ? null : new Date()
    await db.update(quizTable)
      .set({ publishedAt: newPublishedAt })
      .where(eq(quizTable.id, quizId))

    res.json({ publishedAt: newPublishedAt } as PublishQuizRes)
  } catch (error) {
    console.error('Error publishing/unpublishing quiz:', error)
    res.status(500).json({ error: 'Failed to publish/unpublish quiz' })
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.log('Server is listening...')
})

await ViteExpress.bind(app, server)
