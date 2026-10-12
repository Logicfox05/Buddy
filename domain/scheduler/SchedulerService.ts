/**
 * SchedulerService — wraps ts-fsrs behind a stable interface.
 * All integration logic lives here; the algorithm itself is from ts-fsrs.
 * Unit tests cover this integration logic, not the algorithm internals.
 */

import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating as FSRSRating,
  Card,
  RecordLog,
} from 'ts-fsrs';
import type {
  ScheduledCard,
  FSRSCardState,
  Rating,
  ReviewResult,
  DueItem,
} from './types';

// Map our 1-4 ratings to ts-fsrs Rating enum values
const RATING_MAP: Record<Rating, FSRSRating> = {
  1: FSRSRating.Again, // Again
  2: FSRSRating.Hard,  // Hard
  3: FSRSRating.Good,  // Good
  4: FSRSRating.Easy,  // Easy
};

const f = fsrs(generatorParameters({ enable_fuzz: false }));

// ── helpers ──────────────────────────────────────────────────────────────────

function cardToState(card: Card): FSRSCardState {
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state as number,
    last_review: card.last_review ? card.last_review.toISOString() : null,
  };
}

function stateToCard(state: FSRSCardState): Card {
  return {
    due: new Date(state.due),
    stability: state.stability,
    difficulty: state.difficulty,
    elapsed_days: state.elapsed_days,
    scheduled_days: state.scheduled_days,
    reps: state.reps,
    lapses: state.lapses,
    state: state.state as Card['state'],
    last_review: state.last_review ? new Date(state.last_review) : undefined,
  } as Card;
}

// ── public API ────────────────────────────────────────────────────────────────

/**
 * Create a brand-new ScheduledCard for a concept that just became reviewable.
 */
export function createCard(conceptId: string): ScheduledCard {
  const card = createEmptyCard(new Date());
  const now = new Date().toISOString();
  return {
    conceptId,
    due: card.due.toISOString(),
    fsrsState: cardToState(card),
    reps: 0,
    lapses: 0,
    lastRetrievability: 0,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Record a review rating and return the updated card with the new due date.
 * This is the main integration point with ts-fsrs.
 */
export function recordReview(
  card: ScheduledCard,
  rating: Rating,
  reviewedAt?: Date
): ReviewResult {
  const now = reviewedAt ?? new Date();
  const fsrsCard = stateToCard(card.fsrsState);
  const fsrsRating = RATING_MAP[rating];

  // ts-fsrs returns a RecordLog with scheduling options for each rating.
  // We only apply the chosen rating's result.
  const log: RecordLog = f.repeat(fsrsCard, now);
  const chosen = log[fsrsRating as 1 | 2 | 3 | 4];

  const updatedFsrsCard = chosen.card;
  const retrievability = f.get_retrievability(updatedFsrsCard, now, false) as number;

  const updatedCard: ScheduledCard = {
    ...card,
    due: updatedFsrsCard.due.toISOString(),
    fsrsState: cardToState(updatedFsrsCard),
    reps: updatedFsrsCard.reps,
    lapses: updatedFsrsCard.lapses,
    lastRetrievability: retrievability,
    updatedAt: now.toISOString(),
  };

  return {
    conceptId: card.conceptId,
    rating,
    reviewedAt: now.toISOString(),
    nextDue: updatedFsrsCard.due.toISOString(),
    updatedCard,
  };
}

/**
 * Return all cards that are due on or before `asOf`.
 * Sorted by most overdue first.
 */
export function getDueItems(
  cards: ScheduledCard[],
  asOf: Date = new Date()
): DueItem[] {
  const asOfMs = asOf.getTime();
  return cards
    .filter((c) => new Date(c.due).getTime() <= asOfMs)
    .map((c) => {
      const dueMs = new Date(c.due).getTime();
      const overdueDays = Math.floor((asOfMs - dueMs) / 86_400_000);
      return {
        conceptId: c.conceptId,
        dueDate: c.due,
        overdueDays,
        isNew: c.reps === 0,
      };
    })
    .sort((a, b) => b.overdueDays - a.overdueDays);
}

/**
 * Predict retrievability (0-1) for a card at `asOf`.
 * Useful for "fading" threshold detection.
 */
export function getRetrievability(
  card: ScheduledCard,
  asOf: Date = new Date()
): number {
  const fsrsCard = stateToCard(card.fsrsState);
  return f.get_retrievability(fsrsCard, asOf, false) as number;
}

/**
 * Cards below this retrievability threshold are considered "fading".
 * Based on FSRS default target retention of 0.9.
 */
export const FADING_THRESHOLD = 0.75;

export function isFading(card: ScheduledCard, asOf: Date = new Date()): boolean {
  return getRetrievability(card, asOf) < FADING_THRESHOLD;
}
