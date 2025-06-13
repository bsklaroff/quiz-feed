import { pgTable, uuid, timestamp, text, json, index } from 'drizzle-orm/pg-core'
import { InferInsertModel, InferSelectModel } from 'drizzle-orm'

export const webpageTable = pgTable('webpage', {
  id: uuid().primaryKey().defaultRandom(),
  url: text().notNull(),
  title: text().notNull(),
  text: text().notNull(),
  favicon: text().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index().on(table.url),
])

export type WebpageInsert = InferInsertModel<typeof webpageTable>
export type Webpage = InferSelectModel<typeof webpageTable>

export interface QuizItem {
  stem: string
  options: string[]
  correctOption: number
  sourceSnippet: string
}

export const quizTable = pgTable('quiz', {
  id: uuid().primaryKey().defaultRandom(),
  title: text().notNull(),
  items: json().$type<QuizItem[]>().notNull(),
  deletedItems: json().$type<QuizItem[]>().notNull().default([]),
  sourceId: uuid().references(() => webpageTable.id).notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
})

export type QuizInsert = InferInsertModel<typeof quizTable>
export type Quiz = InferSelectModel<typeof quizTable>
