'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { db } from '@/services/storage/db';
import type { Curriculum, Concept } from '@/types/concept';
import type { MasteryRecord } from '@/domain/mastery/MasteryStateMachine';
import type { ScheduledCard, DueItem } from '@/domain/scheduler/types';
import { getDueItems } from '@/domain/scheduler/SchedulerService';

export default function PracticePage() {
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [records, setRecords] = useState<MasteryRecord[]>([]);
  const [dueItems, setDueItems] = useState<DueItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'due' | 'learning' | 'available' | 'mastered'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const curRes = await fetch('/curriculum.json');
        const curData: Curriculum = await curRes.json();
        setCurriculum(curData);

        await db.initializeCurriculumState(curData);

        const allRecords = await db.masteryRecords.toArray();
        setRecords(allRecords);

        const allCards = await db.scheduledCards.toArray();
        const due = getDueItems(allCards);
        setDueItems(due);
      } catch (err) {
        console.error('Failed to load practice page:', err);
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

  const dueConceptIds = useMemo(() => {
    return new Set(dueItems.map((d) => d.conceptId));
  }, [dueItems]);

  const filteredConcepts = useMemo(() => {
    if (!curriculum) return [];
    return curriculum.concepts.filter((concept) => {
      // Domain filter
      if (selectedDomain !== 'all' && concept.domain !== selectedDomain) {
        return false;
      }

      const rec = recordsMap.get(concept.id);
      const isDue = dueConceptIds.has(concept.id);

      // Status filter
      if (statusFilter === 'due' && !isDue) return false;
      if (statusFilter === 'learning' && rec?.state !== 'learning' && rec?.state !== 'proving') return false;
      if (statusFilter === 'available' && rec?.state !== 'available') return false;
      if (statusFilter === 'mastered' && rec?.state !== 'mastered' && rec?.state !== 'fading') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = concept.title.toLowerCase().includes(q);
        const objDesc = concept.learningObjectives[0]?.description?.toLowerCase() ?? '';
        const matchDesc = objDesc.includes(q);
        const matchDomain = concept.domain.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchDomain) return false;
      }

      return true;
    });
  }, [curriculum, selectedDomain, statusFilter, searchQuery, recordsMap, dueConceptIds]);

  const dueConceptsList = useMemo(() => {
    if (!curriculum) return [];
    return dueItems
      .map((item) => {
        const concept = curriculum.concepts.find((c) => c.id === item.conceptId);
        return { item, concept };
      })
      .filter((entry): entry is { item: DueItem; concept: Concept } => entry.concept !== undefined);
  }, [curriculum, dueItems]);

  const getRandomPracticeUrl = () => {
    if (!curriculum) return '/';
    // Prioritize due concepts, then available or learning
    const active = curriculum.concepts.filter((c) => {
      const rec = recordsMap.get(c.id);
      return dueConceptIds.has(c.id) || rec?.state === 'available' || rec?.state === 'learning';
    });
    const pool = active.length > 0 ? active : curriculum.concepts;
    const randomConcept = pool[Math.floor(Math.random() * pool.length)];
    return `/quiz/${randomConcept.id}`;
  };

  if (loading || !curriculum) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4" />
        <div className="text-slate-300 font-medium">Loading practice center...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28 p-4 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="pt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <span className="text-xs font-bold tracking-wider uppercase text-indigo-400">
            Active Recall & Drills
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-0.5">
            Practice Center ✍️
          </h1>
        </div>

        <Link
          href={getRandomPracticeUrl()}
          className="self-start sm:self-auto px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/20 flex items-center gap-1.5 transition-transform active:scale-95"
        >
          <span>🎲</span>
          <span>Quick Random Quiz</span>
        </Link>
      </div>

      {/* Due Reviews Alert Banner */}
      {dueConceptsList.length > 0 && (
        <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-900 border border-amber-500/40 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">⏰</span>
              <div>
                <h3 className="text-sm font-bold text-amber-300">
                  {dueConceptsList.length} Due Spaced Reviews Pending
                </h3>
                <p className="text-xs text-slate-400">
                  Review now to reinforce memory retention and prevent fading.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
            {dueConceptsList.slice(0, 4).map(({ item, concept }) => (
              <div
                key={concept.id}
                className="bg-slate-950/60 border border-amber-900/50 rounded-xl p-3 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">{concept.title}</div>
                  <div className="text-[10px] text-amber-400/80">
                    {item.overdueDays > 0 ? `${item.overdueDays}d overdue` : 'Due today'}
                  </div>
                </div>
                <Link
                  href={`/quiz/${concept.id}`}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold whitespace-nowrap transition-colors"
                >
                  Review
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="space-y-3">
        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search concepts by title or topic..."
            className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5 pl-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <span className="absolute left-3.5 top-3 text-slate-500 text-sm">🔍</span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Domain Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedDomain('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedDomain === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            All Domains
          </button>
          {curriculum.domains.map((d) => (
            <button
              key={d.id}
              onClick={() => setSelectedDomain(d.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedDomain === d.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {d.name}
            </button>
          ))}
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap gap-1.5 text-xs">
          {[
            { id: 'all', label: 'All Statuses' },
            { id: 'due', label: '⏰ Due Reviews' },
            { id: 'learning', label: '🔄 In Progress' },
            { id: 'available', label: '✨ Ready to Learn' },
            { id: 'mastered', label: '🏆 Mastered' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                statusFilter === tab.id
                  ? 'bg-slate-800 text-indigo-300 font-bold border border-indigo-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Concept Practice Cards List */}
      <div className="space-y-3">
        {filteredConcepts.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
            <div className="text-3xl mb-2">🔍</div>
            <div className="text-white font-semibold">No matching concepts found</div>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or search keywords.</p>
          </div>
        ) : (
          filteredConcepts.map((concept) => {
            const rec = recordsMap.get(concept.id);
            const isDue = dueConceptIds.has(concept.id);
            const state = rec?.state ?? 'locked';

            const statusBadgeConfig: Record<string, { label: string; color: string; border: string }> = {
              mastered: { label: '🏆 Mastered', color: 'bg-emerald-950/60 text-emerald-300', border: 'border-emerald-500/30' },
              fading: { label: '⚠️ Fading Retention', color: 'bg-amber-950/60 text-amber-300', border: 'border-amber-500/30' },
              proving: { label: '⚔️ Proving (Assess)', color: 'bg-purple-950/60 text-purple-300', border: 'border-purple-500/30' },
              learning: { label: '🔄 In Progress', color: 'bg-indigo-950/60 text-indigo-300', border: 'border-indigo-500/30' },
              available: { label: '✨ Ready to Learn', color: 'bg-blue-950/60 text-blue-300', border: 'border-blue-500/30' },
              locked: { label: '🔒 Locked', color: 'bg-slate-950/60 text-slate-500', border: 'border-slate-800' },
            };

            const badge = isDue
              ? { label: '⏰ Review Due', color: 'bg-amber-950/80 text-amber-300 animate-pulse', border: 'border-amber-400' }
              : statusBadgeConfig[state] || statusBadgeConfig.locked;

            const isLocked = state === 'locked';

            return (
              <div
                key={concept.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isDue
                    ? 'bg-slate-900/90 border-amber-500/40 shadow-lg shadow-amber-500/5'
                    : isLocked
                    ? 'bg-slate-950/40 border-slate-900 opacity-60'
                    : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800/80 shadow-md'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.color} ${badge.border}`}>
                        {badge.label}
                      </span>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                        {concept.domain}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white tracking-tight">{concept.title}</h3>
                  </div>

                  {rec && (
                    <div className="text-right flex-shrink-0">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Confidence</span>
                      <span className="text-xs font-mono font-bold text-indigo-400">
                        {Math.round((rec.confidenceScore ?? 0) * 100)}%
                      </span>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">
                  {concept.learningObjectives[0]?.description ?? 'Master fundamental concepts through active practice.'}
                </p>

                {/* Prerequisite note if locked */}
                {isLocked && concept.prerequisites && concept.prerequisites.length > 0 && (
                  <div className="text-[11px] text-slate-400 bg-slate-950/80 border border-slate-800/60 rounded-xl p-2.5 mb-3 flex items-center gap-1.5">
                    <span>🔒</span>
                    <span>
                      Requires mastering: <strong className="text-slate-300">{concept.prerequisites.join(', ')}</strong>
                    </span>
                  </div>
                )}

                {/* Action Links */}
                {!isLocked && (
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60 flex-wrap">
                    <Link
                      href={`/lesson/${concept.id}`}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <span>📖</span>
                      <span>Lesson</span>
                    </Link>

                    <Link
                      href={`/quiz/${concept.id}`}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <span>📝</span>
                      <span>Quiz & Rubric</span>
                    </Link>

                    <Link
                      href={`/code/${concept.id}`}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <span>💻</span>
                      <span>Code Challenge</span>
                    </Link>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
