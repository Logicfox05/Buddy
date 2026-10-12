import {
  LearningSession,
  SessionItem,
  SessionType,
  ConceptProgress,
  ReviewSchedule,
  Concept,
} from '@/types';

export class SessionBuilder {
  buildFullSession(
    availableConcepts: Concept[],
    dueReviews: string[],
    progressMap: Map<string, ConceptProgress>
  ): LearningSession {
    const items: SessionItem[] = [];
    
    // Add due reviews
    for (const conceptId of dueReviews.slice(0, 3)) {
      // Review items will be added
    }
    
    // Add new content from in-progress concepts
    for (const concept of availableConcepts.slice(0, 2)) {
      const progress = progressMap.get(concept.id);
      if (progress && progress.lessonsCompleted < progress.totalLessons) {
        const lesson = concept.microLessons[progress.lessonsCompleted];
        if (lesson) {
          items.push({
            type: 'lesson',
            conceptId: concept.id,
            content: lesson,
          });
        }
      }
    }

    return {
      id: `session-${Date.now()}`,
      items: this.interleaveContent(items),
      estimatedMinutes: items.length * 2,
      type: 'full',
      createdAt: new Date(),
    };
  }

  buildFiveMinuteSession(
    dueReviews: string[],
    availableConcepts: Concept[],
    progressMap: Map<string, ConceptProgress>
  ): LearningSession {
    const items: SessionItem[] = [];
    let totalTime = 0;
    const maxTime = 5;

    // Prioritize reviews
    for (const conceptId of dueReviews) {
      if (totalTime >= maxTime) break;
      // Add review item (estimate 2 minutes)
      totalTime += 2;
    }

    // Add one new card if time allows
    if (totalTime < maxTime && availableConcepts.length > 0) {
      const concept = availableConcepts[0];
      const progress = progressMap.get(concept.id);
      if (progress && progress.lessonsCompleted < progress.totalLessons) {
        const lesson = concept.microLessons[progress.lessonsCompleted];
        if (lesson) {
          items.push({
            type: 'lesson',
            conceptId: concept.id,
            content: lesson,
          });
          totalTime += 1.5;
        }
      }
    }

    return {
      id: `session-${Date.now()}`,
      items,
      estimatedMinutes: Math.ceil(totalTime),
      type: 'five-minute',
      createdAt: new Date(),
    };
  }

  buildReviewSession(
    dueReviews: string[],
    conceptMap: Map<string, Concept>
  ): LearningSession {
    const items: SessionItem[] = [];
    
    for (const conceptId of dueReviews) {
      const concept = conceptMap.get(conceptId);
      if (concept) {
        // Add review items for this concept
      }
    }

    return {
      id: `session-${Date.now()}`,
      items: this.interleaveContent(items),
      estimatedMinutes: items.length * 2,
      type: 'review',
      createdAt: new Date(),
    };
  }

  buildLowMotivationSession(
    availableConcepts: Concept[],
    progressMap: Map<string, ConceptProgress>
  ): LearningSession {
    const items: SessionItem[] = [];
    
    // Just one card - the smallest win
    if (availableConcepts.length > 0) {
      const concept = availableConcepts[0];
      const progress = progressMap.get(concept.id);
      if (progress && progress.lessonsCompleted < progress.totalLessons) {
        const lesson = concept.microLessons[progress.lessonsCompleted];
        if (lesson) {
          items.push({
            type: 'lesson',
            conceptId: concept.id,
            content: lesson,
          });
        }
      }
    }

    return {
      id: `session-${Date.now()}`,
      items,
      estimatedMinutes: 1.5,
      type: 'low-motivation',
      createdAt: new Date(),
    };
  }

  interleaveContent(items: SessionItem[]): SessionItem[] {
    // Group by concept
    const byConceptId = new Map<string, SessionItem[]>();
    for (const item of items) {
      const list = byConceptId.get(item.conceptId) || [];
      list.push(item);
      byConceptId.set(item.conceptId, list);
    }

    // Interleave
    const result: SessionItem[] = [];
    const conceptIds = Array.from(byConceptId.keys());
    let index = 0;
    
    while (result.length < items.length) {
      for (const conceptId of conceptIds) {
        const list = byConceptId.get(conceptId);
        if (list && list.length > 0) {
          const item = list.shift();
          if (item) result.push(item);
        }
      }
      index++;
      if (index > items.length * 2) break; // Safety
    }

    return result;
  }
}
