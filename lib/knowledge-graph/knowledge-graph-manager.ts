import { Concept, Curriculum, Domain } from '@/types';
import { ConceptProgress } from '@/types';

export class KnowledgeGraphManager {
  private curriculum: Curriculum | null = null;
  private conceptMap: Map<string, Concept> = new Map();

  async loadCurriculum(curriculumData: Curriculum): Promise<void> {
    this.curriculum = curriculumData;
    this.conceptMap.clear();
    
    // Build concept map for fast lookup
    for (const concept of curriculumData.concepts) {
      this.conceptMap.set(concept.id, concept);
    }
  }

  getConcept(id: string): Concept | null {
    return this.conceptMap.get(id) || null;
  }

  getPrerequisites(conceptId: string): Concept[] {
    const concept = this.getConcept(conceptId);
    if (!concept) return [];
    
    return concept.prerequisites
      .map((id) => this.getConcept(id))
      .filter((c): c is Concept => c !== null);
  }

  getDependents(conceptId: string): Concept[] {
    if (!this.curriculum) return [];
    
    return this.curriculum.concepts.filter((c) =>
      c.prerequisites.includes(conceptId)
    );
  }

  isUnlocked(conceptId: string, progressMap: Map<string, ConceptProgress>): boolean {
    const concept = this.getConcept(conceptId);
    if (!concept) return false;
    
    // Concept with no prerequisites is always unlocked
    if (concept.prerequisites.length === 0) return true;
    
    // Check if all prerequisites are mastered
    return concept.prerequisites.every((prereqId) => {
      const progress = progressMap.get(prereqId);
      return progress?.status === 'mastered';
    });
  }

  getUnlockedConcepts(progressMap: Map<string, ConceptProgress>): Concept[] {
    if (!this.curriculum) return [];
    
    return this.curriculum.concepts.filter((concept) =>
      this.isUnlocked(concept.id, progressMap)
    );
  }

  getConceptsByDomain(domain: Domain): Concept[] {
    if (!this.curriculum) return [];
    
    return this.curriculum.concepts.filter((c) => c.domain === domain);
  }

  getAllConcepts(): Concept[] {
    return this.curriculum?.concepts || [];
  }

  getDomains(): Domain[] {
    return this.curriculum?.domains.map((d) => d.id) || [];
  }
}
