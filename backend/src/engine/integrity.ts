export const integrityConfig = {
  startScore: 100,
  minScore: 0,
  terminationThreshold: Number(process.env.INTEGRITY_TERMINATE_BELOW ?? 35),
  penalties: {
    TAB_HIDDEN: Number(process.env.PENALTY_TAB_HIDDEN ?? 4),
    WINDOW_BLUR: Number(process.env.PENALTY_WINDOW_BLUR ?? 3),
    NO_FACE: Number(process.env.PENALTY_NO_FACE ?? 3),
    MULTIPLE_FACES: Number(process.env.PENALTY_MULTIPLE_FACES ?? 8),
    FACE_AWAY: Number(process.env.PENALTY_FACE_AWAY ?? 2),
    VOICE_ACTIVITY: Number(process.env.PENALTY_VOICE_ACTIVITY ?? 1),
    OTHER: Number(process.env.PENALTY_OTHER ?? 2),
  } as Record<string, number>,
};

export function penaltyFor(kind: string): number {
  return integrityConfig.penalties[kind] ?? integrityConfig.penalties.OTHER;
}
