import { describe, it, expect } from 'vitest';
import { EngagementEngine } from '@/lib/engagement/engagement-engine';
import { EngagementState, ConceptProgress } from '@/types';

describe('EngagementEngine', () => {
  const engine = new EngagementEngine();

  describe('awardXP', () => {
    it('awards 100 XP for concept mastery', () => {
      expect(engine.awardXP('mastery', 0)).toBe(100);
      expect(engine.awardXP('mastery', 250)).toBe(350);
    });

    it('awards 20 XP for review completion', () => {
      expect(engine.awardXP('review', 0)).toBe(20);
      expect(engine.awardXP('review', 100)).toBe(120);
    });
  });

  describe('calculateLevel', () => {
    it('starts at level 1 with 0 XP', () => {
      expect(engine.calculateLevel(0)).toBe(1);
    });

    it('advances monotonically with XP', () => {
      expect(engine.calculateLevel(99)).toBe(1);
      expect(engine.calculateLevel(100)).toBe(2);
      expect(engine.calculateLevel(400)).toBe(3);
      expect(engine.calculateLevel(900)).toBe(4);
      expect(engine.calculateLevel(1600)).toBe(5);
    });
  });

  describe('updateStreak and freeze days', () => {
    const baseState: EngagementState = {
      xp: 0,
      level: 1,
      streak: 0,
      freezeDaysRemaining: 2,
      lastActivityDate: null,
      weeklyGoal: 3,
      weeklyProgress: 0,
      settings: {
        remindersEnabled: false,
        reminderTime: '09:00',
        pausedUntil: null,
      },
    };

    it('initializes streak on first activity', () => {
      const today = new Date('2026-04-01T10:00:00Z');
      const updated = engine.updateStreak(today, baseState);

      expect(updated.streak).toBe(1);
      expect(updated.freezeDaysRemaining).toBe(2);
      expect(updated.lastActivityDate).toEqual(today);
    });

    it('keeps streak identical on multiple activities on same day', () => {
      const day1Morning = new Date('2026-04-01T08:00:00Z');
      const day1Evening = new Date('2026-04-01T20:00:00Z');

      const state1 = engine.updateStreak(day1Morning, baseState);
      const state2 = engine.updateStreak(day1Evening, state1);

      expect(state2.streak).toBe(1);
      expect(state2.freezeDaysRemaining).toBe(2);
    });

    it('increments streak on consecutive day', () => {
      const day1 = new Date('2026-04-01T10:00:00Z');
      const day2 = new Date('2026-04-02T10:00:00Z');

      const state1 = engine.updateStreak(day1, baseState);
      const state2 = engine.updateStreak(day2, state1);

      expect(state2.streak).toBe(2);
      expect(state2.freezeDaysRemaining).toBe(2);
    });

    it('preserves streak across a 1-day skip by consuming 1 freeze day', () => {
      const day1 = new Date('2026-04-01T10:00:00Z');
      // Skip April 2, active again on April 3 (diff = 2 days)
      const day3 = new Date('2026-04-03T10:00:00Z');

      const state1 = engine.updateStreak(day1, baseState);
      const state3 = engine.updateStreak(day3, state1);

      expect(state3.streak).toBe(2);
      expect(state3.freezeDaysRemaining).toBe(1);
    });

    it('resets streak to 1 when gap exceeds available freeze days', () => {
      const day1 = new Date('2026-04-01T10:00:00Z');
      // Gap of 10 days
      const day11 = new Date('2026-04-11T10:00:00Z');

      const state1 = engine.updateStreak(day1, baseState);
      const state11 = engine.updateStreak(day11, state1);

      expect(state11.streak).toBe(1);
      expect(state11.freezeDaysRemaining).toBe(2);
    });
  });

  describe('weekly goals and recap', () => {
    it('checks weekly goal correctly', () => {
      const state: EngagementState = {
        xp: 200,
        level: 2,
        streak: 3,
        freezeDaysRemaining: 2,
        lastActivityDate: new Date(),
        weeklyGoal: 4,
        weeklyProgress: 2,
        settings: {
          remindersEnabled: false,
          reminderTime: '09:00',
          pausedUntil: null,
        },
      };

      const status1 = engine.checkWeeklyGoal(state);
      expect(status1.achieved).toBe(false);
      expect(status1.progress).toBe(2);
      expect(status1.target).toBe(4);

      const achievedState = { ...state, weeklyProgress: 4 };
      const status2 = engine.checkWeeklyGoal(achievedState);
      expect(status2.achieved).toBe(true);
    });

    it('generates accurate weekly recap', () => {
      const weekStart = new Date('2026-04-01T00:00:00Z');
      const progressMap = new Map<string, ConceptProgress>();

      progressMap.set('dsa-arrays', {
        conceptId: 'dsa-arrays',
        status: 'mastered',
        lessonsCompleted: 5,
        totalLessons: 5,
        masteryDate: new Date('2026-04-03T12:00:00Z'),
        confidenceScore: 0.95,
        assessmentResults: [],
        weakSubtopics: [],
        lastAttemptDate: new Date('2026-04-03T12:00:00Z'),
      });

      progressMap.set('dsa-linked-lists', {
        conceptId: 'dsa-linked-lists',
        status: 'in-progress',
        lessonsCompleted: 2,
        totalLessons: 4,
        masteryDate: null,
        confidenceScore: 0.5,
        assessmentResults: [],
        weakSubtopics: [],
        lastAttemptDate: null,
      });

      const domainConcepts = new Map<string, string[]>();
      domainConcepts.set('dsa', ['dsa-arrays', 'dsa-linked-lists']);

      const recap = engine.generateWeeklyRecap(progressMap, domainConcepts, weekStart);

      expect(recap.conceptsMastered).toBe(1);
      expect(recap.xpEarned).toBe(100);
      expect(recap.domainProgress['dsa']).toBe(50);
    });

    it('variable reward returns boolean within expectations', () => {
      let trueCount = 0;
      for (let i = 0; i < 200; i++) {
        if (engine.shouldShowChallenge()) trueCount++;
      }
      // Should show between 10% and 35% of the time on average for 20% probability
      expect(trueCount).toBeGreaterThan(10);
      expect(trueCount).toBeLessThan(80);
    });
  });
});
