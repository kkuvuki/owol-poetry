/**
 * Shareable Line Cards — generates branded PNG share images from poem lines.
 * Uses og-card.js for image generation, adds share UI with multiple options.
 *
 * Used on both the homepage RH section and the /poem page.
 */

import { generateLineCard, generateStoryCard, dataUrlToBlob } from './og-card.js';

var CARD_W = 1080;
var CARD_H = 1080;

/**
 * Renders a 1080x1080 square line card to a canvas and returns a Blob URL.
 * (Original card format, kept for backward compatibility.)
 * @param {string} text — the poem line
 * @param {string} author — author name
 * @returns {Promise<string>} blob URL of the PNG
 */
export function renderCard(text, author) {
  return new Promise(function (resolve) {
    var canvas = document.createElement('canvas');
    canvas.width = CARD_W;
    canvas.height = CARD_H;
    var ctx = canvas.getContext('2d');

    // Background gradient
    var bg = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
    bg.addColorStop(0, '#13100D');
    bg.addColorStop(1, '#1C1916');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CARD_W, CARD_H);

    // Accent line
    ctx.strokeStyle = 'rgba(121, 185, 57, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(440, 340);
    ctx.lineTo(640, 340);
    ctx.stroke();

    // Opening quote mark
    ctx.fillStyle = 'rgba(121, 185, 57, 0.15)';
    ctx.font = 'italic 200px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('\u201C', 540, 380);

    // Main text — word-wrap
    ctx.fillStyle = '#EFF0ED';
    ctx.font = 'italic 42px Georgia, serif';
    ctx.textAlign = 'center';
    var words = text.split(' ');
    var lines = [];
    var currentLine = '';
    var maxWidth = CARD_W - 160;

    words.forEach(function (word) {
      var testLine = currentLine ? currentLine + ' ' + word : word;
      if (ctx.measureText(testLine).width > maxWidth) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });
    if (currentLine) lines.push(currentLine);

    var lineHeight = 60;
    var startY = 540 - (lines.length * lineHeight) / 2;
    lines.forEach(function (line, i) {
      ctx.fillText(line, CARD_W / 2, startY + i * lineHeight);
    });

    // Author
    ctx.fillStyle = '#9B9C96';
    ctx.font = '24px "Nunito Sans", sans-serif';
    ctx.fillText('\u2014 ' + author, CARD_W / 2, startY + lines.length * lineHeight + 50);

    // Bottom branding
    ctx.fillStyle = '#7A7B75';
    ctx.font = '16px "Nunito Sans", sans-serif';
    ctx.fillText('Relentlessly Human \u00B7 itsowol.com', CARD_W / 2, CARD_H - 60);

    // Subtle border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    ctx.strokeRect(30, 30, CARD_W - 60, CARD_H - 60);

    canvas.toBlob(function (blob) {
      resolve(URL.createObjectURL(blob));
    }, 'image/png');
  });
}

/* ------------------------------------------------------------------ */
/*  Share Menu                                                         */
/* ------------------------------------------------------------------ */

var activeMenu = null;

function dismissMenu() {
  if (activeMenu) {
    activeMenu.remove();
    activeMenu = null;
  }
  document.removeEventListener('click', onDocClick);
  document.removeEventListener('keydown', onDocKey);
}

function onDocClick(e) {
  if (activeMenu && !activeMenu.contains(e.target)) {
    dismissMenu();
  }
}

function onDocKey(e) {
  if (e.key === 'Escape') dismissMenu();
}

/**
 * Creates and shows a floating share menu near the trigger button.
 */
