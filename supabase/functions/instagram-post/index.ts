/**
 * Instagram Auto-Post — Supabase Edge Function
 *
 * Automatically posts each new poem line as a beautiful Instagram image.
 * Triggered by a database webhook on poem_lines INSERT.
 *
 * Setup:
 * 1. Deploy: supabase functions deploy instagram-post
 * 2. Set secrets:
 *    supabase secrets set INSTAGRAM_ACCESS_TOKEN=your_long_lived_token
 *    supabase secrets set INSTAGRAM_ACCOUNT_ID=your_ig_business_account_id
 * 3. Create a database webhook in Supabase Dashboard:
 *    - Table: poem_lines
 *    - Events: INSERT
 *    - Type: Edge Function
 *    - Function: instagram-post
 *
 * Instagram Graph API flow:
 * 1. Upload image to a public URL (we use Supabase Storage)
 * 2. Create a media container with the image URL
 * 3. Publish the container
 *
 * Required: Instagram Business/Creator account connected to a Facebook Page
 * with the instagram_basic, instagram_content_publish permissions.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const IG_ACCESS_TOKEN = Deno.env.get('INSTAGRAM_ACCESS_TOKEN') || '';
const IG_ACCOUNT_ID = Deno.env.get('INSTAGRAM_ACCOUNT_ID') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const GRAPH_API = 'https://graph.facebook.com/v19.0';

interface PoemLine {
  id: string;
  text: string;
  author_name: string;
  author_link: string | null;
  created_at: string;
  flagged: boolean;
}

/**
 * Generate a share card image as PNG using Canvas-like SVG approach.
 * Since Deno edge functions don't have Canvas, we generate an SVG
 * and convert it to a hosted image via Supabase Storage.
 */
