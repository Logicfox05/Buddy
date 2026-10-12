'use client';

import { useEffect } from 'react';
import { Card } from '@/components/common';
import { useAppStore } from '@/lib/stores/app-store';
import { loadCurriculum } from '@/lib/utils/data-loader';
import Link from 'next/link';

export default function MapPage() {
  const { curriculum, setCurriculum, progressMap } = useAppStore();

  useEffect(() => {
    async function init() {
      if (!curriculum) {
        const curriculumData = await loadCurriculum();
        setCurriculum(curriculumData);
      }
    }
    init();
  }, [curriculum, setCurriculum]);

  if (!curriculum) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading knowledge map...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 max-w-screen-lg mx-auto">
      <div className="space-y-6">
        <div className="pt-4">
          <h1 className="text-3xl font-bold mb-2">🗺️ Knowledge Map</h1>
          <p className="text-gray-400">
            Your learning path through CS fundamentals
          </p>
        </div>

        {/* Domains */}
        {curriculum.domains.map((domain) => {
          const domainConcepts = curriculum.concepts.filter(
            (c) => c.domain === domain.id
          );
          const masteredCount = domainConcepts.filter((c) => {
            const progress = progressMap.get(c.id);
            return progress?.status === 'mastered';
          }).length;

          return (
            <div key={domain.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">{domain.name}</h2>
                <span className="text-sm text-gray-400">
                  {masteredCount} / {domainConcepts.length}
                </span>
              </div>

              <div className="space-y-2">
                {domainConcepts.map((concept) => {
                  const progress = progressMap.get(concept.id);
                  const status = progress?.status || 'available';
                  
                  const statusConfig = {
                    locked: { bg: 'bg-gray-800', text: 'text-gray-500', icon: '🔒' },
                    available: { bg: 'bg-gray-800', text: 'text-gray-300', icon: '⭐' },
                    'in-progress': { bg: 'bg-blue-900/30', text: 'text-blue-300', icon: '📚' },
                    mastered: { bg: 'bg-green-900/30', text: 'text-green-300', icon: '✅' },
                    fading: { bg: 'bg-yellow-900/30', text: 'text-yellow-300', icon: '⚠️' },
                  };

                  const config = statusConfig[status];

                  return (
                    <Link key={concept.id} href={`/concept/${concept.id}`}>
                      <Card className={`${config.bg} hover:opacity-80 transition-opacity`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">{config.icon}</span>
                            <div>
                              <div className={`font-medium ${config.text}`}>
                                {concept.title}
                              </div>
                              {progress && (
                                <div className="text-xs text-gray-500">
                                  {progress.lessonsCompleted} / {progress.totalLessons} lessons
                                </div>
                              )}
                            </div>
                          </div>
                          {concept.prerequisites.length > 0 && (
                            <span className="text-xs text-gray-500">
                              {concept.prerequisites.length} prereq
                            </span>
                          )}
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
