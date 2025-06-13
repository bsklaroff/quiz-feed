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
