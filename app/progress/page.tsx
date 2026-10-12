'use client';

import { Card, ProgressRing } from '@/components/common';
import { XPDisplay, StreakDisplay } from '@/components/progress';
import { useAppStore } from '@/lib/stores/app-store';

export default function ProgressPage() {
  const { engagement, curriculum, progressMap } = useAppStore();

  const calculateDomainProgress = (domainId: string) => {
    if (!curriculum) return 0;
    const domainConcepts = curriculum.concepts.filter(c => c.domain === domainId);
    const mastered = domainConcepts.filter(c => {
      const progress = progressMap.get(c.id);
      return progress?.status === 'mastered';
    }).length;
    return (mastered / domainConcepts.length) * 100;
  };

  return (
    <div className="min-h-screen p-4 max-w-screen-lg mx-auto">
      <div className="space-y-6">
        <div className="pt-4">
          <h1 className="text-3xl font-bold mb-2">📊 Progress</h1>
          <p className="text-gray-400">
            Track your learning journey
          </p>
        </div>

        {/* XP and Level */}
        <Card>
          <XPDisplay xp={engagement.xp} level={engagement.level} />
        </Card>

        {/* Streak */}
        <StreakDisplay
          streak={engagement.streak}
          freezeDays={engagement.freezeDaysRemaining}
        />

        {/* Weekly Goal */}
        <Card>
          <h3 className="text-lg font-semibold mb-4">🎯 Weekly Goal</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span className="text-gray-400">
                {engagement.weeklyProgress} / {engagement.weeklyGoal}
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(
                    (engagement.weeklyProgress / engagement.weeklyGoal) * 100,
                    100
                  )}%`,
                }}
              />
            </div>
          </div>
        </Card>

        {/* Domain Progress */}
        {curriculum && (
          <Card>
            <h3 className="text-lg font-semibold mb-4">📚 Domain Mastery</h3>
            <div className="grid grid-cols-2 gap-4">
              {curriculum.domains.map((domain) => {
                const progress = calculateDomainProgress(domain.id);
                return (
                  <div key={domain.id} className="flex flex-col items-center">
                    <ProgressRing percentage={progress} size={80} strokeWidth={6}>
                      <div className="text-center">
                        <div className="text-xl font-bold text-blue-500">
                          {Math.round(progress)}%
                        </div>
                      </div>
                    </ProgressRing>
                    <div className="text-sm text-center mt-2 text-gray-400">
                      {domain.name.split(' ')[0]}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Statistics */}
        <Card>
          <h3 className="text-lg font-semibold mb-4">📈 Statistics</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Total XP</span>
              <span className="font-semibold text-lg">{engagement.xp.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Current Level</span>
              <span className="font-semibold text-lg">{engagement.level}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Current Streak</span>
              <span className="font-semibold text-lg">{engagement.streak} days</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Concepts Mastered</span>
              <span className="font-semibold text-lg">
                {Array.from(progressMap.values()).filter(p => p.status === 'mastered').length}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
