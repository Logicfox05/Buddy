'use client';

import { useEffect, useState } from 'react';
import { Button, Card } from '@/components/common';
import { XPDisplay, StreakDisplay } from '@/components/progress';
import { useAppStore } from '@/lib/stores/app-store';
import { loadCurriculum } from '@/lib/utils/data-loader';

export default function HomePage() {
  const { engagement, curriculum, setCurriculum } = useAppStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const curriculumData = await loadCurriculum();
        setCurriculum(curriculumData);
      } catch (error) {
        console.error('Failed to load curriculum:', error);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [setCurriculum]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-2">Loading...</div>
          <div className="text-gray-400">Preparing your learning journey</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 max-w-screen-lg mx-auto">
      <div className="space-y-6">
        {/* Header */}
        <div className="pt-4">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back! 👋
          </h1>
          <p className="text-gray-400">
            Ready to continue your CS mastery journey?
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

        {/* Quick Actions */}
        <div className="space-y-3">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-2">📚 Continue Learning</h3>
            <p className="text-gray-400 text-sm mb-4">
              Pick up where you left off
            </p>
            <Button className="w-full">Start Learning</Button>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-2">⚡ 5-Minute Mode</h3>
            <p className="text-gray-400 text-sm mb-4">
              Quick session with due reviews + one new card
            </p>
            <Button variant="secondary" className="w-full">
              Start Quick Session
            </Button>
          </Card>
        </div>

        {/* Stats */}
        <Card>
          <h3 className="text-lg font-semibold mb-4">📈 This Week</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-2xl font-bold text-blue-500">
                {engagement.weeklyProgress}
              </div>
              <div className="text-sm text-gray-400">Concepts Mastered</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-500">
                {engagement.weeklyGoal}
              </div>
              <div className="text-sm text-gray-400">Weekly Goal</div>
            </div>
          </div>
        </Card>

        {/* Curriculum Info */}
        {curriculum && (
          <Card>
            <h3 className="text-lg font-semibold mb-2">📖 Curriculum</h3>
            <p className="text-gray-400 text-sm">
              {curriculum.concepts.length} concepts across{' '}
              {curriculum.domains.length} domains
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
