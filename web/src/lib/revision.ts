// Same shape as listRevision() in api/src/modules/revision/revision.service.ts
export type RevisionItem = {
  questionId: string
  addedAt: string
  subject: string
  topic: string | null
  stem: string
  explanation: string | null
  options: { id: string; text: string }[]
  correctOptionId: string | null
}