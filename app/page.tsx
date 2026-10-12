'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { db, type EngagementState, type UserSettings } from '@/services/storage/db';
import type { Curriculum, Concept } from '@/types/concept';
import type { MasteryRecord } from '@/domain/mastery/MasteryStateMachine';
import type { ScheduledCard, DueItem } from '@/domain/scheduler/types';
import { getDueItems } from '@/domain/scheduler/SchedulerService';
import { buildSession } from '@/domain/session/SessionBuilder';

export default function HomePage() {
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [engagement, setEngagement] = useState<EngagementState | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [records, setRecords] = useState<MasteryRecord[]>([]);
  const [dueItems, setDueItems] = useState<DueItem[]>([]);
  const [nextToLearn, setNextToLearn] = useState<Concept | null>(null);
  const [loading, setLoading] = useState(true);

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

        // Find next concept ready to learn
        const availableRecord = allRecords.find((r) => r.state === 'available' || r.state === 'learning');
        if (availableRecord) {
          const match = curData.concepts.find((c) => c.id === availableRecord.conceptId);
          setNextToLearn(match ?? null);
        } else {
          // Default to first concept
          setNextToLearn(curData.concepts[0] ?? null);
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
  const learningCount = records.filter((r) => r.state === 'learning' || r.state === 'proving').length;

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

  return (
    <div className="min-h-screen pb-24 p-4 max-w-lg mx-auto space-y-6">
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
              className="block w-full py-3 px-4 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-500 text-white text-center shadow-lg shadow-indigo-600/30 transition-all"
            >
              Continue Learning →
            </Link>
          </div>
        )}

        {/* 5-Minute Quick Session Mode */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">⏱️</span>
              <div>
                <h3 className="font-bold text-white text-sm">5-Minute Mode</h3>
                <p className="text-xs text-slate-400">
                  Quick session: 2 spaced reviews + 1 new concept card
                </p>
              </div>
            </div>
            <span className="text-xs font-mono text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-900/50">
              ~5m
            </span>
          </div>

          <Link
            href={nextToLearn ? `/lesson/${nextToLearn.id}` : '/map'}
            className="block w-full py-2.5 px-4 rounded-xl font-semibold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 text-center border border-slate-700 transition-colors"
          >
            Start 5-Minute Session
          </Link>
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
    </div>
  );
}
