export interface QuizItem {
  stem: string
  options: string[]
  correctOption: number
  sourceSnippet: string
}

export interface CreateQuizReq {
  url: string
}

export interface CreateQuizRes {
  quizSlug: string
}

export interface EditQuizReq {
  quizId: string
  deletedItemIdxs: number[]
  additionalInstructions: string
}

export interface EditQuizRes {
  quizSlug: string
}

export interface PublishQuizReq {
  quizId: string
}

export interface PublishQuizRes {
  publishedAt: Date | null
}

export interface GetQuizRes {
  id: string
  title: string
  slug: string
  items: QuizItem[]
  deletedItems: QuizItem[]
  sourceId: string
  createdAt: Date
  publishedAt: Date | null
  source: {
    url: string
    title: string
    favicon: string | null
  }
}

export type GetQuizzesRes = GetQuizRes[]
