/**
 * Supabase Edge Function: weekly-poem
 *
 * Composes a weekly poem from community-submitted lines, posts it to
 * Twitter/X (and optionally Instagram), and stores it in the weekly_poems table.
 *
 * Setup:
 * 1. Deploy: supabase functions deploy weekly-poem --no-verify-jwt
 * 2. Set secrets:
 *    supabase secrets set TWITTER_API_KEY=your_api_key
 *    supabase secrets set TWITTER_API_SECRET=your_api_secret
 *    supabase secrets set TWITTER_ACCESS_TOKEN=your_access_token
 *    supabase secrets set TWITTER_ACCESS_SECRET=your_access_secret
 *    supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
 * 3. (Optional) supabase secrets set INSTAGRAM_ACCESS_TOKEN=your_token
 * 4. Schedule via pg_cron or external cron to POST to this function weekly.
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Stop words to exclude from overlap scoring ──────────────────────────────

const STOP_WORDS = new Set([
  "the", "a", "is", "and", "to", "of", "in", "it", "that", "was", "for",
  "on", "with", "as", "at", "by", "from", "or", "but", "not", "be", "are",
  "this", "an", "we", "you", "i", "my", "our", "they", "their", "have",
  "has", "had", "do", "did", "will", "would", "could", "should", "can", "may",
]);

// ── Types ───────────────────────────────────────────────────────────────────

interface PoemLine {
  id: string;
  text: string;
  author_name: string;
  created_at: string;
  flagged: boolean;
}

interface ScoredLine {
  line: PoemLine;
  score: number;
}

interface WeeklyPoemLine {
  text: string;
  author_name: string;
  line_id: string;
}

// ── Utility: extract significant words from text ────────────────────────────

function significantWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z\s']/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

// ── Utility: word overlap between two word sets ─────────────────────────────

function wordOverlap(wordsA: string[], wordsB: string[]): number {
  const setB = new Set(wordsB);
  return wordsA.filter((w) => setB.has(w)).length;
}

// ── Utility: emotional resonance score ──────────────────────────────────────

function emotionalScore(text: string): number {
  let score = 0;
  if (text.includes("?")) score += 2;
  if (text.includes("!")) score += 2;
  if (text.includes("...") || text.includes("\u2026")) score += 3;
  if (text.includes("\u2014") || text.includes("--")) score += 1;
  return score;
}

// ── Core: select and arrange lines into a cohesive mini-poem ────────────────

function composePoem(lines: PoemLine[]): WeeklyPoemLine[] {
  if (lines.length < 5) {
    // Not enough lines to compose a poem
    return [];
  }

  // Pick a random seed line
  const seedIdx = Math.floor(Math.random() * lines.length);
  const seedLine = lines[seedIdx];
  const seedWords = significantWords(seedLine.text);

  // Score every line
  const scored: ScoredLine[] = lines.map((line) => {
    const words = significantWords(line.text);
    const overlap = wordOverlap(words, seedWords);
    const emotion = emotionalScore(line.text);
    const lengthRatio =
      Math.min(line.text.length, seedLine.text.length) /
      Math.max(line.text.length, seedLine.text.length);
    const lengthBonus = lengthRatio >= 0.6 ? 2 : 0; // within ~40%

    return {
      line,
      score: overlap * 3 + emotion + lengthBonus,
    };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Select top candidates, ensuring author variety
  const selected: ScoredLine[] = [];
  const authorCounts: Record<string, number> = {};
  const usedIds = new Set<string>();

  // Always include the seed line first
  selected.push({ line: seedLine, score: Infinity });
  const seedAuthor = (seedLine.author_name || "Anonymous").toLowerCase();
  authorCounts[seedAuthor] = 1;
  usedIds.add(seedLine.id);

  for (const candidate of scored) {
    if (selected.length >= 10) break;
    if (usedIds.has(candidate.line.id)) continue;

    const author = (candidate.line.author_name || "Anonymous").toLowerCase();
    // Cap at 2 lines per author for variety
    if ((authorCounts[author] || 0) >= 2) continue;

    selected.push(candidate);
    authorCounts[author] = (authorCounts[author] || 0) + 1;
    usedIds.add(candidate.line.id);
  }

  // Need at least 5 lines
  if (selected.length < 5) {
    // Relax the author constraint and fill up
    for (const candidate of scored) {
      if (selected.length >= 5) break;
      if (usedIds.has(candidate.line.id)) continue;
      selected.push(candidate);
      usedIds.add(candidate.line.id);
    }
  }

  // Arrange: short opener, medium body, impactful closer
  const pool = [...selected];
  pool.sort((a, b) => a.line.text.length - b.line.text.length);

  // Opener: shortest line (punchy)
  const opener = pool.shift()!;

  // Closer: line with highest emotional score among remaining
  pool.sort(
    (a, b) =>
      emotionalScore(b.line.text) - emotionalScore(a.line.text) ||
      b.line.text.length - a.line.text.length
  );
  const closer = pool.shift()!;

  // Body: remaining lines sorted by length ascending for a natural build
  pool.sort((a, b) => a.line.text.length - b.line.text.length);

  const arranged = [opener, ...pool, closer];

  return arranged.map((s) => ({
    text: s.line.text,
    author_name: s.line.author_name || "Anonymous",
    line_id: s.line.id,
  }));
}

// ── Twitter: build tweet and post ───────────────────────────────────────────

function generateNonce(length = 32): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, "%21")
    .replace(/\*/g, "%2A")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29");
}

