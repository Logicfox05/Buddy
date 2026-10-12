export type ConceptStatus =
  | 'locked'
  | 'available'
  | 'in-progress'
  | 'mastered'
  | 'fading';

export interface ErrorRecord {
  questionId: string;
  userAnswer: string | string[];
  correctAnswer: string | string[];
  timestamp: Date;
  subtopic: string;
}

export interface AssessmentResult {
  type: 'quiz' | 'explanation' | 'applied' | 'coding';
  passed: boolean;
  score: number;
  maxScore: number;
  attemptDate: Date;
  errors: ErrorRecord[];
}

export interface ConceptProgress {
  conceptId: string;
  status: ConceptStatus;
  lessonsCompleted: number;
  totalLessons: number;
  assessmentResults: AssessmentResult[];
  confidenceScore: number; // 0-100
  weakSubtopics: string[];
  lastAttemptDate: Date | null;
  masteryDate: Date | null;
}

export interface UserProgress {
  concepts: Map<string, ConceptProgress>;
  lastUpdated: Date;
}
