/**
 * BuddyDatabase — Dexie (IndexedDB) schema for Buddy.
 * Tables: masteryRecords, scheduledCards, llmCache, sessionLog,
 *         userSettings, assessmentAttempts
 *
 * No UI imports. Pure storage layer.
 */

import Dexie, { Table } from 'dexie';
import type { MasteryRecord } from '@/domain/mastery/MasteryStateMachine';
import { createMasteryRecord } from '@/domain/mastery/MasteryStateMachine';
import { KnowledgeGraph } from '@/domain/graph/KnowledgeGraph';
import type { Curriculum } from '@/types/concept';
import type { ScheduledCard } from '@/domain/scheduler/types';

// ── Table row types ───────────────────────────────────────────────────────────

export interface LLMCacheEntry {
  /** SHA-256 of the full prompt string */
  hash: string;
  provider: string;
  response: string;
  createdAt: string;
}

export interface SessionLog {
  id: string;
  startedAt: string;
  endedAt: string | null;
  mode: 'standard' | '5-minute';
  conceptIds: string[];
  xpEarned: number;
  completedConceptIds: string[];
}

export interface AssessmentAttempt {
  id?: number;
  conceptId: string;
  questionId: string;
  questionType: string;
  subtopic: string;
  correct: boolean;
  score: number;
  maxScore: number;
  attemptedAt: string;
}

export interface UserSettings {
  id: 1; // singleton row
  // Engagement module toggles
  streaksEnabled: boolean;
  xpEnabled: boolean;
  progressRingsEnabled: boolean;
  challengeCardEnabled: boolean;
  lowMotivationModeEnabled: boolean;
  // Reminder settings
  remindersEnabled: boolean;
  reminderTime: string; // 'HH:MM'
  pausedUntil: string | null; // ISO date
  // Learning settings
  weeklyGoal: number;
  preferredLanguage: 'python' | 'javascript';
  // LLM settings
  llmProvider: 'gemini' | 'groq' | 'ollama' | 'none';
  llmApiKey: string; // encrypted client-side? For now plaintext in IDB (private device)
  ollamaBaseUrl: string;
  // First run
  onboardingComplete: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EngagementState {
  id: 1; // singleton row
  xp: number;
  level: number;
  streak: number;
  freezeDaysRemaining: number;
  lastActivityDate: string | null;
  weeklyProgress: number;
  weeklyGoalStartDate: string | null;
}

// ── Database class ────────────────────────────────────────────────────────────

export class BuddyDatabase extends Dexie {
  masteryRecords!: Table<MasteryRecord, string>;
  scheduledCards!: Table<ScheduledCard, string>;
  llmCache!: Table<LLMCacheEntry, string>;
  sessionLog!: Table<SessionLog, string>;
  assessmentAttempts!: Table<AssessmentAttempt, number>;
  userSettings!: Table<UserSettings, number>;
  engagementState!: Table<EngagementState, number>;

  constructor() {
    super('BuddyDB_v2');

    this.version(1).stores({
      masteryRecords: 'conceptId, state, firstMasteredAt',
      scheduledCards: 'conceptId, due',
      llmCache: 'hash, provider, createdAt',
      sessionLog: 'id, startedAt, mode',
      assessmentAttempts: '++id, conceptId, questionId, subtopic, correct, attemptedAt',
      userSettings: 'id',
      engagementState: 'id',
    });
  }

  // ── Lifecycle helpers ───────────────────────────────────────────────────────

  async getOrCreateEngagement(): Promise<EngagementState> {
    const existing = await this.engagementState.get(1);
    if (existing) return existing;
    const initial: EngagementState = {
      id: 1,
      xp: 0,
      level: 1,
      streak: 0,
      freezeDaysRemaining: 2,
      lastActivityDate: null,
      weeklyProgress: 0,
      weeklyGoalStartDate: null,
    };
    await this.engagementState.put(initial);
    return initial;
  }

  async getOrCreateSettings(): Promise<UserSettings> {
    const existing = await this.userSettings.get(1);
    if (existing) return existing;
    const now = new Date().toISOString();
    const defaults: UserSettings = {
      id: 1,
      streaksEnabled: true,
      xpEnabled: true,
      progressRingsEnabled: true,
      challengeCardEnabled: true,
      lowMotivationModeEnabled: true,
      remindersEnabled: false,
      reminderTime: '09:00',
      pausedUntil: null,
      weeklyGoal: 3,
      preferredLanguage: 'python',
      llmProvider: 'none',
      llmApiKey: '',
      ollamaBaseUrl: 'http://localhost:11434',
      onboardingComplete: false,
      createdAt: now,
      updatedAt: now,
    };
    await this.userSettings.put(defaults);
    return defaults;
  }

  async initializeCurriculumState(curriculum: Curriculum): Promise<void> {
    const existingCount = await this.masteryRecords.count();
    if (existingCount > 0) return;

    const graph = new KnowledgeGraph();
    graph.load(curriculum);
    const availableIds = new Set(
      graph.getAvailable(new Set<string>()).map((c) => c.id)
    );

    const records: MasteryRecord[] = curriculum.concepts.map((concept) => {
      const record = createMasteryRecord(concept.id);
      if (availableIds.has(concept.id)) {
        record.state = 'available';
      }
      return record;
    });

    await this.masteryRecords.bulkPut(records);
    await this.getOrCreateEngagement();
    await this.getOrCreateSettings();
  }

  // ── Backup & restore ────────────────────────────────────────────────────────

  async exportAll(): Promise<string> {
    const data = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      masteryRecords: await this.masteryRecords.toArray(),
      scheduledCards: await this.scheduledCards.toArray(),
      sessionLog: await this.sessionLog.toArray(),
      assessmentAttempts: await this.assessmentAttempts.toArray(),
      userSettings: await this.userSettings.toArray(),
      engagementState: await this.engagementState.toArray(),
      // Intentionally exclude llmCache (regeneratable)
    };
    return JSON.stringify(data, null, 2);
  }

  async importAll(jsonString: string): Promise<void> {
    const data = JSON.parse(jsonString);
    await this.transaction(
      'rw',
      [
        this.masteryRecords,
        this.scheduledCards,
        this.sessionLog,
        this.assessmentAttempts,
        this.userSettings,
        this.engagementState,
      ],
      async () => {
        await this.masteryRecords.clear();
        await this.scheduledCards.clear();
        await this.sessionLog.clear();
        await this.assessmentAttempts.clear();
        await this.userSettings.clear();
        await this.engagementState.clear();

        if (data.masteryRecords?.length)
          await this.masteryRecords.bulkPut(data.masteryRecords);
        if (data.scheduledCards?.length)
          await this.scheduledCards.bulkPut(data.scheduledCards);
        if (data.sessionLog?.length)
          await this.sessionLog.bulkPut(data.sessionLog);
        if (data.assessmentAttempts?.length)
          await this.assessmentAttempts.bulkPut(data.assessmentAttempts);
        if (data.userSettings?.length)
          await this.userSettings.bulkPut(data.userSettings);
        if (data.engagementState?.length)
          await this.engagementState.bulkPut(data.engagementState);
      }
    );
  }

  async clearAllData(): Promise<void> {
    await this.transaction('rw', this.tables, async () => {
      for (const table of this.tables) {
        await table.clear();
      }
    });
  }
}

export const db = new BuddyDatabase();
