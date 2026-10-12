import React from 'react';
import { ProgressRing } from '@/components/common';

interface XPDisplayProps {
  xp: number;
  level: number;
}

export function XPDisplay({ xp, level }: XPDisplayProps) {
  const xpForCurrentLevel = (level - 1) ** 2 * 100;
  const xpForNextLevel = level ** 2 * 100;
  const xpInLevel = xp - xpForCurrentLevel;
  const xpNeeded = xpForNextLevel - xpForCurrentLevel;
  const percentage = (xpInLevel / xpNeeded) * 100;

  return (
    <div className="flex items-center space-x-4">
      <ProgressRing percentage={percentage} size={80} strokeWidth={6}>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-500">{level}</div>
          <div className="text-xs text-gray-400">Level</div>
        </div>
      </ProgressRing>
      <div>
        <div className="text-sm text-gray-400">Experience Points</div>
        <div className="text-2xl font-bold">{xp.toLocaleString()}</div>
        <div className="text-xs text-gray-500">
          {xpInLevel} / {xpNeeded} to level {level + 1}
        </div>
      </div>
    </div>
  );
}
