import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL || 'https://jebbvyeenafpjrdhneoi.supabase.co',
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_fM_rNj8c0L8gSlc1IuXwIA_466dQW4x'
);

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'X-RateLimit-Limit': '60',
  'X-RateLimit-Window': '60s',
};

export const GET: APIRoute = async ({ url }) => {
  const params = url.searchParams;
  const limit = Math.min(Math.max(parseInt(params.get('limit') || '2000', 10) || 2000, 1), 2000);
  const offset = Math.max(parseInt(params.get('offset') || '0', 10) || 0, 0);
  const author = params.get('author');
  const format = params.get('format');

  // Build query: non-flagged lines, oldest first
  let query = supabase
    .from('poem_lines')
    .select('text, author_name, created_at', { count: 'exact' })
    .eq('flagged', false)
    .order('created_at', { ascending: true });

  if (author) {
    query = query.ilike('author_name', `%${author}%`);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch poem lines' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  const lines = data || [];

  // Unique authors count (from full dataset, not just this page)
  const { data: authorData } = await supabase
    .from('poem_lines')
    .select('author_name')
    .eq('flagged', false);

  const uniqueAuthors = new Set((authorData || []).map((r: { author_name: string }) => r.author_name)).size;

  // Plain text export
  if (format === 'text') {
    const text = lines.map((l: { text: string }) => l.text).join('\n');
    return new Response(text, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        ...CORS_HEADERS,
      },
    });
  }

  // JSON response
  const body = {
    meta: {
      title: 'Relentlessly Human — A Collaborative Poem',
      url: 'https://itsowol.com/poem/',
      total: count ?? lines.length,
      authors: uniqueAuthors,
      generated_at: new Date().toISOString(),
    },
    lines: lines.map((l: { text: string; author_name: string; created_at: string }) => ({
      text: l.text,
      author: l.author_name,
      created_at: l.created_at,
    })),
  };

  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
      ...CORS_HEADERS,
    },
  });
};

// Handle CORS preflight
export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
};
