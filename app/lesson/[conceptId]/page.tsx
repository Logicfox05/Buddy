'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/services/storage/db';
import type { Curriculum, Concept } from '@/types/concept';
import {
  startLearning,
  startProving,
  type MasteryRecord,
} from '@/domain/mastery/MasteryStateMachine';

export default function LessonPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const conceptId = params.conceptId as string;

  const [concept, setConcept] = useState<Concept | null>(null);
  const [record, setRecord] = useState<MasteryRecord | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showResources, setShowResources] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load concept and mastery record
  useEffect(() => {
    async function init() {
      try {
        const res = await fetch('/curriculum.json');
        const data: Curriculum = await res.json();
        const found = data.concepts.find((c) => c.id === conceptId);
        if (found) {
          setConcept(found);
          // Seed DB if needed
          await db.initializeCurriculumState(data);
          let currentRec = await db.masteryRecords.get(conceptId);
          if (currentRec) {
            // If starting from available, transition to learning
            if (currentRec.state === 'available') {
              const updated = startLearning(currentRec);
              await db.masteryRecords.put(updated);
              currentRec = updated;
            }
            setRecord(currentRec);
          }
        }
      } catch (err) {
        console.error('Failed to load lesson:', err);
      } finally {
        setLoading(false);
      }
    }
    if (conceptId) {
      init();
    }
  }, [conceptId]);

  // Handle keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (completed) return;
      if (e.key === 'ArrowRight' || e.key === ' ') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4" />
        <div className="text-slate-300 font-medium">Preparing micro-lesson...</div>
      </div>
    );
  }

  if (!concept) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="text-4xl mb-4">🔍</div>
        <h1 className="text-xl font-bold text-white mb-2">Concept Not Found</h1>
        <p className="text-slate-400 text-sm mb-6">
          The concept ID &quot;{conceptId}&quot; does not exist in the curriculum.
        </p>
        <Link
          href="/map"
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-xl text-sm"
        >
          Return to Knowledge Map
        </Link>
      </div>
    );
  }

  const cards = concept.microLessons;
  const totalCards = cards.length;

  const handleNext = async () => {
    if (currentCardIndex < totalCards - 1) {
      setCurrentCardIndex((prev) => prev + 1);
    } else {
      // Reached the end of lesson
      setCompleted(true);
      if (record && record.state === 'learning') {
        const proving = startProving(record);
        await db.masteryRecords.put(proving);
        setRecord(proving);
      }
    }
  };

  const handlePrev = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex((prev) => prev - 1);
    }
  };

  const currentCard = cards[currentCardIndex];

  return (
    <div className="min-h-screen pb-20 p-4 max-w-2xl mx-auto flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between pt-2 pb-4 border-b border-slate-800">
        <Link
          href="/map"
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors py-1.5 px-3 rounded-lg bg-slate-900 border border-slate-800"
        >
          <span>←</span>
          <span>Map</span>
        </Link>
        <div className="text-center px-2">
          <span className="text-xs uppercase tracking-wider font-bold text-indigo-400">
            {concept.domain.toUpperCase()}
          </span>
          <h2 className="text-sm font-semibold text-white truncate max-w-[200px] sm:max-w-xs">
            {concept.title}
          </h2>
        </div>
        <button
          onClick={() => setShowResources(!showResources)}
          className={`text-xs py-1.5 px-3 rounded-lg font-medium transition-colors border flex items-center gap-1.5 ${
            showResources
              ? 'bg-indigo-600 border-indigo-500 text-white'
              : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
          }`}
        >
          <span>📚</span>
          <span>Sources ({concept.resources.length})</span>
        </button>
      </div>

      {/* Progress Dots */}
      <div className="pt-4 pb-2">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span>
            Card {completed ? totalCards : currentCardIndex + 1} of {totalCards}
          </span>
          <span>~{currentCard?.estimatedSeconds ?? 60}s read</span>
        </div>
        <div className="grid grid-flow-col gap-1.5 w-full">
          {cards.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx < currentCardIndex || completed
                  ? 'bg-indigo-500'
                  : idx === currentCardIndex
                  ? 'bg-indigo-400 shadow-sm shadow-indigo-400/50'
                  : 'bg-slate-800'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Main Content Card or Completion Screen */}
      <div className="flex-1 my-4 flex flex-col">
        {!completed ? (
          <div className="flex-1 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col shadow-2xl relative overflow-hidden">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-950/60 border border-indigo-800/40 text-indigo-300">
                Card #{currentCardIndex + 1}
              </span>
            </div>

            {/* Micro-lesson Content */}
            <div className="flex-1 overflow-y-auto text-slate-200 text-sm sm:text-base leading-relaxed space-y-4 pr-1">
              {currentCard?.content.split('\n\n').map((paragraph, pIdx) => {
                if (paragraph.startsWith('###')) {
                  return (
                    <h3
                      key={pIdx}
                      className="text-lg font-bold text-white pt-2 text-indigo-200"
                    >
                      {paragraph.replace(/^###\s*/, '')}
                    </h3>
                  );
                }
                if (paragraph.startsWith('```')) {
                  const cleaned = paragraph.replace(/```[a-z]*\n?/, '').replace(/```$/, '');
                  return (
                    <pre
                      key={pIdx}
                      className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs sm:text-sm font-mono text-indigo-300 overflow-x-auto"
                    >
                      <code>{cleaned}</code>
                    </pre>
                  );
                }
                if (paragraph.startsWith('- ') || paragraph.startsWith('* ')) {
                  const items = paragraph.split('\n');
                  return (
                    <ul key={pIdx} className="space-y-1.5 pl-4 list-disc marker:text-indigo-500">
                      {items.map((item, iIdx) => (
                        <li key={iIdx} className="text-slate-300 text-sm">
                          {item.replace(/^[-*]\s*/, '')}
                        </li>
                      ))}
                    </ul>
                  );
                }
                return (
                  <p key={pIdx} className="text-slate-300 text-sm sm:text-base">
                    {paragraph}
                  </p>
                );
              })}
            </div>

            {/* Navigation Controls */}
            <div className="pt-6 mt-6 border-t border-slate-800/80 flex items-center justify-between gap-4">
              <button
                onClick={handlePrev}
                disabled={currentCardIndex === 0}
                className={`py-2.5 px-4 rounded-xl text-sm font-semibold transition-colors ${
                  currentCardIndex === 0
                    ? 'text-slate-600 bg-slate-900/50 cursor-not-allowed border border-transparent'
                    : 'text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                ← Previous
              </button>
              <button
                onClick={handleNext}
                className="py-2.5 px-6 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-1.5"
              >
                <span>{currentCardIndex === totalCards - 1 ? 'Finish Lesson' : 'Next'}</span>
                <span>→</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col justify-center items-center text-center shadow-2xl space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-3xl">
              🎉
            </div>
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-emerald-400">
                Lesson Complete
              </span>
              <h2 className="text-2xl font-extrabold text-white mt-1">
                You mastered the concepts!
              </h2>
              <p className="text-slate-400 text-sm mt-2 max-w-sm">
                Now verify your understanding through multi-format recall, explanation, and code challenges to earn mastery.
              </p>
            </div>

            <div className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-left space-y-2">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Mastery Verification Gates
              </div>
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>1. Recall Quiz (≥80%)</span>
                <span className="text-amber-400 font-semibold">Pending</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>2. Explain It Rubric (≥2/3)</span>
                <span className="text-amber-400 font-semibold">Pending</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>3. Applied Task (Trace/Bug)</span>
                <span className="text-amber-400 font-semibold">Pending</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>4. Coding Problem (Hidden Tests)</span>
                <span className="text-amber-400 font-semibold">Pending</span>
              </div>
            </div>

            <div className="w-full space-y-3 pt-2">
              <Link
                href={`/quiz/${concept.id}`}
                className="w-full block py-3.5 px-6 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all text-center"
              >
                Start Verification Quiz →
              </Link>
              <Link
                href="/map"
                className="w-full block py-2.5 px-4 rounded-xl font-semibold text-xs text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 transition-colors text-center"
              >
                Back to Knowledge Map
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Slide-over Resources Drawer */}
      {showResources && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full p-6 flex flex-col overflow-y-auto space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-bold text-white text-base">Verified Open Resources</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Free textbooks, lectures, and interactive visualizations
                </p>
              </div>
              <button
                onClick={() => setShowResources(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {concept.resources.map((res, i) => (
                <a
                  key={i}
                  href={res.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 rounded-2xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 transition-colors group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white group-hover:text-indigo-300">
                      {res.title}
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase font-mono">
                      {res.estimatedMinutes}m
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-900 text-indigo-400 border border-indigo-900/60">
                      {res.type}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      License: {res.license}
                    </span>
                  </div>
                </a>
              ))}
            </div>

            <div className="pt-4 mt-auto border-t border-slate-800">
              <button
                onClick={() => setShowResources(false)}
                className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-sm hover:bg-slate-700"
              >
                Close Resources
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
