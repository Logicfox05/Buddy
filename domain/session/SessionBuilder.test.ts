import { describe, it, expect } from 'vitest';
import { buildSession } from './SessionBuilder';
import type { DueItem } from '../scheduler/types';
import type { Concept } from '@/types/concept';

const mockDueItems: DueItem[] = [
  { conceptId: 'dsa.complexity.big-o', dueDate: '2024-01-01', overdueDays: 5, isNew: false },
  { conceptId: 'dsa.array.basics', dueDate: '2024-01-03', overdueDays: 3, isNew: false },
  { conceptId: 'os.process.basics', dueDate: '2024-01-05', overdueDays: 1, isNew: false },
];

const mockAvailableConcepts: Concept[] = [
  {
    id: 'dsa.array.two-pointers',
    title: 'Two Pointers',
    domain: 'dsa',
    prerequisites: ['dsa.array.basics'],
    learningObjectives: [
      { description: 'Learn two pointers', bloomLevel: 'apply' },
    ],
    resources: [],
    microLessons: [],
    assessments: { quiz: [], explanation: [], applied: [], coding: [] },
  },
  {
    id: 'dsa.linkedlist.singly',
    title: 'Singly Linked List',
    domain: 'dsa',
    prerequisites: ['dsa.array.basics'],
    learningObjectives: [
      { description: 'Learn linked lists', bloomLevel: 'understand' },
    ],
    resources: [],
    microLessons: [],
    assessments: { quiz: [], explanation: [], applied: [], coding: [] },
  },
];

describe('SessionBuilder', () => {
  it('builds standard session with reviews and new concepts', () => {
    const plan = buildSession(mockDueItems, mockAvailableConcepts, {
      mode: 'standard',
      maxCards: 4,
      interleave: true,
    });

    expect(plan.dueReviews).toHaveLength(3);
    expect(plan.newConcepts).toHaveLength(1);
    expect(plan.conceptIds).toHaveLength(4);
    // Should prioritize highest overdue first
    expect(plan.dueReviews[0]).toBe('dsa.complexity.big-o');
  });

  it('handles 5-minute mode correctly (caps at 3 cards)', () => {
    const plan = buildSession(mockDueItems, mockAvailableConcepts, {
      mode: '5-minute',
      interleave: true,
    });

    expect(plan.conceptIds.length).toBeLessThanOrEqual(3);
    expect(plan.newConcepts.length).toBeLessThanOrEqual(1);
    expect(plan.estimatedMinutes).toBe(plan.conceptIds.length * 5);
  });

  it('interleaves reviews and new concepts', () => {
    const plan = buildSession(
      [mockDueItems[0], mockDueItems[1]],
      [mockAvailableConcepts[0], mockAvailableConcepts[1]],
      { mode: 'standard', maxCards: 4, interleave: true }
    );

    expect(plan.conceptIds[0]).toBe(plan.dueReviews[0]);
    expect(plan.conceptIds[1]).toBe(plan.newConcepts[0]);
  });

  it('handles empty due items gracefully', () => {
    const plan = buildSession([], mockAvailableConcepts, {
      mode: 'standard',
      maxCards: 2,
    });

    expect(plan.dueReviews).toHaveLength(0);
    expect(plan.newConcepts).toHaveLength(2);
    expect(plan.conceptIds).toHaveLength(2);
  });

  it('handles empty available concepts gracefully', () => {
    const plan = buildSession(mockDueItems, [], {
      mode: 'standard',
      maxCards: 2,
    });

    expect(plan.dueReviews).toHaveLength(2);
    expect(plan.newConcepts).toHaveLength(0);
    expect(plan.conceptIds).toHaveLength(2);
  });
});
