import { ReviewSchedule, ReviewRecord } from '@/types';

// FSRS Algorithm constants
const DECAY = -0.5;
const FACTOR = 0.9 ** (1 / DECAY) - 1;
const DEFAULT_STABILITY = 0.4;
const DEFAULT_DIFFICULTY = 5;

interface FSRSParameters {
  requestRetention: number;
  maximumInterval: number;
  w: number[]; // 17 weights for the algorithm
}

const DEFAULT_PARAMS: FSRSParameters = {
  requestRetention: 0.9,
  maximumInterval: 36500, // 100 years in days
  w: [
    0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05,
    0.34, 1.26, 0.29, 2.61,
  ],
};

export function createFSRSSchedule(
  conceptId: string,
  initialDifficulty: number = DEFAULT_DIFFICULTY
): ReviewSchedule {
  return {
    conceptId,
    algorithm: 'FSRS',
    stability: DEFAULT_STABILITY,
    difficulty: initialDifficulty,
    lastReviewDate: null,
    nextReviewDate: null,
    reviewHistory: [],
  };
}

function initStability(rating: number, params: FSRSParameters): number {
  return Math.max(params.w[rating - 1], 0.1);
}

function initDifficulty(rating: number, params: FSRSParameters): number {
  return Math.min(Math.max(params.w[4] - (rating - 3) * params.w[5], 1), 10);
}

function nextDifficulty(
  difficulty: number,
  rating: number,
  params: FSRSParameters
): number {
  const delta = rating - 3;
  const newDifficulty =
    difficulty - params.w[6] * delta;
  return Math.min(Math.max(newDifficulty, 1), 10);
}

function nextForgetStability(
  stability: number,
  difficulty: number,
  retrievability: number,
  params: FSRSParameters
): number {
  return (
    params.w[11] *
    Math.pow(difficulty, -params.w[12]) *
    (Math.pow(stability + 1, params.w[13]) - 1) *
    Math.exp((1 - retrievability) * params.w[14])
  );
}

function nextRecallStability(
  stability: number,
  difficulty: number,
  retrievability: number,
  rating: number,
  params: FSRSParameters
): number {
  const hardPenalty = rating === 2 ? params.w[15] : 1;
  const easyBonus = rating === 4 ? params.w[16] : 1;
  
  return (
    stability *
    (1 +
      Math.exp(params.w[8]) *
        (11 - difficulty) *
        Math.pow(stability, -params.w[9]) *
        (Math.exp((1 - retrievability) * params.w[10]) - 1) *
        hardPenalty *
        easyBonus)
  );
}

function calculateRetrievability(
  elapsedDays: number,
  stability: number
): number {
  return Math.pow(1 + (FACTOR * elapsedDays) / stability, DECAY);
}

function calculateInterval(
  stability: number,
  requestRetention: number
): number {
  return Math.round(
    (stability / FACTOR) * (Math.pow(requestRetention, 1 / DECAY) - 1)
  );
}

export function updateFSRSSchedule(
  schedule: ReviewSchedule,
  rating: 1 | 2 | 3 | 4 | 5,
  reviewDate: Date,
  params: FSRSParameters = DEFAULT_PARAMS
): ReviewSchedule {
  const record: ReviewRecord = {
    date: reviewDate,
    rating,
    timeTaken: 0,
  };

  // First review
  if (schedule.reviewHistory.length === 0) {
    const newStability = initStability(rating, params);
    const newDifficulty = initDifficulty(rating, params);
    const interval = calculateInterval(newStability, params.requestRetention);
    
    const nextReview = new Date(reviewDate);
    nextReview.setDate(nextReview.getDate() + Math.min(interval, params.maximumInterval));

    return {
      ...schedule,
      stability: newStability,
      difficulty: newDifficulty,
      lastReviewDate: reviewDate,
      nextReviewDate: nextReview,
      reviewHistory: [record],
    };
  }

  // Subsequent reviews
  const lastReview = schedule.lastReviewDate!;
  const elapsedDays = Math.max(
    1,
    (reviewDate.getTime() - lastReview.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  const retrievability = calculateRetrievability(elapsedDays, schedule.stability!);
  
  let newStability: number;
  if (rating === 1) {
    // Forgot
    newStability = nextForgetStability(
      schedule.stability!,
      schedule.difficulty!,
      retrievability,
      params
    );
  } else {
    // Remembered
    newStability = nextRecallStability(
      schedule.stability!,
      schedule.difficulty!,
      retrievability,
      rating,
      params
    );
  }
  
  const newDifficulty = nextDifficulty(schedule.difficulty!, rating, params);
  const interval = calculateInterval(newStability, params.requestRetention);
  
  const nextReview = new Date(reviewDate);
  nextReview.setDate(nextReview.getDate() + Math.min(interval, params.maximumInterval));

  return {
    ...schedule,
    stability: newStability,
    difficulty: newDifficulty,
    lastReviewDate: reviewDate,
    nextReviewDate: nextReview,
    reviewHistory: [...schedule.reviewHistory, record],
  };
}
