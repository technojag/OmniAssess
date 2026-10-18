/**
 * Integrity / proctoring engine.
 *
 * Detection -> confidence gate -> violation -> warning -> termination.
 *
 * A single noisy frame must never end a test. Only *confirmed* violations
 * (confidence above the per-kind threshold) count, and termination requires
 * either repeated confirmed violations or a severe/one-strike signal
 * (tab switch, window change, camera/mic disabled).
 */

export const integrityConfig = {
  startScore: 100,
  minScore: 0,
  terminationThreshold: Number(process.env.INTEGRITY_TERMINATE_BELOW ?? 35),
  /**
   * Confirmed violations required before a test is force-terminated.
   * Repeated (non-critical) violations beyond the warn budget -> TERMINATE.
   */
  maxWarnings: Number(process.env.PROCTOR_MAX_WARNINGS ?? 3),
  penalties: {
    TAB_HIDDEN: Number(process.env.PENALTY_TAB_HIDDEN ?? 4),
    WINDOW_BLUR: Number(process.env.PENALTY_WINDOW_BLUR ?? 3),
    TAB_SWITCH: Number(process.env.PENALTY_TAB_SWITCH ?? 10),
    WINDOW_CHANGE: Number(process.env.PENALTY_WINDOW_CHANGE ?? 10),
    PHONE_DETECTED: Number(process.env.PENALTY_PHONE_DETECTED ?? 12),
    MULTIPLE_PERSONS: Number(process.env.PENALTY_MULTIPLE_PERSONS ?? 10),
    NO_FACE: Number(process.env.PENALTY_NO_FACE ?? 3),
    MULTIPLE_FACES: Number(process.env.PENALTY_MULTIPLE_FACES ?? 10),
    FACE_AWAY: Number(process.env.PENALTY_FACE_AWAY ?? 2),
    GAZE_AWAY: Number(process.env.PENALTY_GAZE_AWAY ?? 2),
    VOICE_ACTIVITY: Number(process.env.PENALTY_VOICE_ACTIVITY ?? 1),
    CAMERA_DISABLED: Number(process.env.PENALTY_CAMERA_DISABLED ?? 15),
    MIC_DISABLED: Number(process.env.PENALTY_MIC_DISABLED ?? 15),
    SUSPICIOUS_ACTIVITY: Number(process.env.PENALTY_SUSPICIOUS_ACTIVITY ?? 8),
    OTHER: Number(process.env.PENALTY_OTHER ?? 2),
  } as Record<string, number>,
};

/**
 * Minimum model confidence for a signal to count as a *confirmed* violation.
 * Noisy CV signals (phone, face) need more confidence; browser signals are exact.
 */
export const confidenceThresholds: Record<string, number> = {
  PHONE_DETECTED: Number(process.env.CONF_PHONE ?? 0.6),
  MULTIPLE_PERSONS: Number(process.env.CONF_PERSONS ?? 0.6),
  MULTIPLE_FACES: Number(process.env.CONF_FACES ?? 0.6),
  NO_FACE: Number(process.env.CONF_NO_FACE ?? 0.55),
  FACE_AWAY: Number(process.env.CONF_FACE_AWAY ?? 0.6),
  GAZE_AWAY: Number(process.env.CONF_GAZE ?? 0.6),
  TAB_HIDDEN: 0,
  TAB_SWITCH: 0,
  WINDOW_BLUR: 0,
  WINDOW_CHANGE: 0,
  CAMERA_DISABLED: 0,
  MIC_DISABLED: 0,
  VOICE_ACTIVITY: 0,
  SUSPICIOUS_ACTIVITY: 0,
  OTHER: 0,
};

/** Signals that terminate immediately on the first confirmed detection. */
export const criticalKinds = new Set([
  "CAMERA_DISABLED",
  "MIC_DISABLED",
  "TAB_SWITCH",
  "WINDOW_CHANGE",
]);

