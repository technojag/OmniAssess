// Pure proctoring rules. No database, no HTTP. The numbers come from the exam template,
// with the defaults below used for anything the template does not set.
import { z } from 'zod';

export const VIOLATION_KINDS = [
  'FACE_MISSING',
  'MULTIPLE_FACES',
  'HANDS_HIDDEN',
  'TAB_SWITCH',
  'FULLSCREEN_EXIT',
  'PHONE_DETECTED',
  'OBJECT_DETECTED',
  'GAZE_AWAY',
] as const;
export type ViolationKind = (typeof VIOLATION_KINDS)[number];

export interface ViolationRule {
  penalty: number; // integrity points removed
  warning: boolean; // does it count towards the warning limit?
}

export const DEFAULT_VIOLATIONS: Record<ViolationKind, ViolationRule> = {
  FACE_MISSING: { penalty: 15, warning: true },
  MULTIPLE_FACES: { penalty: 25, warning: true },
  HANDS_HIDDEN: { penalty: 10, warning: false },
  TAB_SWITCH: { penalty: 25, warning: true },
  FULLSCREEN_EXIT: { penalty: 15, warning: true },
  PHONE_DETECTED: { penalty: 25, warning: true },
  OBJECT_DETECTED: { penalty: 10, warning: false },
  GAZE_AWAY: { penalty: 3, warning: false },
};

const ruleSchema = z.object({
  penalty: z.number().int().min(0).max(100),
  warning: z.boolean(),
});

const rulesSchema = z.object({
  enabled: z.boolean().default(true),
  maxWarnings: z.number().int().min(1).max(20).default(3),
  minIntegrity: z.number().int().min(0).max(100).default(40),
  cooldownSeconds: z.number().int().min(0).max(600).default(10),
  violations: z.record(z.enum(VIOLATION_KINDS), ruleSchema).default({}),
});

export interface ProctoringRules {
  enabled: boolean;
  maxWarnings: number;
  minIntegrity: number;
  cooldownSeconds: number;
  violations: Record<ViolationKind, ViolationRule>;
}

/** Turns whatever is stored in the template (or nothing) into complete, valid rules. */
export function resolveRules(raw: unknown): ProctoringRules {
  const parsed = rulesSchema.safeParse(raw ?? {});
  const base = parsed.success ? parsed.data : rulesSchema.parse({});

  const violations = {} as Record<ViolationKind, ViolationRule>;
  for (const k of VIOLATION_KINDS) violations[k] = base.violations[k] ?? DEFAULT_VIOLATIONS[k];

  return {
    enabled: base.enabled,
    maxWarnings: base.maxWarnings,
    minIntegrity: base.minIntegrity,
    cooldownSeconds: base.cooldownSeconds,
    violations,
  };
}

export interface ProctorState {
  warningCount: number;
  integrityScore: number;
}

export type ProctorDecision =
  | { counted: false; reason: 'DISABLED' | 'COOLDOWN' }
  | {
      counted: true;
      penalty: number;
      warningIssued: boolean;
      warningCount: number;
      integrityScore: number;
      terminate: boolean;
      terminateReason: 'MAX_WARNINGS' | 'LOW_INTEGRITY' | null;
    };

/**
 * Decides what one violation does. `lastCountedAt` is when the SAME kind of violation
 * was last counted (null if never), which is how the cooldown works.
 */
export function applyViolation(
  state: ProctorState,
  kind: ViolationKind,
  at: Date,
  lastCountedAt: Date | null,
  rules: ProctoringRules,
): ProctorDecision {
  if (!rules.enabled) return { counted: false, reason: 'DISABLED' };

  if (lastCountedAt && (at.getTime() - lastCountedAt.getTime()) / 1000 < rules.cooldownSeconds) {
    return { counted: false, reason: 'COOLDOWN' };
  }

  const rule = rules.violations[kind];
  const integrityScore = Math.max(0, state.integrityScore - rule.penalty);
  const warningCount = state.warningCount + (rule.warning ? 1 : 0);

  let terminateReason: 'MAX_WARNINGS' | 'LOW_INTEGRITY' | null = null;
  if (warningCount >= rules.maxWarnings) terminateReason = 'MAX_WARNINGS';
  else if (integrityScore < rules.minIntegrity) terminateReason = 'LOW_INTEGRITY';

  return {
    counted: true,
    penalty: rule.penalty,
    warningIssued: rule.warning,
    warningCount,
    integrityScore,
    terminate: terminateReason !== null,
    terminateReason,
  };
}