function generateCardSvg(text: string, author: string): string {
  // Escape XML entities
  const escXml = (s: string) => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const safeText = escXml(text);
  const safeAuthor = escXml(author);

  // Word-wrap text into lines (~35 chars per line for 1080px)
  const words = safeText.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? current + ' ' + word : word;
    if (test.length > 38 && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);

  // Calculate vertical positioning
  const lineHeight = 60;
  const blockHeight = lines.length * lineHeight;
  const startY = 540 - blockHeight / 2;

  const textLines = lines.map((line, i) => {
    const prefix = i === 0 ? '\u201C' : '';
    const suffix = i === lines.length - 1 ? '\u201D' : '';
    return `<text x="540" y="${startY + i * lineHeight}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="42" font-style="italic" fill="#EFF0ED">${prefix}${line}${suffix}</text>`;
  }).join('\n    ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1080" height="1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#13100D"/>
      <stop offset="100%" style="stop-color:#1C1916"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1080" height="1080" fill="url(#bg)"/>

  <!-- Top green accent -->
  <rect x="0" y="0" width="1080" height="4" fill="#79B939"/>

  <!-- Decorative quote mark -->
  <text x="200" y="320" font-family="Georgia, serif" font-size="200" font-style="italic" fill="rgba(121,185,57,0.08)">\u201C</text>

  <!-- Poem line -->
  <g>
    ${textLines}
  </g>

  <!-- Author -->
  <text x="540" y="${startY + blockHeight + 60}" text-anchor="middle" font-family="'Nunito Sans', -apple-system, sans-serif" font-size="24" fill="#908F8A">\u2014 ${safeAuthor}</text>

  <!-- Accent line -->
  <line x1="440" y1="${startY + blockHeight + 100}" x2="640" y2="${startY + blockHeight + 100}" stroke="rgba(121,185,57,0.4)" stroke-width="2"/>

  <!-- Bottom branding -->
  <text x="540" y="980" text-anchor="middle" font-family="'Nunito Sans', -apple-system, sans-serif" font-size="18" fill="#7A7B75">Relentlessly Human</text>
  <text x="540" y="1010" text-anchor="middle" font-family="'Nunito Sans', -apple-system, sans-serif" font-size="14" fill="#7A7B75">itsowol.com/poem</text>

  <!-- Subtle border -->
  <rect x="20" y="20" width="1040" height="1040" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
</svg>`;
}

/**
 * Upload an SVG card to Supabase Storage and return its public URL.
 */
async function uploadCardImage(lineId: string, svgContent: string): Promise<string | null> {
  const path = `instagram/${lineId}.svg`;

  const { error } = await supabase.storage
    .from('public-assets')
    .upload(path, new Blob([svgContent], { type: 'image/svg+xml' }), {
      contentType: 'image/svg+xml',
      upsert: true,
    });

  if (error) {
    console.error('Upload error:', error);
    return null;
  }

  const { data } = supabase.storage.from('public-assets').getPublicUrl(path);
  return data?.publicUrl || null;
}

/**
 * Post an image to Instagram via the Graph API.
 * Two-step process: create container → publish.
 */
async function postToInstagram(imageUrl: string, caption: string): Promise<{ success: boolean; id?: string; error?: string }> {
  // Step 1: Create media container
  const containerRes = await fetch(`${GRAPH_API}/${IG_ACCOUNT_ID}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_url: imageUrl,
      caption: caption,
      access_token: IG_ACCESS_TOKEN,
    }),
  });

  const containerData = await containerRes.json();

  if (containerData.error) {
    return { success: false, error: containerData.error.message };
  }

  const containerId = containerData.id;

  // Step 2: Wait briefly for processing, then publish
  await new Promise((resolve) => setTimeout(resolve, 5000));

  const publishRes = await fetch(`${GRAPH_API}/${IG_ACCOUNT_ID}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creation_id: containerId,
      access_token: IG_ACCESS_TOKEN,
    }),
  });

  const publishData = await publishRes.json();

  if (publishData.error) {
    return { success: false, error: publishData.error.message };
  }

  return { success: true, id: publishData.id };
}

/**
 * Build Instagram caption with hashtags and link.
 */
function buildCaption(line: PoemLine): string {
  // Parse location from author_link
  let locationTag = '';
  if (line.author_link) {
    try {
      const socials = JSON.parse(line.author_link);
      if (socials.city || socials.country) {
        const parts = [socials.city, socials.country].filter(Boolean);
        locationTag = `\n\ud83d\udccd ${parts.join(', ')}`;
      }
    } catch (_e) {
      // Ignore
    }
  }

  return [
    `\u201C${line.text}\u201D`,
    `\u2014 ${line.author_name}${locationTag}`,
    '',
    'A line from the collaborative poem \u2014 written by strangers, for strangers.',
    'One line at a time. No AI. Only what you carry inside.',
    '',
    'Add your line \u2192 link in bio',
    '',
    '#RelentlesslyHuman #Poetry #CollaborativePoetry #HumanWords',
    '#SpokenWord #PoemOfTheDay #WritingCommunity #PoetsOfInstagram',
    '#OurWayOfLife #OwOL #itsowol',
  ].join('\n');
}

Deno.serve(async (req) => {
  try {
    // Parse the webhook payload
    const body = await req.json();

    // Database webhooks send: { type, table, record, schema, old_record }
    const record = body.record as PoemLine;

    if (!record || record.flagged) {
      return new Response(JSON.stringify({ message: 'Skipped: flagged or empty' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check credentials
    if (!IG_ACCESS_TOKEN || !IG_ACCOUNT_ID) {
      console.log('Instagram credentials not configured — skipping post');
      return new Response(JSON.stringify({
        message: 'Instagram not configured',
        line: record.text,
        author: record.author_name,
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    // Generate the card image
    const svg = generateCardSvg(record.text, record.author_name);

    // Upload to Supabase Storage
    const imageUrl = await uploadCardImage(record.id, svg);

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: 'Failed to upload image' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Build caption
    const caption = buildCaption(record);

    // Post to Instagram
    const result = await postToInstagram(imageUrl, caption);

    // Log the result
    console.log('Instagram post result:', result);

    return new Response(JSON.stringify({
      message: result.success ? 'Posted to Instagram' : 'Post failed',
      ...result,
      line: record.text,
      author: record.author_name,
    }), {
      status: result.success ? 200 : 500,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Instagram post error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
