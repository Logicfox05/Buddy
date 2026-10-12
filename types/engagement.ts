export interface EngagementSettings {
  remindersEnabled: boolean;
  reminderTime: string; // HH:MM format
  pausedUntil: Date | null;
}

export interface EngagementState {
  xp: number;
  level: number;
  streak: number;
  freezeDaysRemaining: number;
  lastActivityDate: Date | null;
  weeklyGoal: number;
  weeklyProgress: number;
  settings: EngagementSettings;
}

export interface WeeklyRecap {
  weekStartDate: Date;
  weekEndDate: Date;
  xpEarned: number;
  conceptsMastered: number;
  streakStatus: string;
  domainProgress: Record<string, number>; // domain ID -> percentage
}
