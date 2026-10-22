'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { SynthesizedSubjectData, WebMCQ } from '@/services/web-learning/WebKnowledgeService';
import { evaluateExplanationRubric, RubricEvaluation } from '@/lib/assessment/rubric';
import { db } from '@/services/storage/db';

const POPULAR_SUBJECT_TOPICS = [
  { domain: 'DBMS', label: 'B+ Tree Indexing', query: 'B+ tree' },
  { domain: 'DBMS', label: 'ACID & Isolation', query: 'ACID transactions' },
  { domain: 'DBMS', label: 'Normalization (BCNF)', query: 'Database normalization' },
  { domain: 'OS', label: 'Virtual Memory & TLB', query: 'Virtual memory' },
  { domain: 'OS', label: 'Deadlock & Banker\'s', query: 'Deadlock operating systems' },
  { domain: 'OS', label: 'Process vs Thread', query: 'Thread (computing)' },
  { domain: 'Networks', label: 'TCP 3-Way Handshake', query: 'TCP handshake' },
  { domain: 'Networks', label: 'DNS Resolution Flow', query: 'Domain Name System' },
  { domain: 'Networks', label: 'HTTPS & TLS Handshake', query: 'Transport Layer Security' },
  { domain: 'DSA', label: 'Graph BFS & DFS', query: 'Breadth-first search' },
  { domain: 'DSA', label: 'Dynamic Programming', query: 'Dynamic programming' },
  { domain: 'System Design', label: 'CAP Theorem', query: 'CAP theorem' },
  { domain: 'System Design', label: 'Consistent Hashing', query: 'Consistent hashing' },
  { domain: 'Compilers', label: 'Lexical Analysis & DFA', query: 'Deterministic finite automaton' },
];

