import {
  Question,
  ExplanationTask,
  CodingProblem,
  ExplanationGrade,
  TestResult,
  ErrorRecord,
} from '@/types';

export class AssessmentEngine {
  selectQuestions(
    conceptId: string,
    questionBank: Question[],
    count: number
  ): Question[] {
    // Filter questions for this concept
    const available = questionBank.filter((q) => q.id.startsWith(conceptId));
    
    // Shuffle and take requested count
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  gradeQuestion(
    question: Question,
    userAnswer: string | string[]
  ): { correct: boolean; explanation: string } {
    const { correctAnswer, explanation } = question;
    
    let correct = false;
    
    if (Array.isArray(correctAnswer)) {
      // Multi-select or multiple answers
      const userArr = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
      const sortedCorrect = [...correctAnswer].sort();
      const sortedUser = [...userArr].sort();
      correct =
        sortedCorrect.length === sortedUser.length &&
        sortedCorrect.every((val, idx) => val === sortedUser[idx]);
    } else {
      // Single answer (MCQ or fill-blank)
      const userStr = Array.isArray(userAnswer) ? userAnswer[0] : userAnswer;
      correct = userStr.trim().toLowerCase() === correctAnswer.toLowerCase();
    }
    
    return { correct, explanation };
  }

  trackError(
    conceptId: string,
    question: Question,
    userAnswer: string | string[]
  ): ErrorRecord {
    return {
      questionId: question.id,
      userAnswer,
      correctAnswer: question.correctAnswer,
      timestamp: new Date(),
      subtopic: question.subtopic,
    };
  }

  // This will be implemented with LLM provider
  async gradeExplanation(
    task: ExplanationTask,
    userResponse: string,
    // LLM provider will be injected
    gradeFn: (prompt: string, rubric: any) => Promise<ExplanationGrade>
  ): Promise<ExplanationGrade> {
    const prompt = `Grade the following explanation based on the rubric:\n\nPrompt: ${task.prompt}\n\nUser Response: ${userResponse}\n\nRubric: ${JSON.stringify(task.rubric)}`;
    return gradeFn(prompt, task.rubric);
  }

  // This will be implemented with code executor
  async executeCodingProblem(
    problem: CodingProblem,
    userCode: string,
    language: string,
    executeFn: (code: string, testCases: any[], lang: string) => Promise<TestResult[]>
  ): Promise<{
    passed: boolean;
    results: TestResult[];
    runtime: number;
    memory: number;
  }> {
    const results = await executeFn(userCode, problem.testCases, language);
    
    const allPassed = results.every((r) => r.passed);
    const totalRuntime = results.reduce((sum, r) => sum + r.executionTime, 0);
    
    return {
      passed: allPassed,
      results,
      runtime: totalRuntime,
      memory: 0, // Will be calculated by executor
    };
  }
}
