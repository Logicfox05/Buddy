import {
  AptitudeQuestion,
  TechnicalInterviewQuestion,
  HRInterviewQuestion,
  PhaseResult,
  MockDriveResult
} from '@/types/interview';
import { evaluateExplanationRubric } from '@/lib/assessment/rubric';

export interface HREvaluation {
  score: number;
  maxScore: number;
  passed: boolean;
  starBreakdown: {
    situationCovered: boolean;
    taskCovered: boolean;
    actionCovered: boolean;
    resultCovered: boolean;
  };
  matchedCriteria: string[];
  missingCriteria: string[];
  interviewerFeedback: string;
}

export function evaluateHRAttempt(
  userText: string,
  question: HRInterviewQuestion
): HREvaluation {
  const normalized = userText.toLowerCase().trim();
  const rawCriteria = question.rubric;

  const baseRubric = evaluateExplanationRubric(userText, rawCriteria);

  // Check for STAR method structure
  const situationKeywords = ['situation', 'context', 'project', 'background', 'when i was', 'during my', 'faced', 'problem'];
  const taskKeywords = ['task', 'goal', 'responsibility', 'objective', 'needed to', 'had to', 'my role'];
  const actionKeywords = ['action', 'i implemented', 'i designed', 'i analyzed', 'i used', 'i debugged', 'i solved', 'i proposed', 'i built'];
  const resultKeywords = ['result', 'outcome', 'impact', 'improved', 'reduced', 'achieved', 'metric', 'finally', 'learned', 'delivered'];

  const situationCovered = situationKeywords.some(kw => normalized.includes(kw));
  const taskCovered = taskKeywords.some(kw => normalized.includes(kw));
  const actionCovered = actionKeywords.some(kw => normalized.includes(kw));
  const resultCovered = resultKeywords.some(kw => normalized.includes(kw));

  const starCount = [situationCovered, taskCovered, actionCovered, resultCovered].filter(Boolean).length;

  const finalScore = Math.min(rawCriteria.length, baseRubric.score + (starCount >= 3 ? 1 : 0));
  const passed = finalScore >= Math.ceil(rawCriteria.length * 0.6) && userText.length >= 60;

  let feedback = '';
  if (starCount < 3) {
    feedback = `Structure tip: Ensure your answer explicitly highlights all 4 STAR components (Situation, Task, Action, Result). You missed clear indications of ${
      [!situationCovered && 'Situation', !taskCovered && 'Task', !actionCovered && 'Action', !resultCovered && 'Result']
        .filter(Boolean)
        .join(', ')
    }.`;
  } else if (passed) {
    feedback = `Strong behavioral answer! Structured clearly with clear STAR progression and matched ${baseRubric.score}/${rawCriteria.length} evaluation points.`;
  } else {
    feedback = `Good structure, but try elaborating with deeper technical specifics on your personal actions and measurable outcomes.`;
  }

  return {
    score: finalScore,
    maxScore: rawCriteria.length,
    passed,
    starBreakdown: {
      situationCovered,
      taskCovered,
      actionCovered,
      resultCovered,
    },
    matchedCriteria: baseRubric.matchedCriteria,
    missingCriteria: baseRubric.missingCriteria,
    interviewerFeedback: feedback,
  };
}

export function computeMockDriveVerdict(
  aptitudeResult: PhaseResult,
  technicalResult: PhaseResult,
  hrResult: PhaseResult
): MockDriveResult {
  const totalEarned = aptitudeResult.score + technicalResult.score + hrResult.score;
  const totalMax = (aptitudeResult.maxScore || 1) + (technicalResult.maxScore || 1) + (hrResult.maxScore || 1);
  const overallPercentage = Math.round((totalEarned / totalMax) * 100);

  let decision: 'Strong Hire' | 'Hire' | 'Lean Hire' | 'Needs Improvement';
  if (overallPercentage >= 85 && aptitudeResult.passed && technicalResult.passed && hrResult.passed) {
    decision = 'Strong Hire';
  } else if (overallPercentage >= 70 && technicalResult.passed) {
    decision = 'Hire';
  } else if (overallPercentage >= 55) {
    decision = 'Lean Hire';
  } else {
    decision = 'Needs Improvement';
  }

  const strengths: string[] = [];
  const criticalGaps: string[] = [];
  const targetedConceptIds: string[] = [];

  if (aptitudeResult.percentage >= 75) {
    strengths.push('Rapid problem solving & quantitative agility');
  } else {
    criticalGaps.push('Speed and accuracy in Quantitative Aptitude / Logic');
    targetedConceptIds.push('apt.quant.foundations');
  }

  if (technicalResult.percentage >= 75) {
    strengths.push('Solid grasp of B.Tech Core Computer Science principles');
  } else {
    criticalGaps.push('Core CS fundamentals (OS, DBMS, Networks, or OOPs)');
    targetedConceptIds.push('dsa.complexity.big-o', 'os.sync.deadlock', 'dbms.normalization');
  }

  if (hrResult.percentage >= 75) {
    strengths.push('Structured behavioral communication via the STAR technique');
  } else {
    criticalGaps.push('Articulating impact & structured behavioral responses');
    targetedConceptIds.push('hr.star.framework');
  }

  return {
    id: `mock-drive-${Date.now()}`,
    timestamp: Date.now(),
    overallScore: totalEarned,
    overallPercentage,
    decision,
    phases: {
      phase1_aptitude: aptitudeResult,
      phase2_technical: technicalResult,
      phase3_hr: hrResult,
    },
    strengths,
    criticalGaps,
    targetedConceptIds,
  };
}
