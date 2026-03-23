/**
 * New Line Notification — Supabase Edge Function
 *
 * Sends Chidi an email notification whenever a new poem line is added.
 * Triggered by a database webhook on poem_lines INSERT.
 *
 * Setup:
 * 1. Deploy: supabase functions deploy new-line-notify
 * 2. Set secrets:
 *    supabase secrets set RESEND_API_KEY=your_resend_key
 *    supabase secrets set NOTIFY_EMAIL=onwufranc@gmail.com
 * 3. Create a database webhook in Supabase Dashboard:
 *    - Table: poem_lines
 *    - Events: INSERT
 *    - Type: Edge Function
 *    - Function: new-line-notify
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const NOTIFY_EMAIL = Deno.env.get('NOTIFY_EMAIL') || 'onwufranc@gmail.com';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface PoemLine {
  id: string;
  text: string;
  author_name: string;
  author_link: string | null;
  created_at: string;
  flagged: boolean;
}

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const record = body.record as PoemLine;

    if (!record || record.flagged) {
      return new Response(JSON.stringify({ message: 'Skipped' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse location/socials
    let locationStr = '';
    let socialsHtml = '';
    if (record.author_link) {
      try {
        const socials = JSON.parse(record.author_link);
        const parts = [socials.city, socials.country].filter(Boolean);
        if (parts.length) locationStr = parts.join(', ');

        const links: string[] = [];
        if (socials.linkedin) links.push(`<a href="${socials.linkedin}" style="color:#79B939;">LinkedIn</a>`);
        if (socials.instagram) links.push(`<a href="https://instagram.com/${socials.instagram.replace('@', '')}" style="color:#79B939;">Instagram</a>`);
        if (socials.website) links.push(`<a href="${socials.website.startsWith('http') ? socials.website : 'https://' + socials.website}" style="color:#79B939;">Website</a>`);
        if (socials.email) links.push(`<a href="mailto:${socials.email}" style="color:#79B939;">Email</a>`);
        if (links.length) socialsHtml = `<p style="font-size:12px;color:#7A7B75;margin:8px 0 0;">${links.join(' · ')}</p>`;
      } catch (_e) {
        // Ignore
      }
    }

    // Get total line count
    const { count } = await supabase
      .from('poem_lines')
      .select('*', { count: 'exact', head: true })
      .eq('flagged', false);

    const date = new Date(record.created_at);
    const dateStr = date.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    const html = `
      <div style="background:#13100D;padding:40px 20px;font-family:Georgia,serif;">
        <div style="max-width:520px;margin:0 auto;">
          <p style="color:#79B939;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">
            New Line Added
          </p>
          <h1 style="color:#EFF0ED;font-size:24px;font-weight:400;margin-bottom:24px;font-style:italic;">
            \u201C${record.text}\u201D
          </h1>
          <p style="color:#908F8A;font-size:16px;margin:0;">
            \u2014 ${record.author_name}${locationStr ? ` \u00B7 ${locationStr}` : ''}
          </p>
          ${socialsHtml}
          <div style="border-top:1px solid rgba(255,255,255,0.06);margin-top:24px;padding-top:16px;">
            <p style="color:#7A7B75;font-size:13px;margin:0;">
              ${dateStr}
            </p>
            <p style="color:#7A7B75;font-size:13px;margin:4px 0 0;">
              Line #${count || '?'} in the poem
            </p>
          </div>
          <div style="margin-top:24px;">
            <a href="https://itsowol.com/poem" style="color:#79B939;font-size:14px;text-decoration:none;">
              View the full poem \u2192
            </a>
            <span style="color:#7A7B75;margin:0 8px;">\u00B7</span>
            <a href="https://itsowol.com/admin" style="color:#7A7B75;font-size:14px;text-decoration:none;">
              Admin dashboard \u2192
            </a>
          </div>
        </div>
      </div>
    `;

    // Send via Resend
    if (!RESEND_API_KEY) {
      console.log('RESEND_API_KEY not set — would notify:', NOTIFY_EMAIL);
      return new Response(JSON.stringify({
        message: 'Resend not configured',
        would_send_to: NOTIFY_EMAIL,
        line: record.text,
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    // Use verified domain if available, otherwise Resend's default
    const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'Ravings <onboarding@resend.dev>';

    const emailPayload = {
      from: FROM_EMAIL,
      to: [NOTIFY_EMAIL],
      subject: `New line: "${record.text.substring(0, 50)}${record.text.length > 50 ? '...' : ''}" — ${record.author_name}`,
      html: html,
    };

    console.log('Sending notification to:', NOTIFY_EMAIL, 'from:', FROM_EMAIL);

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    const result = await res.json();
    console.log('Resend response:', JSON.stringify(result));

    if (result.error) {
      console.error('Resend error:', result.error);
      return new Response(JSON.stringify({
        message: 'Email send failed',
        error: result.error,
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({
      message: 'Notification sent',
      result,
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('Notification error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
