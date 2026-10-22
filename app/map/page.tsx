'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { db } from '@/services/storage/db';
import type { Curriculum, Concept } from '@/types/concept';
import type { MasteryRecord, MasteryState } from '@/domain/mastery/MasteryStateMachine';
import { KnowledgeGraph } from '@/domain/graph/KnowledgeGraph';

const STATUS_THEMES: Record<
  MasteryState,
  { label: string; bg: string; text: string; border: string; icon: string }
> = {
  locked: {
    label: 'Locked',
    bg: 'bg-slate-900/60',
    text: 'text-slate-500',
    border: 'border-slate-800',
    icon: '🔒',
  },
  available: {
    label: 'Ready to Learn',
    bg: 'bg-indigo-950/40',
    text: 'text-indigo-300',
    border: 'border-indigo-500/40',
    icon: '✨',
  },
  learning: {
    label: 'In Progress',
    bg: 'bg-blue-950/50',
    text: 'text-blue-300',
    border: 'border-blue-500/50',
    icon: '📖',
  },
  proving: {
    label: 'Proving Mastery',
    bg: 'bg-amber-950/40',
    text: 'text-amber-300',
    border: 'border-amber-500/50',
    icon: '✍️',
  },
  mastered: {
    label: 'Mastered',
    bg: 'bg-emerald-950/50',
    text: 'text-emerald-300',
    border: 'border-emerald-500/50',
    icon: '🏆',
  },
  fading: {
    label: 'Review Needed',
    bg: 'bg-rose-950/40',
    text: 'text-rose-300',
    border: 'border-rose-500/50',
    icon: '⚡',
  },
};

const BLOOM_LEVELS: Record<number, string> = {
  1: 'Remember',
  2: 'Understand',
  3: 'Apply',
  4: 'Analyze',
  5: 'Evaluate',
  6: 'Create',
};

