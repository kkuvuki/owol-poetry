import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async () => {
  const poems = (await getCollection('poems')).sort((a, b) => a.data.order - b.data.order);

  // Deterministic rotation based on the day
  const daysSinceEpoch = Math.floor(Date.now() / 86400000);
  const index = daysSinceEpoch % poems.length;
  const poem = poems[index];
  const slug = poem.id.replace(/\.md$/, '');

  return new Response(JSON.stringify({
    title: poem.data.title,
    excerpt: poem.data.excerpt || '',
    theme: poem.data.theme || '',
    year: poem.data.year || '',
    url: `https://itsowol.com/poems/${slug}/`,
    og_image: `https://itsowol.com/og/${slug}.svg`,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
