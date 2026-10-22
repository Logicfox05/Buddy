import { describe, it, expect } from 'vitest';
import {
  APTITUDE_QUESTION_BANK,
  TECHNICAL_QUESTION_BANK,
  HR_QUESTION_BANK
} from '@/lib/interview/mock-bank';
import {
  evaluateHRAttempt,
  computeMockDriveVerdict
} from '@/lib/interview/evaluator';
import { PhaseResult } from '@/types/interview';

describe('Interview Question Banks', () => {
  it('contains valid questions across all 3 phases', () => {
    expect(APTITUDE_QUESTION_BANK.length).toBeGreaterThanOrEqual(5);
    expect(TECHNICAL_QUESTION_BANK.length).toBeGreaterThanOrEqual(5);
    expect(HR_QUESTION_BANK.length).toBeGreaterThanOrEqual(3);
  });

  it('aptitude questions have valid correctIndex within options range', () => {
    for (const q of APTITUDE_QUESTION_BANK) {
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThan(q.options.length);
      expect(q.explanation).toBeTruthy();
    }
  });

  it('technical questions cover core B.Tech CS subjects', () => {
    const categories = new Set(TECHNICAL_QUESTION_BANK.map((q) => q.category));
    expect(categories.has('os')).toBe(true);
    expect(categories.has('dbms')).toBe(true);
    expect(categories.has('networks')).toBe(true);
    expect(categories.has('oops_system_design')).toBe(true);
    expect(categories.has('dsa')).toBe(true);
  });
});

describe('HR Evaluator & STAR Method Breakdown', () => {
  it('detects structured STAR components in good candidate responses', () => {
    const hrQ = HR_QUESTION_BANK[0];
    const candidateResponse =
      'In our final year DBMS project (Situation), we faced sudden deadlock errors during concurrency testing. ' +
      'My task was to optimize the transaction locks within 48 hours (Task). ' +
      'I analyzed pg_stat_activity logs, enforced consistent canonical locking order on account IDs, and rewritten nested joins (Action). ' +
      'As a result, transaction deadlocks reduced to zero, latency improved by 40%, and we successfully delivered on schedule (Result).';

    const evaluation = evaluateHRAttempt(candidateResponse, hrQ);
    expect(evaluation.starBreakdown.situationCovered).toBe(true);
    expect(evaluation.starBreakdown.taskCovered).toBe(true);
    expect(evaluation.starBreakdown.actionCovered).toBe(true);
    expect(evaluation.starBreakdown.resultCovered).toBe(true);
    expect(evaluation.passed).toBe(true);
  });

  it('flags responses lacking STAR structure or too short', () => {
    const hrQ = HR_QUESTION_BANK[0];
    const evaluation = evaluateHRAttempt('I worked hard and fixed it with code.', hrQ);
    expect(evaluation.passed).toBe(false);
    expect(evaluation.interviewerFeedback).toContain('STAR');
  });
});

describe('computeMockDriveVerdict', () => {
  it('awards Strong Hire when all three rounds have stellar scores', () => {
    const apt: PhaseResult = { score: 9, maxScore: 10, percentage: 90, passed: true, timeSpentSeconds: 300, answers: {} };
    const tech: PhaseResult = { score: 9, maxScore: 10, percentage: 90, passed: true, timeSpentSeconds: 600, answers: {} };
    const hr: PhaseResult = { score: 4, maxScore: 4, percentage: 100, passed: true, timeSpentSeconds: 200, answers: {} };

    const verdict = computeMockDriveVerdict(apt, tech, hr);
    expect(verdict.decision).toBe('Strong Hire');
    expect(verdict.overallPercentage).toBeGreaterThanOrEqual(85);
    expect(verdict.strengths.length).toBeGreaterThanOrEqual(2);
  });

  it('flags critical gaps when student needs improvement in technical or aptitude', () => {
    const apt: PhaseResult = { score: 3, maxScore: 10, percentage: 30, passed: false, timeSpentSeconds: 300, answers: {} };
    const tech: PhaseResult = { score: 4, maxScore: 10, percentage: 40, passed: false, timeSpentSeconds: 600, answers: {} };
    const hr: PhaseResult = { score: 2, maxScore: 4, percentage: 50, passed: false, timeSpentSeconds: 200, answers: {} };

    const verdict = computeMockDriveVerdict(apt, tech, hr);
    expect(verdict.decision).toBe('Needs Improvement');
    expect(verdict.criticalGaps.length).toBeGreaterThan(0);
    expect(verdict.targetedConceptIds.length).toBeGreaterThan(0);
  });
});
