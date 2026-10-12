export type Domain =
  | 'dsa'
  | 'algorithms'
  | 'os'
  | 'dbms'
  | 'networks'
  | 'computer-architecture'
  | 'theory-of-computation'
  | 'compilers'
  | 'discrete-math'
  | 'oop-design'
  | 'system-design'
  | 'security';

export type BloomLevel =
  | 'remember'
  | 'understand'
  | 'apply'
  | 'analyze'
  | 'evaluate'
  | 'create';

export interface LearningObjective {
  description: string;
  bloomLevel: BloomLevel;
}

export interface Resource {
  title: string;
  url: string;
  type: 'video' | 'article' | 'docs' | 'interactive';
  license: string;
  estimatedMinutes: number;
}

export interface MicroLesson {
  id: string;
  content: string; // Markdown
  estimatedSeconds: number;
}

export interface AssessmentBank {
  quiz: string[]; // question IDs
  explanation: string[]; // explanation task IDs
  applied: string[]; // applied task IDs
  coding: string[]; // coding problem IDs
}

export interface Concept {
  id: string;
  title: string;
  domain: Domain;
  prerequisites: string[]; // concept IDs
  learningObjectives: LearningObjective[];
  resources: Resource[];
  microLessons: MicroLesson[];
  assessments: AssessmentBank;
}

export interface DomainInfo {
  id: Domain;
  name: string;
  concepts: string[]; // concept IDs
}

export interface Curriculum {
  version: string;
  domains: DomainInfo[];
  concepts: Concept[];
}
