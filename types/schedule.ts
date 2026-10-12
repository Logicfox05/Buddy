export type SpacingAlgorithm = 'FSRS' | 'SM2';

export interface ReviewRecord {
  date: Date;
  rating: 1 | 2 | 3 | 4 | 5; // 1=again, 2=hard, 3=good, 4=easy, 5=perfect
  timeTaken: number; // seconds
}

export interface ReviewSchedule {
  conceptId: string;
  algorithm: SpacingAlgorithm;
  // FSRS-specific fields
  stability?: number;
  difficulty?: number;
  // SM-2 specific fields
  easeFactor?: number;
  interval?: number;
  repetitions?: number;
  // Common fields
  lastReviewDate: Date | null;
  nextReviewDate: Date | null;
  reviewHistory: ReviewRecord[];
}
