/**
 * Relentlessly Human — Embeddable Widget
 *
 * Usage:
 * <div id="relentlessly-human-widget"></div>
 * <script src="https://itsowol.com/embed.js"></script>
 */
(function () {
  var SUPABASE_URL = 'https://jebbvyeenafpjrdhneoi.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_fM_rNj8c0L8gSlc1IuXwIA_466dQW4x';

  var container = document.getElementById('relentlessly-human-widget');
  if (!container) return;

  // Styles
  var style = document.createElement('style');
  style.textContent = [
    '.rh-widget { font-family: Georgia, "Times New Roman", serif; background: #13100D; color: #EFF0ED; padding: 24px; border-radius: 12px; max-width: 480px; border: 1px solid rgba(255,255,255,0.06); }',
    '.rh-widget__title { font-size: 18px; font-weight: 400; margin: 0 0 4px; letter-spacing: 0.02em; }',
    '.rh-widget__sub { font-size: 12px; color: #7A7B75; margin: 0 0 16px; }',
    '.rh-widget__line { font-style: italic; font-size: 15px; line-height: 1.6; margin: 0 0 4px; }',
    '.rh-widget__author { font-size: 11px; color: #7A7B75; margin: 0 0 12px; font-family: -apple-system, sans-serif; }',
    '.rh-widget__cta { display: inline-block; font-family: -apple-system, sans-serif; font-size: 12px; font-weight: 600; color: #13100D; background: #79B939; padding: 6px 16px; border-radius: 20px; text-decoration: none; margin-top: 8px; }',
    '.rh-widget__cta:hover { background: #8cc94a; }',
  ].join('\n');
  document.head.appendChild(style);

  // Fetch latest 3 lines
  fetch(SUPABASE_URL + '/rest/v1/poem_lines?flagged=eq.false&order=created_at.desc&limit=3&select=text,author_name', {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
  })
    .then(function (res) { return res.json(); })
    .then(function (lines) {
      var html = '<div class="rh-widget">';
      html += '<p class="rh-widget__title">Relentlessly Human</p>';
      html += '<p class="rh-widget__sub">A poem by strangers</p>';

      if (lines && lines.length > 0) {
        lines.reverse().forEach(function (l) {
          html += '<p class="rh-widget__line">' + escHtml(l.text) + '</p>';
          html += '<p class="rh-widget__author">\u2014 ' + escHtml(l.author_name) + '</p>';
        });
      }

      html += '<a class="rh-widget__cta" href="https://itsowol.com/#relentlessly-human" target="_blank" rel="noopener">Add your line \u2192</a>';
      html += '</div>';
      container.innerHTML = html;
    })
    .catch(function () {
      container.innerHTML = '<div class="rh-widget"><p class="rh-widget__title">Relentlessly Human</p><a class="rh-widget__cta" href="https://itsowol.com/#relentlessly-human" target="_blank" rel="noopener">Read the poem \u2192</a></div>';
    });

  function escHtml(str) {
    var div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }
})();
