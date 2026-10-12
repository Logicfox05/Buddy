/**
 * MasteryStateMachine tests — every transition path, every gate combination.
 */

import { describe, it, expect } from 'vitest';
import {
  createMasteryRecord,
  unlock,
  startLearning,
  startProving,
  updateGate,
  attemptMastery,
  failRetest,
  passRetest,
  allGatesPassed,
  missingGates,
  XP_FOR_MASTERY,
  XP_FOR_REVIEW_PASS,
} from '@/domain/mastery/MasteryStateMachine';
import type { MasteryRecord } from '@/domain/mastery/MasteryStateMachine';

// Helper to build a record in 'proving' state with all gates passed
function makeFullyPassedProving(): MasteryRecord {
  let rec = createMasteryRecord('test-concept');
  rec = unlock(rec);
  rec = startLearning(rec);
  rec = startProving(rec);
  rec = updateGate(rec, 'quizPassed', true);
  rec = updateGate(rec, 'explainPassed', true);
  rec = updateGate(rec, 'appliedPassed', true);
  rec = updateGate(rec, 'codingPassed', true);
  return rec;
}

describe('MasteryStateMachine', () => {
  describe('createMasteryRecord', () => {
    it('initialises in locked state', () => {
      const rec = createMasteryRecord('c1');
      expect(rec.state).toBe('locked');
      expect(rec.xpEarned).toBe(0);
      expect(rec.reviewCount).toBe(0);
      expect(rec.firstMasteredAt).toBeNull();
    });

    it('all gates start as false', () => {
      const rec = createMasteryRecord('c1');
      expect(rec.gates.quizPassed).toBe(false);
      expect(rec.gates.explainPassed).toBe(false);
      expect(rec.gates.appliedPassed).toBe(false);
      expect(rec.gates.codingPassed).toBe(false);
    });
  });

  describe('state transitions', () => {
    it('locked → available on unlock', () => {
      const rec = unlock(createMasteryRecord('c1'));
      expect(rec.state).toBe('available');
    });

    it('unlock is idempotent when already available', () => {
      let rec = createMasteryRecord('c1');
      rec = unlock(rec);
      const again = unlock(rec);
      expect(again.state).toBe('available');
    });

    it('available → learning on startLearning', () => {
      let rec = createMasteryRecord('c1');
      rec = unlock(rec);
      rec = startLearning(rec);
      expect(rec.state).toBe('learning');
    });

    it('cannot startLearning from locked', () => {
      const rec = startLearning(createMasteryRecord('c1'));
      expect(rec.state).toBe('locked'); // no-op
    });

    it('learning → proving on startProving', () => {
      let rec = createMasteryRecord('c1');
      rec = unlock(rec);
      rec = startLearning(rec);
      rec = startProving(rec);
      expect(rec.state).toBe('proving');
    });

    it('cannot startProving unless in learning state', () => {
      let rec = createMasteryRecord('c1');
      rec = unlock(rec);
      const result = startProving(rec); // still 'available'
      expect(result.state).toBe('available'); // no-op
    });

    describe('proving → mastered (all gates passed)', () => {
      it('transitions to mastered when all gates pass', () => {
        const rec = makeFullyPassedProving();
        const { record } = attemptMastery(rec);
        expect(record.state).toBe('mastered');
      });

      it('awards XP_FOR_MASTERY on first mastery', () => {
        const rec = makeFullyPassedProving();
        const { xpAwarded } = attemptMastery(rec);
        expect(xpAwarded).toBe(XP_FOR_MASTERY);
      });

      it('sets firstMasteredAt', () => {
        const rec = makeFullyPassedProving();
        const { record } = attemptMastery(rec);
        expect(record.firstMasteredAt).not.toBeNull();
      });

      it('increments reviewCount', () => {
        const rec = makeFullyPassedProving();
        const { record } = attemptMastery(rec);
        expect(record.reviewCount).toBe(1);
      });

      it('confidenceScore is 100 when all gates pass', () => {
        const rec = makeFullyPassedProving();
        const { record } = attemptMastery(rec);
        expect(record.confidenceScore).toBe(100);
      });
    });

    describe('proving → learning (gates not all passed)', () => {
      it('returns to learning when coding gate fails', () => {
        let rec = createMasteryRecord('c1');
        rec = unlock(rec);
        rec = startLearning(rec);
        rec = startProving(rec);
        rec = updateGate(rec, 'quizPassed', true);
        rec = updateGate(rec, 'explainPassed', true);
        rec = updateGate(rec, 'appliedPassed', true);
        // codingPassed stays false
        const { record, missing } = attemptMastery(rec);
        expect(record.state).toBe('learning');
        expect(missing).toContain('Coding Problem (all tests)');
      });

      it('awards no XP when mastery fails', () => {
        let rec = createMasteryRecord('c1');
        rec = unlock(rec);
        rec = startLearning(rec);
        rec = startProving(rec);
        const { xpAwarded } = attemptMastery(rec);
        expect(xpAwarded).toBe(0);
      });

      it('reports all missing gates', () => {
        let rec = createMasteryRecord('c1');
        rec = unlock(rec);
        rec = startLearning(rec);
        rec = startProving(rec);
        const { missing } = attemptMastery(rec);
        expect(missing).toHaveLength(4);
      });
    });

    describe('mastered ↔ fading (re-test logic)', () => {
      it('failed re-test → fading (NOT back to locked or learning)', () => {
        const rec = makeFullyPassedProving();
        const { record: mastered } = attemptMastery(rec);
        const fading = failRetest(mastered);
        expect(fading.state).toBe('fading');
      });

      it('failed re-test reduces confidence but not below 0', () => {
        const rec = makeFullyPassedProving();
        const { record: mastered } = attemptMastery(rec);
        // Force low confidence
        const low = { ...mastered, confidenceScore: 5 };
        const fading = failRetest(low);
        expect(fading.confidenceScore).toBe(0);
      });

      it('passed re-test → mastered from fading', () => {
        const rec = makeFullyPassedProving();
        const { record: mastered } = attemptMastery(rec);
        const fading = failRetest(mastered);
        const { record: restored } = passRetest(fading);
        expect(restored.state).toBe('mastered');
      });

      it('passed re-test awards XP_FOR_REVIEW_PASS', () => {
        const rec = makeFullyPassedProving();
        const { record: mastered } = attemptMastery(rec);
        const fading = failRetest(mastered);
        const { xpAwarded } = passRetest(fading);
        expect(xpAwarded).toBe(XP_FOR_REVIEW_PASS);
      });

      it('passed re-test increases reviewCount', () => {
        const rec = makeFullyPassedProving();
        const { record: mastered } = attemptMastery(rec);
        const { record: reviewed } = passRetest(mastered);
        expect(reviewed.reviewCount).toBe(2); // 1 for mastery + 1 for re-test
      });

      it('XP_FOR_REVIEW_PASS < XP_FOR_MASTERY', () => {
        expect(XP_FOR_REVIEW_PASS).toBeLessThan(XP_FOR_MASTERY);
      });

      it('secondMastery does not reset firstMasteredAt', () => {
        const rec = makeFullyPassedProving();
        const { record: mastered } = attemptMastery(rec, '2024-01-01T00:00:00Z');
        const { record: reviewed } = passRetest(mastered, '2024-02-01T00:00:00Z');
        expect(reviewed.firstMasteredAt).toBe('2024-01-01T00:00:00Z');
      });

      it('failRetest is a no-op on a locked concept', () => {
        const locked = createMasteryRecord('c1');
        const result = failRetest(locked);
        expect(result.state).toBe('locked');
      });
    });
  });

  describe('gate helpers', () => {
    it('allGatesPassed returns true only when all gates are true', () => {
      expect(
        allGatesPassed({
          quizPassed: true,
          explainPassed: true,
          appliedPassed: true,
          codingPassed: true,
        })
      ).toBe(true);
    });

    it('allGatesPassed returns false if any gate fails', () => {
      expect(
        allGatesPassed({
          quizPassed: true,
          explainPassed: true,
          appliedPassed: false,
          codingPassed: true,
        })
      ).toBe(false);
    });

    it('missingGates returns empty array when all pass', () => {
      expect(
        missingGates({
          quizPassed: true,
          explainPassed: true,
          appliedPassed: true,
          codingPassed: true,
        })
      ).toHaveLength(0);
    });

    it('missingGates lists all failing gates', () => {
      const missing = missingGates({
        quizPassed: false,
        explainPassed: false,
        appliedPassed: false,
        codingPassed: false,
      });
      expect(missing).toHaveLength(4);
    });
  });

  describe('updateGate', () => {
    it('updates the specified gate', () => {
      let rec = makeFullyPassedProving();
      rec = updateGate(rec, 'quizPassed', false, ['big-o notation']);
      expect(rec.gates.quizPassed).toBe(false);
    });

    it('accumulates weak subtopics on failure', () => {
      let rec = makeFullyPassedProving();
      rec = updateGate(rec, 'quizPassed', false, ['topic-a']);
      rec = updateGate(rec, 'explainPassed', false, ['topic-b']);
      expect(rec.weakSubtopics).toContain('topic-a');
      expect(rec.weakSubtopics).toContain('topic-b');
    });

    it('deduplicates weak subtopics', () => {
      let rec = makeFullyPassedProving();
      rec = updateGate(rec, 'quizPassed', false, ['topic-a']);
      rec = updateGate(rec, 'appliedPassed', false, ['topic-a']);
      const count = rec.weakSubtopics.filter((t) => t === 'topic-a').length;
      expect(count).toBe(1);
    });

    it('does not add weak subtopics when gate passes', () => {
      let rec = createMasteryRecord('c1');
      rec = updateGate(rec, 'quizPassed', true, ['should-not-appear']);
      expect(rec.weakSubtopics).not.toContain('should-not-appear');
    });
  });

  describe('XP accumulation', () => {
    it('total XP includes mastery + all re-test passes', () => {
      const proving = makeFullyPassedProving();
      const { record: m1 } = attemptMastery(proving);
      const { record: m2 } = passRetest(m1);
      const { record: m3 } = passRetest(m2);
      expect(m3.xpEarned).toBe(XP_FOR_MASTERY + XP_FOR_REVIEW_PASS * 2);
    });
  });
});
