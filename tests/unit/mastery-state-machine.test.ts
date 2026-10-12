import { describe, it, expect } from 'vitest';
import { MasteryStateMachine } from '@/lib/mastery';
import { ConceptProgress, AssessmentResult } from '@/types';

describe('MasteryStateMachine', () => {
  const machine = new MasteryStateMachine();

  describe('evaluateMastery', () => {
    it('should require all assessment types to pass', () => {
      const progress: ConceptProgress = {
        conceptId: 'test-1',
        status: 'in-progress',
        lessonsCompleted: 5,
        totalLessons: 5,
        assessmentResults: [
          {
            type: 'quiz',
            passed: true,
            score: 8,
            maxScore: 10,
            attemptDate: new Date(),
            errors: [],
          },
          {
            type: 'explanation',
            passed: true,
            score: 3,
            maxScore: 3,
            attemptDate: new Date(),
            errors: [],
          },
          {
            type: 'applied',
            passed: true,
            score: 5,
            maxScore: 5,
            attemptDate: new Date(),
            errors: [],
          },
        ],
        confidenceScore: 0,
        weakSubtopics: [],
        lastAttemptDate: null,
        masteryDate: null,
      };

      const result = machine.evaluateMastery(progress);
      
      expect(result.achieved).toBe(false);
      expect(result.missingRequirements).toContain('Coding problem');
    });

    it('should achieve mastery when all assessments pass', () => {
      const progress: ConceptProgress = {
        conceptId: 'test-1',
        status: 'in-progress',
        lessonsCompleted: 5,
        totalLessons: 5,
        assessmentResults: [
          {
            type: 'quiz',
            passed: true,
            score: 8,
            maxScore: 10,
            attemptDate: new Date(),
            errors: [],
          },
          {
            type: 'explanation',
            passed: true,
            score: 3,
            maxScore: 3,
            attemptDate: new Date(),
            errors: [],
          },
          {
            type: 'applied',
            passed: true,
            score: 5,
            maxScore: 5,
            attemptDate: new Date(),
            errors: [],
          },
          {
            type: 'coding',
            passed: true,
            score: 100,
            maxScore: 100,
            attemptDate: new Date(),
            errors: [],
          },
        ],
        confidenceScore: 0,
        weakSubtopics: [],
        lastAttemptDate: null,
        masteryDate: null,
      };

      const result = machine.evaluateMastery(progress);
      
      expect(result.achieved).toBe(true);
      expect(result.missingRequirements).toHaveLength(0);
    });
  });

  describe('calculateConfidence', () => {
    it('should calculate weighted confidence based on recent results', () => {
      const results: AssessmentResult[] = [
        {
          type: 'quiz',
          passed: true,
          score: 7,
          maxScore: 10,
          attemptDate: new Date(),
          errors: [],
        },
        {
          type: 'quiz',
          passed: true,
          score: 9,
          maxScore: 10,
          attemptDate: new Date(),
          errors: [],
        },
      ];

      const confidence = machine.calculateConfidence(results);
      
      expect(confidence).toBeGreaterThan(70);
      expect(confidence).toBeLessThanOrEqual(100);
    });
  });
});
