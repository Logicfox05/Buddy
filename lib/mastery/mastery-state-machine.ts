import {
  ConceptStatus,
  ConceptProgress,
  AssessmentResult,
  ErrorRecord,
} from '@/types';

export class MasteryStateMachine {
  getStatus(conceptId: string, progressMap: Map<string, ConceptProgress>): ConceptStatus {
    const progress = progressMap.get(conceptId);
    return progress?.status || 'available';
  }

  transitionToInProgress(progress: ConceptProgress): ConceptProgress {
    return {
      ...progress,
      status: 'in-progress',
      lastAttemptDate: new Date(),
    };
  }

  evaluateMastery(progress: ConceptProgress): {
    achieved: boolean;
    missingRequirements: string[];
  } {
    const missing: string[] = [];
    
    // Check if all assessment types have passing results
    const hasQuiz = progress.assessmentResults.some(
      (r) => r.type === 'quiz' && r.passed
    );
    const hasExplanation = progress.assessmentResults.some(
      (r) => r.type === 'explanation' && r.passed
    );
    const hasApplied = progress.assessmentResults.some(
      (r) => r.type === 'applied' && r.passed
    );
    const hasCoding = progress.assessmentResults.some(
      (r) => r.type === 'coding' && r.passed
    );

    if (!hasQuiz) missing.push('Quiz assessment');
    if (!hasExplanation) missing.push('Explanation task');
    if (!hasApplied) missing.push('Applied task');
    if (!hasCoding) missing.push('Coding problem');

    return {
      achieved: missing.length === 0,
      missingRequirements: missing,
    };
  }

  transitionToMastered(progress: ConceptProgress): ConceptProgress {
    return {
      ...progress,
      status: 'mastered',
      masteryDate: new Date(),
      confidenceScore: this.calculateConfidence(progress.assessmentResults),
    };
  }

  transitionToFading(progress: ConceptProgress): ConceptProgress {
    return {
      ...progress,
      status: 'fading',
      confidenceScore: Math.max(0, progress.confidenceScore - 20),
    };
  }

  calculateConfidence(results: AssessmentResult[]): number {
    if (results.length === 0) return 0;
    
    // Weight recent results more heavily
    const recentResults = results.slice(-5);
    const scores = recentResults.map((r) => (r.score / r.maxScore) * 100);
    
    // Calculate weighted average (more recent = more weight)
    let totalWeight = 0;
    let weightedSum = 0;
    
    scores.forEach((score, index) => {
      const weight = index + 1; // More recent results have higher weight
      weightedSum += score * weight;
      totalWeight += weight;
    });
    
    return Math.round(weightedSum / totalWeight);
  }

  identifyWeakSubtopics(results: AssessmentResult[]): string[] {
    const subtopicErrors: Map<string, { total: number; errors: number }> = new Map();
    
    for (const result of results) {
      for (const error of result.errors) {
        const stats = subtopicErrors.get(error.subtopic) || { total: 0, errors: 0 };
        stats.total++;
        stats.errors++;
        subtopicErrors.set(error.subtopic, stats);
      }
    }
    
    // Return subtopics with < 70% accuracy
    const weak: string[] = [];
    subtopicErrors.forEach((stats, subtopic) => {
      const accuracy = ((stats.total - stats.errors) / stats.total) * 100;
      if (accuracy < 70) {
        weak.push(subtopic);
      }
    });
    
    return weak;
  }
}
