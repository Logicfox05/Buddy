export type InterviewPhaseId = 'phase1_aptitude' | 'phase2_technical' | 'phase3_hr';

export type AptitudeCategory = 'quantitative' | 'logical_reasoning' | 'verbal_ability';

export type CoreCSCategory = 'dsa' | 'os' | 'dbms' | 'networks' | 'oops_system_design';

export type HRCategory = 'star_story' | 'cultural_fit' | 'conflict_resolution' | 'career_goals';

export interface BaseQuestion {
  id: string;
  phase: InterviewPhaseId;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  prompt: string;
}

export interface AptitudeQuestion extends BaseQuestion {
  phase: 'phase1_aptitude';
  category: AptitudeCategory;
  type: 'mcq';
  options: string[];
  correctIndex: number;
  explanation: string;
  shortcutTip?: string;
}

export interface TechnicalInterviewQuestion extends BaseQuestion {
  phase: 'phase2_technical';
  category: CoreCSCategory;
  type: 'mcq' | 'explain' | 'code';
  options?: string[];
  correctIndex?: number;
  explanation?: string;
  rubric?: string[];
  sampleModelAnswer?: string;
  codeStarter?: {
    language: 'javascript' | 'python';
    initialCode: string;
    functionName: string;
    testCases: { input: any[]; expected: any; description: string }[];
  };
}

export interface HRInterviewQuestion extends BaseQuestion {
  phase: 'phase3_hr';
  category: HRCategory;
  type: 'behavioral';
  competency: string;
  starGuidelines: {
    situation: string;
    task: string;
    action: string;
    result: string;
  };
  rubric: string[];
  sampleStarResponse: string;
}

export type AnyInterviewQuestion =
  | AptitudeQuestion
  | TechnicalInterviewQuestion
  | HRInterviewQuestion;

export interface PhaseResult {
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  timeSpentSeconds: number;
  answers: Record<string, {
    userResponse: any;
    isCorrect?: boolean;
    score?: number;
    feedback?: string;
  }>;
}

export interface MockDriveResult {
  id: string;
  timestamp: number;
  companyTarget?: string;
  overallScore: number;
  overallPercentage: number;
  decision: 'Strong Hire' | 'Hire' | 'Lean Hire' | 'Needs Improvement';
  phases: {
    phase1_aptitude: PhaseResult;
    phase2_technical: PhaseResult;
    phase3_hr: PhaseResult;
  };
  strengths: string[];
  criticalGaps: string[];
  targetedConceptIds: string[];
}