export default function KnowledgeMapPage() {
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [records, setRecords] = useState<Map<string, MasteryRecord>>(new Map());
  const [selectedDomain, setSelectedDomain] = useState<string>('dsa');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeConcept, setActiveConcept] = useState<Concept | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/curriculum.json');
        const data: Curriculum = await res.json();
        setCurriculum(data);

        // Seed DB on first launch
        await db.initializeCurriculumState(data);

        // Load mastery records
        const allRecords = await db.masteryRecords.toArray();
        const map = new Map<string, MasteryRecord>();
        for (const rec of allRecords) {
          map.set(rec.conceptId, rec);
        }
        setRecords(map);
      } catch (err) {
        console.error('Failed to load curriculum/mastery in map:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const graph = useMemo(() => {
    if (!curriculum) return null;
    const g = new KnowledgeGraph();
    g.load(curriculum);
    return g;
  }, [curriculum]);

  const domainConcepts = useMemo(() => {
    if (!curriculum) return [];
    return curriculum.concepts.filter((c) => {
      const matchDomain = c.domain === selectedDomain;
      const matchSearch =
        !searchQuery.trim() ||
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.learningObjectives.some((obj) =>
          obj.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
      return matchDomain && matchSearch;
    });
  }, [curriculum, selectedDomain, searchQuery]);

  // Group concepts by stage
  const stages = useMemo(() => {
    if (selectedDomain === 'dsa') {
      return [
        {
          id: 'foundations',
          title: 'Foundations & Complexity',
          conceptIds: ['dsa.complexity.big-o', 'dsa.array.basics'],
        },
        {
          id: 'linear-patterns',
          title: 'Linear Data Structures & Two-Pointers',
          conceptIds: [
            'dsa.array.two-pointers',
            'dsa.array.sliding-window',
            'dsa.linkedlist.singly',
            'dsa.linkedlist.doubly',
            'dsa.stack.basics',
            'dsa.queue.basics',
          ],
        },
        {
          id: 'hierarchical',
          title: 'Trees, Heaps & Hashing',
          conceptIds: [
            'dsa.tree.binary',
            'dsa.tree.bst',
            'dsa.heap.basics',
            'dsa.hash.basics',
          ],
        },
        {
          id: 'graphs-sorting',
          title: 'Graphs & Sorting Algorithms',
          conceptIds: [
            'dsa.graph.representation',
            'dsa.graph.bfs-dfs',
            'dsa.sorting.comparison',
          ],
        },
      ];
    } else if (selectedDomain === 'os') {
      return [
        {
          id: 'processes',
          title: 'Processes & Concurrency',
          conceptIds: [
            'os.process.basics',
            'os.process.scheduling',
            'os.thread.basics',
            'os.sync.mutex',
            'os.sync.deadlock',
          ],
        },
        {
          id: 'memory',
          title: 'Memory Management',
          conceptIds: [
            'os.memory.virtual',
            'os.memory.paging',
            'os.memory.segmentation',
            'os.memory.tlb',
          ],
        },
        {
          id: 'storage-io',
          title: 'File Systems & I/O Subsystem',
          conceptIds: [
            'os.storage.filesystem',
            'os.storage.inode',
            'os.io.basics',
            'os.io.dma',
          ],
        },
        {
          id: 'systems-boot',
          title: 'Protection & Boot Sequence',
          conceptIds: ['os.security.protection', 'os.boot.sequence'],
        },
      ];
    } else {
      const matchConcepts = curriculum?.concepts.filter((c) => c.domain === selectedDomain) || [];
      return [
        {
          id: `${selectedDomain}-stage`,
          title: `${selectedDomain.toUpperCase()} Mastery Track`,
          conceptIds: matchConcepts.map((c) => c.id),
        },
      ];
    }
  }, [curriculum, selectedDomain]);

  if (loading || !curriculum) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4" />
        <div className="text-slate-300 font-medium text-lg">Loading Knowledge Graph...</div>
        <div className="text-slate-500 text-sm mt-1">Tracing prerequisites & mastery state</div>
      </div>
    );
  }

  // Domain progress metrics
  const totalInDomain = curriculum.concepts.filter((c) => c.domain === selectedDomain).length;
  const masteredInDomain = curriculum.concepts
    .filter((c) => c.domain === selectedDomain)
    .filter((c) => records.get(c.id)?.state === 'mastered').length;

  return (
    <div className="min-h-screen pb-24 p-4 max-w-screen-lg mx-auto">
      {/* Header */}
      <div className="pt-4 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <span>🗺️</span> Skill Tree & Map
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Prerequisite-enforced mastery progression
            </p>
          </div>
          <div className="text-right">
            <span className="text-xl sm:text-2xl font-bold text-emerald-400">
              {masteredInDomain}/{totalInDomain}
            </span>
            <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
              Mastered
            </div>
          </div>
        </div>

        {/* Domain Selector Tabs */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar mt-5 p-1 bg-slate-900/80 rounded-xl border border-slate-800">
          {curriculum.domains.map((dom) => {
            const count = curriculum.concepts.filter((c) => c.domain === dom.id).length;
            const isSelected = selectedDomain === dom.id;
            const emoji =
              dom.id === 'dsa'
                ? '🧩'
                : dom.id === 'os'
                ? '⚙️'
                : dom.id === 'dbms'
                ? '🗄️'
                : dom.id === 'networks'
                ? '🌐'
                : dom.id === 'oop-design'
                ? '🏗️'
                : dom.id === 'aptitude'
                ? '🧠'
                : '🤝';

            return (
              <button
                key={dom.id}
                onClick={() => setSelectedDomain(dom.id)}
                className={`py-2 px-3 rounded-lg font-semibold text-xs whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <span>{emoji}</span> {dom.name} ({count})
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative mt-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search concepts, objectives, or algorithms..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 pl-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
          <span className="absolute left-3.5 top-3 text-slate-500 text-sm">🔍</span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Stages & Nodes */}
      <div className="space-y-8 mt-4">
        {stages.map((stage, stageIdx) => {
          const conceptsInStage = stage.conceptIds
            .map((id) => curriculum.concepts.find((c) => c.id === id))
            .filter((c): c is Concept => !!c && domainConcepts.some((dc) => dc.id === c.id));

          if (conceptsInStage.length === 0) return null;

          return (
            <div key={stage.id} className="relative">
              {/* Stage connector line */}
              {stageIdx > 0 && (
                <div className="absolute -top-6 left-6 w-0.5 h-6 bg-slate-800" />
              )}

              <div className="flex items-center gap-2 mb-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold border border-indigo-500/30">
                  {stageIdx + 1}
                </span>
                <h2 className="text-base font-bold text-slate-200 uppercase tracking-wider text-xs">
                  {stage.title}
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {conceptsInStage.map((concept) => {
                  const record = records.get(concept.id);
                  const state: MasteryState = record?.state ?? 'locked';
                  const theme = STATUS_THEMES[state];

                  const prereqCount = concept.prerequisites.length;
                  const prereqsMastered = concept.prerequisites.every(
                    (pId) => records.get(pId)?.state === 'mastered'
                  );

                  return (
                    <div
                      key={concept.id}
                      onClick={() => setActiveConcept(concept)}
                      className={`cursor-pointer rounded-2xl p-4 border transition-all duration-200 hover:scale-[1.01] hover:shadow-xl ${theme.bg} ${theme.border} relative overflow-hidden`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl mt-0.5">{theme.icon}</span>
                          <div>
                            <h3 className="font-semibold text-white text-sm sm:text-base leading-snug">
                              {concept.title}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <span
                                className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${theme.text} ${theme.border}`}
                              >
                                {theme.label}
                              </span>
                              {concept.learningObjectives.length > 0 && (
                                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-400 border border-slate-700/50 uppercase">
                                  {concept.learningObjectives[0].bloomLevel}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {prereqCount > 0 && (
                          <div className="text-right flex-shrink-0">
                            <span
                              className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${
                                prereqsMastered
                                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {prereqsMastered ? '✓ Prereqs' : `${prereqCount} Prereq`}
                            </span>
                          </div>
                        )}
                      </div>

                      {concept.learningObjectives.length > 0 && (
                        <p className="text-xs text-slate-400 mt-3 line-clamp-1">
                          • {concept.learningObjectives[0].description}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Concept Detail Modal / Sheet */}
      {activeConcept && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-5 sm:p-6 shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs uppercase font-bold tracking-wider text-indigo-400">
                    {activeConcept.domain.toUpperCase()}
                  </span>
                  {activeConcept.learningObjectives.length > 0 && (
                    <>
                      <span className="text-slate-600">•</span>
                      <span className="text-xs text-slate-400 uppercase font-medium">
                        Bloom: {activeConcept.learningObjectives[0].bloomLevel}
                      </span>
                    </>
                  )}
                </div>
                <h2 className="text-xl font-bold text-white leading-tight">
                  {activeConcept.title}
                </h2>
              </div>
              <button
                onClick={() => setActiveConcept(null)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Status Card */}
            {(() => {
              const rec = records.get(activeConcept.id);
              const state: MasteryState = rec?.state ?? 'locked';
              const theme = STATUS_THEMES[state];
              return (
                <div
                  className={`p-3.5 rounded-xl border flex items-center justify-between ${theme.bg} ${theme.border}`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{theme.icon}</span>
                    <div>
                      <div className={`font-semibold text-sm ${theme.text}`}>
                        {theme.label}
                      </div>
                      <div className="text-xs text-slate-400">
                        {state === 'mastered'
                          ? 'All 4 verification gates passed'
                          : state === 'locked'
                          ? 'Complete prerequisites to unlock'
                          : 'Ready for learning and assessment'}
                      </div>
                    </div>
                  </div>
                  {rec && rec.xpEarned > 0 && (
                    <span className="text-xs font-bold text-amber-400 bg-amber-950/60 border border-amber-800/50 px-2 py-1 rounded-md">
                      +{rec.xpEarned} XP
                    </span>
                  )}
                </div>
              );
            })()}

            {/* Prerequisites */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Prerequisites
              </h3>
              {activeConcept.prerequisites.length === 0 ? (
                <div className="text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-900/40 p-2.5 rounded-lg flex items-center gap-2">
                  <span>✓</span> None — Available to start immediately as a foundational concept.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {activeConcept.prerequisites.map((pId) => {
                    const prereqConcept = curriculum.concepts.find((c) => c.id === pId);
                    const isMastered = records.get(pId)?.state === 'mastered';
                    return (
                      <div
                        key={pId}
                        className={`text-xs p-2 rounded-lg border flex items-center justify-between ${
                          isMastered
                            ? 'bg-emerald-950/30 border-emerald-900/40 text-emerald-300'
                            : 'bg-slate-800/50 border-slate-800 text-slate-400'
                        }`}
                      >
                        <span className="font-medium">
                          {prereqConcept?.title ?? pId}
                        </span>
                        <span className="text-[11px] font-semibold">
                          {isMastered ? '✓ Mastered' : 'Pending'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Learning Objectives */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Learning Objectives
              </h3>
              <ul className="space-y-1.5">
                {activeConcept.learningObjectives.map((obj, i) => (
                  <li
                    key={i}
                    className="text-xs text-slate-300 bg-slate-800/40 p-2.5 rounded-lg border border-slate-800 flex items-start gap-2"
                  >
                    <span className="text-indigo-400 font-bold mt-0.5">•</span>
                    <div className="flex-1">
                      <span>{obj.description}</span>
                      <span className="ml-2 text-[10px] text-slate-500 uppercase font-mono">
                        ({obj.bloomLevel})
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Verified Free Resources */}
            {activeConcept.resources.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Curated Free Resources
                </h3>
                <div className="space-y-2">
                  {activeConcept.resources.map((res, i) => (
                    <a
                      key={i}
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-xs text-slate-200 group-hover:text-indigo-300 flex items-center gap-1.5">
                          <span>🔗</span>
                          <span>{res.title}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 uppercase font-mono">
                          {res.estimatedMinutes}m
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-indigo-400 border border-indigo-900/50 uppercase font-mono">
                          {res.type}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          License: {res.license}
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex items-center gap-3">
              <Link
                href={`/lesson/${activeConcept.id}`}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-sm text-center bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all"
              >
                Study Micro-Lesson
              </Link>
              <button
                onClick={() => setActiveConcept(null)}
                className="py-3 px-4 rounded-xl font-semibold text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
