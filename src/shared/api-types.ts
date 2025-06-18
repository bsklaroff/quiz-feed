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

export interface EditQuizRes {
  success: boolean
}

export interface GetQuizRes {
  id: string
  title: string
  items: QuizItem[]
  deletedItems: QuizItem[]
  sourceId: string
  createdAt: Date
  source: {
    url: string
    title: string
    favicon: string | null
  }
}
