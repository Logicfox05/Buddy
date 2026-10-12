import { ReviewSchedule } from '@/types';
import { createFSRSSchedule, updateFSRSSchedule } from './fsrs';
import { createSM2Schedule, updateSM2Schedule } from './sm2';

export class SpacedRepetitionScheduler {
  createSchedule(
    conceptId: string,
    algorithm: 'FSRS' | 'SM2' = 'FSRS',
    initialDifficulty?: number
  ): ReviewSchedule {
    if (algorithm === 'FSRS') {
      return createFSRSSchedule(conceptId, initialDifficulty);
    } else {
      return createSM2Schedule(conceptId);
    }
  }

  updateSchedule(
    schedule: ReviewSchedule,
    rating: 1 | 2 | 3 | 4 | 5,
    reviewDate: Date
  ): ReviewSchedule {
    if (schedule.algorithm === 'FSRS') {
      return updateFSRSSchedule(schedule, rating, reviewDate);
    } else {
      return updateSM2Schedule(schedule, rating, reviewDate);
    }
  }

  getDueReviews(currentDate: Date, schedules: ReviewSchedule[]): string[] {
    return schedules
      .filter((schedule) => {
        if (!schedule.nextReviewDate) return false;
        return schedule.nextReviewDate <= currentDate;
      })
      .map((schedule) => schedule.conceptId);
  }

  getUpcomingReviews(
    schedules: ReviewSchedule[],
    days: number
  ): ReviewSchedule[] {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return schedules
      .filter((schedule) => {
        if (!schedule.nextReviewDate) return false;
        const now = new Date();
        return (
          schedule.nextReviewDate > now &&
          schedule.nextReviewDate <= futureDate
        );
      })
      .sort((a, b) => {
        if (!a.nextReviewDate || !b.nextReviewDate) return 0;
        return a.nextReviewDate.getTime() - b.nextReviewDate.getTime();
      });
  }

  calculateNextReviewDate(schedule: ReviewSchedule): Date | null {
    return schedule.nextReviewDate;
  }
}
