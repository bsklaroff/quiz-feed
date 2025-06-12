import express from 'express'
import morgan from 'morgan'
import { createServer } from 'node:http'
import { parseArgs } from 'node:util'
import ViteExpress from 'vite-express'
import { eq } from 'drizzle-orm'
import Exa from 'exa-js'

import db from './db/engine.ts'
import { webpageTable, quizTable } from './db/schema.ts'
import { CreateQuizReq, CreateQuizRes } from './shared/api-types.ts'
import { createQuiz } from './anthropic-api.ts'

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

app.get('/api/quiz/:quizId', async (req, res) => {
  try {
    const { quizId } = req.params
    if (!quizId) {
      res.status(400).json({ error: 'Quiz ID is required' })
      return
    }

    const [result] = (
      await db.select({
        quiz: quizTable,
        webpage: webpageTable,
      })
      .from(quizTable)
      .innerJoin(webpageTable, eq(quizTable.sourceId, webpageTable.id))
      .where(eq(quizTable.id, quizId))
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
    })
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
    let quizId = existingQuiz?.id
    if (!quizId) {
      const quizToInsert = await createQuiz(webpage)
      const [insertedQuiz] = (
        await db.insert(quizTable)
        .values(quizToInsert)
        .returning()
      )
      quizId = insertedQuiz.id
    }

    res.json({ quizId } as CreateQuizRes)
  } catch (error) {
    console.error('Error creating quiz:', error)
    res.status(500).json({ error: 'Failed to create quiz' })
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.log('Server is listening...')
})

await ViteExpress.bind(app, server)
