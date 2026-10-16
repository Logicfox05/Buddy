'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/services/storage/db';
import type { Curriculum, Concept } from '@/types/concept';
import {
  attemptMastery,
  type MasteryRecord,
  type AssessmentGates,
  XP_FOR_MASTERY,
} from '@/domain/mastery/MasteryStateMachine';
import { createCard } from '@/domain/scheduler/SchedulerService';
import { evaluateExplanationRubric } from '@/lib/assessment/rubric';

interface QuestionItem {
  id: string;
  conceptId: string;
  type: 'mcq' | 'multi-select' | 'explain-it' | 'trace-output' | 'spot-bug' | 'complexity';
  difficulty: string;
  subtopic: string;
  prompt: string;
  options?: string[];
  correctIndex?: number;
  correctIndices?: number[];
  rubric?: string[];
  modelAnswer?: string;
  explanation: string;
}

export default function QuizRunnerPage() {
  const params = useParams();
  const router = useRouter();
  const conceptId = params.conceptId as string;

  const [concept, setConcept] = useState<Concept | null>(null);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [record, setRecord] = useState<MasteryRecord | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedMCQ, setSelectedMCQ] = useState<number | null>(null);
  const [selectedMulti, setSelectedMulti] = useState<number[]>([]);
  const [explainText, setExplainText] = useState('');

  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState<{
    correct: boolean;
    score: number;
    maxScore: number;
    message: string;
    matchedCriteria?: string[];
    missingCriteria?: string[];
  } | null>(null);

  // Results aggregation
  const [scores, setScores] = useState<
    {
      questionId: string;
      type: string;
      correct: boolean;
      score: number;
      maxScore: number;
    }[]
  >([]);

  const [quizFinished, setQuizFinished] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadQuiz() {
      try {
        const curRes = await fetch('/curriculum.json');
        const curData: Curriculum = await curRes.json();
        const foundConcept = curData.concepts.find((c) => c.id === conceptId);
        setConcept(foundConcept ?? null);

        const bankRes = await fetch('/assessment-bank.json');
        const bankData = await bankRes.json();
        const conceptQuestions: QuestionItem[] = bankData.questions.filter(
          (q: QuestionItem) => q.conceptId === conceptId
        );
        setQuestions(conceptQuestions);

        const rec = await db.masteryRecords.get(conceptId);
        if (rec) setRecord(rec);
      } catch (err) {
        console.error('Failed to load quiz:', err);
      } finally {
        setLoading(false);
      }
    }
    if (conceptId) {
      loadQuiz();
    }
  }, [conceptId]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4" />
        <div className="text-slate-300 font-medium">Loading assessment...</div>
      </div>
    );
  }

  if (!concept || questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="text-4xl mb-4">📝</div>
        <h1 className="text-xl font-bold text-white mb-2">No Questions Available</h1>
        <p className="text-slate-400 text-sm mb-6">
          There are no assessment items seeded for this concept yet.
        </p>
        <Link
          href={`/lesson/${conceptId}`}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-xl text-sm"
        >
          Back to Micro-Lesson
        </Link>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;

  const handleSubmitQuestion = async () => {
    if (!currentQ || submitted) return;

    let isCorrect = false;
    let score = 0;
    const maxScore = 1;
    let message = '';

    if (currentQ.type === 'mcq' || currentQ.type === 'trace-output' || currentQ.type === 'spot-bug' || currentQ.type === 'complexity') {
      isCorrect = selectedMCQ === currentQ.correctIndex;
      score = isCorrect ? 1 : 0;
      message = isCorrect
        ? 'Correct! Excellent recall.'
        : `Incorrect. The correct answer was: "${currentQ.options?.[currentQ.correctIndex ?? 0]}"`;
    } else if (currentQ.type === 'multi-select') {
      const correctSet = new Set(currentQ.correctIndices ?? []);
      const userSet = new Set(selectedMulti);
      const allMatches =
        correctSet.size === userSet.size &&
        [...correctSet].every((val) => userSet.has(val));
      isCorrect = allMatches;
      score = isCorrect ? 1 : 0;
      message = isCorrect
        ? 'All correct options selected!'
        : 'Some options were missed or incorrectly included.';
    } else if (currentQ.type === 'explain-it') {
      const rubric = currentQ.rubric ?? [];
      const rubricResult = evaluateExplanationRubric(explainText, rubric);
      isCorrect = rubricResult.passed;
      score = rubricResult.score;
      message = rubricResult.feedback;

      setFeedback({
        correct: isCorrect,
        score,
        maxScore: rubricResult.maxScore,
        message,
        matchedCriteria: rubricResult.matchedCriteria,
        missingCriteria: rubricResult.missingCriteria,
      });
      setSubmitted(true);

      const newScoreItem = {
        questionId: currentQ.id,
        type: currentQ.type,
        correct: isCorrect,
        score,
        maxScore: rubricResult.maxScore,
      };
      const updatedScores = [...scores, newScoreItem];
      setScores(updatedScores);

      await db.assessmentAttempts.add({
        conceptId,
        questionId: currentQ.id,
        questionType: currentQ.type,
        subtopic: currentQ.subtopic,
        correct: isCorrect,
        score,
        maxScore: rubricResult.maxScore,
        attemptedAt: new Date().toISOString(),
      });
      return;
    }

    setFeedback({
      correct: isCorrect,
      score,
      maxScore,
      message,
    });
    setSubmitted(true);

    const newScoreItem = {
      questionId: currentQ.id,
      type: currentQ.type,
      correct: isCorrect,
      score,
      maxScore,
    };
    const updatedScores = [...scores, newScoreItem];
    setScores(updatedScores);

    // Save attempt to Dexie
    await db.assessmentAttempts.add({
      conceptId,
      questionId: currentQ.id,
      questionType: currentQ.type,
      subtopic: currentQ.subtopic,
      correct: isCorrect,
      score,
      maxScore,
      attemptedAt: new Date().toISOString(),
    });
  };

  const handleNextQuestion = async () => {
    if (isLastQuestion) {
      await finalizeQuiz();
    } else {
      setCurrentIndex((prev) => prev + 1);
      setSelectedMCQ(null);
      setSelectedMulti([]);
      setExplainText('');
      setSubmitted(false);
      setFeedback(null);
    }
  };

  const finalizeQuiz = async () => {
    setQuizFinished(true);

    if (!record) return;

    // Check pass criteria
    const recallQuestions = scores.filter(
      (s) => s.type === 'mcq' || s.type === 'multi-select'
    );
    const recallPass =
      recallQuestions.length === 0 ||
      recallQuestions.filter((s) => s.correct).length / recallQuestions.length >= 0.8;

    const explainQuestions = scores.filter((s) => s.type === 'explain-it');
    const explainPass =
      explainQuestions.length === 0 ||
      explainQuestions.every((s) => s.score >= 2);

    const appliedQuestions = scores.filter(
      (s) =>
        s.type === 'trace-output' ||
        s.type === 'spot-bug' ||
        s.type === 'complexity'
    );
    const appliedPass =
      appliedQuestions.length === 0 ||
      appliedQuestions.every((s) => s.correct);

    const newGates: AssessmentGates = {
      ...record.gates,
      quizPassed: recallPass,
      explainPassed: explainPass,
      appliedPassed: appliedPass,
      // Coding problem is gate 4 (or auto-pass for conceptual concepts without coding)
      codingPassed: concept?.assessments.coding.length === 0 ? true : record.gates.codingPassed,
    };

    let updatedRecord = { ...record, gates: newGates };

    if (newGates.quizPassed && newGates.explainPassed && newGates.appliedPassed && newGates.codingPassed) {
      const result = attemptMastery(updatedRecord);
      updatedRecord = result.record;

      if (result.xpAwarded > 0) {
        const scheduledCard = createCard(conceptId);
        await db.scheduledCards.put(scheduledCard);

        const engagement = await db.getOrCreateEngagement();
        engagement.xp += result.xpAwarded;
        engagement.weeklyProgress += 1;
        await db.engagementState.put(engagement);
      }
    }

    await db.masteryRecords.put(updatedRecord);
    setRecord(updatedRecord);
  };

  return (
    <div className="min-h-screen pb-20 p-4 max-w-2xl mx-auto flex flex-col">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-2 pb-4 border-b border-slate-800">
        <Link
          href={`/lesson/${conceptId}`}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors py-1.5 px-3 rounded-lg bg-slate-900 border border-slate-800"
        >
          <span>←</span>
          <span>Lesson</span>
        </Link>
        <div className="text-center px-2">
          <span className="text-xs uppercase tracking-wider font-bold text-indigo-400">
            Assessment Gate
          </span>
          <h2 className="text-sm font-semibold text-white truncate max-w-[200px] sm:max-w-xs">
            {concept.title}
          </h2>
        </div>
        <div className="text-xs font-mono text-slate-400 py-1.5 px-3 rounded-lg bg-slate-900 border border-slate-800">
          Q {currentIndex + 1}/{questions.length}
        </div>
      </div>

      {!quizFinished ? (
        <div className="flex-1 my-4 flex flex-col space-y-4">
          {/* Question Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs uppercase font-mono font-bold tracking-wider px-2.5 py-1 rounded-full bg-indigo-950/70 border border-indigo-800/40 text-indigo-300">
                {currentQ.type.toUpperCase()}
              </span>
              <span className="text-xs text-slate-500 capitalize font-medium">
                Difficulty: {currentQ.difficulty}
              </span>
            </div>

            {/* Prompt */}
            <div className="text-white font-semibold text-base sm:text-lg mb-6 leading-snug">
              {currentQ.prompt.split('```').map((part, pIdx) => {
                if (pIdx % 2 === 1) {
                  const cleaned = part.replace(/^[a-z]*\n/, '');
                  return (
                    <pre
                      key={pIdx}
                      className="my-3 p-4 rounded-xl bg-slate-950 text-indigo-300 text-xs sm:text-sm font-mono overflow-x-auto border border-slate-800"
                    >
                      <code>{cleaned}</code>
                    </pre>
                  );
                }
                return <span key={pIdx}>{part}</span>;
              })}
            </div>

            {/* Answer Input depending on type */}
            <div className="space-y-2.5 my-2">
              {(currentQ.type === 'mcq' ||
                currentQ.type === 'trace-output' ||
                currentQ.type === 'spot-bug' ||
                currentQ.type === 'complexity') &&
                currentQ.options?.map((opt, optIdx) => {
                  const isSelected = selectedMCQ === optIdx;
                  return (
                    <button
                      key={optIdx}
                      disabled={submitted}
                      onClick={() => setSelectedMCQ(optIdx)}
                      className={`w-full text-left p-4 rounded-xl border text-sm transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-indigo-950/60 border-indigo-500 text-white shadow-md'
                          : 'bg-slate-800/50 hover:bg-slate-800 border-slate-700/60 text-slate-300'
                      } ${submitted ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      <span>{opt}</span>
                      <span
                        className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs ml-3 flex-shrink-0 ${
                          isSelected
                            ? 'border-indigo-400 bg-indigo-500 text-white'
                            : 'border-slate-600'
                        }`}
                      >
                        {isSelected ? '✓' : ''}
                      </span>
                    </button>
                  );
                })}

              {currentQ.type === 'multi-select' &&
                currentQ.options?.map((opt, optIdx) => {
                  const isSelected = selectedMulti.includes(optIdx);
                  const toggleOption = () => {
                    if (submitted) return;
                    setSelectedMulti((prev) =>
                      prev.includes(optIdx)
                        ? prev.filter((i) => i !== optIdx)
                        : [...prev, optIdx]
                    );
                  };
                  return (
                    <button
                      key={optIdx}
                      disabled={submitted}
                      onClick={toggleOption}
                      className={`w-full text-left p-4 rounded-xl border text-sm transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-indigo-950/60 border-indigo-500 text-white shadow-md'
                          : 'bg-slate-800/50 hover:bg-slate-800 border-slate-700/60 text-slate-300'
                      } ${submitted ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      <span>{opt}</span>
                      <span
                        className={`w-5 h-5 rounded-md border flex items-center justify-center text-xs ml-3 flex-shrink-0 ${
                          isSelected
                            ? 'border-indigo-400 bg-indigo-500 text-white'
                            : 'border-slate-600'
                        }`}
                      >
                        {isSelected ? '✓' : ''}
                      </span>
                    </button>
                  );
                })}

              {currentQ.type === 'explain-it' && (
                <div className="space-y-3">
                  <div className="text-xs text-amber-400/90 bg-amber-950/30 border border-amber-800/40 p-2.5 rounded-xl flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span>⚠️</span>
                      <span>Express in your own words. Minimum 50 characters required for evaluation.</span>
                    </span>
                    <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                      explainText.trim().length >= 50 ? 'bg-emerald-900/60 text-emerald-300' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {explainText.trim().length}/50
                    </span>
                  </div>
                  <textarea
                    rows={5}
                    value={explainText}
                    onChange={(e) => setExplainText(e.target.value)}
                    disabled={submitted}
                    placeholder="Type your explanation here. Include key mechanisms, trade-offs, and a concrete example..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}
            </div>

            {/* Feedback & Explanation Card */}
            {submitted && feedback && (
              <div
                className={`mt-6 p-4 rounded-2xl border animate-in fade-in ${
                  feedback.correct
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm mb-1">
                  <span>{feedback.correct ? '✅' : '❌'}</span>
                  <span>{feedback.message}</span>
                </div>
                {feedback.matchedCriteria && feedback.matchedCriteria.length > 0 && (
                  <div className="mt-2 text-xs">
                    <span className="text-emerald-400 font-semibold">Matched criteria:</span>
                    <ul className="list-disc pl-4 mt-1 space-y-0.5 text-emerald-300/90">
                      {feedback.matchedCriteria.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {feedback.missingCriteria && feedback.missingCriteria.length > 0 && (
                  <div className="mt-2 text-xs">
                    <span className="text-amber-400 font-semibold">To improve, consider mentioning:</span>
                    <ul className="list-disc pl-4 mt-1 space-y-0.5 text-amber-300/90">
                      {feedback.missingCriteria.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {currentQ.explanation && (
                  <p className="text-xs mt-2 text-slate-300 leading-relaxed border-t border-slate-800/60 pt-2">
                    <strong className="text-white">Explanation: </strong>
                    {currentQ.explanation}
                  </p>
                )}
                {currentQ.modelAnswer && (
                  <div className="text-xs mt-2 text-slate-300 leading-relaxed border-t border-slate-800/60 pt-2">
                    <strong className="text-white">Model Answer: </strong>
                    <p className="mt-1 italic">{currentQ.modelAnswer}</p>
                  </div>
                )}
              </div>
            )}

            {/* Bottom Actions */}
            <div className="pt-6 mt-6 border-t border-slate-800 flex items-center justify-end">
              {!submitted ? (
                <button
                  onClick={handleSubmitQuestion}
                  disabled={
                    (currentQ.type === 'mcq' && selectedMCQ === null) ||
                    (currentQ.type === 'multi-select' && selectedMulti.length === 0) ||
                    (currentQ.type === 'explain-it' && explainText.trim().length === 0)
                  }
                  className="py-3 px-8 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-lg shadow-indigo-600/30 transition-all"
                >
                  Submit Answer
                </button>
              ) : (
                <button
                  onClick={handleNextQuestion}
                  className="py-3 px-8 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all"
                >
                  {isLastQuestion ? 'View Results →' : 'Next Question →'}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Quiz Summary & Mastery Gates Screen */
        <div className="flex-1 my-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col shadow-2xl space-y-6 text-center">
          <div className="w-16 h-16 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-3xl mx-auto">
            📊
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-white">Assessment Summary</h2>
            <p className="text-slate-400 text-sm mt-1">
              {concept.title} — Verified Learning Gates
            </p>
          </div>

          {/* Gates Review */}
          {record && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 text-left space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Gate Status:
              </h3>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300">1. Recall Quiz (≥80%)</span>
                <span
                  className={`font-semibold ${
                    record.gates.quizPassed ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {record.gates.quizPassed ? '✓ PASSED' : '✕ INCOMPLETE'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300">2. Explain It Rubric (≥2/3)</span>
                <span
                  className={`font-semibold ${
                    record.gates.explainPassed ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {record.gates.explainPassed ? '✓ PASSED' : '✕ INCOMPLETE'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300">3. Applied Task</span>
                <span
                  className={`font-semibold ${
                    record.gates.appliedPassed ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {record.gates.appliedPassed ? '✓ PASSED' : '✕ INCOMPLETE'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300">4. Coding Problem</span>
                <span
                  className={`font-semibold ${
                    record.gates.codingPassed ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {record.gates.codingPassed ? '✓ PASSED' : 'READY TO CODE'}
                </span>
              </div>
            </div>
          )}

          {/* Next steps CTA */}
          <div className="space-y-3 pt-2">
            {concept.assessments.coding.length > 0 && !record?.gates.codingPassed ? (
              <Link
                href={`/code/${concept.id}`}
                className="w-full block py-3.5 px-6 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all"
              >
                Proceed to Coding Problem (Final Gate) →
              </Link>
            ) : (
              <Link
                href="/map"
                className="w-full block py-3.5 px-6 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all"
              >
                View Mastery Progress in Map →
              </Link>
            )}
            <Link
              href={`/lesson/${concept.id}`}
              className="w-full block py-2.5 px-4 rounded-xl font-semibold text-xs text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 transition-colors"
            >
              Review Micro-Lesson Material
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
