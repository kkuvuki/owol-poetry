/**
 * Weekly Digest — Supabase Edge Function
 *
 * Sends a weekly email to all subscribers with the best new lines
 * from the collaborative poem.
 *
 * Setup:
 * 1. Deploy: supabase functions deploy weekly-digest
 * 2. Set secrets: supabase secrets set RESEND_API_KEY=your_key
 * 3. Schedule via Supabase Dashboard → Database → Extensions → pg_cron:
 *    SELECT cron.schedule('weekly-digest', '0 10 * * 1', $$
 *      SELECT net.http_post(
 *        url := 'https://jebbvyeenafpjrdhneoi.supabase.co/functions/v1/weekly-digest',
 *        headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
 *      );
 *    $$);
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

Deno.serve(async () => {
  try {
    // Get lines from the past 7 days
    const oneWeekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    const { data: newLines, error: linesErr } = await supabase
      .from('poem_lines')
      .select('text, author_name, created_at')
      .eq('flagged', false)
      .gte('created_at', oneWeekAgo)
      .order('created_at', { ascending: true })
      .limit(50);

    if (linesErr || !newLines || newLines.length === 0) {
      return new Response(JSON.stringify({ message: 'No new lines this week' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get all subscribers
    const { data: subscribers, error: subErr } = await supabase
      .from('email_signups')
      .select('email')
      .limit(1000);

    if (subErr || !subscribers || subscribers.length === 0) {
      return new Response(JSON.stringify({ message: 'No subscribers' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Build the email
    const linesHtml = newLines.map((l) =>
      `<p style="font-style:italic;color:#EFF0ED;margin:12px 0 4px;">"${l.text}"</p>
       <p style="font-size:12px;color:#7A7B75;margin:0;">— ${l.author_name}</p>`
    ).join('');

    const html = `
      <div style="background:#13100D;padding:40px 20px;font-family:Georgia,serif;">
        <div style="max-width:560px;margin:0 auto;">
          <h1 style="color:#EFF0ED;font-size:28px;font-weight:400;margin-bottom:8px;">
            Relentlessly Human
          </h1>
          <p style="color:#9B9C96;font-size:14px;margin-bottom:32px;">
            This week, ${newLines.length} new line${newLines.length !== 1 ? 's were' : ' was'} added to the poem.
          </p>
          <div style="border-top:1px solid rgba(255,255,255,0.06);padding-top:24px;">
            ${linesHtml}
          </div>
          <div style="margin-top:40px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
            <a href="https://itsowol.com/poem" style="color:#79B939;font-size:14px;">
              Read the full poem →
            </a>
          </div>
          <p style="color:#7A7B75;font-size:11px;text-align:center;margin-top:24px;">
            itsowol.com
          </p>
        </div>
      </div>
    `;

    // Send via Resend (or log if no API key)
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({
        message: 'RESEND_API_KEY not set — would send to ' + subscribers.length + ' subscribers',
        preview: html,
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    const emails = subscribers.map((s) => s.email);

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Ravings <hello@itsowol.com>',
        bcc: emails,
        subject: `This week in the poem — ${newLines.length} new voices`,
        html: html,
      }),
    });

    const result = await res.json();

    return new Response(JSON.stringify({
      message: 'Digest sent',
      recipients: emails.length,
      result,
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
