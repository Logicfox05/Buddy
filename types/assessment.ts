export type QuestionType =
  | 'mcq'
  | 'multi-select'
  | 'fill-blank'
  | 'trace'
  | 'debug'
  | 'complexity';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Question {
  id: string;
  type: QuestionType;
  difficulty: Difficulty;
  subtopic: string;
  prompt: string;
  options?: string[]; // For MCQ/multi-select
  correctAnswer: string | string[];
  explanation: string;
}

export interface RubricCriterion {
  id: string;
  description: string;
  points: number;
  keywords?: string[]; // Hints for LLM grading
}

export interface ExplanationTask {
  id: string;
  prompt: string;
  rubric: RubricCriterion[];
  subtopic: string;
}

export interface Example {
  input: string;
  output: string;
  explanation?: string;
}

export interface TestCase {
  input: string;
  expectedOutput: string;
  hidden: boolean;
}

export interface CodingProblem {
  id: string;
  title: string;
  difficulty: Difficulty;
  description: string;
  constraints: string[];
  examples: Example[];
  testCases: TestCase[];
  hints: string[]; // 3 tiers
  editorial: string;
  starterCode: Record<string, string>; // lang -> code
}

export interface ExplanationGrade {
  passed: boolean;
  score: number;
  maxScore: number;
  feedback: string;
  missingCriteria: string[];
}
