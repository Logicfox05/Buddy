/**
 * MasteryStateMachine — pure domain logic, no UI or DB imports.
 *
 * States:
 *   locked → available → learning → proving → mastered ⇄ [review due]
 *                                 ↓ (fail)    ↓ (fail re-test)
 *                              learning       fading
 *
 * Mastery requires passing ALL FOUR assessment gates.
 * A failed re-test → fading (NOT back to zero).
 * XP is only awarded when entering mastered for the first time.
 */

export type MasteryState =
  | 'locked'
  | 'available'
  | 'learning'
  | 'proving'
  | 'mastered'
  | 'fading';

export interface AssessmentGates {
  quizPassed: boolean;       // ≥ 80% recall quiz
  explainPassed: boolean;    // ≥ 2/3 rubric points on explain-it
  appliedPassed: boolean;    // trace/bug/complexity task correct
  codingPassed: boolean;     // all hidden tests pass (never LLM-graded)
}

export interface MasteryRecord {
  conceptId: string;
  state: MasteryState;
  gates: AssessmentGates;
  confidenceScore: number;    // 0-100
  weakSubtopics: string[];
  firstMasteredAt: string | null;  // ISO date
  lastReviewedAt: string | null;
  reviewCount: number;
  xpEarned: number;
}

export const XP_FOR_MASTERY = 100;
export const XP_FOR_REVIEW_PASS = 25;

// ── guards ───────────────────────────────────────────────────────────────────

export function allGatesPassed(gates: AssessmentGates): boolean {
  return (
    gates.quizPassed &&
    gates.explainPassed &&
    gates.appliedPassed &&
    gates.codingPassed
  );
}

export function missingGates(gates: AssessmentGates): string[] {
  const missing: string[] = [];
  if (!gates.quizPassed) missing.push('Recall Quiz (≥80%)');
  if (!gates.explainPassed) missing.push('Explain It (≥2/3 rubric points)');
  if (!gates.appliedPassed) missing.push('Applied Task');
  if (!gates.codingPassed) missing.push('Coding Problem (all tests)');
  return missing;
}

// ── state factory ─────────────────────────────────────────────────────────────

export function createMasteryRecord(conceptId: string): MasteryRecord {
  return {
    conceptId,
    state: 'locked',
    gates: {
      quizPassed: false,
      explainPassed: false,
      appliedPassed: false,
      codingPassed: false,
    },
    confidenceScore: 0,
    weakSubtopics: [],
    firstMasteredAt: null,
    lastReviewedAt: null,
    reviewCount: 0,
    xpEarned: 0,
  };
}

// ── transitions ───────────────────────────────────────────────────────────────

/** Called when all prerequisites are mastered */
export function unlock(record: MasteryRecord): MasteryRecord {
  if (record.state !== 'locked') return record;
  return { ...record, state: 'available' };
}

/** Called when the user starts a concept for the first time */
export function startLearning(record: MasteryRecord): MasteryRecord {
  if (record.state !== 'available') return record;
  return { ...record, state: 'learning' };
}

/** Called when all lesson cards have been viewed */
export function startProving(record: MasteryRecord): MasteryRecord {
  if (record.state !== 'learning') return record;
  return { ...record, state: 'proving' };
}

/** Called after each assessment gate result comes in */
export function updateGate(
  record: MasteryRecord,
  gate: keyof AssessmentGates,
  passed: boolean,
  weakSubtopics: string[] = []
): MasteryRecord {
  const updatedGates = { ...record.gates, [gate]: passed };
  const updatedWeak = passed
    ? record.weakSubtopics
    : Array.from(new Set([...record.weakSubtopics, ...weakSubtopics]));

  return { ...record, gates: updatedGates, weakSubtopics: updatedWeak };
}

/** Called when proving phase is submitted — transitions to mastered or back to learning */
export function attemptMastery(
  record: MasteryRecord,
  now: string = new Date().toISOString()
): { record: MasteryRecord; xpAwarded: number; missing: string[] } {
  if (record.state !== 'proving') {
    return { record, xpAwarded: 0, missing: missingGates(record.gates) };
  }

  const missing = missingGates(record.gates);
  if (missing.length > 0) {
    // Failed — retry from learning (reset only failed gates)
    return {
      record: { ...record, state: 'learning' },
      xpAwarded: 0,
      missing,
    };
  }

  // All passed — mastered!
  const isFirstMastery = record.firstMasteredAt === null;
  const xpAwarded = isFirstMastery ? XP_FOR_MASTERY : XP_FOR_REVIEW_PASS;
  return {
    record: {
      ...record,
      state: 'mastered',
      firstMasteredAt: record.firstMasteredAt ?? now,
      lastReviewedAt: now,
      reviewCount: record.reviewCount + 1,
      xpEarned: record.xpEarned + xpAwarded,
      confidenceScore: computeConfidence(record.gates),
    },
    xpAwarded,
    missing: [],
  };
}

/** Called on a FAILED scheduled re-test — fading, not reset */
export function failRetest(record: MasteryRecord): MasteryRecord {
  if (record.state !== 'mastered' && record.state !== 'fading') return record;
  return {
    ...record,
    state: 'fading',
    confidenceScore: Math.max(0, record.confidenceScore - 20),
  };
}

/** Called on a PASSED scheduled re-test */
export function passRetest(
  record: MasteryRecord,
  now: string = new Date().toISOString()
): { record: MasteryRecord; xpAwarded: number } {
  return {
    record: {
      ...record,
      state: 'mastered',
      lastReviewedAt: now,
      reviewCount: record.reviewCount + 1,
      xpEarned: record.xpEarned + XP_FOR_REVIEW_PASS,
      confidenceScore: Math.min(100, record.confidenceScore + 10),
    },
    xpAwarded: XP_FOR_REVIEW_PASS,
  };
}

// ── helpers ───────────────────────────────────────────────────────────────────

function computeConfidence(gates: AssessmentGates): number {
  // All gates equal weight for now; can be tuned
  const passed = Object.values(gates).filter(Boolean).length;
  return Math.round((passed / 4) * 100);
}
