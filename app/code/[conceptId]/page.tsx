'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
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
import { pythonRunner } from '@/services/runner/PythonRunner';
import { jsRunner } from '@/services/runner/JSRunner';

interface CodingQuestion {
  id: string;
  conceptId: string;
  type: 'coding';
  difficulty: string;
  subtopic: string;
  title: string;
  prompt: string;
  starterCode: string;
  language: 'python' | 'javascript';
  testCases: { input: string; expected: string }[];
  hints: string[];
  editorial: string;
}

export default function CodingProblemPage() {
  const params = useParams();
  const conceptId = params.conceptId as string;

  const [concept, setConcept] = useState<Concept | null>(null);
  const [problem, setProblem] = useState<CodingQuestion | null>(null);
  const [record, setRecord] = useState<MasteryRecord | null>(null);

  const [code, setCode] = useState('');
  const [language, setLanguage] = useState<'python' | 'javascript'>('python');

  // Test execution state
  const [running, setRunning] = useState(false);
  const [testResults, setTestResults] = useState<
    { testCase: any; passed: boolean; actual: string; runtime: number }[] | null
  >(null);
  const [consoleOutput, setConsoleOutput] = useState<{
    stdout: string;
    stderr: string;
    runtime: number;
  } | null>(null);

  // Hints & Editorial state
  const [unlockedHints, setUnlockedHints] = useState<number>(0);
  const [showEditorial, setShowEditorial] = useState(false);

  // Mastery success modal
  const [masteryAchieved, setMasteryAchieved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const curRes = await fetch('/curriculum.json');
        const curData: Curriculum = await curRes.json();
        const foundConcept = curData.concepts.find((c) => c.id === conceptId);
        setConcept(foundConcept ?? null);

        const bankRes = await fetch('/assessment-bank.json');
        const bankData = await bankRes.json();
        const foundProblem: CodingQuestion = bankData.questions.find(
          (q: any) => q.conceptId === conceptId && q.type === 'coding'
        );
        if (foundProblem) {
          setProblem(foundProblem);
          setCode(foundProblem.starterCode);
          setLanguage(foundProblem.language || 'python');
        }

        const rec = await db.masteryRecords.get(conceptId);
        if (rec) setRecord(rec);
      } catch (err) {
        console.error('Failed to load coding problem:', err);
      } finally {
        setLoading(false);
      }
    }
    if (conceptId) {
      loadData();
    }
  }, [conceptId]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4" />
        <div className="text-slate-300 font-medium">Loading coding challenge...</div>
      </div>
    );
  }

  if (!concept || !problem) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="text-4xl mb-4">💻</div>
        <h1 className="text-xl font-bold text-white mb-2">No Coding Problem</h1>
        <p className="text-slate-400 text-sm mb-6">
          There is no coding problem required for &quot;{conceptId}&quot;.
        </p>
        <Link
          href={`/quiz/${conceptId}`}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-xl text-sm"
        >
          Back to Assessment
        </Link>
      </div>
    );
  }

  // Detect function name from starter code
  const fnMatch = problem.starterCode.match(/def\s+([a-zA-Z0-9_]+)\s*\(/);
  const fnName = fnMatch ? fnMatch[1] : undefined;

  const handleRunConsole = async () => {
    setRunning(true);
    setTestResults(null);
    try {
      if (language === 'python') {
        const res = await pythonRunner.execute(code);
        setConsoleOutput({
          stdout: res.stdout,
          stderr: res.stderr,
          runtime: res.runtime,
        });
      } else {
        const res = await jsRunner.execute(code);
        setConsoleOutput({
          stdout: res.stdout,
          stderr: res.stderr,
          runtime: res.runtime,
        });
      }
    } catch (err: any) {
      setConsoleOutput({
        stdout: '',
        stderr: err?.message || String(err),
        runtime: 0,
      });
    } finally {
      setRunning(false);
    }
  };

  const handleSubmitTests = async () => {
    setRunning(true);
    setConsoleOutput(null);

    try {
      let results: { testCase: any; passed: boolean; actual: string; runtime: number }[] = [];

      if (language === 'python') {
        results = await pythonRunner.runTests(code, problem.testCases, fnName);
      } else {
        results = await jsRunner.runTests(code, problem.testCases, fnName);
      }

      setTestResults(results);

      const allPassed = results.every((r) => r.passed);

      // If all tests passed, update mastery gate!
      if (allPassed && record) {
        const updatedGates: AssessmentGates = {
          ...record.gates,
          codingPassed: true,
        };

        let updatedRec = { ...record, gates: updatedGates };

        // Attempt mastery transition if all 4 gates are cleared
        if (
          updatedGates.quizPassed &&
          updatedGates.explainPassed &&
          updatedGates.appliedPassed &&
          updatedGates.codingPassed
        ) {
          const outcome = attemptMastery(updatedRec);
          updatedRec = outcome.record;

          if (outcome.xpAwarded > 0) {
            // Schedule card with FSRS
            const card = createCard(conceptId);
            await db.scheduledCards.put(card);

            // Award XP
            const engagement = await db.getOrCreateEngagement();
            engagement.xp += outcome.xpAwarded;
            engagement.weeklyProgress += 1;
            await db.engagementState.put(engagement);

            setMasteryAchieved(true);
          }
        }

        await db.masteryRecords.put(updatedRec);
        setRecord(updatedRec);
      }
    } catch (err: any) {
      console.error('Test execution error:', err);
    } finally {
      setRunning(false);
    }
  };

  const allPassed = testResults && testResults.every((r) => r.passed);

  return (
    <div className="min-h-screen pb-24 p-4 max-w-4xl mx-auto flex flex-col space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <Link
          href={`/quiz/${conceptId}`}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors py-1.5 px-3 rounded-lg bg-slate-900 border border-slate-800"
        >
          <span>←</span>
          <span>Quiz</span>
        </Link>
        <div className="text-center px-2">
          <span className="text-xs uppercase tracking-wider font-bold text-indigo-400">
            Final Gate: Coding Problem
          </span>
          <h2 className="text-sm font-semibold text-white truncate max-w-xs sm:max-w-md">
            {problem.title}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase font-mono px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
            {language}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Problem Description & Hints */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-bold text-white">{problem.title}</h1>
              <span className="text-xs capitalize font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                {problem.difficulty}
              </span>
            </div>

            {/* Prompt */}
            <div className="text-slate-300 text-sm leading-relaxed space-y-3">
              {problem.prompt.split('\n\n').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>

            {/* Test Case Previews */}
            <div className="pt-2 border-t border-slate-800">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Sample Test Cases
              </h3>
              <div className="space-y-1.5">
                {problem.testCases.slice(0, 3).map((tc, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono flex items-center justify-between text-slate-300"
                  >
                    <span>Input: {tc.input}</span>
                    <span className="text-indigo-400">Expected: {tc.expected}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Progressive 3-Tier Hints */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>💡</span> Hints ({unlockedHints}/{problem.hints.length})
              </h3>
              {unlockedHints < problem.hints.length && (
                <button
                  onClick={() => setUnlockedHints((h) => h + 1)}
                  className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Unlock Hint {unlockedHints + 1}
                </button>
              )}
            </div>

            {unlockedHints === 0 ? (
              <p className="text-xs text-slate-500 italic">
                Stuck? Unlock progressive hints to nudge you without spoiling the solution.
              </p>
            ) : (
              <div className="space-y-2">
                {problem.hints.slice(0, unlockedHints).map((hint, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-900/40 text-xs text-indigo-200 leading-relaxed"
                  >
                    <strong className="text-indigo-400">Hint {idx + 1}: </strong>
                    {hint}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Solution Editorial (Unlocked upon passing) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>📖</span> Solution Editorial
              </h3>
              {allPassed && (
                <button
                  onClick={() => setShowEditorial(!showEditorial)}
                  className="text-xs font-bold text-emerald-400 hover:text-emerald-300"
                >
                  {showEditorial ? 'Hide' : 'Reveal'}
                </button>
              )}
            </div>
            {!allPassed ? (
              <p className="text-xs text-slate-500 italic">
                Editorial unlocks after passing all hidden test cases.
              </p>
            ) : showEditorial ? (
              <p className="text-xs text-slate-300 leading-relaxed pt-2 border-t border-slate-800">
                {problem.editorial}
              </p>
            ) : (
              <p className="text-xs text-emerald-400">
                ✓ Solved! Tap &quot;Reveal&quot; to review the formal mathematical analysis.
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Code Editor & Runner */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Solution Code
              </span>
              <button
                onClick={() => setCode(problem.starterCode)}
                className="text-xs text-slate-400 hover:text-white transition-colors"
              >
                Reset Starter
              </button>
            </div>

            {/* Code Input Area */}
            <div className="relative">
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                spellCheck={false}
                rows={12}
                className="w-full bg-slate-950 text-indigo-300 font-mono text-xs sm:text-sm p-4 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 leading-relaxed resize-y"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={handleRunConsole}
                disabled={running}
                className="py-2.5 px-4 rounded-xl font-semibold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700"
              >
                Run Code (Preview)
              </button>
              <button
                onClick={handleSubmitTests}
                disabled={running}
                className="py-2.5 px-6 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
              >
                {running ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Executing Tests...</span>
                  </>
                ) : (
                  <span>Submit & Verify Tests →</span>
                )}
              </button>
            </div>
          </div>

          {/* Test Results Panel */}
          {testResults && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Verification Suite
                </h3>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    allPassed
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                      : 'bg-rose-950 text-rose-400 border border-rose-800/60'
                  }`}
                >
                  {testResults.filter((r) => r.passed).length}/{testResults.length} Tests Passed
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto">
                {testResults.map((res, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-xl border text-xs font-mono flex items-center justify-between ${
                      res.passed
                        ? 'bg-emerald-950/30 border-emerald-900/40 text-emerald-300'
                        : 'bg-rose-950/30 border-rose-900/40 text-rose-300'
                    }`}
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <span>{res.passed ? '✓' : '✕'}</span>
                        <span>Test #{i + 1}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Expected: {res.testCase.expected} · Got: {res.actual}
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500">{res.runtime}ms</span>
                  </div>
                ))}
              </div>

              {allPassed && (
                <div className="pt-2">
                  <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-800/60 text-xs text-emerald-300 flex items-center justify-between">
                    <span className="font-semibold">
                      🎉 Final Gate Passed! Concept verified for mastery.
                    </span>
                    <Link
                      href="/map"
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                    >
                      View Map →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Console Output Panel */}
          {consoleOutput && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-bold uppercase tracking-wider">Console Output</span>
                <span>{consoleOutput.runtime}ms</span>
              </div>
              <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto min-h-[60px]">
                {consoleOutput.stderr ? (
                  <span className="text-rose-400">{consoleOutput.stderr}</span>
                ) : consoleOutput.stdout ? (
                  consoleOutput.stdout
                ) : (
                  <span className="text-slate-600 italic">No output printed</span>
                )}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Mastery Achieved Celebration Modal */}
      {masteryAchieved && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-indigo-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-5 shadow-2xl">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center text-4xl mx-auto shadow-lg shadow-emerald-500/20 animate-bounce">
              🏆
            </div>
            <div>
              <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-400">
                Mastery Achieved!
              </span>
              <h2 className="text-2xl font-black text-white mt-1">
                {concept.title}
              </h2>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                All 4 gates passed: Recall quiz, Explain-it rubric, Applied task, and all hidden test cases!
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-800/40 flex items-center justify-around">
              <div>
                <div className="text-2xl font-black text-amber-400">+{XP_FOR_MASTERY}</div>
                <div className="text-[10px] text-slate-400 uppercase font-semibold">XP Earned</div>
              </div>
              <div className="h-8 w-px bg-slate-800" />
              <div>
                <div className="text-2xl font-black text-emerald-400">FSRS</div>
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Scheduled</div>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <Link
                href="/map"
                className="w-full block py-3.5 px-6 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all"
              >
                Continue on Knowledge Map →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
