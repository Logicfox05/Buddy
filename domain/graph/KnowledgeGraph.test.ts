/**
 * KnowledgeGraph domain tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { KnowledgeGraph } from '@/domain/graph/KnowledgeGraph';
import type { Curriculum } from '@/types/concept';

const mockCurriculum: Curriculum = {
  version: '1.0',
  domains: [
    { id: 'dsa', name: 'DSA', concepts: ['big-o', 'arrays', 'linked-list'] },
    { id: 'os', name: 'OS', concepts: ['process'] },
  ],
  concepts: [
    {
      id: 'big-o',
      title: 'Big-O Notation',
      domain: 'dsa',
      prerequisites: [],
      learningObjectives: [],
      resources: [],
      microLessons: [],
      assessments: { quiz: [], explanation: [], applied: [], coding: [] },
    },
    {
      id: 'arrays',
      title: 'Arrays',
      domain: 'dsa',
      prerequisites: ['big-o'],
      learningObjectives: [],
      resources: [],
      microLessons: [],
      assessments: { quiz: [], explanation: [], applied: [], coding: [] },
    },
    {
      id: 'linked-list',
      title: 'Linked Lists',
      domain: 'dsa',
      prerequisites: ['arrays'],
      learningObjectives: [],
      resources: [],
      microLessons: [],
      assessments: { quiz: [], explanation: [], applied: [], coding: [] },
    },
    {
      id: 'process',
      title: 'Processes',
      domain: 'os',
      prerequisites: [],
      learningObjectives: [],
      resources: [],
      microLessons: [],
      assessments: { quiz: [], explanation: [], applied: [], coding: [] },
    },
  ],
};

describe('KnowledgeGraph', () => {
  let graph: KnowledgeGraph;

  beforeEach(() => {
    graph = new KnowledgeGraph();
    graph.load(mockCurriculum);
  });

  describe('load', () => {
    it('loads all concepts', () => {
      expect(graph.getAllConcepts()).toHaveLength(4);
    });

    it('throws on cyclic prerequisites', () => {
      const cyclic: Curriculum = {
        ...mockCurriculum,
        concepts: [
          ...mockCurriculum.concepts,
          {
            id: 'a',
            title: 'A',
            domain: 'dsa',
            prerequisites: ['b'],
            learningObjectives: [],
            resources: [],
            microLessons: [],
            assessments: { quiz: [], explanation: [], applied: [], coding: [] },
          },
          {
            id: 'b',
            title: 'B',
            domain: 'dsa',
            prerequisites: ['a'],
            learningObjectives: [],
            resources: [],
            microLessons: [],
            assessments: { quiz: [], explanation: [], applied: [], coding: [] },
          },
        ],
      };
      const cycleGraph = new KnowledgeGraph();
      expect(() => cycleGraph.load(cyclic)).toThrow(/cycle/i);
    });
  });

  describe('isUnlocked', () => {
    it('concept with no prerequisites is always unlocked', () => {
      expect(graph.isUnlocked('big-o', new Set())).toBe(true);
    });

    it('concept with prerequisites is locked when prereqs not mastered', () => {
      expect(graph.isUnlocked('arrays', new Set())).toBe(false);
    });

    it('concept is unlocked when all prerequisites are mastered', () => {
      expect(graph.isUnlocked('arrays', new Set(['big-o']))).toBe(true);
    });

    it('transitive prerequisites must all be mastered', () => {
      // linked-list requires arrays, arrays requires big-o
      expect(graph.isUnlocked('linked-list', new Set(['big-o']))).toBe(false);
      expect(
        graph.isUnlocked('linked-list', new Set(['big-o', 'arrays']))
      ).toBe(true);
    });

    it('returns false for unknown concept', () => {
      expect(graph.isUnlocked('nonexistent', new Set())).toBe(false);
    });
  });

  describe('getAvailable', () => {
    it('only no-prereq concepts available at start', () => {
      const available = graph.getAvailable(new Set());
      const ids = available.map((c) => c.id);
      expect(ids).toContain('big-o');
      expect(ids).toContain('process');
      expect(ids).not.toContain('arrays');
    });

    it('unlocks arrays once big-o is mastered', () => {
      const available = graph.getAvailable(new Set(['big-o']));
      expect(available.map((c) => c.id)).toContain('arrays');
    });

    it('excludes already-mastered concepts from available', () => {
      const available = graph.getAvailable(new Set(['big-o']));
      expect(available.map((c) => c.id)).not.toContain('big-o');
    });
  });

  describe('getPrerequisiteChain', () => {
    it('returns empty for no-prereq concept', () => {
      expect(graph.getPrerequisiteChain('big-o')).toHaveLength(0);
    });

    it('returns direct prerequisite', () => {
      const chain = graph.getPrerequisiteChain('arrays');
      expect(chain.map((c) => c.id)).toContain('big-o');
    });

    it('returns full transitive chain in topological order', () => {
      const chain = graph.getPrerequisiteChain('linked-list');
      const ids = chain.map((c) => c.id);
      expect(ids).toContain('big-o');
      expect(ids).toContain('arrays');
      // big-o must come before arrays in topological order
      expect(ids.indexOf('big-o')).toBeLessThan(ids.indexOf('arrays'));
    });
  });

  describe('getDependents', () => {
    it('returns concepts that directly depend on the given concept', () => {
      const deps = graph.getDependents('big-o');
      expect(deps.map((c) => c.id)).toContain('arrays');
    });

    it('does not include transitive dependents', () => {
      const deps = graph.getDependents('big-o');
      expect(deps.map((c) => c.id)).not.toContain('linked-list');
    });
  });

  describe('getConceptsByDomain', () => {
    it('returns only concepts in the specified domain', () => {
      const dsa = graph.getConceptsByDomain('dsa');
      expect(dsa.every((c) => c.domain === 'dsa')).toBe(true);
    });

    it('returns correct count', () => {
      expect(graph.getConceptsByDomain('dsa')).toHaveLength(3);
      expect(graph.getConceptsByDomain('os')).toHaveLength(1);
    });
  });
});