/** Human-readable labels used in warnings and the integrity report. */
export const kindLabels: Record<string, string> = {
  TAB_HIDDEN: "Tab was hidden",
  TAB_SWITCH: "Tab switched away from the test",
  WINDOW_BLUR: "Test window lost focus",
  WINDOW_CHANGE: "Browser window changed",
  PHONE_DETECTED: "Phone detected in camera frame",
  MULTIPLE_PERSONS: "Multiple persons detected",
  MULTIPLE_FACES: "Multiple faces detected",
  NO_FACE: "Face not visible",
  FACE_AWAY: "Looking away from the screen",
  GAZE_AWAY: "Gaze off-screen",
  VOICE_ACTIVITY: "Voice activity detected",
  CAMERA_DISABLED: "Camera disabled or blocked",
  MIC_DISABLED: "Microphone disabled or blocked",
  SUSPICIOUS_ACTIVITY: "Suspicious activity",
  OTHER: "Integrity signal",
};

export type ProctorAction = "LOG" | "WARNING" | "TERMINATE";

export function penaltyFor(kind: string): number {
  return integrityConfig.penalties[kind] ?? integrityConfig.penalties.OTHER;
}

export function confidenceThresholdFor(kind: string): number {
  return confidenceThresholds[kind] ?? 0.5;
}

export function isCritical(kind: string): boolean {
  return criticalKinds.has(kind);
}

export function labelFor(kind: string): string {
  return kindLabels[kind] ?? kind.replace(/_/g, " ").toLowerCase();
}

/**
 * Two-stage gate:
 *  1. confidence must clear the kind's threshold (else -> LOG, not a violation)
 *  2. the confirmed violation is bucketed into LOG | WARNING | TERMINATE
 */
export function evaluateViolation(input: {
  kind: string;
  confidence: number;
  warningCount: number; // confirmed violations already recorded (pre-increment)
  severity: "LOW" | "MEDIUM" | "HIGH";
  integrityScore: number;
}): {
  confirmed: boolean;
  action: ProctorAction;
  penalty: number;
  severity: "LOW" | "MEDIUM" | "HIGH";
  reason: string;
  threshold: number;
} {
  const threshold = confidenceThresholdFor(input.kind);
  const confirmed = input.confidence >= threshold;
  const penalty = penaltyFor(input.kind);

  if (!confirmed) {
    return {
      confirmed: false,
      action: "LOG",
      penalty: 0,
      severity: "LOW",
      threshold,
      reason: `${labelFor(input.kind)} below confidence threshold (${input.confidence.toFixed(2)} < ${threshold}). Logged, not counted.`,
    };
  }

  const projected = Math.max(integrityConfig.minScore, input.integrityScore - penalty);
  const violCount = input.warningCount + 1; // this is the Nth confirmed violation
  const severity: "LOW" | "MEDIUM" | "HIGH" =
    isCritical(input.kind) || input.severity === "HIGH"
      ? "HIGH"
      : input.severity === "MEDIUM"
        ? "MEDIUM"
        : "LOW";

  if (isCritical(input.kind)) {
    return {
      confirmed: true,
      action: "TERMINATE",
      penalty,
      severity: "HIGH",
      threshold,
      reason: `${labelFor(input.kind)} is a zero-tolerance violation. Test terminated.`,
    };
  }

  if (violCount >= integrityConfig.maxWarnings || projected < integrityConfig.terminationThreshold) {
    return {
      confirmed: true,
      action: "TERMINATE",
      penalty,
      severity: "HIGH",
      threshold,
      reason: `Repeated suspicious activity detected (${violCount} confirmed violations). Test terminated.`,
    };
  }

  return {
    confirmed: true,
    action: "WARNING",
    penalty,
    severity,
    threshold,
    reason: `${labelFor(input.kind)}. Warning ${violCount} of ${Math.max(1, integrityConfig.maxWarnings - 1)}.`,
  };
}

