import { ReviewSchedule, ReviewRecord } from '@/types';

const DEFAULT_EASE_FACTOR = 2.5;
const MIN_EASE_FACTOR = 1.3;

export function createSM2Schedule(conceptId: string): ReviewSchedule {
  return {
    conceptId,
    algorithm: 'SM2',
    easeFactor: DEFAULT_EASE_FACTOR,
    interval: 1,
    repetitions: 0,
    lastReviewDate: null,
    nextReviewDate: null,
    reviewHistory: [],
  };
}

function calculateQuality(rating: 1 | 2 | 3 | 4 | 5): number {
  // Map 1-5 rating to 0-5 quality scale for SM-2
  return rating - 1;
}

export function updateSM2Schedule(
  schedule: ReviewSchedule,
  rating: 1 | 2 | 3 | 4 | 5,
  reviewDate: Date
): ReviewSchedule {
  const quality = calculateQuality(rating);
  
  const record: ReviewRecord = {
    date: reviewDate,
    rating,
    timeTaken: 0,
  };

  let newEaseFactor = schedule.easeFactor!;
  let newInterval = schedule.interval!;
  let newRepetitions = schedule.repetitions!;

  if (quality < 3) {
    // Failed review - reset repetitions
    newRepetitions = 0;
    newInterval = 1;
  } else {
    // Successful review
    newEaseFactor = Math.max(
      MIN_EASE_FACTOR,
      newEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    );

    if (newRepetitions === 0) {
      newInterval = 1;
    } else if (newRepetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(schedule.interval! * newEaseFactor);
    }

    newRepetitions++;
  }

  const nextReview = new Date(reviewDate);
  nextReview.setDate(nextReview.getDate() + newInterval);

  return {
    ...schedule,
    easeFactor: newEaseFactor,
    interval: newInterval,
    repetitions: newRepetitions,
    lastReviewDate: reviewDate,
    nextReviewDate: nextReview,
    reviewHistory: [...schedule.reviewHistory, record],
  };
}
