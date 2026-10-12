import { EngagementState, WeeklyRecap, ConceptProgress } from '@/types';

const XP_PER_MASTERY = 100;
const XP_PER_REVIEW = 20;
const DEFAULT_FREEZE_DAYS = 2;

export class EngagementEngine {
  awardXP(
    activity: 'mastery' | 'review',
    currentXP: number
  ): number {
    const amount = activity === 'mastery' ? XP_PER_MASTERY : XP_PER_REVIEW;
    return currentXP + amount;
  }

  calculateLevel(xp: number): number {
    // Level formula: sqrt(XP / 100)
    return Math.floor(Math.sqrt(xp / 100)) + 1;
  }

  updateStreak(
    currentDate: Date,
    state: EngagementState
  ): EngagementState {
    if (!state.lastActivityDate) {
      // First activity
      return {
        ...state,
        streak: 1,
        lastActivityDate: currentDate,
        freezeDaysRemaining: DEFAULT_FREEZE_DAYS,
      };
    }

    const lastActivity = new Date(state.lastActivityDate);
    const daysDiff = Math.floor(
      (currentDate.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff === 0) {
      // Same day activity
      return state;
    } else if (daysDiff === 1) {
      // Next day - increment streak
      return {
        ...state,
        streak: state.streak + 1,
        lastActivityDate: currentDate,
        freezeDaysRemaining: DEFAULT_FREEZE_DAYS,
      };
    } else if (daysDiff <= state.freezeDaysRemaining + 1) {
      // Within freeze days - maintain streak
      return {
        ...state,
        streak: state.streak + 1,
        lastActivityDate: currentDate,
        freezeDaysRemaining: Math.max(
          0,
          state.freezeDaysRemaining - (daysDiff - 1)
        ),
      };
    } else {
      // Streak broken
      return {
        ...state,
        streak: 1,
        lastActivityDate: currentDate,
        freezeDaysRemaining: DEFAULT_FREEZE_DAYS,
      };
    }
  }

  shouldShowChallenge(): boolean {
    // 20% probability
    return Math.random() < 0.2;
  }

  generateWeeklyRecap(
    progressMap: Map<string, ConceptProgress>,
    domainConcepts: Map<string, string[]>,
    startDate: Date
  ): WeeklyRecap {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);

    let xpEarned = 0;
    let conceptsMastered = 0;

    for (const progress of progressMap.values()) {
      if (
        progress.masteryDate &&
        progress.masteryDate >= startDate &&
        progress.masteryDate <= endDate
      ) {
        conceptsMastered++;
        xpEarned += XP_PER_MASTERY;
      }
    }

    // Calculate domain progress
    const domainProgress: Record<string, number> = {};
    for (const [domain, conceptIds] of domainConcepts.entries()) {
      const masteredInDomain = conceptIds.filter((id) => {
        const progress = progressMap.get(id);
        return progress?.status === 'mastered';
      }).length;
      domainProgress[domain] =
        (masteredInDomain / conceptIds.length) * 100;
    }

    return {
      weekStartDate: startDate,
      weekEndDate: endDate,
      xpEarned,
      conceptsMastered,
      streakStatus: 'Active', // Will be calculated from state
      domainProgress,
    };
  }

  checkWeeklyGoal(state: EngagementState): {
    achieved: boolean;
    progress: number;
    target: number;
  } {
    return {
      achieved: state.weeklyProgress >= state.weeklyGoal,
      progress: state.weeklyProgress,
      target: state.weeklyGoal,
    };
  }
}
