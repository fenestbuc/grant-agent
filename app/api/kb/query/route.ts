// app/api/kb/query/route.ts
import { createClient } from '@/lib/supabase/server';
import { generateQueryEmbedding } from '@/lib/llm/document-processor';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: startup } = await supabase
      .from('startups')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!startup) {
      return NextResponse.json({ error: 'No startup profile found' }, { status: 400 });
    }

    const { query, limit = 5, threshold = 0.7 } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Generate embedding for query
    const queryEmbedding = await generateQueryEmbedding(query);

    // Search for similar chunks using pgvector
    const { data: chunks, error } = await supabase.rpc('match_kb_chunks', {
      query_embedding: queryEmbedding,
      match_startup_id: startup.id,
      match_threshold: threshold,
      match_count: limit,
    });

    if (error) {
      console.error('Search error:', error);
      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }

    // Get document names for the chunks
    const documentIds = [...new Set(chunks?.map((c: { document_id: string }) => c.document_id) || [])];

    const { data: documents } = await supabase
      .from('kb_documents')
      .select('id, filename')
      .in('id', documentIds);

    const docMap = new Map(documents?.map((d) => [d.id, d.filename]) || []);

    // Enrich chunks with document names
    const enrichedChunks = chunks?.map((chunk: { document_id: string; content: string; similarity: number }) => ({
      ...chunk,
      document_name: docMap.get(chunk.document_id) || 'Unknown',
    })) || [];

    return NextResponse.json({ data: enrichedChunks });
  } catch (error) {
    console.error('Query error:', error);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }
}
