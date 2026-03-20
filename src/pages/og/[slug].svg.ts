import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';

export const getStaticPaths: GetStaticPaths = async () => {
  const poems = await getCollection('poems');
  return poems.map((poem) => ({
    params: { slug: poem.id.replace(/\.md$/, '') },
    props: { title: poem.data.title, theme: poem.data.theme || '', excerpt: poem.data.excerpt || '' },
  }));
};

export const GET: APIRoute = ({ props }) => {
  const { title, theme, excerpt } = props as { title: string; theme: string; excerpt: string };

  // Truncate excerpt to ~80 chars for the SVG
  const shortExcerpt = excerpt.length > 80 ? excerpt.slice(0, 77) + '...' : excerpt;

  // Escape XML entities
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#13100D"/>
      <stop offset="100%" stop-color="#1C1916"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  ${theme ? `<text x="600" y="180" text-anchor="middle" font-family="-apple-system, 'Segoe UI', sans-serif" font-size="14" fill="#79B939" letter-spacing="4" text-transform="uppercase">${esc(theme.toUpperCase())}</text>` : ''}
  <text x="600" y="260" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="64" font-weight="400" fill="#EFF0ED" letter-spacing="2">${esc(title)}</text>
  <line x1="500" y1="290" x2="700" y2="290" stroke="#79B939" stroke-width="1.5" opacity="0.5"/>
  ${shortExcerpt ? `<text x="600" y="340" text-anchor="middle" font-family="Georgia, serif" font-size="20" fill="#9B9C96" font-style="italic">${esc(shortExcerpt)}</text>` : ''}
  <text x="600" y="520" text-anchor="middle" font-family="Georgia, serif" font-size="18" fill="#7A7B75" font-style="italic">from Ravings by Chidi Francis Onwuka</text>
  <text x="600" y="570" text-anchor="middle" font-family="-apple-system, 'Segoe UI', sans-serif" font-size="16" fill="#7A7B75" letter-spacing="2">itsowol.com</text>
</svg>`;

  return new Response(svg, {
    headers: { 'Content-Type': 'image/svg+xml' },
  });
};
