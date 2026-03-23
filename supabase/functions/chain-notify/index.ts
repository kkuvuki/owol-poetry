/**
 * Chain Reaction Notification — Supabase Edge Function
 *
 * When a new poem line is added, notifies the author of the previous line
 * that someone continued the poem after them — creating a chain of connection.
 *
 * Setup:
 * 1. Deploy: supabase functions deploy chain-notify --no-verify-jwt
 * 2. Set secrets:
 *    supabase secrets set RESEND_API_KEY=your_resend_key
 *    supabase secrets set RESEND_FROM_EMAIL="Ravings <hello@itsowol.com>"
 * 3. Create database webhook in Supabase Dashboard:
 *    - Table: poem_lines
 *    - Events: INSERT
 *    - Type: Edge Function
 *    - Function: chain-notify
 *
 * Requires a `notification_email` column on poem_lines (optional):
 *   ALTER TABLE poem_lines ADD COLUMN notification_email TEXT;
 *
 * When a contributor opts in by providing their email, they'll get notified
 * when someone writes the next line after theirs.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'Ravings <onboarding@resend.dev>';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface PoemLine {
  id: string;
  text: string;
  author_name: string;
  notification_email?: string;
  created_at: string;
  flagged: boolean;
}

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const newLine = body.record as PoemLine;

    if (!newLine || newLine.flagged) {
      return new Response(JSON.stringify({ message: 'Skipped' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Find the line immediately before this one (the previous contributor)
    const { data: prevLines } = await supabase
      .from('poem_lines')
      .select('*')
      .eq('flagged', false)
      .lt('created_at', newLine.created_at)
      .order('created_at', { ascending: false })
      .limit(1);

    const prevLine = prevLines?.[0] as PoemLine | undefined;

    if (!prevLine || !prevLine.notification_email) {
      return new Response(JSON.stringify({
        message: 'No previous author to notify (no email on file)',
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    // Don't notify if same author
    if (prevLine.author_name.toLowerCase().trim() === newLine.author_name.toLowerCase().trim()) {
      return new Response(JSON.stringify({
        message: 'Same author — skipped notification',
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    if (!RESEND_API_KEY) {
      console.log('RESEND_API_KEY not set — would notify:', prevLine.notification_email);
      return new Response(JSON.stringify({
        message: 'Resend not configured',
        would_notify: prevLine.notification_email,
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    const html = `
      <div style="background:#13100D;padding:40px 20px;font-family:Georgia,serif;">
        <div style="max-width:520px;margin:0 auto;">
          <p style="color:#79B939;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">
            The Poem Continues
          </p>
          <p style="color:#908F8A;font-size:14px;margin-bottom:16px;">
            ${prevLine.author_name}, someone picked up where you left off.
          </p>

          <div style="border-left:3px solid rgba(121,185,57,0.3);padding-left:16px;margin:24px 0;">
            <p style="color:#7A7B75;font-size:13px;margin:0 0 4px;">Your line:</p>
            <p style="color:#B0B1AB;font-size:18px;font-style:italic;margin:0;">
              \u201C${prevLine.text}\u201D
            </p>
          </div>

          <div style="border-left:3px solid #79B939;padding-left:16px;margin:24px 0;">
            <p style="color:#79B939;font-size:13px;margin:0 0 4px;">The next line:</p>
            <p style="color:#EFF0ED;font-size:18px;font-style:italic;margin:0;">
              \u201C${newLine.text}\u201D
            </p>
            <p style="color:#908F8A;font-size:14px;margin:8px 0 0;">
              \u2014 ${newLine.author_name}
            </p>
          </div>

          <div style="margin-top:32px;">
            <a href="https://itsowol.com/poem" style="color:#79B939;font-size:14px;text-decoration:none;">
              Read the full poem \u2192
            </a>
          </div>

          <p style="color:#7A7B75;font-size:11px;margin-top:32px;border-top:1px solid rgba(255,255,255,0.06);padding-top:16px;">
            You're receiving this because you opted in to chain notifications when you contributed to Relentlessly Human.
          </p>
        </div>
      </div>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [prevLine.notification_email],
        subject: `Someone continued the poem after your line — "${newLine.text.substring(0, 40)}..."`,
        html,
      }),
    });

    const result = await res.json();
    console.log('Chain notification sent:', result);

    return new Response(JSON.stringify({
      message: 'Chain notification sent',
      notified: prevLine.author_name,
      result,
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('Chain notify error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