async function buildOAuthHeader(
  method: string,
  url: string,
  body: Record<string, string>,
  credentials: {
    apiKey: string;
    apiSecret: string;
    accessToken: string;
    accessSecret: string;
  }
): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = generateNonce();

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: credentials.apiKey,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_token: credentials.accessToken,
    oauth_version: "1.0",
  };

  const allParams: Record<string, string> = { ...oauthParams, ...body };
  const sortedKeys = Object.keys(allParams).sort();
  const paramString = sortedKeys
    .map((key) => `${percentEncode(key)}=${percentEncode(allParams[key])}`)
    .join("&");

  const signatureBaseString = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(paramString),
  ].join("&");

  const signingKey = `${percentEncode(credentials.apiSecret)}&${percentEncode(
    credentials.accessSecret
  )}`;

  const encoder = new TextEncoder();
  const keyData = encoder.encode(signingKey);
  const messageData = encoder.encode(signatureBaseString);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    messageData
  );
  const signature = btoa(
    String.fromCharCode(...new Uint8Array(signatureBuffer))
  );

  oauthParams["oauth_signature"] = signature;

  const headerParts = Object.keys(oauthParams)
    .sort()
    .map((key) => `${percentEncode(key)}="${percentEncode(oauthParams[key])}"`)
    .join(", ");

  return `OAuth ${headerParts}`;
}

function buildTweetText(poemLines: WeeklyPoemLine[]): string {
  const voiceCount = new Set(poemLines.map((l) => l.author_name.toLowerCase()))
    .size;
  const suffix = `\n\n\u2014 Composed from ${voiceCount} voices\n#RelentlesslyHuman\nitsowol.com/weekly-poem`;

  // Start with all lines and reduce if over 280 chars
  let lines = [...poemLines];

  while (lines.length > 3) {
    const poemText = lines.map((l) => l.text).join("\n");
    const fullTweet = poemText + suffix;
    if (fullTweet.length <= 280) {
      return fullTweet;
    }
    // Remove the second-to-last line (preserve opener and closer)
    lines.splice(lines.length - 2, 1);
  }

  // Final attempt with minimum lines
  const poemText = lines.map((l) => l.text).join("\n");
  const fullTweet = poemText + suffix;

  // If still too long, truncate the body lines
  if (fullTweet.length > 280) {
    const available = 280 - suffix.length - 2; // 2 for newlines
    const truncated = lines
      .map((l) => l.text)
      .join("\n")
      .substring(0, available);
    return truncated + suffix;
  }

  return fullTweet;
}

async function postToTwitter(
  poemLines: WeeklyPoemLine[]
): Promise<{ ok: boolean; tweet_id?: string; error?: string }> {
  const apiKey = Deno.env.get("TWITTER_API_KEY");
  const apiSecret = Deno.env.get("TWITTER_API_SECRET");
  const accessToken = Deno.env.get("TWITTER_ACCESS_TOKEN");
  const accessSecret = Deno.env.get("TWITTER_ACCESS_SECRET");

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    console.log("Twitter credentials not configured. Skipping tweet.");
    return { ok: false, error: "missing_credentials" };
  }

  const tweetText = buildTweetText(poemLines);
  const twitterUrl = "https://api.twitter.com/2/tweets";
  const tweetBody = JSON.stringify({ text: tweetText });

  const authHeader = await buildOAuthHeader("POST", twitterUrl, {}, {
    apiKey,
    apiSecret,
    accessToken,
    accessSecret,
  });

  const response = await fetch(twitterUrl, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: tweetBody,
  });

  const responseData = await response.json();

  if (!response.ok) {
    console.error("Twitter API error:", JSON.stringify(responseData));
    return { ok: false, error: JSON.stringify(responseData) };
  }

  console.log(`Weekly poem tweeted: ${responseData.data?.id}`);
  return { ok: true, tweet_id: responseData.data?.id };
}

