import { describe, it, expect } from 'vitest';
import {
  extractKeywords,
  parseRubricCriteria,
  evaluateExplanationRubric,
} from '@/lib/assessment/rubric';

describe('Rubric Parsing and Evaluation', () => {
  const sampleRubric = [
    'Mentions contiguous memory allocation and fixed element size',
    'Explains O(1) random access via index arithmetic formula: base + index * size',
    'Discusses worst-case O(n) overhead for insertion and deletion due to element shifting',
  ];

  it('extracts significant keywords filtering short tokens', () => {
    const keywords = extractKeywords(sampleRubric[0]);
    expect(keywords).toContain('contiguous');
    expect(keywords).toContain('memory');
    expect(keywords).toContain('allocation');
    expect(keywords).toContain('element');
    expect(keywords).not.toContain('and');
  });

  it('parses criteria into structured objects with IDs', () => {
    const parsed = parseRubricCriteria(sampleRubric);
    expect(parsed).toHaveLength(3);
    expect(parsed[0].id).toBe('crit-1');
    expect(parsed[0].description).toBe(sampleRubric[0]);
    expect(parsed[0].keywords.length).toBeGreaterThan(0);
  });

  it('rejects explanations shorter than 50 characters', () => {
    const shortText = 'Arrays use contiguous memory.';
    const result = evaluateExplanationRubric(shortText, sampleRubric);

    expect(result.passed).toBe(false);
    expect(result.score).toBe(0);
    expect(result.feedback).toMatch(/at least 50 characters/i);
    expect(result.missingCriteria).toHaveLength(3);
  });

  it('evaluates and passes comprehensive explanation hitting criteria', () => {
    const fullExplanation =
      'Arrays store elements in contiguous memory allocation blocks with a fixed element size. ' +
      'Because memory is sequential, index arithmetic enables O(1) random access with base address calculation. ' +
      'However, inserting or deleting elements causes shifting of neighboring elements leading to O(n) worst-case time.';

    const result = evaluateExplanationRubric(fullExplanation, sampleRubric);

    expect(result.passed).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(2);
    expect(result.matchedCriteria.length).toBeGreaterThanOrEqual(2);
    expect(result.feedback).toMatch(/Great explanation/i);
  });

  it('identifies missing criteria accurately when explanation only covers one concept', () => {
    const partialExplanation =
      'In an array, contiguous memory allocation is used so all the items sit directly next to each other in RAM permanently.';

    const result = evaluateExplanationRubric(partialExplanation, sampleRubric);

    expect(result.score).toBe(1);
    expect(result.passed).toBe(false);
    expect(result.missingCriteria.length).toBe(2);
    expect(result.feedback).toMatch(/Good attempt/i);
  });
});