function showShareMenu(text, author, anchorEl) {
  dismissMenu();

  var menu = document.createElement('div');
  menu.className = 'share-menu';
  menu.setAttribute('role', 'menu');
  menu.innerHTML = [
    '<button class="share-menu__item" data-action="share" role="menuitem">',
    '  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>',
    '  Share image',
    '</button>',
    '<button class="share-menu__item" data-action="story" role="menuitem">',
    '  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18.01"/></svg>',
    '  Story card',
    '</button>',
    '<button class="share-menu__item" data-action="copy" role="menuitem">',
    '  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    '  Copy text',
    '</button>',
    '<button class="share-menu__item" data-action="download" role="menuitem">',
    '  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    '  Download image',
    '</button>',
  ].join('\n');

  // Position near the anchor
  var rect = anchorEl.getBoundingClientRect();
  menu.style.position = 'fixed';
  menu.style.top = (rect.bottom + 8) + 'px';
  menu.style.left = Math.max(8, rect.left - 80) + 'px';
  menu.style.zIndex = '9999';

  document.body.appendChild(menu);
  activeMenu = menu;

  // Close on outside click (delayed to avoid immediate close)
  setTimeout(function () {
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onDocKey);
  }, 0);

  // Handle actions
  menu.addEventListener('click', async function (e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var action = btn.dataset.action;
    dismissMenu();

    if (action === 'share') {
      await shareImage(text, author, 'og');
    } else if (action === 'story') {
      await shareImage(text, author, 'story');
    } else if (action === 'copy') {
      await copyText(text, author);
    } else if (action === 'download') {
      await downloadImage(text, author, 'og');
    }
  });
}

/**
 * Shares or downloads a generated image.
 * @param {'og'|'story'} format
 */
async function shareImage(text, author, format) {
  var dataUrl = format === 'story'
    ? await generateStoryCard(text, author)
    : await generateLineCard(text, author);

  var blob = dataUrlToBlob(dataUrl);
  var filename = format === 'story' ? 'poem-story.png' : 'poem-line.png';
  var file = new File([blob], filename, { type: 'image/png' });

  // Try Web Share API with file support
  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: 'Relentlessly Human',
        text: '\u201C' + text + '\u201D \u2014 ' + author,
        files: [file],
      });
      return;
    } catch (e) {
      // User cancelled — fall through to download
      if (e.name === 'AbortError') return;
    }
  }

  // Fallback: download
  downloadBlob(blob, filename);
}

/**
 * Downloads a blob as a file.
 */
function downloadBlob(blob, filename) {
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
}

/**
 * Downloads the OG or story image directly.
 */
async function downloadImage(text, author, format) {
  var dataUrl = format === 'story'
    ? await generateStoryCard(text, author)
    : await generateLineCard(text, author);

  var blob = dataUrlToBlob(dataUrl);
  var filename = format === 'story' ? 'poem-story.png' : 'poem-line.png';
  downloadBlob(blob, filename);
}

/**
 * Copies the poem line text to clipboard.
 */
async function copyText(text, author) {
  var str = '\u201C' + text + '\u201D \u2014 ' + author + '\nitsowol.com/poem';
  try {
    await navigator.clipboard.writeText(str);
    showToast('Copied to clipboard');
  } catch (e) {
    // Fallback
    var ta = document.createElement('textarea');
    ta.value = str;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('Copied to clipboard');
  }
}

/**
 * Brief toast notification.
 */
function showToast(message) {
  var toast = document.createElement('div');
  toast.className = 'share-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  // Trigger animation
  requestAnimationFrame(function () {
    toast.classList.add('share-toast--visible');
  });
  setTimeout(function () {
    toast.classList.remove('share-toast--visible');
    setTimeout(function () { toast.remove(); }, 300);
  }, 2000);
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Triggers share for a line.
 * If called with an event/element, shows the share menu.
 * If called without, uses the quick-share path (backward compatible).
 *
 * @param {string} text
 * @param {string} author
 * @param {HTMLElement} [anchorEl] — optional element to anchor the menu to
 */
export async function shareLine(text, author, anchorEl) {
  if (anchorEl) {
    showShareMenu(text, author, anchorEl);
    return;
  }

  // Quick share path (backward compatible) — generate OG card + share/download
  var dataUrl = await generateLineCard(text, author);
  var blob = dataUrlToBlob(dataUrl);
  var file = new File([blob], 'poem-line.png', { type: 'image/png' });

  // Try Web Share API with file support
  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: 'Relentlessly Human',
        text: '\u201C' + text + '\u201D \u2014 ' + author,
        files: [file],
      });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }

  // Fallback: download
  downloadBlob(blob, 'poem-line.png');
}
