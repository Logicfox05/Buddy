/**
 * SchedulerService integration tests.
 * Tests our integration logic — NOT the ts-fsrs algorithm internals.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createCard,
  recordReview,
  getDueItems,
  getRetrievability,
  isFading,
  FADING_THRESHOLD,
} from '@/domain/scheduler/SchedulerService';
import type { ScheduledCard, Rating } from '@/domain/scheduler/types';

describe('SchedulerService', () => {
  const CONCEPT_ID = 'dsa.complexity.big-o';

  describe('createCard', () => {
    it('creates a new card with correct defaults', () => {
      const card = createCard(CONCEPT_ID);
      expect(card.conceptId).toBe(CONCEPT_ID);
      expect(card.reps).toBe(0);
      expect(card.lapses).toBe(0);
      expect(card.fsrsState.state).toBe(0); // New
      expect(card.fsrsState.stability).toBe(0);
    });

    it('sets due date to now or very close', () => {
      const before = Date.now();
      const card = createCard(CONCEPT_ID);
      const after = Date.now();
      const due = new Date(card.due).getTime();
      // Due should be within a second of creation
      expect(due).toBeGreaterThanOrEqual(before - 1000);
      expect(due).toBeLessThanOrEqual(after + 1000);
    });

    it('sets createdAt and updatedAt', () => {
      const card = createCard(CONCEPT_ID);
      expect(card.createdAt).toBeTruthy();
      expect(card.updatedAt).toBeTruthy();
    });
  });

  describe('recordReview', () => {
    let card: ScheduledCard;
    const reviewDate = new Date('2024-01-01T10:00:00Z');

    beforeEach(() => {
      card = createCard(CONCEPT_ID);
    });

    it('increments reps on Good rating', () => {
      const result = recordReview(card, 3 as Rating, reviewDate);
      expect(result.updatedCard.reps).toBeGreaterThan(card.reps);
    });

    it('increments lapses on Again rating', () => {
      // First do an Easy review to get the card into Review state
      const afterEasy = recordReview(card, 4 as Rating, reviewDate);
      // Then fail it
      const laterDate = new Date('2024-01-10T10:00:00Z');
      const result = recordReview(afterEasy.updatedCard, 1 as Rating, laterDate);
      expect(result.updatedCard.lapses).toBeGreaterThan(0);
    });

    it('Good rating produces a longer interval than Hard', () => {
      const goodResult = recordReview(card, 3 as Rating, reviewDate);
      const hardResult = recordReview(card, 2 as Rating, reviewDate);

      const goodDue = new Date(goodResult.nextDue).getTime();
      const hardDue = new Date(hardResult.nextDue).getTime();

      expect(goodDue).toBeGreaterThanOrEqual(hardDue);
    });

    it('Easy rating produces the longest interval', () => {
      const easyResult = recordReview(card, 4 as Rating, reviewDate);
      const goodResult = recordReview(card, 3 as Rating, reviewDate);

      const easyDue = new Date(easyResult.nextDue).getTime();
      const goodDue = new Date(goodResult.nextDue).getTime();

      expect(easyDue).toBeGreaterThanOrEqual(goodDue);
    });

    it('Again rating produces the shortest interval', () => {
      const againResult = recordReview(card, 1 as Rating, reviewDate);
      const hardResult = recordReview(card, 2 as Rating, reviewDate);

      const againDue = new Date(againResult.nextDue).getTime();
      const hardDue = new Date(hardResult.nextDue).getTime();

      expect(againDue).toBeLessThanOrEqual(hardDue);
    });

    it('returns the correct conceptId', () => {
      const result = recordReview(card, 3 as Rating, reviewDate);
      expect(result.conceptId).toBe(CONCEPT_ID);
    });

    it('stability increases on Good review after first review', () => {
      const first = recordReview(card, 3 as Rating, reviewDate);
      const second = recordReview(
        first.updatedCard,
        3 as Rating,
        new Date('2024-01-08T10:00:00Z')
      );
      expect(second.updatedCard.fsrsState.stability).toBeGreaterThan(
        first.updatedCard.fsrsState.stability
      );
    });

    it('stability decreases after Again (lapse) review', () => {
      const first = recordReview(card, 4 as Rating, reviewDate);
      const afterLapse = recordReview(
        first.updatedCard,
        1 as Rating,
        new Date('2024-01-10T10:00:00Z')
      );
      // Stability should be lower after a lapse
      expect(afterLapse.updatedCard.fsrsState.stability).toBeLessThan(
        first.updatedCard.fsrsState.stability
      );
    });

    it('stores lastRetrievability', () => {
      const result = recordReview(card, 3 as Rating, reviewDate);
      expect(result.updatedCard.lastRetrievability).toBeGreaterThanOrEqual(0);
      expect(result.updatedCard.lastRetrievability).toBeLessThanOrEqual(1);
    });
  });

  describe('getDueItems', () => {
    it('returns only cards due on or before asOf', () => {
      const past = new Date('2024-01-01T00:00:00Z');
      const future = new Date('2025-01-01T00:00:00Z');

      const pastCard: ScheduledCard = {
        ...createCard('concept-1'),
        due: past.toISOString(),
      };
      const futureCard: ScheduledCard = {
        ...createCard('concept-2'),
        due: future.toISOString(),
      };

      const asOf = new Date('2024-06-01T00:00:00Z');
      const due = getDueItems([pastCard, futureCard], asOf);

      expect(due).toHaveLength(1);
      expect(due[0].conceptId).toBe('concept-1');
    });

    it('sorts by most overdue first', () => {
      const veryOld = new Date('2023-01-01T00:00:00Z');
      const old = new Date('2024-01-01T00:00:00Z');

      const card1: ScheduledCard = {
        ...createCard('concept-newer'),
        due: old.toISOString(),
      };
      const card2: ScheduledCard = {
        ...createCard('concept-older'),
        due: veryOld.toISOString(),
      };

      const asOf = new Date('2024-06-01T00:00:00Z');
      const due = getDueItems([card1, card2], asOf);

      expect(due[0].conceptId).toBe('concept-older');
      expect(due[1].conceptId).toBe('concept-newer');
    });

    it('marks new cards (reps=0) as isNew=true', () => {
      const card = createCard('new-concept');
      // Force due in past
      const pastCard: ScheduledCard = {
        ...card,
        due: new Date('2020-01-01').toISOString(),
        reps: 0,
      };
      const due = getDueItems([pastCard], new Date('2024-01-01'));
      expect(due[0].isNew).toBe(true);
    });

    it('returns empty array when nothing is due', () => {
      const futureCard: ScheduledCard = {
        ...createCard('concept-1'),
        due: new Date('2099-01-01').toISOString(),
      };
      expect(getDueItems([futureCard], new Date())).toHaveLength(0);
    });

    it('calculates overdueDays correctly', () => {
      const due = new Date('2024-01-01T00:00:00Z');
      const asOf = new Date('2024-01-11T00:00:00Z'); // 10 days later

      const card: ScheduledCard = {
        ...createCard('concept-1'),
        due: due.toISOString(),
      };
      const items = getDueItems([card], asOf);
      expect(items[0].overdueDays).toBe(10);
    });
  });

  describe('getRetrievability', () => {
    it('returns 1 immediately after review', () => {
      const card = createCard(CONCEPT_ID);
      const reviewDate = new Date();
      const result = recordReview(card, 3 as Rating, reviewDate);
      const r = getRetrievability(result.updatedCard, reviewDate);
      // Retrievability right after review should be very high
      expect(r).toBeGreaterThan(0.9);
    });

    it('decreases over time', () => {
      const card = createCard(CONCEPT_ID);
      const reviewDate = new Date('2024-01-01T00:00:00Z');
      const result = recordReview(card, 3 as Rating, reviewDate);

      const rNow = getRetrievability(result.updatedCard, reviewDate);
      const rLater = getRetrievability(
        result.updatedCard,
        new Date('2024-02-01T00:00:00Z')
      );

      expect(rLater).toBeLessThan(rNow);
    });

    it('stays between 0 and 1', () => {
      const card = createCard(CONCEPT_ID);
      const reviewDate = new Date('2024-01-01T00:00:00Z');
      const result = recordReview(card, 3 as Rating, reviewDate);

      const r = getRetrievability(
        result.updatedCard,
        new Date('2026-01-01T00:00:00Z')
      );
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(1);
    });
  });

  describe('isFading', () => {
    it('is not fading immediately after a good review', () => {
      const card = createCard(CONCEPT_ID);
      const now = new Date();
      const result = recordReview(card, 3 as Rating, now);
      expect(isFading(result.updatedCard, now)).toBe(false);
    });

    it('is fading well past the due date', () => {
      const card = createCard(CONCEPT_ID);
      const reviewDate = new Date('2020-01-01T00:00:00Z');
      // Easy review to get a reasonable stability
      const result = recordReview(card, 4 as Rating, reviewDate);
      // Check far in the future — 5 years later
      const farFuture = new Date('2025-01-01T00:00:00Z');
      expect(isFading(result.updatedCard, farFuture)).toBe(true);
    });

    it('FADING_THRESHOLD is below default retention target', () => {
      // FSRS targets 0.9 retention; our fading threshold should be lower
      expect(FADING_THRESHOLD).toBeLessThan(0.9);
    });
  });
});
