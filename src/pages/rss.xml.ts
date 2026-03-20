import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const poems = (await getCollection('poems')).sort((a, b) => a.data.order - b.data.order);

  return rss({
    title: 'Ravings — Chidi Francis Onwuka',
    description: 'Poetry about resilience, heritage, connection, and our way of life.',
    site: context.site || 'https://itsowol.com',
    items: poems.map((poem) => ({
      title: poem.data.title,
      description: poem.data.excerpt || `Read "${poem.data.title}" from the collection Ravings.`,
      link: `/poems/${poem.id.replace(/\.md$/, '')}/`,
      pubDate: new Date(poem.data.year || '2024'),
    })),
  });
}
