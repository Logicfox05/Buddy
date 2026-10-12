import React from 'react';

interface StreakDisplayProps {
  streak: number;
  freezeDays: number;
}

export function StreakDisplay({ streak, freezeDays }: StreakDisplayProps) {
  return (
    <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-lg p-4 border border-orange-500/30">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-400">Daily Streak</div>
          <div className="text-3xl font-bold text-orange-400">
            {streak} 🔥
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-400">Freeze Days</div>
          <div className="text-2xl font-semibold text-blue-400">
            {freezeDays} ❄️
          </div>
        </div>
      </div>
      {streak > 0 && (
        <div className="mt-2 text-xs text-gray-400">
          Keep it up! You&apos;re on a roll 🎉
        </div>
      )}
    </div>
  );
}
