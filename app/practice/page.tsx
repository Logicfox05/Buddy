'use client';

import { Card, Button } from '@/components/common';

export default function PracticePage() {
  return (
    <div className="min-h-screen p-4 max-w-screen-lg mx-auto">
      <div className="space-y-6">
        <div className="pt-4">
          <h1 className="text-3xl font-bold mb-2">✍️ Practice</h1>
          <p className="text-gray-400">
            Sharpen your skills with targeted practice
          </p>
        </div>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">📋 Due Reviews</h3>
          <p className="text-gray-400 text-sm mb-4">
            You have 0 concepts due for review
          </p>
          <Button variant="secondary" className="w-full" disabled>
            No Reviews Due
          </Button>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">🎯 Practice Mode</h3>
          <p className="text-gray-400 text-sm mb-4">
            Practice any concept you&apos;ve started
          </p>
          <Button className="w-full">Browse Concepts</Button>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">❓ Random Quiz</h3>
          <p className="text-gray-400 text-sm mb-4">
            Test yourself with random questions from mastered concepts
          </p>
          <Button variant="outline" className="w-full">
            Start Random Quiz
          </Button>
        </Card>
      </div>
    </div>
  );
}
