/**
 * SessionBuilder — pure domain logic.
 * Builds an ordered list of concept IDs for a learning session.
 * No UI or DB imports.
 */

import type { DueItem } from '../scheduler/types';
import type { Concept } from '@/types/concept';

export interface SessionOptions {
  mode: 'standard' | '5-minute';
  maxCards: number;
  interleave: boolean; // mix domains during review
}

export interface SessionPlan {
  /** Ordered list of concept IDs to review/learn in this session */
  conceptIds: string[];
  dueReviews: string[];
  newConcepts: string[];
  estimatedMinutes: number;
}

const DEFAULT_OPTIONS: SessionOptions = {
  mode: 'standard',
  maxCards: 10,
  interleave: true,
};

/**
 * Build a session plan from:
 * - dueItems: cards that are due for spaced-repetition review
 * - availableConcepts: newly unlocked concepts ready to learn
 * - options: session configuration
 */
export function buildSession(
  dueItems: DueItem[],
  availableConcepts: Concept[],
  options: Partial<SessionOptions> = {}
): SessionPlan {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const maxCards = opts.mode === '5-minute' ? 3 : opts.maxCards;

  // Priority: most-overdue reviews first, then new concepts
  const sortedDue = [...dueItems].sort((a, b) => b.overdueDays - a.overdueDays);

  const dueReviews: string[] = [];
  const newConcepts: string[] = [];

  // In 5-minute mode, reserve 1 slot for a new concept if available
  const wantNew = availableConcepts.length > 0;
  const maxReviews = opts.mode === '5-minute' ? (wantNew ? 2 : 3) : maxCards;

  // Fill reviews
  for (const item of sortedDue) {
    if (dueReviews.length >= maxReviews) break;
    dueReviews.push(item.conceptId);
  }

  // Fill new concepts up to remaining capacity
  const remaining = maxCards - dueReviews.length;
  const newToAdd = opts.mode === '5-minute' ? Math.min(1, remaining) : remaining;
  for (let i = 0; i < Math.min(newToAdd, availableConcepts.length); i++) {
    newConcepts.push(availableConcepts[i].id);
  }

  // Interleave: alternate between reviews and new concepts
  let conceptIds: string[];
  if (opts.interleave && dueReviews.length > 0 && newConcepts.length > 0) {
    conceptIds = interleave(dueReviews, newConcepts);
  } else {
    conceptIds = [...dueReviews, ...newConcepts];
  }

  const estimatedMinutes = conceptIds.length * 5; // rough 5 min per card

  return { conceptIds, dueReviews, newConcepts, estimatedMinutes };
}

/** Round-robin interleave of two arrays */
function interleave<T>(a: T[], b: T[]): T[] {
  const result: T[] = [];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    if (i < a.length) result.push(a[i]);
    if (i < b.length) result.push(b[i]);
  }
  return result;
}
