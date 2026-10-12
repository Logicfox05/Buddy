import { create } from 'zustand';
import { Concept, ConceptProgress, EngagementState, Curriculum } from '@/types';

interface AppState {
  // Curriculum
  curriculum: Curriculum | null;
  conceptsMap: Map<string, Concept>;
  
  // User Progress
  progressMap: Map<string, ConceptProgress>;
  
  // Engagement
  engagement: EngagementState;
  
  // UI State
  currentConceptId: string | null;
  
  // Actions
  setCurriculum: (curriculum: Curriculum) => void;
  setProgress: (progressMap: Map<string, ConceptProgress>) => void;
  setEngagement: (engagement: EngagementState) => void;
  setCurrentConcept: (conceptId: string | null) => void;
  updateConceptProgress: (conceptId: string, progress: ConceptProgress) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  curriculum: null,
  conceptsMap: new Map(),
  progressMap: new Map(),
  engagement: {
    xp: 0,
    level: 1,
    streak: 0,
    freezeDaysRemaining: 2,
    lastActivityDate: null,
    weeklyGoal: 3,
    weeklyProgress: 0,
    settings: {
      remindersEnabled: false,
      reminderTime: '09:00',
      pausedUntil: null,
    },
  },
  currentConceptId: null,

  // Actions
  setCurriculum: (curriculum) => {
    const conceptsMap = new Map<string, Concept>();
    curriculum.concepts.forEach((c) => conceptsMap.set(c.id, c));
    set({ curriculum, conceptsMap });
  },

  setProgress: (progressMap) => set({ progressMap }),

  setEngagement: (engagement) => set({ engagement }),

  setCurrentConcept: (conceptId) => set({ currentConceptId: conceptId }),

  updateConceptProgress: (conceptId, progress) =>
    set((state) => {
      const newMap = new Map(state.progressMap);
      newMap.set(conceptId, progress);
      return { progressMap: newMap };
    }),
}));
