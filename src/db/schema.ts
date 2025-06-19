import { pgTable, AnyPgColumn, uuid, timestamp, text, json, index } from 'drizzle-orm/pg-core'
import { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import { QuizItem } from '../shared/api-types.js'

export const webpageTable = pgTable('webpage', {
  id: uuid().primaryKey().defaultRandom(),
  url: text().notNull(),
  title: text().notNull(),
  text: text().notNull(),
  favicon: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index().on(table.url),
])

export type WebpageInsert = InferInsertModel<typeof webpageTable>
export type Webpage = InferSelectModel<typeof webpageTable>


export const quizTable = pgTable('quiz', {
  id: uuid().primaryKey().defaultRandom(),
  title: text().notNull(),
  slug: text().notNull().unique(),
  items: json().$type<QuizItem[]>().notNull(),
  deletedItems: json().$type<QuizItem[]>().notNull().default([]),
  sourceId: uuid().references(() => webpageTable.id).notNull(),
  parentId: uuid().references((): AnyPgColumn => quizTable.id),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  publishedAt: timestamp({ withTimezone: true }),
})

export type QuizInsert = InferInsertModel<typeof quizTable>
export type Quiz = InferSelectModel<typeof quizTable>
