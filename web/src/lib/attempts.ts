// Same shape as listMyAttempts() in api/src/modules/attempts/attempts.list.ts
export type AttemptRow = {
  id: string
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'TERMINATED' | 'EXPIRED'
  startedAt: string
  submittedAt: string | null
  score: number | null
  maxScore: number | null
  exam: { slug: string; name: string }
  current: { sectionName: string | null } | null
}

// Colour AND a text label are always shown together
export const STATUS_STYLE: Record<string, string> = {
  SUBMITTED: 'bg-green-600 text-white',
  TERMINATED: 'bg-red-600 text-white',
  EXPIRED: 'bg-gray-500 text-white',
  IN_PROGRESS: 'bg-blue-600 text-white',
}