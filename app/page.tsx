'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { db, type EngagementState, type UserSettings } from '@/services/storage/db';
import type { Curriculum, Concept } from '@/types/concept';
import type { MasteryRecord } from '@/domain/mastery/MasteryStateMachine';
import type { ScheduledCard, DueItem } from '@/domain/scheduler/types';
import { getDueItems } from '@/domain/scheduler/SchedulerService';
import { buildSession, type SessionPlan } from '@/domain/session/SessionBuilder';
import { EngagementEngine } from '@/lib/engagement/engagement-engine';

export default function HomePage() {
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [engagement, setEngagement] = useState<EngagementState | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [records, setRecords] = useState<MasteryRecord[]>([]);
  const [dueItems, setDueItems] = useState<DueItem[]>([]);
  const [nextToLearn, setNextToLearn] = useState<Concept | null>(null);
  const [availableConcepts, setAvailableConcepts] = useState<Concept[]>([]);
  const [loading, setLoading] = useState(true);

  // Session state
  const [activeSession, setActiveSession] = useState<SessionPlan | null>(null);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [sessionMode, setSessionMode] = useState<'5-minute' | 'low-motivation'>('5-minute');

  // Variable reward state
  const [bonusChallengeOpen, setBonusChallengeOpen] = useState(false);
  const [bonusClaimed, setBonusClaimed] = useState(false);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const res = await fetch('/curriculum.json');
        const curData: Curriculum = await res.json();
        setCurriculum(curData);

        // Seed DB on launch
        await db.initializeCurriculumState(curData);

        const eng = await db.getOrCreateEngagement();
        setEngagement(eng);

        const userSet = await db.getOrCreateSettings();
        setSettings(userSet);

        const allRecords = await db.masteryRecords.toArray();
        setRecords(allRecords);

        const allCards = await db.scheduledCards.toArray();
        const due = getDueItems(allCards);
        setDueItems(due);

        // Filter available concepts
        const availList = curData.concepts.filter((c) => {
          const rec = allRecords.find((r) => r.conceptId === c.id);
          return rec?.state === 'available' || rec?.state === 'learning';
        });
        setAvailableConcepts(availList);

        // Find next concept ready to learn
        const availableRecord = allRecords.find((r) => r.state === 'available' || r.state === 'learning');
        if (availableRecord) {
          const match = curData.concepts.find((c) => c.id === availableRecord.conceptId);
          setNextToLearn(match ?? null);
        } else {
          setNextToLearn(curData.concepts[0] ?? null);
        }

        // Variable reward random challenge check (Task 9.8)
        const engine = new EngagementEngine();
        if (userSet.challengeCardEnabled && engine.shouldShowChallenge()) {
          setBonusChallengeOpen(true);
        }
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  if (loading || !curriculum || !engagement) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4" />
        <div className="text-slate-300 font-medium">Assembling your daily session...</div>
      </div>
    );
  }

  const masteredCount = records.filter((r) => r.state === 'mastered').length;

  const handleExportBackup = async () => {
    const data = await db.exportAll();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `buddy-cs-mastery-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleStartSession = (mode: '5-minute' | 'low-motivation') => {
    setSessionMode(mode);
    const plan = buildSession(
      dueItems,
      availableConcepts,
      mode === 'low-motivation'
        ? { mode: '5-minute', maxCards: 1, interleave: false }
        : { mode: '5-minute', maxCards: 3, interleave: true }
    );
    setActiveSession(plan);
    setSessionModalOpen(true);
  };

  const handleClaimBonusXP = async () => {
    if (!engagement || bonusClaimed) return;
    const updatedXP = engagement.xp + 50;
    const engine = new EngagementEngine();
    const updatedLevel = engine.calculateLevel(updatedXP);
    const updatedState = { ...engagement, xp: updatedXP, level: updatedLevel };
    await db.engagementState.put(updatedState);
    setEngagement(updatedState);
    setBonusClaimed(true);
    setTimeout(() => {
      setBonusChallengeOpen(false);
      setBonusClaimed(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen pb-28 p-4 max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div className="pt-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold tracking-wider uppercase text-indigo-400">
              Computer Science Mastery
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-0.5">
              Buddy CS 🎓
            </h1>
          </div>
          <button
            onClick={handleExportBackup}
            title="Download JSON backup snapshot"
            className="text-xs py-1.5 px-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <span>💾</span>
            <span>Backup</span>
          </button>
        </div>
      </div>

      {/* Engagement & Streaks Overview Card */}
      <div className="bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-2.5 rounded-2xl bg-slate-950/40 border border-slate-800/60">
            <div className="text-xl sm:text-2xl font-black text-amber-400 flex items-center justify-center gap-1">
              <span>⚡</span>
              <span>{engagement.xp}</span>
            </div>
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-1">
              XP Earned
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-slate-950/40 border border-slate-800/60">
            <div className="text-xl sm:text-2xl font-black text-indigo-400 flex items-center justify-center gap-1">
              <span>🔥</span>
              <span>{engagement.streak}d</span>
            </div>
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-1">
              Streak ({engagement.freezeDaysRemaining} freeze)
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-slate-950/40 border border-slate-800/60">
            <div className="text-xl sm:text-2xl font-black text-emerald-400 flex items-center justify-center gap-1">
              <span>🏆</span>
              <span>{masteredCount}</span>
            </div>
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-1">
              Mastered
            </div>
          </div>
        </div>

        {/* Weekly Goal Progress Bar */}
        <div className="mt-4 pt-4 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-400 font-medium">Weekly Goal Progress</span>
            <span className="text-white font-bold">
              {engagement.weeklyProgress} / {settings?.weeklyGoal ?? 3} concepts
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, (engagement.weeklyProgress / Math.max(1, settings?.weeklyGoal ?? 3)) * 100)}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Focus CTAs */}
      <div className="space-y-3">
        {/* 3-Phase Placement Drive Card */}
        <div className="bg-gradient-to-r from-indigo-950/80 via-purple-950/50 to-slate-900 border border-indigo-700/60 rounded-3xl p-5 shadow-xl space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-900/60 text-indigo-300 border border-indigo-700/50 flex items-center gap-1">
              <span>🎯</span> 3-Phase Placement Simulator
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/70 border border-emerald-800/80 px-2 py-0.5 rounded">
              Ready to Practice
            </span>
          </div>

          <div>
            <h2 className="text-base font-bold text-white">Full Campus Interview Drive</h2>
            <p className="text-xs text-slate-300 mt-1">
              Test all 3 hiring stages: <strong>Aptitude</strong> (Quant & Logic), <strong>Technical Round</strong> (Core B.Tech OS, DBMS, Networks, OOPs), and <strong>HR Behavioral</strong> (STAR method).
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              href="/interview"
              className="flex-1 py-2.5 px-3 rounded-xl font-bold text-xs bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-center shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.99]"
            >
              🚀 3-Phase Placement Drive →
            </Link>
            <Link
              href="/explore"
              className="py-2.5 px-3.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white text-center shadow-lg shadow-emerald-600/30 transition-all active:scale-[0.99] flex items-center gap-1"
            >
              <span>🌐</span> Web Tutor
            </Link>
          </div>
        </div>

        {/* Next Concept Card */}
        {nextToLearn && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-900/50">
                Next In Queue
              </span>
              <span className="text-xs text-slate-400">
                {nextToLearn.domain.toUpperCase()}
              </span>
            </div>

            <div>
              <h2 className="text-lg font-bold text-white">{nextToLearn.title}</h2>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                {nextToLearn.learningObjectives[0]?.description ?? 'Master fundamental concepts'}
              </p>
            </div>

            <Link
              href={`/lesson/${nextToLearn.id}`}
              className="block w-full py-3 px-4 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-500 text-white text-center shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.99]"
            >
              Continue Learning →
            </Link>
          </div>
        )}

        {/* 5-Minute Quick Session Mode & Low Motivation Mode */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">⏱️</span>
              <div>
                <h3 className="font-bold text-white text-sm">Quick Session Mode</h3>
                <p className="text-xs text-slate-400">
                  Curated daily burst: due reviews + new concept
                </p>
              </div>
            </div>
            <span className="text-xs font-mono text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-900/50">
              ~5m
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => handleStartSession('5-minute')}
              className="py-2.5 px-3 rounded-xl font-semibold text-xs bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-center transition-colors flex items-center justify-center gap-1.5"
            >
              <span>⚡</span>
              <span>5-Minute Session</span>
            </button>

            <button
              onClick={() => handleStartSession('low-motivation')}
              className="py-2.5 px-3 rounded-xl font-semibold text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-center transition-colors flex items-center justify-center gap-1.5"
            >
              <span>🌱</span>
              <span>Just 1 Card Mode</span>
            </button>
          </div>
        </div>
      </div>

      {/* Due FSRS Reviews */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔁</span>
            <h3 className="font-bold text-white text-sm">Spaced-Repetition Reviews</h3>
          </div>
          <span
            className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
              dueItems.length > 0
                ? 'bg-rose-950 text-rose-300 border border-rose-800/60'
                : 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
            }`}
          >
            {dueItems.length} Due
          </span>
        </div>

        {dueItems.length === 0 ? (
          <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800/60 text-center text-xs text-slate-400">
            ✓ All reviews are up to date! Memory retention modeled with FSRS-4.5.
          </div>
        ) : (
          <div className="space-y-2">
            {dueItems.map((item) => {
              const conceptMatch = curriculum.concepts.find((c) => c.id === item.conceptId);
              return (
                <div
                  key={item.conceptId}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-white">
                      {conceptMatch?.title ?? item.conceptId}
                    </div>
                    <div className="text-[11px] text-rose-400 mt-0.5">
                      {item.overdueDays > 0 ? `${item.overdueDays} days overdue` : 'Due today'}
                    </div>
                  </div>
                  <Link
                    href={`/quiz/${item.conceptId}`}
                    className="py-1 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md"
                  >
                    Review
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Curriculum Summary Quick Link */}
      <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800 flex items-center justify-between text-xs">
        <div className="text-slate-400">
          <span>{curriculum.concepts.length} concepts</span>
          <span className="mx-2">•</span>
          <span>{curriculum.domains.length} core domains (DSA & OS)</span>
        </div>
        <Link href="/map" className="font-bold text-indigo-400 hover:text-indigo-300">
          Explore Tree →
        </Link>
      </div>

      {/* 5-Minute / Low Motivation Session Modal */}
      {sessionModalOpen && activeSession && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-indigo-500/40 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400">
                  {sessionMode === 'low-motivation' ? '🌱 Low Motivation Mode' : '⏱️ 5-Minute Session'}
                </span>
                <h3 className="text-lg font-bold text-white">Your Targeted Session</h3>
              </div>
              <button
                onClick={() => setSessionModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              {sessionMode === 'low-motivation'
                ? 'Minimalism: Just 1 single card to maintain your daily streak without cognitive fatigue.'
                : 'Balanced interleaving of due reviews and newly unlocked concepts.'}
            </p>

            {/* Session Items Playlist */}
            <div className="space-y-2">
              {activeSession.conceptIds.map((cId, idx) => {
                const concept = curriculum.concepts.find((c) => c.id === cId);
                const isReview = activeSession.dueReviews.includes(cId);

                return (
                  <div
                    key={cId}
                    className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px] flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">
                          {concept?.title ?? cId}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {isReview ? '🔁 Spaced Review' : '✨ New Learning'}
                        </div>
                      </div>
                    </div>

                    <Link
                      href={isReview ? `/quiz/${cId}` : `/lesson/${cId}`}
                      onClick={() => setSessionModalOpen(false)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs whitespace-nowrap shadow-md shadow-indigo-600/20"
                    >
                      Start →
                    </Link>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setSessionModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Variable Reward Surprise Bonus Card Modal (Task 9.8) */}
      {bonusChallengeOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-900 border-2 border-amber-400/80 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl relative overflow-hidden">
            <div className="text-4xl animate-bounce">🎁</div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-500/40">
                Surprise Bonus Reward!
              </span>
              <h3 className="text-xl font-black text-white mt-2">
                Lucky Scholar Drop
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                You triggered a 20% variable reward bonus! Claim instant bonus XP to level up your mastery ranking.
              </p>
            </div>

            <div className="py-3 px-4 bg-slate-950/80 rounded-2xl border border-slate-800">
              <div className="text-2xl font-black text-amber-400">+50 Bonus XP</div>
            </div>

            <button
              onClick={handleClaimBonusXP}
              disabled={bonusClaimed}
              className={`w-full py-3 rounded-xl font-bold text-sm shadow-xl transition-all ${
                bonusClaimed
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950'
              }`}
            >
              {bonusClaimed ? 'Claimed! ✓' : 'Claim Bonus XP ⚡'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
