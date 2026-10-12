import { Curriculum } from '@/types';

export async function loadCurriculum(): Promise<Curriculum> {
  const response = await fetch('/curriculum.json');
  if (!response.ok) {
    throw new Error('Failed to load curriculum');
  }
  return response.json();
}

export async function loadAssessmentBank(): Promise<any> {
  const response = await fetch('/assessment-bank.json');
  if (!response.ok) {
    throw new Error('Failed to load assessment bank');
  }
  return response.json();
}

export async function loadOfflineContent(): Promise<any> {
  const response = await fetch('/offline-content.json');
  if (!response.ok) {
    throw new Error('Failed to load offline content');
  }
  return response.json();
}
