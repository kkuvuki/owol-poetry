/**
 * Supabase Edge Function: twitter-post
 *
 * Auto-posts each new poem line to Twitter/X when inserted into the poem_lines table.
 *
 * Setup:
 * 1. Deploy: supabase functions deploy twitter-post --no-verify-jwt
 * 2. Set secrets:
 *    supabase secrets set TWITTER_API_KEY=your_api_key
 *    supabase secrets set TWITTER_API_SECRET=your_api_secret
 *    supabase secrets set TWITTER_ACCESS_TOKEN=your_access_token
 *    supabase secrets set TWITTER_ACCESS_SECRET=your_access_secret
 * 3. Create database webhook:
 *    - Table: poem_lines
 *    - Events: INSERT
 *    - Type: Edge Function
 *    - Function: twitter-post
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { hmac } from "https://deno.land/x/hmac@v2.0.1/mod.ts";

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: {
    id: string;
    line_text: string;
    author_name: string;
    flagged?: boolean;
    [key: string]: unknown;
  };
  schema: string;
  old_record: null | Record<string, unknown>;
}

/**
 * Generate a random nonce string for OAuth 1.0a.
 */
function generateNonce(length = 32): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

/**
 * Percent-encode a string per RFC 3986 (required for OAuth signature base string).
 */
function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, "%21")
    .replace(/\*/g, "%2A")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29");
}

/**
 * Build the OAuth 1.0a Authorization header for the Twitter API v2.
 */
function buildOAuthHeader(
  method: string,
  url: string,
  body: Record<string, string>,
  credentials: {
    apiKey: string;
    apiSecret: string;
    accessToken: string;
    accessSecret: string;
  }
): string {
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

  // Combine OAuth params and request body params, then sort
  const allParams: Record<string, string> = { ...oauthParams, ...body };
  const sortedKeys = Object.keys(allParams).sort();
  const paramString = sortedKeys
    .map((key) => `${percentEncode(key)}=${percentEncode(allParams[key])}`)
    .join("&");

  // Build the signature base string
  const signatureBaseString = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(paramString),
  ].join("&");

  // Build the signing key
  const signingKey = `${percentEncode(credentials.apiSecret)}&${percentEncode(credentials.accessSecret)}`;

  // Sign with HMAC-SHA1
  const signatureBytes = hmac("sha1", signingKey, signatureBaseString);
  const signature =
    typeof signatureBytes === "string"
      ? btoa(signatureBytes)
      : btoa(String.fromCharCode(...new Uint8Array(signatureBytes as ArrayBuffer)));

  oauthParams["oauth_signature"] = signature;

  // Build the Authorization header
  const headerParts = Object.keys(oauthParams)
    .sort()
    .map((key) => `${percentEncode(key)}="${percentEncode(oauthParams[key])}"`)
    .join(", ");

  return `OAuth ${headerParts}`;
}

/**
 * Build the tweet text, truncating the line if needed to stay within 280 characters.
 */
function buildTweetText(lineText: string, authorName: string): string {
  const suffix =
    `\n\u2014 ${authorName}\n\nA line from Relentlessly Human, a collaborative poem written by strangers.\n\nAdd yours \u2192 itsowol.com/poem\n\n#RelentlesslyHuman #Poetry`;

  // The tweet format is: "[line text]"\n— author\n...
  // We need: quote marks (2 chars) + suffix
  const maxLineLength = 280 - 2 - suffix.length; // 2 for the surrounding quotes

  let truncatedLine = lineText;
  if (truncatedLine.length > maxLineLength) {
    truncatedLine = truncatedLine.substring(0, maxLineLength - 1) + "\u2026";
  }

  return `\u201c${truncatedLine}\u201d${suffix}`;
}

serve(async (req: Request) => {
  try {
    // ── Check Twitter credentials ──────────────────────────────────────
    const apiKey = Deno.env.get("TWITTER_API_KEY");
    const apiSecret = Deno.env.get("TWITTER_API_SECRET");
    const accessToken = Deno.env.get("TWITTER_ACCESS_TOKEN");
    const accessSecret = Deno.env.get("TWITTER_ACCESS_SECRET");

    if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
      console.log("Twitter credentials not configured. Skipping tweet.");
      return new Response(
        JSON.stringify({ ok: true, skipped: true, reason: "missing_credentials" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // ── Parse the webhook payload ──────────────────────────────────────
    const payload: WebhookPayload = await req.json();

    if (payload.type !== "INSERT") {
      return new Response(
        JSON.stringify({ ok: true, skipped: true, reason: "not_insert" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const { record } = payload;

    // ── Skip flagged lines ─────────────────────────────────────────────
    if (record.flagged) {
      console.log(`Skipping flagged line: ${record.id}`);
      return new Response(
        JSON.stringify({ ok: true, skipped: true, reason: "flagged" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // ── Build the tweet ────────────────────────────────────────────────
    const tweetText = buildTweetText(record.line_text, record.author_name);

    // ── Post to Twitter API v2 ─────────────────────────────────────────
    const twitterUrl = "https://api.twitter.com/2/tweets";
    const tweetBody = JSON.stringify({ text: tweetText });

    const authHeader = buildOAuthHeader("POST", twitterUrl, {}, {
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
      return new Response(
        JSON.stringify({ ok: false, error: responseData }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`Tweet posted for line ${record.id}: ${responseData.data?.id}`);

    return new Response(
      JSON.stringify({ ok: true, tweet_id: responseData.data?.id }),
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
