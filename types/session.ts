import { MicroLesson } from './concept';
import { Question, CodingProblem } from './assessment';

export type SessionType = 'full' | 'five-minute' | 'review' | 'low-motivation';

export interface SessionItem {
  type: 'lesson' | 'review-quiz' | 'review-coding';
  conceptId: string;
  content: MicroLesson | Question | CodingProblem;
}

export interface LearningSession {
  id: string;
  items: SessionItem[];
  estimatedMinutes: number;
  type: SessionType;
  createdAt: Date;
}
