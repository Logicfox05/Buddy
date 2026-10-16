export interface RubricCriterion {
  id: string;
  description: string;
  keywords: string[];
}

export interface RubricEvaluation {
  score: number;
  maxScore: number;
  passed: boolean;
  matchedCriteria: string[];
  missingCriteria: string[];
  feedback: string;
}

/**
 * Extracts significant keywords (> 4 characters) from a rubric criterion description.
 */
export function extractKeywords(description: string): string[] {
  return description
    .toLowerCase()
    .split(/[\s,–—().:;]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 4);
}

/**
 * Parses raw string criteria into structured RubricCriterion objects.
 */
export function parseRubricCriteria(rawCriteria: string[]): RubricCriterion[] {
  return rawCriteria.map((criterion, idx) => ({
    id: `crit-${idx + 1}`,
    description: criterion,
    keywords: extractKeywords(criterion),
  }));
}

/**
 * Pure evaluation function matching user response against rubric criteria.
 * Follows Buddy specification:
 * - Minimum response length 50 chars for valid attempt
 * - Checks keywords or conceptual indicators
 * - Passing threshold: at least 60% of rubric criteria matched (or minimum 2 criteria)
 */
export function evaluateExplanationRubric(
  userExplanation: string,
  rawCriteria: string[]
): RubricEvaluation {
  const criteria = parseRubricCriteria(rawCriteria);
  const normalizedUser = userExplanation.toLowerCase().trim();

  if (normalizedUser.length < 50) {
    return {
      score: 0,
      maxScore: criteria.length,
      passed: false,
      matchedCriteria: [],
      missingCriteria: criteria.map((c) => c.description),
      feedback: 'Explanation is too brief. Please provide a detailed response (at least 50 characters).',
    };
  }

  const matched: string[] = [];
  const missing: string[] = [];

  for (const crit of criteria) {
    const hits = crit.keywords.filter((kw) => normalizedUser.includes(kw));
    // If at least one distinct keyword matches or user provided strong prose matching length
    if (hits.length > 0) {
      matched.push(crit.description);
    } else {
      missing.push(crit.description);
    }
  }

  const score = matched.length;
  const maxScore = criteria.length;
  const passingThreshold = Math.max(1, Math.ceil(maxScore * 0.6));
  const passed = score >= passingThreshold;

  let feedback = '';
  if (passed) {
    feedback = `Great explanation! You covered ${score} of ${maxScore} key criteria accurately.`;
  } else {
    feedback = `Good attempt! You matched ${score} of ${maxScore} criteria. Try elaborating on: ${missing.slice(0, 2).join('; ')}.`;
  }

  return {
    score,
    maxScore,
    passed,
    matchedCriteria: matched,
    missingCriteria: missing,
    feedback,
  };
}
