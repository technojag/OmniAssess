export type Exam = {
  slug: string
  name: { en: string; hi: string }
  detail: { en: string; hi: string }
  available: boolean
  keywords: string[]
}

// Temporary list. Later this will come from the API (exam templates).
export const EXAMS: Exam[] = [
  {
    slug: 'ssc-cgl-full',
    name: { en: 'SSC CGL — Full Exam Simulation', hi: 'SSC CGL — पूरी परीक्षा सिमुलेशन' },
    detail: { en: '4 sections · 60 minutes', hi: '4 सेक्शन · 60 मिनट' },
    available: true,
    keywords: ['ssc', 'cgl', 'staff selection', 'combined graduate level', 'एसएससी', 'सीजीएल'],
  },
  { slug: 'ssc-chsl', name: { en: 'SSC CHSL', hi: 'SSC CHSL' }, detail: { en: 'Tier 1', hi: 'टियर 1' }, available: false, keywords: ['ssc', 'chsl', 'एसएससी', 'सीएचएसएल'] },
  { slug: 'ssc-mts', name: { en: 'SSC MTS', hi: 'SSC MTS' }, detail: { en: 'Paper 1', hi: 'पेपर 1' }, available: false, keywords: ['ssc', 'mts', 'एसएससी', 'एमटीएस'] },
  { slug: 'bank-po', name: { en: 'Bank PO', hi: 'बैंक PO' }, detail: { en: 'Prelims', hi: 'प्रारंभिक' }, available: false, keywords: ['bank', 'banking', 'po', 'ibps', 'sbi', 'बैंक', 'बैंकिंग'] },
  { slug: 'rrb-ntpc', name: { en: 'Railways NTPC', hi: 'रेलवे NTPC' }, detail: { en: 'CBT 1', hi: 'CBT 1' }, available: false, keywords: ['railway', 'railways', 'rrb', 'ntpc', 'रेलवे'] },
  { slug: 'upsc-prelims', name: { en: 'UPSC Prelims', hi: 'UPSC प्रारंभिक' }, detail: { en: 'GS Paper 1', hi: 'सामान्य अध्ययन पेपर 1' }, available: false, keywords: ['upsc', 'civil services', 'ias', 'prelims', 'यूपीएससी'] },
]

const norm = (s: string) => s.normalize('NFC').toLowerCase().trim()

// Edit distance, used to forgive one typing mistake in longer words
function distance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return dp[a.length][b.length]
}

export function searchExams(query: string, list: Exam[] = EXAMS): Exam[] {
  const tokens = norm(query).split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return list

  return list.filter((e) => {
    const words = [...e.keywords, e.name.en, e.name.hi].flatMap((k) => norm(k).split(/[\s—-]+/)).filter(Boolean)
    return tokens.every((tok) => words.some((w) => w.startsWith(tok) || (tok.length >= 4 && distance(w, tok) <= 1)))
  }).sort((a, b) => Number(b.available) - Number(a.available))
}