export default function ExploreWebTutorPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [subjectData, setSubjectData] = useState<SynthesizedSubjectData | null>(null);
  const [activeTab, setActiveTab] = useState<'explanation' | 'practice'>('explanation');

  // Practice state
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});
  const [explainText, setExplainText] = useState('');
  const [rubricResult, setRubricResult] = useState<RubricEvaluation | null>(null);

  // Saving / XP status
  const [savedToGraph, setSavedToGraph] = useState(false);
  const [savedNotification, setSavedNotification] = useState<string | null>(null);

  // Load default topic on mount
  useEffect(() => {
    fetchTopic('B+ tree', 'Database Management Systems');
  }, []);

  const fetchTopic = async (topic: string, domainHint?: string) => {
    setLoading(true);
    setSubjectData(null);
    setSelectedAnswers({});
    setRevealedAnswers({});
    setExplainText('');
    setRubricResult(null);
    setSavedToGraph(false);
    setSavedNotification(null);

    try {
      const res = await fetch('/api/web-learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, domain: domainHint }),
      });
      if (!res.ok) throw new Error('Failed to fetch from web');
      const data: SynthesizedSubjectData = await res.json();
      setSubjectData(data);
    } catch (err) {
      console.error('Error fetching subject details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    fetchTopic(searchQuery.trim());
  };

  const handleMCQSelect = (questionId: string, optionIdx: number) => {
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionIdx }));
    setRevealedAnswers((prev) => ({ ...prev, [questionId]: true }));
  };

  const handleEvaluateExplanation = () => {
    if (!explainText.trim() || !subjectData) return;
    const result = evaluateExplanationRubric(
      explainText,
      subjectData.practiceSet.explainTask.rubric
    );
    setRubricResult(result);
  };

  const handleSaveToKnowledgeGraph = async () => {
    if (!subjectData || savedToGraph) return;

    try {
      // Award XP
      const eng = await db.getOrCreateEngagement();
      await db.engagementState.put({
        ...eng,
        xp: eng.xp + 25,
      });

      // Schedule into FSRS spaced repetition
      const conceptId = `web.${encodeURIComponent(subjectData.cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, '-'))}`;
      const nowIso = new Date().toISOString();
      await db.scheduledCards.put({
        conceptId,
        due: nowIso,
        fsrsState: {
          due: nowIso,
          stability: 1.0,
          difficulty: 5.0,
          elapsed_days: 0,
          scheduled_days: 1,
          reps: 0,
          lapses: 0,
          state: 0,
          last_review: null,
        },
        reps: 0,
        lapses: 0,
        lastRetrievability: 1.0,
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      setSavedToGraph(true);
      setSavedNotification(`✅ "${subjectData.cleanTitle}" saved! +25 XP awarded and added to your daily review queue!`);
      setTimeout(() => setSavedNotification(null), 5000);
    } catch (err) {
      console.error('Failed to save to graph:', err);
    }
  };

  return (
    <div className="px-4 py-6 pb-24 max-w-xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Live Web Knowledge Engine
          </span>
          <span className="text-[11px] text-slate-400">All CS Subjects & Drills</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Web Tutor & AI Practice
        </h1>
        <p className="text-xs text-slate-400 leading-relaxed">
          Search any computer science subject across the internet. The portal collects authoritative details, builds conceptual breakdowns, and tests your mastery with interview-grade practice.
        </p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search any subject or topic (e.g. Raft Consensus, B+ Trees, LRU Cache)..."
          className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-3 pl-11 pr-24 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 shadow-inner"
        />
        <span className="absolute left-4 top-3.5 text-slate-400 text-sm">🔍</span>
        <button
          type="submit"
          className="absolute right-2 top-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-3.5 py-1.5 rounded-xl transition"
        >
          Fetch Web →
        </button>
      </form>

      {/* Popular Subject Chips */}
      <div>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2">
          Featured B.Tech Subjects & Interview Hotspots:
        </span>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {POPULAR_SUBJECT_TOPICS.map((item, idx) => (
            <button
              key={idx}
              onClick={() => fetchTopic(item.query, item.domain)}
              className="text-[11px] bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg border border-slate-800 shrink-0 transition"
            >
              <span className="text-indigo-400 font-medium">{item.domain}:</span> {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notification Toast */}
      {savedNotification && (
        <div className="bg-emerald-950/90 border border-emerald-700 p-3 rounded-xl text-xs text-emerald-300 shadow-lg animate-bounce">
          {savedNotification}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto" />
          <h3 className="text-sm font-semibold text-white">Crawling & Synthesizing Web Knowledge...</h3>
          <p className="text-xs text-slate-400">
            Querying academic internet databases, parsing definitions, and generating practice challenges.
          </p>
        </div>
      )}

      {/* Loaded Subject Container */}
      {!loading && subjectData && (
        <div className="space-y-4">
          {/* Subject Header Card */}
          <div className="bg-gradient-to-br from-indigo-950/50 via-slate-900 to-slate-900 border border-indigo-800/40 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-900/60 text-indigo-300 border border-indigo-700/50">
                {subjectData.domain}
              </span>
              <a
                href={subjectData.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-indigo-400 hover:underline flex items-center gap-1"
              >
                <span>🌐 Web Source</span> ↗
              </a>
            </div>

            <h2 className="text-xl font-bold text-white tracking-tight">
              {subjectData.cleanTitle}
            </h2>

            <p className="text-xs text-slate-300 leading-relaxed">
              {subjectData.summary}
            </p>

            {/* Quick Action Button */}
            <div className="pt-1 flex gap-2">
              <button
                onClick={handleSaveToKnowledgeGraph}
                disabled={savedToGraph}
                className={`flex-1 py-2 px-3 rounded-xl font-semibold text-xs transition flex items-center justify-center gap-1.5 ${
                  savedToGraph
                    ? 'bg-emerald-950 border border-emerald-800 text-emerald-400'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 active:scale-[0.98]'
                }`}
              >
                <span>{savedToGraph ? '✓' : '💾'}</span>
                <span>{savedToGraph ? 'Added to Spaced Repetition Queue' : 'Save to My Knowledge Graph (+25 XP)'}</span>
              </button>
            </div>
          </div>

          {/* View Mode Tabs: Explanation vs Practice */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('explanation')}
              className={`py-2 rounded-lg font-semibold text-xs transition flex items-center justify-center gap-1.5 ${
                activeTab === 'explanation'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>📖</span> Deep Explanation & Architecture
            </button>
            <button
              onClick={() => setActiveTab('practice')}
              className={`py-2 rounded-lg font-semibold text-xs transition flex items-center justify-center gap-1.5 ${
                activeTab === 'practice'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>✍️</span> Practice with User ({subjectData.practiceSet.mcqs.length + 1} Drills)
            </button>
          </div>

          {/* --- TAB 1: DEEP EXPLANATION --- */}
          {activeTab === 'explanation' && (
            <div className="space-y-4">
              {/* Detailed Breakdown */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>🔬</span> Technical Breakdown & Mechanics
                </h3>
                <div className="space-y-2.5">
                  {subjectData.deepExplanation.map((para, idx) => (
                    <p key={idx} className="text-xs text-slate-300 leading-relaxed">
                      {para}
                    </p>
                  ))}
                </div>
              </div>

              {/* Architecture / Flow Diagram */}
              {subjectData.architectureDiagram && (
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-2">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>📐</span> Architecture & System Diagram
                  </h3>
                  <pre className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto whitespace-pre leading-snug">
                    {subjectData.architectureDiagram}
                  </pre>
                </div>
              )}

              {/* Key Takeaways & Interview Gotchas */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>🎯</span> Campus Interview Focus
                </h3>
                <p className="text-xs text-amber-300/90 bg-amber-950/30 p-3 rounded-xl border border-amber-900/40 leading-relaxed">
                  {subjectData.interviewFocus}
                </p>

                <div className="pt-2">
                  <span className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Core Engineering Takeaways:
                  </span>
                  <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                    {subjectData.keyTakeaways.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* --- TAB 2: INTERACTIVE PRACTICE ARENA --- */}
          {activeTab === 'practice' && (
            <div className="space-y-4">
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs">
                <span className="text-slate-300 font-semibold">Interactive Practice Set</span>
                <span className="text-indigo-400">Instant AI/Rubric Feedback</span>
              </div>

              {/* Multiple Choice Questions */}
              {subjectData.practiceSet.mcqs.map((q, qIdx) => {
                const userChoice = selectedAnswers[q.id];
                const isRevealed = revealedAnswers[q.id];

                return (
                  <div key={q.id} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-emerald-400">Drill #{qIdx + 1} (MCQ)</span>
                      {isRevealed && (
                        <span className={userChoice === q.correctIndex ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                          {userChoice === q.correctIndex ? '✓ Correct' : '✗ Incorrect'}
                        </span>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm font-medium text-white leading-relaxed">
                      {q.question}
                    </p>

                    <div className="space-y-2 pt-1">
                      {q.options.map((opt, optIdx) => {
                        const isSelected = userChoice === optIdx;
                        const isCorrect = optIdx === q.correctIndex;
                        let btnStyle = 'border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-200';

                        if (isRevealed) {
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
                            key={optIdx}
                            disabled={isRevealed}
                            onClick={() => handleMCQSelect(q.id, optIdx)}
                            className={`w-full text-left p-3 rounded-xl border text-xs transition flex items-center justify-between ${btnStyle}`}
                          >
                            <span>{opt}</span>
                            {isRevealed && isCorrect && <span className="text-emerald-400 font-bold">✓</span>}
                          </button>
                        );
                      })}
                    </div>

                    {isRevealed && (
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1 mt-2">
                        <div className="text-slate-300 font-semibold">Explanation:</div>
                        <p className="text-slate-400 leading-relaxed">{q.explanation}</p>
                        {q.speedTip && (
                          <div className="text-amber-300 pt-1">⚡ <em>{q.speedTip}</em></div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Conceptual "Explain-It" Task */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-purple-400">Drill #{subjectData.practiceSet.mcqs.length + 1} (Interview Explain-It)</span>
                  <span className="text-slate-400">Rubric Evaluated</span>
                </div>

                <p className="text-xs sm:text-sm font-medium text-white leading-relaxed">
                  {subjectData.practiceSet.explainTask.prompt}
                </p>

                <textarea
                  rows={4}
                  value={explainText}
                  onChange={(e) => setExplainText(e.target.value)}
                  placeholder="Type your explanation as if speaking to an interviewer..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />

                <button
                  onClick={handleEvaluateExplanation}
                  disabled={!explainText.trim()}
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm rounded-xl transition"
                >
                  Grade My Technical Explanation
                </button>

                {rubricResult && (
                  <div className={`p-3.5 rounded-xl border text-xs space-y-2 mt-2 ${rubricResult.passed ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300' : 'bg-amber-950/40 border-amber-800 text-amber-300'}`}>
                    <div className="flex items-center justify-between font-semibold">
                      <span>Interviewer Evaluation ({rubricResult.score}/{rubricResult.maxScore})</span>
                      <span>{rubricResult.passed ? '✅ Passed Criteria' : '🔍 Elaborate Further'}</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">{rubricResult.feedback}</p>

                    <div className="pt-2 text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                      <strong>Model Answer Benchmark:</strong>
                      <p className="mt-1 text-slate-300">{subjectData.practiceSet.explainTask.modelAnswer}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Sample Code Pattern */}
              {subjectData.practiceSet.codeSnippet && (
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-blue-400">Implementation Blueprint</span>
                    <span className="text-slate-400">{subjectData.practiceSet.codeSnippet.language}</span>
                  </div>
                  <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto">
                    {subjectData.practiceSet.codeSnippet.code}
                  </pre>
                  <p className="text-xs text-slate-400">
                    {subjectData.practiceSet.codeSnippet.explanation}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
