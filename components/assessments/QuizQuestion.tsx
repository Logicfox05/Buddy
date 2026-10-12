'use client';

import React, { useState } from 'react';
import { Question } from '@/types';
import { Button, Card } from '@/components/common';

interface QuizQuestionProps {
  question: Question;
  onSubmit: (answer: string | string[]) => void;
}

export function QuizQuestion({ question, onSubmit }: QuizQuestionProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | string[]>(
    question.type === 'multi-select' ? [] : ''
  );
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    setSubmitted(true);
    onSubmit(selectedAnswer);
  };

  const handleOptionClick = (option: string) => {
    if (submitted) return;

    if (question.type === 'multi-select') {
      const current = selectedAnswer as string[];
      if (current.includes(option)) {
        setSelectedAnswer(current.filter((o) => o !== option));
      } else {
        setSelectedAnswer([...current, option]);
      }
    } else {
      setSelectedAnswer(option);
    }
  };

  const isSelected = (option: string) => {
    if (question.type === 'multi-select') {
      return (selectedAnswer as string[]).includes(option);
    }
    return selectedAnswer === option;
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-4">
          <span className="text-xs text-blue-400 uppercase font-semibold">
            {question.type === 'mcq' ? 'Multiple Choice' : 'Multi-Select'}
          </span>
          <span className="text-xs text-gray-500 ml-2">
            ({question.difficulty})
          </span>
        </div>
        <h3 className="text-lg font-medium mb-4">{question.prompt}</h3>
      </Card>

      {/* Options */}
      <div className="space-y-2">
        {question.options?.map((option, index) => (
          <button
            key={index}
            onClick={() => handleOptionClick(option)}
            disabled={submitted}
            className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
              isSelected(option)
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-gray-700 hover:border-gray-600'
            } ${submitted ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
          >
            <div className="flex items-center">
              <div
                className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                  isSelected(option)
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-600'
                }`}
              >
                {isSelected(option) && (
                  <div className="w-2 h-2 bg-white rounded-full" />
                )}
              </div>
              <span>{option}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Fill-in-the-blank input */}
      {question.type === 'fill-blank' && (
        <input
          type="text"
          value={selectedAnswer as string}
          onChange={(e) => setSelectedAnswer(e.target.value)}
          disabled={submitted}
          placeholder="Type your answer..."
          className="w-full p-4 bg-gray-800 border-2 border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
        />
      )}

      {/* Submit button */}
      {!submitted && (
        <Button
          onClick={handleSubmit}
          disabled={
            question.type === 'multi-select'
              ? (selectedAnswer as string[]).length === 0
              : !selectedAnswer
          }
          className="w-full"
        >
          Submit Answer
        </Button>
      )}
    </div>
  );
}
