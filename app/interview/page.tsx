'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  APTITUDE_QUESTION_BANK,
  TECHNICAL_QUESTION_BANK,
  HR_QUESTION_BANK,
} from '@/lib/interview/mock-bank';
import {
  evaluateHRAttempt,
  computeMockDriveVerdict,
  HREvaluation,
} from '@/lib/interview/evaluator';
import { evaluateExplanationRubric, RubricEvaluation } from '@/lib/assessment/rubric';
import {
  InterviewPhaseId,
  PhaseResult,
  MockDriveResult,
  AptitudeQuestion,
  TechnicalInterviewQuestion,
  HRInterviewQuestion,
} from '@/types/interview';

type ViewMode = 'hub' | 'mock_drive' | 'aptitude_drill' | 'technical_drill' | 'hr_drill';

export default function InterviewPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('hub');

  // --- Full Mock Drive State ---
  const [drivePhase, setDrivePhase] = useState<InterviewPhaseId>('phase1_aptitude');
  const [qIndex, setQIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [textAnswer, setTextAnswer] = useState('');
  const [codeAnswer, setCodeAnswer] = useState('');
  const [rubricResult, setRubricResult] = useState<RubricEvaluation | null>(null);
  const [hrResult, setHrResult] = useState<HREvaluation | null>(null);
  const [timeSpent, setTimeSpent] = useState(0);

  // Phase records
  const [aptitudeScore, setAptitudeScore] = useState(0);
  const [aptitudeAnswers, setAptitudeAnswers] = useState<Record<string, any>>({});

  const [techScore, setTechScore] = useState(0);
  const [techAnswers, setTechAnswers] = useState<Record<string, any>>({});

  const [hrScore, setHrScore] = useState(0);
  const [hrAnswers, setHrAnswers] = useState<Record<string, any>>({});

  const [finalVerdict, setFinalVerdict] = useState<MockDriveResult | null>(null);

  // Timer effect
  useEffect(() => {
    let interval: any;
    if (viewMode === 'mock_drive' && !finalVerdict) {
      interval = setInterval(() => {
        setTimeSpent((t) => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [viewMode, finalVerdict]);

  // Questions for Mock Drive
  const driveAptitudeQuestions = APTITUDE_QUESTION_BANK.slice(0, 4);
  const driveTechQuestions = TECHNICAL_QUESTION_BANK.slice(0, 4);
  const driveHRQuestions = HR_QUESTION_BANK.slice(0, 2);

  const startMockDrive = () => {
    setViewMode('mock_drive');
    setDrivePhase('phase1_aptitude');
    setQIndex(0);
    setSelectedOption(null);
    setShowExplanation(false);
    setTextAnswer('');
    setCodeAnswer('');
    setRubricResult(null);
    setHrResult(null);
    setTimeSpent(0);
    setAptitudeScore(0);
    setAptitudeAnswers({});
    setTechScore(0);
    setTechAnswers({});
    setHrScore(0);
    setHrAnswers({});
    setFinalVerdict(null);
  };

  // --- Handlers for Phase 1 Aptitude ---
  const handleAptitudeSubmit = (q: AptitudeQuestion) => {
    if (selectedOption === null) return;
    const isCorrect = selectedOption === q.correctIndex;
    if (isCorrect) {
      setAptitudeScore((s) => s + 1);
    }
    setAptitudeAnswers((prev) => ({
      ...prev,
      [q.id]: { selected: selectedOption, isCorrect },
    }));
    setShowExplanation(true);
  };

  const handleNextAptitude = () => {
    setShowExplanation(false);
    setSelectedOption(null);
    if (qIndex + 1 < driveAptitudeQuestions.length) {
      setQIndex(qIndex + 1);
    } else {
      // Transition to Phase 2: Technical
      setDrivePhase('phase2_technical');
      setQIndex(0);
      setTextAnswer('');
      setRubricResult(null);
    }
  };

  // --- Handlers for Phase 2 Technical ---
  const handleTechnicalSubmit = (q: TechnicalInterviewQuestion) => {
    if (q.type === 'mcq') {
      if (selectedOption === null) return;
      const isCorrect = selectedOption === q.correctIndex;
      if (isCorrect) setTechScore((s) => s + 1);
      setTechAnswers((prev) => ({ ...prev, [q.id]: { selected: selectedOption, isCorrect } }));
      setShowExplanation(true);
    } else if (q.type === 'explain') {
      if (!textAnswer.trim()) return;
      const evalRes = evaluateExplanationRubric(textAnswer, q.rubric || []);
      setRubricResult(evalRes);
      if (evalRes.passed) setTechScore((s) => s + 1);
      setTechAnswers((prev) => ({ ...prev, [q.id]: { text: textAnswer, eval: evalRes } }));
    } else if (q.type === 'code') {
      // Automatic pass for demonstration if code compiles or has text
      const passed = codeAnswer.includes('return') || codeAnswer.length > 20;
      if (passed) setTechScore((s) => s + 1);
      setTechAnswers((prev) => ({ ...prev, [q.id]: { code: codeAnswer, passed } }));
      setShowExplanation(true);
    }
  };

  const handleNextTechnical = () => {
    setShowExplanation(false);
    setSelectedOption(null);
    setTextAnswer('');
    setCodeAnswer('');
    setRubricResult(null);
    if (qIndex + 1 < driveTechQuestions.length) {
      setQIndex(qIndex + 1);
    } else {
      // Transition to Phase 3: HR
      setDrivePhase('phase3_hr');
      setQIndex(0);
      setHrResult(null);
    }
  };

  // --- Handlers for Phase 3 HR ---
  const handleHRSubmit = (q: HRInterviewQuestion) => {
    if (!textAnswer.trim()) return;
    const evalRes = evaluateHRAttempt(textAnswer, q);
    setHrResult(evalRes);
    if (evalRes.passed) setHrScore((s) => s + 1);
    setHrAnswers((prev) => ({ ...prev, [q.id]: { answer: textAnswer, eval: evalRes } }));
  };

  const handleNextHR = () => {
    setTextAnswer('');
    setHrResult(null);
    if (qIndex + 1 < driveHRQuestions.length) {
      setQIndex(qIndex + 1);
    } else {
      // Finish Drive & Compute Verdict
      finishMockDrive();
    }
  };

  const finishMockDrive = () => {
    const aptRes: PhaseResult = {
      score: aptitudeScore,
      maxScore: driveAptitudeQuestions.length,
      percentage: Math.round((aptitudeScore / driveAptitudeQuestions.length) * 100),
      passed: aptitudeScore >= Math.ceil(driveAptitudeQuestions.length * 0.5),
      timeSpentSeconds: timeSpent,
      answers: aptitudeAnswers,
    };

    const techRes: PhaseResult = {
      score: techScore,
      maxScore: driveTechQuestions.length,
      percentage: Math.round((techScore / driveTechQuestions.length) * 100),
      passed: techScore >= Math.ceil(driveTechQuestions.length * 0.5),
      timeSpentSeconds: timeSpent,
      answers: techAnswers,
    };

    const hrRes: PhaseResult = {
      score: hrScore,
      maxScore: driveHRQuestions.length,
      percentage: Math.round((hrScore / driveHRQuestions.length) * 100),
      passed: hrScore >= 1,
      timeSpentSeconds: timeSpent,
      answers: hrAnswers,
    };

    const verdict = computeMockDriveVerdict(aptRes, techRes, hrRes);
    setFinalVerdict(verdict);
  };

  return (
    <div className="px-4 py-6 pb-24 max-w-xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800">
            Placement Prep Suite
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
            Interview Arena
          </h1>
        </div>
        {viewMode !== 'hub' && (
          <button
            onClick={() => setViewMode('hub')}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 transition"
          >
            ← Exit to Hub
          </button>
        )}
      </div>

      {/* --- VIEW 1: HUB VIEW --- */}
      {viewMode === 'hub' && (
        <div className="space-y-6">
          {/* Main Hero Card */}
          <div className="bg-gradient-to-br from-indigo-900/40 via-purple-900/30 to-slate-900 border border-indigo-700/50 rounded-2xl p-5 shadow-xl relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl"></div>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>🎓</span> Complete 3-Phase Placement Drive
                </h2>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Simulate standard on-campus & off-campus hiring drives: Aptitude screening, Core B.Tech Computer Science questions, and HR STAR round.
                </p>
              </div>
            </div>

            {/* 3 Phases Badges */}
            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 text-center">
                <span className="text-xs font-semibold text-emerald-400 block">Round 1</span>
                <span className="text-[11px] text-slate-300 font-medium">Aptitude</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Quant & Logic</span>
              </div>
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 text-center">
                <span className="text-xs font-semibold text-blue-400 block">Round 2</span>
                <span className="text-[11px] text-slate-300 font-medium">Technical</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Core B.Tech CS</span>
              </div>
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 text-center">
                <span className="text-xs font-semibold text-purple-400 block">Round 3</span>
                <span className="text-[11px] text-slate-300 font-medium">HR Round</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">STAR Method</span>
              </div>
            </div>

            <button
              onClick={startMockDrive}
              className="mt-4 w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-500/25 transition active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <span>🚀</span> Start Full Mock Placement Drive (10 Qs)
            </button>
          </div>

          {/* Drill Rooms Header */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Specialized Drill Arenas
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Aptitude Arena */}
              <div
                onClick={() => setViewMode('aptitude_drill')}
                className="bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 rounded-xl p-4 cursor-pointer transition active:scale-[0.98] group"
              >
                <div className="text-2xl mb-2">🧠</div>
                <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition">
                  Phase 1: Aptitude
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Speed Math, Time-Work, Syllogisms & Logic shortcuts.
                </p>
                <span className="text-[11px] text-emerald-400 font-medium mt-2 inline-block">
                  Practice Round →
                </span>
              </div>

              {/* Technical Arena */}
              <div
                onClick={() => setViewMode('technical_drill')}
                className="bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 rounded-xl p-4 cursor-pointer transition active:scale-[0.98] group"
              >
                <div className="text-2xl mb-2">💻</div>
                <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition">
                  Phase 2: Core CS
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  OS, DBMS, Networks, OOPs & Coding Challenges.
                </p>
                <span className="text-[11px] text-blue-400 font-medium mt-2 inline-block">
                  Practice Round →
                </span>
              </div>

              {/* HR Arena */}
              <div
                onClick={() => setViewMode('hr_drill')}
                className="bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 rounded-xl p-4 cursor-pointer transition active:scale-[0.98] group"
              >
                <div className="text-2xl mb-2">🤝</div>
                <h4 className="text-sm font-bold text-white group-hover:text-purple-400 transition">
                  Phase 3: HR Round
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  STAR Technique coach for behavioral questions.
                </p>
                <span className="text-[11px] text-purple-400 font-medium mt-2 inline-block">
                  Practice Round →
                </span>
              </div>
            </div>
          </div>

          {/* 4-Year B.Tech Computer Science Core Roadmap */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
              <span>📚</span> 4-Year B.Tech Computer Science Core Map
            </h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Standard curriculum topics tested in high-tier engineering campus recruitment interviews.
            </p>

            <div className="space-y-3">
              {/* Year 1 & 2 */}
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-indigo-400">
                    Years 1 & 2: Foundations & Systems
                  </span>
                  <span className="text-[10px] bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-800">
                    Semester 1 - 4
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Link
                    href="/map"
                    className="text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md border border-slate-800 transition"
                  >
                    DSA & Complexity
                  </Link>
                  <Link
                    href="/map"
                    className="text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md border border-slate-800 transition"
                  >
                    Computer Architecture
                  </Link>
                  <Link
                    href="/map"
                    className="text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md border border-slate-800 transition"
                  >
                    Discrete Mathematics
                  </Link>
                </div>
              </div>

              {/* Year 3 */}
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-blue-400">
                    Year 3: The Big 3 Core Placement Subjects
                  </span>
                  <span className="text-[10px] bg-blue-950 text-blue-300 px-2 py-0.5 rounded border border-blue-800">
                    Semester 5 & 6
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Link
                    href="/map"
                    className="text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md border border-slate-800 transition"
                  >
                    Operating Systems (OS)
                  </Link>
                  <Link
                    href="/map"
                    className="text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md border border-slate-800 transition"
                  >
                    Database Management (DBMS)
                  </Link>
                  <Link
                    href="/map"
                    className="text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md border border-slate-800 transition"
                  >
                    Computer Networks (CN)
                  </Link>
                </div>
              </div>

              {/* Year 4 */}
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-purple-400">
                    Year 4: Design, Scalability & Placement
                  </span>
                  <span className="text-[10px] bg-purple-950 text-purple-300 px-2 py-0.5 rounded border border-purple-800">
                    Semester 7 & 8
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Link
                    href="/map"
                    className="text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md border border-slate-800 transition"
                  >
                    OOP & SOLID Design
                  </Link>
                  <Link
                    href="/map"
                    className="text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md border border-slate-800 transition"
                  >
                    System Design & Scalability
                  </Link>
                  <Link
                    href="/map"
                    className="text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md border border-slate-800 transition"
                  >
                    Behavioral & STAR Mastery
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- VIEW 2: MOCK DRIVE SIMULATION --- */}
      {viewMode === 'mock_drive' && !finalVerdict && (
        <div className="space-y-4">
          {/* Phase Banner */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
                {drivePhase === 'phase1_aptitude' && 'Round 1: Aptitude Screening'}
                {drivePhase === 'phase2_technical' && 'Round 2: Core CS Technical'}
                {drivePhase === 'phase3_hr' && 'Round 3: HR & Behavioral Round'}
              </span>
              <div className="text-xs text-slate-400">
                Question {qIndex + 1} of{' '}
                {drivePhase === 'phase1_aptitude'
                  ? driveAptitudeQuestions.length
                  : drivePhase === 'phase2_technical'
                  ? driveTechQuestions.length
                  : driveHRQuestions.length}
              </div>
            </div>
            <div className="text-xs font-mono bg-slate-950 px-2.5 py-1 rounded border border-slate-800 text-slate-300">
              ⏱️ {Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}
            </div>
          </div>

          {/* Phase 1: Aptitude Question Card */}
          {drivePhase === 'phase1_aptitude' && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
              {(() => {
                const q = driveAptitudeQuestions[qIndex];
                return (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                        {q.topic}
                      </span>
                      <span className="text-[11px] text-slate-400 uppercase tracking-wide">
                        {q.difficulty}
                      </span>
                    </div>

                    <p className="text-sm font-medium text-white whitespace-pre-line leading-relaxed">
                      {q.prompt}
                    </p>

                    <div className="space-y-2 pt-2">
                      {q.options.map((opt, idx) => {
                        const isSelected = selectedOption === idx;
                        const isCorrect = idx === q.correctIndex;
                        let btnStyle = 'border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-200';
                        if (showExplanation) {
                          if (isCorrect) {
                            btnStyle = 'border-emerald-600 bg-emerald-950/70 text-emerald-300';
                          } else if (isSelected) {
                            btnStyle = 'border-red-600 bg-red-950/70 text-red-300';
                          }
                        } else if (isSelected) {
                          btnStyle = 'border-indigo-500 bg-indigo-950/50 text-white';
                        }

                        return (
                          <button
                            key={idx}
                            disabled={showExplanation}
                            onClick={() => setSelectedOption(idx)}
                            className={`w-full text-left p-3 rounded-xl border text-xs sm:text-sm transition flex items-center justify-between ${btnStyle}`}
                          >
                            <span>{opt}</span>
                            {showExplanation && isCorrect && <span className="text-emerald-400 font-bold">✓</span>}
                            {showExplanation && isSelected && !isCorrect && <span className="text-red-400 font-bold">✗</span>}
                          </button>
                        );
                      })}
                    </div>

                    {/* Submit / Next Button */}
                    {!showExplanation ? (
                      <button
                        onClick={() => handleAptitudeSubmit(q)}
                        disabled={selectedOption === null}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm rounded-xl transition"
                      >
                        Lock Answer
                      </button>
                    ) : (
                      <div className="space-y-3 pt-2">
                        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-1.5">
                          <div className="font-semibold text-slate-300">Explanation:</div>
                          <p className="text-slate-400 leading-relaxed">{q.explanation}</p>
                          {q.shortcutTip && (
                            <div className="mt-2 text-amber-300 bg-amber-950/30 p-2 rounded border border-amber-900/50">
                              ⚡ <strong>Speed Tip:</strong> {q.shortcutTip}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={handleNextAptitude}
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm rounded-xl transition"
                        >
                          {qIndex + 1 < driveAptitudeQuestions.length ? 'Next Question →' : 'Advance to Round 2 (Technical) →'}
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* Phase 2: Technical Question Card */}
          {drivePhase === 'phase2_technical' && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
              {(() => {
                const q = driveTechQuestions[qIndex];
                return (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800 uppercase">
                        {q.category} • {q.topic}
                      </span>
                      <span className="text-[11px] text-slate-400 uppercase tracking-wide">
                        {q.type}
                      </span>
                    </div>

                    <p className="text-sm font-medium text-white whitespace-pre-line leading-relaxed">
                      {q.prompt}
                    </p>

                    {/* MCQ Type */}
                    {q.type === 'mcq' && q.options && (
                      <div className="space-y-2 pt-2">
                        {q.options.map((opt, idx) => {
                          const isSelected = selectedOption === idx;
                          const isCorrect = idx === q.correctIndex;
                          let btnStyle = 'border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-200';
                          if (showExplanation) {
                            if (isCorrect) {
                              btnStyle = 'border-emerald-600 bg-emerald-950/70 text-emerald-300';
                            } else if (isSelected) {
                              btnStyle = 'border-red-600 bg-red-950/70 text-red-300';
                            }
                          } else if (isSelected) {
                            btnStyle = 'border-blue-500 bg-blue-950/50 text-white';
                          }

                          return (
                            <button
                              key={idx}
                              disabled={showExplanation}
                              onClick={() => setSelectedOption(idx)}
                              className={`w-full text-left p-3 rounded-xl border text-xs sm:text-sm transition flex items-center justify-between ${btnStyle}`}
                            >
                              <span>{opt}</span>
                              {showExplanation && isCorrect && <span className="text-emerald-400 font-bold">✓</span>}
                              {showExplanation && isSelected && !isCorrect && <span className="text-red-400 font-bold">✗</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Explain Type */}
                    {q.type === 'explain' && (
                      <div className="space-y-3">
                        <textarea
                          rows={4}
                          value={textAnswer}
                          onChange={(e) => setTextAnswer(e.target.value)}
                          placeholder="Explain clearly to the interviewer (mention key principles)..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                        />
                        {rubricResult && (
                          <div className={`p-3 rounded-xl border text-xs space-y-1 ${rubricResult.passed ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300' : 'bg-amber-950/50 border-amber-800 text-amber-300'}`}>
                            <div className="font-semibold">
                              {rubricResult.passed ? '✅ Strong Technical Answer' : '⚠️ Missing Core Criteria'} ({rubricResult.score}/{rubricResult.maxScore})
                            </div>
                            <p className="text-slate-300">{rubricResult.feedback}</p>
                            {q.sampleModelAnswer && (
                              <div className="mt-2 text-slate-400 bg-slate-900/80 p-2.5 rounded border border-slate-800">
                                <strong>Model Answer:</strong> {q.sampleModelAnswer}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Code Type */}
                    {q.type === 'code' && q.codeStarter && (
                      <div className="space-y-3">
                        <div className="bg-slate-950 p-2 rounded-t-xl border border-b-0 border-slate-800 flex justify-between items-center text-xs text-slate-400">
                          <span>Language: JavaScript</span>
                          <span>Test Cases: {q.codeStarter.testCases.length}</span>
                        </div>
                        <textarea
                          rows={7}
                          value={codeAnswer || q.codeStarter.initialCode}
                          onChange={(e) => setCodeAnswer(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-b-xl p-3 text-xs font-mono text-emerald-400 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    )}

                    {/* Submit / Next Button */}
                    {!showExplanation && !rubricResult ? (
                      <button
                        onClick={() => handleTechnicalSubmit(q)}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm rounded-xl transition"
                      >
                        Submit Technical Answer
                      </button>
                    ) : (
                      <button
                        onClick={handleNextTechnical}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm rounded-xl transition"
                      >
                        {qIndex + 1 < driveTechQuestions.length ? 'Next Technical Question →' : 'Advance to Round 3 (HR & Behavioral) →'}
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* Phase 3: HR Behavioral Card */}
          {drivePhase === 'phase3_hr' && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
              {(() => {
                const q = driveHRQuestions[qIndex];
                return (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800">
                        {q.competency}
                      </span>
                      <span className="text-[11px] text-slate-400 uppercase tracking-wide">
                        STAR Method
                      </span>
                    </div>

                    <p className="text-sm font-medium text-white leading-relaxed">
                      {q.prompt}
                    </p>

                    {/* STAR Guide Card */}
                    <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 text-xs space-y-1 text-slate-300">
                      <div className="font-semibold text-purple-400">💡 Recommended Structure:</div>
                      <div><strong>S:</strong> {q.starGuidelines.situation}</div>
                      <div><strong>T:</strong> {q.starGuidelines.task}</div>
                      <div><strong>A:</strong> {q.starGuidelines.action}</div>
                      <div><strong>R:</strong> {q.starGuidelines.result}</div>
                    </div>

                    <textarea
                      rows={5}
                      value={textAnswer}
                      onChange={(e) => setTextAnswer(e.target.value)}
                      placeholder="Type your response here using the STAR format (Situation, Task, Action, Result)..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                    />

                    {/* HR Feedback Result */}
                    {hrResult && (
                      <div className={`p-3.5 rounded-xl border text-xs space-y-2 ${hrResult.passed ? 'bg-emerald-950/40 border-emerald-800' : 'bg-purple-950/40 border-purple-800'}`}>
                        <div className="flex items-center justify-between font-semibold text-white">
                          <span>Interviewer Evaluation ({hrResult.score}/{hrResult.maxScore})</span>
                          <span className={hrResult.passed ? 'text-emerald-400' : 'text-purple-300'}>
                            {hrResult.passed ? '✅ Candidate Ready' : '🔍 Needs Structure Polish'}
                          </span>
                        </div>

                        {/* STAR Indicators */}
                        <div className="flex gap-2 text-[10px]">
                          <span className={`px-2 py-0.5 rounded border ${hrResult.starBreakdown.situationCovered ? 'bg-emerald-950 border-emerald-700 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                            S: Situation {hrResult.starBreakdown.situationCovered ? '✓' : '✗'}
                          </span>
                          <span className={`px-2 py-0.5 rounded border ${hrResult.starBreakdown.taskCovered ? 'bg-emerald-950 border-emerald-700 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                            T: Task {hrResult.starBreakdown.taskCovered ? '✓' : '✗'}
                          </span>
                          <span className={`px-2 py-0.5 rounded border ${hrResult.starBreakdown.actionCovered ? 'bg-emerald-950 border-emerald-700 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                            A: Action {hrResult.starBreakdown.actionCovered ? '✓' : '✗'}
                          </span>
                          <span className={`px-2 py-0.5 rounded border ${hrResult.starBreakdown.resultCovered ? 'bg-emerald-950 border-emerald-700 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                            R: Result {hrResult.starBreakdown.resultCovered ? '✓' : '✗'}
                          </span>
                        </div>

                        <p className="text-slate-300 leading-relaxed">{hrResult.interviewerFeedback}</p>

                        {q.sampleStarResponse && (
                          <div className="mt-2 text-slate-400 bg-slate-950 p-2.5 rounded border border-slate-800 whitespace-pre-line text-[11px]">
                            <strong>Sample Benchmark Response:</strong>
                            {'\n' + q.sampleStarResponse}
                          </div>
                        )}
                      </div>
                    )}

                    {!hrResult ? (
                      <button
                        onClick={() => handleHRSubmit(q)}
                        disabled={!textAnswer.trim()}
                        className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm rounded-xl transition"
                      >
                        Submit to HR Interviewer
                      </button>
                    ) : (
                      <button
                        onClick={handleNextHR}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm rounded-xl transition"
                      >
                        {qIndex + 1 < driveHRQuestions.length ? 'Next HR Question →' : 'Complete Drive & View Placement Scorecard 🎓'}
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* --- VIEW 3: PLACEMENT VERDICT & SCORECARD --- */}
      {viewMode === 'mock_drive' && finalVerdict && (
        <div className="space-y-6">
          {/* Verdict Card */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4 shadow-xl">
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
              Campus Placement Verdict
            </span>
            <div className="text-3xl font-extrabold text-white flex items-center justify-center gap-2">
              <span>{finalVerdict.decision === 'Strong Hire' || finalVerdict.decision === 'Hire' ? '🎉' : '📈'}</span>
              <span>{finalVerdict.decision}</span>
            </div>
            <div className="text-sm text-slate-300">
              Overall Score: <strong>{finalVerdict.overallPercentage}%</strong> ({finalVerdict.overallScore} points earned)
            </div>

            {/* Phase Scores */}
            <div className="grid grid-cols-3 gap-2.5 pt-2">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="text-[10px] uppercase font-bold text-emerald-400 block">Round 1</span>
                <span className="text-xs font-semibold text-slate-200 block mt-0.5">Aptitude</span>
                <span className="text-lg font-bold text-white mt-1 block">
                  {finalVerdict.phases.phase1_aptitude.percentage}%
                </span>
                <span className={`text-[10px] font-semibold ${finalVerdict.phases.phase1_aptitude.passed ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {finalVerdict.phases.phase1_aptitude.passed ? 'Passed' : 'Needs Work'}
                </span>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="text-[10px] uppercase font-bold text-blue-400 block">Round 2</span>
                <span className="text-xs font-semibold text-slate-200 block mt-0.5">Core CS Tech</span>
                <span className="text-lg font-bold text-white mt-1 block">
                  {finalVerdict.phases.phase2_technical.percentage}%
                </span>
                <span className={`text-[10px] font-semibold ${finalVerdict.phases.phase2_technical.passed ? 'text-blue-400' : 'text-amber-400'}`}>
                  {finalVerdict.phases.phase2_technical.passed ? 'Passed' : 'Needs Work'}
                </span>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="text-[10px] uppercase font-bold text-purple-400 block">Round 3</span>
                <span className="text-xs font-semibold text-slate-200 block mt-0.5">HR Round</span>
                <span className="text-lg font-bold text-white mt-1 block">
                  {finalVerdict.phases.phase3_hr.percentage}%
                </span>
                <span className={`text-[10px] font-semibold ${finalVerdict.phases.phase3_hr.passed ? 'text-purple-400' : 'text-amber-400'}`}>
                  {finalVerdict.phases.phase3_hr.passed ? 'Passed' : 'Needs Work'}
                </span>
              </div>
            </div>
          </div>

          {/* Feedback & Recommendations */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>📋</span> Interviewer Assessment Report
            </h3>

            {finalVerdict.strengths.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-emerald-400 block mb-1">
                  Key Strengths:
                </span>
                <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                  {finalVerdict.strengths.map((str, idx) => (
                    <li key={idx}>{str}</li>
                  ))}
                </ul>
              </div>
            )}

            {finalVerdict.criticalGaps.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-amber-400 block mb-1">
                  Improvement Areas Before Real Drives:
                </span>
                <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                  {finalVerdict.criticalGaps.map((gap, idx) => (
                    <li key={idx}>{gap}</li>
                  ))}
                </ul>
              </div>
            )}

            {finalVerdict.targetedConceptIds.length > 0 && (
              <div className="pt-2">
                <span className="text-xs font-semibold text-indigo-400 block mb-2">
                  Recommended B.Tech Study Micro-Lessons:
                </span>
                <div className="flex flex-wrap gap-2">
                  {finalVerdict.targetedConceptIds.map((cid) => (
                    <Link
                      key={cid}
                      href={`/lesson/${cid}`}
                      className="text-xs bg-slate-950 hover:bg-slate-800 text-indigo-300 border border-indigo-900/60 px-3 py-1.5 rounded-lg transition"
                    >
                      📖 Study {cid} →
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={startMockDrive}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm rounded-xl transition shadow-lg"
            >
              🔄 Retake Mock Drive
            </button>
            <button
              onClick={() => setViewMode('hub')}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs sm:text-sm rounded-xl transition border border-slate-700"
            >
              Back to Interview Hub
            </button>
          </div>
        </div>
      )}

      {/* --- VIEW 4: APTITUDE DRILL ARENA --- */}
      {viewMode === 'aptitude_drill' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>🧠</span> Aptitude & Reasoning Drills
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Practicing quantitative problems, logic syllogisms, and verbal questions with speed formulas.
            </p>
          </div>

          <div className="space-y-4">
            {APTITUDE_QUESTION_BANK.map((q, idx) => (
              <div key={q.id} className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-400">{q.topic}</span>
                  <span className="text-slate-400 capitalize">{q.category.replace('_', ' ')}</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed">
                  {idx + 1}. {q.prompt}
                </p>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-1">
                  <div className="text-slate-300">
                    <strong>Correct Answer:</strong> {q.options[q.correctIndex]}
                  </div>
                  <div className="text-slate-400">{q.explanation}</div>
                  {q.shortcutTip && (
                    <div className="text-amber-300 pt-1">⚡ <em>{q.shortcutTip}</em></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- VIEW 5: TECHNICAL DRILL ARENA --- */}
      {viewMode === 'technical_drill' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>💻</span> Core B.Tech Computer Science Technical Bank
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              In-depth questions across Operating Systems, DBMS, Computer Networks, and OOP & System Design.
            </p>
          </div>

          <div className="space-y-4">
            {TECHNICAL_QUESTION_BANK.map((q, idx) => (
              <div key={q.id} className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-blue-400 uppercase">{q.category}</span>
                  <span className="text-slate-400">{q.topic}</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed">
                  {idx + 1}. {q.prompt}
                </p>
                {q.sampleModelAnswer && (
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-1">
                    <span className="font-semibold text-slate-300 block">Model Answer & Rubric:</span>
                    <p className="text-slate-400 leading-relaxed">{q.sampleModelAnswer}</p>
                  </div>
                )}
                {q.type === 'mcq' && q.options && (
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-1">
                    <span className="text-emerald-400 font-medium">Answer: {q.options[q.correctIndex || 0]}</span>
                    <p className="text-slate-400">{q.explanation}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- VIEW 6: HR DRILL ARENA --- */}
      {viewMode === 'hr_drill' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>🤝</span> HR & Behavioral Interview Preparation (STAR)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Master the Situation-Task-Action-Result methodology to win over HR and hiring managers.
            </p>
          </div>

          <div className="space-y-4">
            {HR_QUESTION_BANK.map((q, idx) => (
              <div key={q.id} className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-purple-400">{q.competency}</span>
                  <span className="text-slate-400">{q.topic}</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed">
                  {idx + 1}. {q.prompt}
                </p>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-2">
                  <span className="font-semibold text-purple-300 block">Benchmark Response:</span>
                  <p className="text-slate-300 whitespace-pre-line leading-relaxed text-[11px]">
                    {q.sampleStarResponse}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
