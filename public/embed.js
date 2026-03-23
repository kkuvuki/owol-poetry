/**
 * Relentlessly Human — Embeddable Widget v2
 *
 * Drop this on any website to show a live poem line.
 *
 * Usage:
 *   <script src="https://itsowol.com/embed.js"></script>
 *
 * Configuration (data attributes on the script tag):
 *   data-theme="light|dark"   — default: dark
 *   data-width="300px"        — default: 100%
 *   data-show-cta="true|false" — default: true
 */
(function () {
  'use strict';

  var API_URL = 'https://itsowol.com/api/poem.json?limit=1';
  var REFRESH_MS = 5 * 60 * 1000; // 5 minutes

  // Read config from the script tag
  var scripts = document.getElementsByTagName('script');
  var currentScript = scripts[scripts.length - 1];
  var theme = (currentScript.getAttribute('data-theme') || 'dark').toLowerCase();
  var width = currentScript.getAttribute('data-width') || '100%';
  var showCta = currentScript.getAttribute('data-show-cta') !== 'false';

  // Create host element and shadow root
  var host = document.createElement('div');
  host.className = 'rh-embed-host';
  currentScript.parentNode.insertBefore(host, currentScript);

  var shadow = host.attachShadow({ mode: 'closed' });

  // Theme palettes
  var themes = {
    dark: {
      bg: '#13100D',
      border: 'rgba(255,255,255,0.08)',
      text: '#EFF0ED',
      textMuted: '#7A7B75',
      accent: '#79B939',
      accentHover: '#8cc94a',
      accentText: '#13100D',
      glow: 'rgba(121,185,57,0.06)',
    },
    light: {
      bg: '#FAFAF8',
      border: 'rgba(0,0,0,0.08)',
      text: '#1A1A18',
      textMuted: '#6B6B65',
      accent: '#5A9A1F',
      accentHover: '#4A8518',
      accentText: '#FFFFFF',
      glow: 'rgba(90,154,31,0.06)',
    },
  };

  var t = themes[theme] || themes.dark;

  // Styles scoped inside Shadow DOM
  var style = document.createElement('style');
  style.textContent = [
    ':host { display: block; width: ' + width + '; }',

    '.rh-widget {',
    '  font-family: Georgia, "Times New Roman", Times, serif;',
    '  background: ' + t.bg + ';',
    '  color: ' + t.text + ';',
    '  padding: 28px 28px 24px;',
    '  border-radius: 14px;',
    '  border: 1px solid ' + t.border + ';',
    '  box-shadow: 0 4px 24px rgba(0,0,0,0.12), 0 0 0 1px ' + t.glow + ';',
    '  max-width: 520px;',
    '  box-sizing: border-box;',
    '  position: relative;',
    '  overflow: hidden;',
    '  transition: box-shadow 0.3s ease;',
    '}',

    '.rh-widget:hover {',
    '  box-shadow: 0 8px 32px rgba(0,0,0,0.18), 0 0 0 1px ' + t.glow + ';',
    '}',

    /* Header */
    '.rh-widget__header {',
    '  display: flex;',
    '  align-items: center;',
    '  gap: 8px;',
    '  margin-bottom: 20px;',
    '}',

    '.rh-widget__icon {',
    '  width: 6px;',
    '  height: 6px;',
    '  border-radius: 50%;',
    '  background: ' + t.accent + ';',
    '  flex-shrink: 0;',
    '  animation: rh-pulse 3s ease-in-out infinite;',
    '}',

    '.rh-widget__label {',
    '  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;',
    '  font-size: 11px;',
    '  font-weight: 600;',
    '  letter-spacing: 0.08em;',
    '  text-transform: uppercase;',
    '  color: ' + t.textMuted + ';',
    '  margin: 0;',
    '}',

    /* Line */
    '.rh-widget__line {',
    '  font-style: italic;',
    '  font-size: 18px;',
    '  line-height: 1.65;',
    '  margin: 0 0 8px;',
    '  letter-spacing: 0.01em;',
    '  min-height: 1.65em;',
    '  opacity: 1;',
    '  transition: opacity 0.4s ease;',
    '}',

    '.rh-widget__line--loading {',
    '  opacity: 0.3;',
    '}',

    '.rh-widget__author {',
    '  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;',
    '  font-size: 12px;',
    '  color: ' + t.textMuted + ';',
    '  margin: 0 0 20px;',
    '}',

    /* Divider */
    '.rh-widget__divider {',
    '  height: 1px;',
    '  background: ' + t.border + ';',
    '  margin: 0 0 16px;',
    '}',

    /* Footer */
    '.rh-widget__footer {',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: space-between;',
    '  gap: 12px;',
    '  flex-wrap: wrap;',
    '}',

    '.rh-widget__subtitle {',
    '  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;',
    '  font-size: 11px;',
    '  color: ' + t.textMuted + ';',
    '  margin: 0;',
    '}',

    '.rh-widget__cta {',
    '  display: inline-block;',
    '  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;',
    '  font-size: 12px;',
    '  font-weight: 600;',
    '  color: ' + t.accentText + ';',
    '  background: ' + t.accent + ';',
    '  padding: 7px 18px;',
    '  border-radius: 20px;',
    '  text-decoration: none;',
    '  transition: background 0.2s ease, transform 0.15s ease;',
    '  white-space: nowrap;',
    '}',

    '.rh-widget__cta:hover {',
    '  background: ' + t.accentHover + ';',
    '  transform: translateY(-1px);',
    '}',

    '.rh-widget__brand {',
    '  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;',
    '  font-size: 10px;',
    '  color: ' + t.textMuted + ';',
    '  text-decoration: none;',
    '  opacity: 0.5;',
    '  transition: opacity 0.2s ease;',
    '  margin-top: 12px;',
    '  display: block;',
    '  text-align: right;',
    '}',

    '.rh-widget__brand:hover { opacity: 0.8; }',

    /* Pulse animation */
    '@keyframes rh-pulse {',
    '  0%, 100% { opacity: 1; }',
    '  50% { opacity: 0.4; }',
    '}',

    /* Fade-in for fresh lines */
    '@keyframes rh-fade-in {',
    '  from { opacity: 0; transform: translateY(6px); }',
    '  to { opacity: 1; transform: translateY(0); }',
    '}',

    '.rh-widget__line--fresh {',
    '  animation: rh-fade-in 0.6s ease forwards;',
    '}',
  ].join('\n');

  shadow.appendChild(style);

  // Build DOM
  var widget = document.createElement('div');
  widget.className = 'rh-widget';
  widget.setAttribute('role', 'complementary');
  widget.setAttribute('aria-label', 'Relentlessly Human poem widget');

  // Header
  var header = document.createElement('div');
  header.className = 'rh-widget__header';
  var dot = document.createElement('span');
  dot.className = 'rh-widget__icon';
  var label = document.createElement('p');
  label.className = 'rh-widget__label';
  label.textContent = 'Live from the poem';
  header.appendChild(dot);
  header.appendChild(label);
  widget.appendChild(header);

  // Line
  var lineEl = document.createElement('p');
  lineEl.className = 'rh-widget__line rh-widget__line--loading';
  lineEl.textContent = '\u2026';
  widget.appendChild(lineEl);

  // Author
  var authorEl = document.createElement('p');
  authorEl.className = 'rh-widget__author';
  authorEl.textContent = '\u00A0';
  widget.appendChild(authorEl);

  // Divider
  var divider = document.createElement('div');
  divider.className = 'rh-widget__divider';
  widget.appendChild(divider);

  // Footer
  var footer = document.createElement('div');
  footer.className = 'rh-widget__footer';

  var subtitle = document.createElement('p');
  subtitle.className = 'rh-widget__subtitle';
  subtitle.textContent = 'From Relentlessly Human';
  footer.appendChild(subtitle);

  if (showCta) {
    var cta = document.createElement('a');
    cta.className = 'rh-widget__cta';
    cta.href = 'https://itsowol.com/#relentlessly-human';
    cta.target = '_blank';
    cta.rel = 'noopener';
    cta.textContent = 'Add your line \u2192';
    footer.appendChild(cta);
  }

  widget.appendChild(footer);

  // Brand link
  var brand = document.createElement('a');
  brand.className = 'rh-widget__brand';
  brand.href = 'https://itsowol.com';
  brand.target = '_blank';
  brand.rel = 'noopener';
  brand.textContent = 'itsowol.com';
  widget.appendChild(brand);

  shadow.appendChild(widget);

  // Fetch and render
  var isFirstLoad = true;

  function fetchLine() {
    fetch(API_URL)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data.lines || data.lines.length === 0) return;
        var line = data.lines[0];
        lineEl.className = 'rh-widget__line' + (isFirstLoad ? '' : ' rh-widget__line--fresh');
        lineEl.textContent = '\u201C' + line.text + '\u201D';
        authorEl.textContent = '\u2014 ' + line.author;
        isFirstLoad = false;
      })
      .catch(function () {
        lineEl.className = 'rh-widget__line';
        lineEl.textContent = 'A poem written by strangers, one line at a time.';
        authorEl.textContent = '';
      });
  }

  fetchLine();
  setInterval(fetchLine, REFRESH_MS);
})();
