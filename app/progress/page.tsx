'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { db, type EngagementState, type UserSettings } from '@/services/storage/db';
import type { Curriculum, Concept } from '@/types/concept';
import type { MasteryRecord } from '@/domain/mastery/MasteryStateMachine';
import { EngagementEngine } from '@/lib/engagement/engagement-engine';

export default function ProgressPage() {
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [engagement, setEngagement] = useState<EngagementState | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [records, setRecords] = useState<MasteryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Settings & feedback state
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const engine = useMemo(() => new EngagementEngine(), []);

  useEffect(() => {
    async function loadData() {
      try {
        const curRes = await fetch('/curriculum.json');
        const curData: Curriculum = await curRes.json();
        setCurriculum(curData);

        await db.initializeCurriculumState(curData);

        const eng = await db.getOrCreateEngagement();
        setEngagement(eng);

        const userSet = await db.getOrCreateSettings();
        setSettings(userSet);

        const allRecords = await db.masteryRecords.toArray();
        setRecords(allRecords);
      } catch (err) {
        console.error('Failed to load progress page:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const recordsMap = useMemo(() => {
    const map = new Map<string, MasteryRecord>();
    records.forEach((r) => map.set(r.conceptId, r));
    return map;
  }, [records]);

  // Statistics
  const masteredConcepts = useMemo(() => {
    return records.filter((r) => r.state === 'mastered');
  }, [records]);

  const learningConcepts = useMemo(() => {
    return records.filter((r) => r.state === 'learning' || r.state === 'proving');
  }, [records]);

  const availableConcepts = useMemo(() => {
    return records.filter((r) => r.state === 'available');
  }, [records]);

  // Next Unlocks calculation (Task 9.14 / 11.1)
  const nextUnlocks = useMemo(() => {
    if (!curriculum) return [];
    const masteredIds = new Set(masteredConcepts.map((r) => r.conceptId));

    return curriculum.concepts
      .filter((concept) => {
        const rec = recordsMap.get(concept.id);
        return rec?.state === 'locked' && concept.prerequisites && concept.prerequisites.length > 0;
      })
      .map((concept) => {
        const prereqs = concept.prerequisites || [];
        const missingPrereqs = prereqs.filter((pId) => !masteredIds.has(pId));
        const completedPrereqsCount = prereqs.length - missingPrereqs.length;
        const progressPct = Math.round((completedPrereqsCount / prereqs.length) * 100);

        return {
          concept,
          prereqs,
          missingPrereqs,
          completedPrereqsCount,
          progressPct,
        };
      })
      .sort((a, b) => b.completedPrereqsCount - a.completedPrereqsCount)
      .slice(0, 5);
  }, [curriculum, recordsMap, masteredConcepts]);

  // Domain progress calculation
  const domainProgressList = useMemo(() => {
    if (!curriculum) return [];
    return curriculum.domains.map((domain) => {
      const domainConcepts = curriculum.concepts.filter((c) => c.domain === domain.id);
      const total = domainConcepts.length;
      const mastered = domainConcepts.filter((c) => {
        const rec = recordsMap.get(c.id);
        return rec?.state === 'mastered';
      }).length;
      const pct = total > 0 ? Math.round((mastered / total) * 100) : 0;
      return {
        id: domain.id,
        name: domain.name,
        mastered,
        total,
        percentage: pct,
      };
    });
  }, [curriculum, recordsMap]);

  // Save Settings handler
  const handleUpdateSettings = async (updates: Partial<UserSettings>) => {
    if (!settings) return;
    const updated = { ...settings, ...updates, updatedAt: new Date().toISOString() };
    await db.userSettings.put(updated);
    setSettings(updated);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);
  };

  // Export Backup handler
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

  // Import Backup handler
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      await db.importAll(text);
      setImportStatus('Backup restored successfully! Refreshing data...');
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err: any) {
      console.error('Import failed:', err);
      setImportStatus(`Import failed: ${err.message || 'Invalid backup file'}`);
    }
  };

  // Delete All Data handler
  const handleDeleteAll = async () => {
    await db.clearAllData();
    setDeleteConfirmOpen(false);
    window.location.reload();
  };

  if (loading || !engagement || !settings || !curriculum) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4" />
        <div className="text-slate-300 font-medium">Loading progress insights...</div>
      </div>
    );
  }

  // Level calculation
  const currentLevel = engine.calculateLevel(engagement.xp);
  // Current level threshold: (level - 1)^2 * 100
  // Next level threshold: level^2 * 100
  const currentLevelBaseXP = Math.pow(currentLevel - 1, 2) * 100;
  const nextLevelXP = Math.pow(currentLevel, 2) * 100;
  const xpIntoLevel = Math.max(0, engagement.xp - currentLevelBaseXP);
  const levelSpan = Math.max(1, nextLevelXP - currentLevelBaseXP);
  const levelProgressPct = Math.min(100, Math.round((xpIntoLevel / levelSpan) * 100));

  return (
    <div className="min-h-screen pb-28 p-4 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="pt-3">
        <span className="text-xs font-bold tracking-wider uppercase text-indigo-400">
          Analytics & Mastery Matrix
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-0.5">
          Progress & Settings 📊
        </h1>
      </div>

      {/* Level and XP Hero Card */}
      <div className="bg-gradient-to-br from-indigo-950/70 via-slate-900 to-purple-950/50 border border-indigo-500/30 rounded-3xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold tracking-wider uppercase text-indigo-400">
              Mastery Tier
            </span>
            <div className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
              <span>Level {currentLevel}</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                CS Apprentice
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold tracking-wider uppercase text-amber-400 block">
              Total XP
            </span>
            <div className="text-2xl font-black text-amber-300">
              ⚡ {engagement.xp.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Level XP Progress Bar */}
        <div>
          <div className="flex justify-between text-xs text-slate-400 mb-1.5 font-medium">
            <span>Progress to Level {currentLevel + 1}</span>
            <span className="text-white font-mono font-bold">
              {engagement.xp} / {nextLevelXP} XP ({levelProgressPct}%)
            </span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-3 border border-slate-800 overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${levelProgressPct}%` }}
            />
          </div>
        </div>

        {/* Streaks and Counts Row */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center">
          <div className="p-2.5 rounded-2xl bg-slate-950/60 border border-slate-800/60">
            <div className="text-lg font-black text-indigo-400 flex items-center justify-center gap-1">
              <span>🔥</span>
              <span>{engagement.streak}d</span>
            </div>
            <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
              Streak ({engagement.freezeDaysRemaining} freeze)
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-slate-950/60 border border-slate-800/60">
            <div className="text-lg font-black text-emerald-400 flex items-center justify-center gap-1">
              <span>🏆</span>
              <span>{masteredConcepts.length}</span>
            </div>
            <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
              Mastered
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-slate-950/60 border border-slate-800/60">
            <div className="text-lg font-black text-blue-400 flex items-center justify-center gap-1">
              <span>🔄</span>
              <span>{learningConcepts.length}</span>
            </div>
            <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
              In Progress
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Goal Card */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>🎯</span>
            <span>Weekly Goal</span>
          </h3>
          <span className="text-xs font-mono font-bold text-indigo-300">
            {engagement.weeklyProgress} / {settings.weeklyGoal} concepts
          </span>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          Concepts mastered this week towards your weekly mastery target.
        </p>
        <div className="w-full bg-slate-950 rounded-full h-2.5 border border-slate-800 overflow-hidden">
          <div
            className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2.5 rounded-full transition-all duration-300"
            style={{
              width: `${Math.min(100, Math.round((engagement.weeklyProgress / Math.max(1, settings.weeklyGoal)) * 100))}%`,
            }}
          />
        </div>
      </div>

      {/* Domain Mastery Rings (Task 9.12) */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <span>📚</span>
          <span>Domain Mastery Breakdown</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {domainProgressList.map((domain) => (
            <div
              key={domain.id}
              className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 flex items-center justify-between gap-3"
            >
              <div>
                <h4 className="text-xs font-bold text-white">{domain.name}</h4>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {domain.mastered} of {domain.total} mastered
                </div>
              </div>

              {/* Progress Circle Visual */}
              <div className="relative w-12 h-12 flex-shrink-0 flex items-center justify-center">
                <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-800"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-indigo-500 transition-all duration-500"
                    strokeDasharray={`${domain.percentage}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className="absolute font-mono text-[10px] font-bold text-white">
                  {domain.percentage}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Next Unlocks Section (Task 9.14 & 11.1) */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <span>🗝️</span>
          <span>Next Unlocks</span>
        </h3>
        <p className="text-xs text-slate-400">
          Locked concepts closest to becoming available based on your prerequisite mastery:
        </p>

        {nextUnlocks.length === 0 ? (
          <div className="text-xs text-slate-400 py-3 text-center bg-slate-950/40 rounded-xl border border-slate-800/60">
            All curriculum concepts are unlocked or already mastered! 🎉
          </div>
        ) : (
          <div className="space-y-2">
            {nextUnlocks.map(({ concept, missingPrereqs, progressPct }) => (
              <div
                key={concept.id}
                className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <div className="text-xs font-bold text-white">{concept.title}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Needs: <span className="text-amber-400 font-semibold">{missingPrereqs.join(', ')}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {progressPct}% pre-reqs done
                  </span>
                  <Link
                    href={`/map?concept=${concept.id}`}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-semibold"
                  >
                    View in Map
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notification and Learning Controls (Task 11.5) */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>⚙️</span>
            <span>Settings & Controls</span>
          </h3>
          {settingsSaved && (
            <span className="text-xs text-emerald-400 font-bold animate-pulse">Saved ✓</span>
          )}
        </div>

        <div className="space-y-3 divide-y divide-slate-800/60">
          {/* Daily Reminders Toggle */}
          <div className="pt-2 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-white">Daily Review Reminders</div>
              <div className="text-[11px] text-slate-400">
                Default: disabled. Opt-in to browser notifications for spaced reviews.
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.remindersEnabled}
              onChange={(e) => handleUpdateSettings({ remindersEnabled: e.target.checked })}
              className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
            />
          </div>

          {/* Reminder Time */}
          {settings.remindersEnabled && (
            <div className="pt-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-white">Reminder Time</div>
                <div className="text-[11px] text-slate-400">Time of day to notify about due reviews</div>
              </div>
              <input
                type="time"
                value={settings.reminderTime}
                onChange={(e) => handleUpdateSettings({ reminderTime: e.target.value })}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
              />
            </div>
          )}

          {/* Pause Everything */}
          <div className="pt-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-white">Pause Everything (Take a Break)</div>
              <div className="text-[11px] text-slate-400">
                Preserves all your progress, streaks, and data while pausing notifications.
              </div>
            </div>
            <button
              onClick={() => {
                const isCurrentlyPaused = !!settings.pausedUntil;
                handleUpdateSettings({
                  pausedUntil: isCurrentlyPaused
                    ? null
                    : new Date(Date.now() + 7 * 86400000).toISOString(),
                });
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                settings.pausedUntil
                  ? 'bg-amber-500 text-black font-bold'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              {settings.pausedUntil ? 'Paused (Resume)' : 'Pause 7 Days'}
            </button>
          </div>

          {/* Preferred Code Language */}
          <div className="pt-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-white">Coding Language</div>
              <div className="text-[11px] text-slate-400">Default runtime for code challenges</div>
            </div>
            <select
              value={settings.preferredLanguage}
              onChange={(e) =>
                handleUpdateSettings({ preferredLanguage: e.target.value as 'python' | 'javascript' })
              }
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
            >
              <option value="python">Python 3 (Pyodide)</option>
              <option value="javascript">JavaScript (Worker)</option>
            </select>
          </div>

          {/* Weekly Goal Setting */}
          <div className="pt-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-white">Weekly Goal Target</div>
              <div className="text-[11px] text-slate-400">Number of concepts to master weekly</div>
            </div>
            <input
              type="number"
              min="1"
              max="20"
              value={settings.weeklyGoal}
              onChange={(e) => handleUpdateSettings({ weeklyGoal: parseInt(e.target.value, 10) || 3 })}
              className="w-16 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white text-center"
            />
          </div>
        </div>
      </div>

      {/* Backup & Portability Controls (Task 12.7) */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>💾</span>
            <span>Data Backup & Portability</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Buddy stores 100% of your progress locally on your device in IndexedDB. You can export or restore full snapshots anytime.
          </p>
        </div>

        {importStatus && (
          <div className="p-3 rounded-xl bg-indigo-950/80 border border-indigo-500/40 text-xs text-indigo-300">
            {importStatus}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Export Button */}
          <button
            onClick={handleExportBackup}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-white flex items-center justify-center gap-2 transition-colors"
          >
            <span>📥</span>
            <span>Export Backup JSON</span>
          </button>

          {/* Import Button */}
          <label className="w-full py-2.5 px-4 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-xs font-semibold text-indigo-300 flex items-center justify-center gap-2 transition-colors cursor-pointer">
            <span>📤</span>
            <span>Import Backup JSON</span>
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleImportFile}
              className="hidden"
            />
          </label>
        </div>

        {/* Clear Data / Danger Zone */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-rose-400">Reset Local Database</div>
            <div className="text-[10px] text-slate-500">
              Irreversibly delete all progress, streaks, and history.
            </div>
          </div>
          <button
            onClick={() => setDeleteConfirmOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/60 text-xs text-rose-300 font-semibold transition-colors"
          >
            Delete All Data
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Reset */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="text-3xl text-center">⚠️</div>
            <h4 className="text-base font-bold text-white text-center">
              Are you completely sure?
            </h4>
            <p className="text-xs text-slate-400 text-center leading-relaxed">
              This will erase all your mastery records, scheduled reviews, XP, streaks, and quiz attempts from this browser. This action cannot be undone unless you have an exported backup JSON.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAll}
                className="py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white shadow-lg shadow-rose-600/30"
              >
                Yes, Reset All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
