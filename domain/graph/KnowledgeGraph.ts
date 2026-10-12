/**
 * KnowledgeGraph — pure domain logic, no UI or DB imports.
 * Handles prerequisite resolution, cycle detection, and unlock queries.
 */

import type { Concept, Curriculum } from '@/types/concept';

export class KnowledgeGraph {
  private conceptMap = new Map<string, Concept>();
  private curriculum: Curriculum | null = null;

  load(curriculum: Curriculum): void {
    this.curriculum = curriculum;
    this.conceptMap.clear();
    for (const concept of curriculum.concepts) {
      this.conceptMap.set(concept.id, concept);
    }
    // Validate: no cycles
    for (const concept of curriculum.concepts) {
      if (this.hasCycle(concept.id, new Set())) {
        throw new Error(`Prerequisite cycle detected involving concept: ${concept.id}`);
      }
    }
  }

  getConcept(id: string): Concept | undefined {
    return this.conceptMap.get(id);
  }

  getAllConcepts(): Concept[] {
    return this.curriculum?.concepts ?? [];
  }

  getConceptsByDomain(domainId: string): Concept[] {
    return this.getAllConcepts().filter((c) => c.domain === domainId);
  }

  /**
   * A concept is unlocked when ALL its prerequisites have state 'mastered'.
   * Concepts with no prerequisites are always unlocked.
   */
  isUnlocked(
    conceptId: string,
    masteredIds: ReadonlySet<string>
  ): boolean {
    const concept = this.conceptMap.get(conceptId);
    if (!concept) return false;
    if (concept.prerequisites.length === 0) return true;
    return concept.prerequisites.every((pid) => masteredIds.has(pid));
  }

  /**
   * Returns all concepts whose prerequisites are all in masteredIds.
   * Excludes already-mastered concepts (they're already done).
   */
  getAvailable(masteredIds: ReadonlySet<string>): Concept[] {
    return this.getAllConcepts().filter(
      (c) => !masteredIds.has(c.id) && this.isUnlocked(c.id, masteredIds)
    );
  }

  /**
   * Full prerequisite chain (transitive) for a concept, topologically ordered.
   */
  getPrerequisiteChain(conceptId: string): Concept[] {
    const visited = new Set<string>();
    const order: Concept[] = [];
    const visit = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);
      const c = this.conceptMap.get(id);
      if (!c) return;
      for (const pid of c.prerequisites) visit(pid);
      if (id !== conceptId) order.push(c); // exclude the concept itself
    };
    visit(conceptId);
    return order;
  }

  /** Concepts that directly depend on this concept */
  getDependents(conceptId: string): Concept[] {
    return this.getAllConcepts().filter((c) =>
      c.prerequisites.includes(conceptId)
    );
  }

  private hasCycle(id: string, visiting: Set<string>): boolean {
    if (visiting.has(id)) return true;
    const concept = this.conceptMap.get(id);
    if (!concept) return false;
    visiting.add(id);
    for (const pid of concept.prerequisites) {
      if (this.hasCycle(pid, visiting)) return true;
    }
    visiting.delete(id);
    return false;
  }
}

export const knowledgeGraph = new KnowledgeGraph();
