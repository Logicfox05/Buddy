import { TestCase } from './assessment';

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  runtime: number; // milliseconds
  memory: number; // bytes
  timedOut: boolean;
}

export interface TestResult {
  testCase: TestCase;
  passed: boolean;
  actualOutput: string;
  executionTime: number; // milliseconds
}

export interface CodeRunner {
  execute(
    code: string,
    language: string,
    input?: string
  ): Promise<ExecutionResult>;
  executeTests(
    code: string,
    testCases: TestCase[],
    language: string
  ): Promise<TestResult[]>;
  supportsLanguage(language: string): boolean;
}
