import { NextRequest, NextResponse } from 'next/server';
import { webKnowledgeService } from '@/services/web-learning/WebKnowledgeService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const topic = body.topic?.trim();
    const domain = body.domain?.trim();

    if (!topic) {
      return NextResponse.json(
        { error: 'Topic query is required' },
        { status: 400 }
      );
    }

    const result = await webKnowledgeService.fetchSubjectDetails(topic, domain);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching web knowledge:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch knowledge from web' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const topic = url.searchParams.get('topic') || 'B+ Tree Indexing';
  const domain = url.searchParams.get('domain') || undefined;

  const result = await webKnowledgeService.fetchSubjectDetails(topic, domain);
  return NextResponse.json(result);
}