// ── Instagram: post if token available ──────────────────────────────────────

async function postToInstagram(
  poemLines: WeeklyPoemLine[]
): Promise<{ ok: boolean; error?: string }> {
  const accessToken = Deno.env.get("INSTAGRAM_ACCESS_TOKEN");
  const igUserId = Deno.env.get("INSTAGRAM_USER_ID");

  if (!accessToken || !igUserId) {
    console.log("Instagram credentials not configured. Skipping.");
    return { ok: false, error: "missing_credentials" };
  }

  const voiceCount = new Set(poemLines.map((l) => l.author_name.toLowerCase()))
    .size;
  const caption = poemLines.map((l) => l.text).join("\n") +
    `\n\n\u2014 Composed from ${voiceCount} voices\n\n#RelentlesslyHuman #Poetry #CollaborativePoetry #OwOL\nitsowol.com/weekly-poem`;

  try {
    // Step 1: Create media container (text post via carousel or caption-only)
    const createUrl = `https://graph.instagram.com/v18.0/${igUserId}/media`;
    const createResponse = await fetch(createUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caption,
        access_token: accessToken,
      }),
    });

    const createData = await createResponse.json();

    if (!createResponse.ok || !createData.id) {
      console.error("Instagram create error:", JSON.stringify(createData));
      return { ok: false, error: JSON.stringify(createData) };
    }

    // Step 2: Publish
    const publishUrl = `https://graph.instagram.com/v18.0/${igUserId}/media_publish`;
    const publishResponse = await fetch(publishUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: createData.id,
        access_token: accessToken,
      }),
    });

    const publishData = await publishResponse.json();

    if (!publishResponse.ok) {
      console.error("Instagram publish error:", JSON.stringify(publishData));
      return { ok: false, error: JSON.stringify(publishData) };
    }

    console.log(`Weekly poem posted to Instagram: ${publishData.id}`);
    return { ok: true };
  } catch (error) {
    console.error("Instagram error:", error);
    return { ok: false, error: (error as Error).message };
  }
}

// ── Main handler ────────────────────────────────────────────────────────────

serve(async (_req: Request) => {
  try {
    // ── Initialize Supabase client with service role ──────────────────
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ??
      "https://jebbvyeenafpjrdhneoi.supabase.co";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseKey) {
      return new Response(
        JSON.stringify({ ok: false, error: "missing SUPABASE_SERVICE_ROLE_KEY" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // ── Fetch all non-flagged lines ───────────────────────────────────
    const { data: lines, error: fetchError } = await supabase
      .from("poem_lines")
      .select("id, text, author_name, created_at, flagged")
      .eq("flagged", false)
      .order("created_at", { ascending: true });

    if (fetchError) {
      console.error("Failed to fetch poem lines:", fetchError);
      return new Response(
        JSON.stringify({ ok: false, error: fetchError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!lines || lines.length < 5) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Not enough lines to compose a weekly poem",
          line_count: lines?.length ?? 0,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // ── Compose the poem ──────────────────────────────────────────────
    const poemLines = composePoem(lines as PoemLine[]);

    if (poemLines.length < 3) {
      return new Response(
        JSON.stringify({ ok: false, error: "Composition produced too few lines" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // ── Post to Twitter ───────────────────────────────────────────────
    const twitterResult = await postToTwitter(poemLines);

    // ── Post to Instagram (optional) ──────────────────────────────────
    const instagramResult = await postToInstagram(poemLines);

    // ── Store in weekly_poems table ───────────────────────────────────
    const { data: insertData, error: insertError } = await supabase
      .from("weekly_poems")
      .insert({
        lines: poemLines,
        posted_twitter: twitterResult.ok,
        posted_instagram: instagramResult.ok,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Failed to store weekly poem:", insertError);
      return new Response(
        JSON.stringify({
          ok: false,
          error: insertError.message,
          twitter: twitterResult,
          instagram: instagramResult,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`Weekly poem created: ${insertData.id}`);

    return new Response(
      JSON.stringify({
        ok: true,
        poem_id: insertData.id,
        line_count: poemLines.length,
        voice_count: new Set(poemLines.map((l) => l.author_name.toLowerCase())).size,
        twitter: twitterResult,
        instagram: instagramResult,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ ok: false, error: (error as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
