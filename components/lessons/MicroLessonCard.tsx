'use client';

import React, { useState } from 'react';
import { MicroLesson } from '@/types';
import { Button } from '@/components/common';

interface MicroLessonCardProps {
  lesson: MicroLesson;
  current: number;
  total: number;
  onComplete: () => void;
  onPrevious?: () => void;
}

export function MicroLessonCard({
  lesson,
  current,
  total,
  onComplete,
  onPrevious,
}: MicroLessonCardProps) {
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 150) {
      // Swiped left - next
      onComplete();
    }
    if (touchStart - touchEnd < -150 && onPrevious) {
      // Swiped right - previous
      onPrevious();
    }
  };

  return (
    <div
      className="bg-gray-800 rounded-lg p-6 min-h-[400px] flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Progress indicator */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-400">
            Card {current} of {total}
          </span>
          <span className="text-xs text-gray-500">
            ~{lesson.estimatedSeconds}s
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(current / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto prose prose-invert prose-sm max-w-none mb-6">
        <div dangerouslySetInnerHTML={{ __html: lesson.content }} />
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-700">
        {onPrevious ? (
          <Button variant="outline" size="sm" onClick={onPrevious}>
            ← Previous
          </Button>
        ) : (
          <div />
        )}
        <Button onClick={onComplete} size="md">
          {current === total ? 'Complete' : 'Next →'}
        </Button>
      </div>

      {/* Swipe hint */}
      <div className="text-center text-xs text-gray-500 mt-2">
        Swipe to navigate
      </div>
    </div>
  );
}
