import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebKnowledgeService } from '@/services/web-learning/WebKnowledgeService';

describe('WebKnowledgeService', () => {
  const service = new WebKnowledgeService();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('retrieves detailed subject knowledge for curated CS topics', async () => {
    const data = await service.fetchSubjectDetails('B+ tree');
    expect(data).toBeDefined();
    expect(data.cleanTitle).toContain('B+ Tree');
    expect(data.domain).toContain('DBMS');
    expect(data.summary).toBeTruthy();
    expect(data.deepExplanation.length).toBeGreaterThan(0);
    expect(data.keyTakeaways.length).toBeGreaterThan(0);
  });

  it('generates an interactive practice set with MCQs and Explain-It rubric', async () => {
    const data = await service.fetchSubjectDetails('Virtual memory');
    expect(data.practiceSet).toBeDefined();
    expect(data.practiceSet.mcqs.length).toBeGreaterThanOrEqual(1);

    const firstMCQ = data.practiceSet.mcqs[0];
    expect(firstMCQ.options.length).toBeGreaterThanOrEqual(3);
    expect(firstMCQ.correctIndex).toBeGreaterThanOrEqual(0);
    expect(firstMCQ.correctIndex).toBeLessThan(firstMCQ.options.length);

    expect(data.practiceSet.explainTask).toBeDefined();
    expect(data.practiceSet.explainTask.rubric.length).toBeGreaterThan(0);
    expect(data.practiceSet.explainTask.modelAnswer).toBeTruthy();
  });

  it('handles arbitrary CS queries with clean synthesis and valid practice set', async () => {
    // Mock fetch for Wikipedia endpoint
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
      const urlStr = url.toString();
      if (urlStr.includes('action=query')) {
        return {
          ok: true,
          json: async () => ({
            query: { search: [{ title: 'Raft (algorithm)', snippet: 'Raft is a consensus algorithm...' }] },
          }),
        } as any;
      }
      if (urlStr.includes('page/summary')) {
        return {
          ok: true,
          json: async () => ({
            title: 'Raft (algorithm)',
            extract: 'Raft is a consensus algorithm designed as an alternative to Paxos.',
            content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Raft_(algorithm)' } },
          }),
        } as any;
      }
      return { ok: false } as any;
    });

    const data = await service.fetchSubjectDetails('Raft Consensus Algorithm', 'Distributed Systems');
    expect(data.topic).toBe('Raft Consensus Algorithm');
    expect(data.cleanTitle).toContain('Raft');
    expect(data.summary).toBeTruthy();
    expect(data.practiceSet.mcqs.length).toBeGreaterThanOrEqual(1);
    expect(data.sourceUrl).toContain('wikipedia');
  });
});
