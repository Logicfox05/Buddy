/**
 * Scheduler types — pure domain types, no UI imports.
 * We wrap ts-fsrs's Card type to keep our interface stable
 * if we ever swap the underlying algorithm.
 */

export type Rating = 1 | 2 | 3 | 4; // Again=1, Hard=2, Good=3, Easy=4

export interface ScheduledCard {
  conceptId: string;
  /** ISO date string for next review */
  due: string;
  /** ts-fsrs Card serialised as plain object */
  fsrsState: FSRSCardState;
  /** Number of successful re-tests (stability proxy) */
  reps: number;
  /** Number of lapses (failed re-tests) */
  lapses: number;
  /** Retrievability at last review (0-1) */
  lastRetrievability: number;
  createdAt: string;
  updatedAt: string;
}

/** Serialisable snapshot of the FSRS card parameters */
export interface FSRSCardState {
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: number; // 0=New 1=Learning 2=Review 3=Relearning
  last_review: string | null;
}

export interface ReviewResult {
  conceptId: string;
  rating: Rating;
  reviewedAt: string;
  nextDue: string;
  updatedCard: ScheduledCard;
}

export interface DueItem {
  conceptId: string;
  dueDate: string;
  overdueDays: number;
  isNew: boolean;
}
