export interface SuccessRes {
  success: boolean
}

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
  quizId: string
}

export interface EditQuizReq {
  quizId: string
  deletedItemIdxs: number[]
  additionalInstructions: string
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
