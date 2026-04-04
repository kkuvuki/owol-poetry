/**
 * Poem Generator — creates mini-poems from collaborative lines using a
 * client-side scoring algorithm (no AI/API). Shows results in a beautiful
 * fullscreen modal with typewriter reveal and share/download actions.
 *
 * Exports:
 *   generatePoem(allLines, seedLine) — runs the algorithm + shows the modal
 */

import { supabase } from './supabase.js';
import { dataUrlToBlob } from './og-card.js';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

var CARD_W = 1080;
var CARD_H = 1080;
var MIN_LINES = 5;
var MAX_LINES = 10;
var LINE_REVEAL_DELAY = 600; // ms between each line appearing

var COLOR_BG = '#13100D';
var COLOR_BG_END = '#1C1916';
var COLOR_TEXT = '#EFF0ED';
var COLOR_ACCENT = '#79B939';
var COLOR_AUTHOR = '#A6A5A0';
var COLOR_WATERMARK = '#7A7B75';
var COLOR_MUTED = '#A6A5A0';

// Common English stop words to ignore when looking for thematic overlap
var STOP_WORDS = [
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'it', 'its', 'this', 'that', 'was',
  'are', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
  'did', 'will', 'would', 'could', 'should', 'may', 'might', 'shall',
  'can', 'not', 'no', 'so', 'if', 'then', 'than', 'too', 'very', 'just',
  'about', 'up', 'out', 'my', 'your', 'our', 'we', 'you', 'i', 'me',
  'he', 'she', 'they', 'them', 'his', 'her', 'all', 'each', 'every',
  'some', 'any', 'how', 'when', 'where', 'what', 'who', 'which', 'there',
  'here', 'more', 'as', 'into', 'like', 'through', 'over', 'after', 'before'
];

/* ------------------------------------------------------------------ */
/*  Utility helpers                                                    */
/* ------------------------------------------------------------------ */

function getSignificantWords(text) {
  var words = text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/);
  var result = [];
  for (var i = 0; i < words.length; i++) {
    if (words[i].length > 2 && STOP_WORDS.indexOf(words[i]) === -1) {
      result.push(words[i]);
    }
  }
  return result;
}

function shuffleArray(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

/* ------------------------------------------------------------------ */
/*  The Generation Algorithm                                           */
/* ------------------------------------------------------------------ */

/**
 * Selects 5-10 lines that work together thematically.
 *
 * @param {Array} allLines — all non-flagged poem_lines
 * @param {Object|null} seedLine — the line the user clicked (or null for random)
 * @returns {Array} selected lines, arranged in poetic order
 */
function selectPoemLines(allLines, seedLine) {
  if (allLines.length <= MIN_LINES) return allLines.slice();

  // If no seed, pick a random "strong" line (longer lines tend to be more evocative)
  if (!seedLine) {
    var sorted = allLines.slice().sort(function (a, b) {
      return b.text.length - a.text.length;
    });
    // Pick randomly from top 30%
    var topCount = Math.max(3, Math.floor(sorted.length * 0.3));
    var topLines = sorted.slice(0, topCount);
    seedLine = topLines[Math.floor(Math.random() * topLines.length)];
  }

  var seedWords = getSignificantWords(seedLine.text);
  var seedLen = seedLine.text.length;
  var seedAuthor = (seedLine.author_name || '').toLowerCase().trim();

  // Score every line
  var scored = [];
  var selectedAuthors = {};
  selectedAuthors[seedAuthor] = true;

  for (var i = 0; i < allLines.length; i++) {
    var line = allLines[i];
    if (line.id === seedLine.id) continue;

    var score = 0;
    var lineWords = getSignificantWords(line.text);
    var lineAuthor = (line.author_name || '').toLowerCase().trim();

    // +2 for each shared significant word
    for (var w = 0; w < lineWords.length; w++) {
      if (seedWords.indexOf(lineWords[w]) !== -1) {
        score += 2;
      }
    }

    // +1 for similar length (within 30%)
    var lenRatio = line.text.length / seedLen;
    if (lenRatio >= 0.7 && lenRatio <= 1.3) {
      score += 1;
    }

    // +1 for different author (encourages variety)
    if (!selectedAuthors[lineAuthor]) {
      score += 1;
    }

    // Small random factor to prevent identical outputs
    score += Math.random() * 0.5;

    scored.push({ line: line, score: score });
  }

  // Sort by score descending
  scored.sort(function (a, b) { return b.score - a.score; });

  // Select top lines, but balance author diversity
  var selected = [seedLine];
  var targetCount = Math.min(MAX_LINES, Math.max(MIN_LINES, Math.floor(allLines.length * 0.15)));
  targetCount = Math.min(targetCount, allLines.length);

  for (var s = 0; s < scored.length && selected.length < targetCount; s++) {
    var candidate = scored[s].line;
    var candAuthor = (candidate.author_name || '').toLowerCase().trim();

    // After we have 3+ lines from one author, skip further lines from them
    var authorCount = 0;
    for (var k = 0; k < selected.length; k++) {
      if ((selected[k].author_name || '').toLowerCase().trim() === candAuthor) {
        authorCount++;
      }
    }
    if (authorCount >= 3) continue;

    selected.push(candidate);
    selectedAuthors[candAuthor] = true;
  }

  // Arrange in poetic order: short opener, medium body, impactful close
  selected.sort(function (a, b) { return a.text.length - b.text.length; });

  // Move seed line to a prominent position (2nd or 3rd line)
  var seedIdx = -1;
  for (var si = 0; si < selected.length; si++) {
    if (selected[si].id === seedLine.id) { seedIdx = si; break; }
  }
  if (seedIdx > 2) {
    var removed = selected.splice(seedIdx, 1)[0];
    selected.splice(1, 0, removed);
  }

  // Rearrange: short → longer → short at end (arc shape)
  var byLen = selected.slice().sort(function (a, b) { return a.text.length - b.text.length; });
  var arranged = [];
  var left = 0;
  var rightEnd = byLen.length - 1;
  var takeFromLong = false;

  // Opening: short
  arranged.push(byLen[left++]);

  // Body: alternating medium-long
  while (left <= rightEnd) {
    if (takeFromLong) {
      arranged.push(byLen[left++]);
    } else {
      arranged.push(byLen[rightEnd--]);
    }
    takeFromLong = !takeFromLong;
  }

  return arranged;
}

/* ------------------------------------------------------------------ */
/*  Canvas Share Card for Generated Poem                               */
/* ------------------------------------------------------------------ */

/**
 * Word-wrap helper using canvas measureText.
 */
function wrapTextCanvas(ctx, text, maxWidth) {
  var words = text.split(' ');
  var lines = [];
  var currentLine = '';

  for (var i = 0; i < words.length; i++) {
    var testLine = currentLine ? currentLine + ' ' + words[i] : words[i];
    if (ctx.measureText(testLine).width > maxWidth) {
      if (currentLine) lines.push(currentLine);
      currentLine = words[i];
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * Generates a 1080x1080 share card with all poem lines.
 * Returns a data URL (PNG).
 */
function generatePoemCard(poemLines) {
  var canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  var ctx = canvas.getContext('2d');

  // Background gradient
  var bg = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
  bg.addColorStop(0, COLOR_BG);
  bg.addColorStop(1, COLOR_BG_END);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // Subtle border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  ctx.strokeRect(30, 30, CARD_W - 60, CARD_H - 60);

  // Top accent line
  ctx.strokeStyle = COLOR_ACCENT;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(CARD_W * 0.3, 80);
  ctx.lineTo(CARD_W * 0.7, 80);
  ctx.stroke();

  // Opening quote mark
  ctx.fillStyle = 'rgba(121, 185, 57, 0.10)';
  ctx.font = 'italic 160px Georgia, "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.fillText('\u201C', CARD_W / 2, 200);

  // Poem lines — measure total height first, then center vertically
  var lineHeight = 38;
  var authorLineHeight = 26;
  var gapBetweenLines = 8;
  var maxTextWidth = CARD_W - 180;
  var allWrapped = [];

  ctx.font = 'italic 28px Georgia, "Times New Roman", serif';

  for (var i = 0; i < poemLines.length; i++) {
    var wrapped = wrapTextCanvas(ctx, poemLines[i].text, maxTextWidth);
    allWrapped.push({ wrapped: wrapped, author: poemLines[i].author_name });
  }

  // Calculate total block height
  var totalHeight = 0;
  for (var h = 0; h < allWrapped.length; h++) {
    totalHeight += allWrapped[h].wrapped.length * lineHeight;
    totalHeight += authorLineHeight; // author attribution
    if (h < allWrapped.length - 1) totalHeight += gapBetweenLines;
  }

  // Available vertical space (between top decor and bottom branding)
  var availTop = 220;
  var availBottom = CARD_H - 120;
  var availHeight = availBottom - availTop;

  // If too tall, reduce font and recalculate
  if (totalHeight > availHeight) {
    lineHeight = 30;
    authorLineHeight = 22;
    ctx.font = 'italic 22px Georgia, "Times New Roman", serif';
    allWrapped = [];
    for (var r = 0; r < poemLines.length; r++) {
      var rWrapped = wrapTextCanvas(ctx, poemLines[r].text, maxTextWidth);
      allWrapped.push({ wrapped: rWrapped, author: poemLines[r].author_name });
    }
    totalHeight = 0;
    for (var rh = 0; rh < allWrapped.length; rh++) {
      totalHeight += allWrapped[rh].wrapped.length * lineHeight;
      totalHeight += authorLineHeight;
      if (rh < allWrapped.length - 1) totalHeight += gapBetweenLines;
    }
  }

  var startY = availTop + (availHeight - totalHeight) / 2;
  var curY = startY;

  for (var p = 0; p < allWrapped.length; p++) {
    var entry = allWrapped[p];

    // Line text
    ctx.fillStyle = COLOR_TEXT;
    ctx.font = totalHeight > availHeight ? 'italic 22px Georgia, "Times New Roman", serif' : 'italic 28px Georgia, "Times New Roman", serif';
    ctx.textAlign = 'center';

    for (var wl = 0; wl < entry.wrapped.length; wl++) {
      ctx.fillText(entry.wrapped[wl], CARD_W / 2, curY + wl * lineHeight);
    }
    curY += entry.wrapped.length * lineHeight;

    // Author
    ctx.fillStyle = COLOR_AUTHOR;
    ctx.font = (totalHeight > availHeight ? '14' : '16') + 'px "Nunito Sans", sans-serif';
    ctx.fillText('\u2014 ' + entry.author, CARD_W / 2, curY + 4);
    curY += authorLineHeight + gapBetweenLines;
  }

  // Bottom branding
  ctx.fillStyle = COLOR_WATERMARK;
  ctx.font = '16px "Nunito Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Relentlessly Human \u00B7 itsowol.com', CARD_W / 2, CARD_H - 50);

  // Number of voices
  var authors = {};
  for (var a = 0; a < poemLines.length; a++) {
    var name = (poemLines[a].author_name || '').toLowerCase().trim();
    if (name) authors[name] = true;
  }
  var voiceCount = Object.keys(authors).length;
  ctx.fillStyle = COLOR_ACCENT;
  ctx.font = '14px "Nunito Sans", sans-serif';
  ctx.fillText('Composed from ' + voiceCount + ' voices', CARD_W / 2, CARD_H - 76);

  return canvas.toDataURL('image/png');
}

/* ------------------------------------------------------------------ */
/*  Toast helper                                                       */
/* ------------------------------------------------------------------ */

function showToast(message) {
  var toast = document.createElement('div');
  toast.className = 'share-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(function () {
    toast.classList.add('share-toast--visible');
  });
  setTimeout(function () {
    toast.classList.remove('share-toast--visible');
    setTimeout(function () { toast.remove(); }, 300);
  }, 2000);
}

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

/* ------------------------------------------------------------------ */
/*  Modal UI                                                           */
/* ------------------------------------------------------------------ */

/**
 * Shows the generated poem in a fullscreen modal with typewriter reveal.
 */
function showPoemModal(poemLines, allLines, seedLine) {
  // Remove any existing modal
  var existing = document.getElementById('poem-generator-modal');
  if (existing) existing.remove();

  // Count unique voices
  var authorMap = {};
  for (var a = 0; a < poemLines.length; a++) {
    var name = (poemLines[a].author_name || '').toLowerCase().trim();
    if (name) authorMap[name] = true;
  }
  var voiceCount = Object.keys(authorMap).length;

  // --- Build overlay ---
  var overlay = document.createElement('div');
  overlay.id = 'poem-generator-modal';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Generated poem');
  overlay.style.cssText = [
    'position:fixed',
    'inset:0',
    'z-index:10000',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'background:rgba(0,0,0,0.88)',
    'backdrop-filter:blur(12px)',
    'padding:24px',
    'opacity:0',
    'transition:opacity 0.3s ease',
    'overflow-y:auto',
  ].join(';');

  var modal = document.createElement('div');
  modal.style.cssText = [
    'display:flex',
    'flex-direction:column',
    'align-items:center',
    'gap:16px',
    'max-width:640px',
    'width:100%',
    'padding:40px 20px',
  ].join(';');

  // Title
  var title = document.createElement('p');
  title.style.cssText = [
    'font:italic 14px "Nunito Sans", sans-serif',
    'color:' + COLOR_ACCENT,
    'letter-spacing:2px',
    'text-transform:uppercase',
    'margin:0 0 8px 0',
    'opacity:0',
    'transition:opacity 0.6s ease',
  ].join(';');
  title.textContent = 'A poem, generated';
  modal.appendChild(title);

  // Poem lines container
  var poemContainer = document.createElement('div');
  poemContainer.style.cssText = [
    'display:flex',
    'flex-direction:column',
    'gap:20px',
    'width:100%',
    'max-width:520px',
  ].join(';');

  // Build line elements (hidden initially)
  var lineEls = [];
  for (var li = 0; li < poemLines.length; li++) {
    var lineWrap = document.createElement('div');
    lineWrap.style.cssText = [
      'opacity:0',
      'transform:translateY(12px)',
      'transition:opacity 0.5s ease, transform 0.5s ease',
    ].join(';');

    var lineText = document.createElement('p');
    lineText.style.cssText = [
      'font:italic 22px/1.6 Georgia, "Times New Roman", serif',
      'color:' + COLOR_TEXT,
      'margin:0',
      'text-align:center',
    ].join(';');
    lineText.textContent = poemLines[li].text;

    var lineAuthor = document.createElement('span');
    lineAuthor.style.cssText = [
      'display:block',
      'font:13px "Nunito Sans", sans-serif',
      'color:' + COLOR_MUTED,
      'text-align:center',
      'margin-top:4px',
    ].join(';');
    lineAuthor.textContent = '\u2014 ' + poemLines[li].author_name;

    lineWrap.appendChild(lineText);
    lineWrap.appendChild(lineAuthor);
    poemContainer.appendChild(lineWrap);
    lineEls.push(lineWrap);
  }

  modal.appendChild(poemContainer);

  // Footer (hidden until reveal completes)
  var footer = document.createElement('div');
  footer.style.cssText = [
    'opacity:0',
    'transform:translateY(8px)',
    'transition:opacity 0.5s ease, transform 0.5s ease',
    'text-align:center',
    'margin-top:12px',
  ].join(';');

  var voicesLabel = document.createElement('p');
  voicesLabel.style.cssText = [
    'font:italic 15px "Nunito Sans", sans-serif',
    'color:' + COLOR_MUTED,
    'margin:0 0 20px 0',
  ].join(';');
  voicesLabel.textContent = '\u2014 Composed from ' + voiceCount + ' voices \u2014';
  footer.appendChild(voicesLabel);

  // Action buttons row
  var btnRow = document.createElement('div');
  btnRow.style.cssText = [
    'display:flex',
    'gap:12px',
    'flex-wrap:wrap',
    'justify-content:center',
  ].join(';');

  var btnStyle = [
    'padding:10px 18px',
    'border:1px solid rgba(255,255,255,0.12)',
    'border-radius:8px',
    'background:rgba(255,255,255,0.06)',
    'color:#EFF0ED',
    'font:14px "Nunito Sans", sans-serif',
    'cursor:pointer',
    'transition:background 0.2s',
    'display:flex',
    'align-items:center',
    'gap:6px',
  ].join(';');

  // Download Image button
  var dlBtn = document.createElement('button');
  dlBtn.style.cssText = btnStyle;
  dlBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download';
  dlBtn.addEventListener('mouseenter', function () { this.style.background = 'rgba(255,255,255,0.12)'; });
  dlBtn.addEventListener('mouseleave', function () { this.style.background = 'rgba(255,255,255,0.06)'; });

  // Share button
  var shareBtn = document.createElement('button');
  shareBtn.style.cssText = btnStyle;
  shareBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> Share';
  shareBtn.addEventListener('mouseenter', function () { this.style.background = 'rgba(255,255,255,0.12)'; });
  shareBtn.addEventListener('mouseleave', function () { this.style.background = 'rgba(255,255,255,0.06)'; });

  // Copy button
  var copyBtn = document.createElement('button');
  copyBtn.style.cssText = btnStyle;
  copyBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy';
  copyBtn.addEventListener('mouseenter', function () { this.style.background = 'rgba(255,255,255,0.12)'; });
  copyBtn.addEventListener('mouseleave', function () { this.style.background = 'rgba(255,255,255,0.06)'; });

  // Regenerate button
  var regenBtn = document.createElement('button');
  regenBtn.style.cssText = btnStyle.replace('rgba(255,255,255,0.06)', 'rgba(121,185,57,0.12)').replace('rgba(255,255,255,0.12)', 'rgba(121,185,57,0.2)');
  regenBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> Regenerate';
  regenBtn.addEventListener('mouseenter', function () { this.style.background = 'rgba(121,185,57,0.25)'; });
  regenBtn.addEventListener('mouseleave', function () { this.style.background = 'rgba(121,185,57,0.12)'; });

  btnRow.appendChild(dlBtn);
  btnRow.appendChild(shareBtn);
  btnRow.appendChild(copyBtn);
  btnRow.appendChild(regenBtn);
  footer.appendChild(btnRow);
  modal.appendChild(footer);

  // Close button
  var closeBtn = document.createElement('button');
  closeBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.style.cssText = [
    'position:fixed',
    'top:16px',
    'right:16px',
    'background:none',
    'border:none',
    'color:#EFF0ED',
    'cursor:pointer',
    'padding:8px',
    'opacity:0.6',
    'transition:opacity 0.2s',
    'z-index:10001',
  ].join(';');
  closeBtn.addEventListener('mouseenter', function () { this.style.opacity = '1'; });
  closeBtn.addEventListener('mouseleave', function () { this.style.opacity = '0.6'; });

  overlay.appendChild(modal);
  overlay.appendChild(closeBtn);
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  // Fade in
  requestAnimationFrame(function () {
    overlay.style.opacity = '1';
    title.style.opacity = '1';
  });

  // Typewriter reveal: line by line
  var revealTimers = [];

  function startReveal() {
    for (var r = 0; r < lineEls.length; r++) {
      (function (idx) {
        var timer = setTimeout(function () {
          lineEls[idx].style.opacity = '1';
          lineEls[idx].style.transform = 'translateY(0)';
        }, (idx + 1) * LINE_REVEAL_DELAY);
        revealTimers.push(timer);
      })(r);
    }

    // Show footer after all lines revealed
    var footerTimer = setTimeout(function () {
      footer.style.opacity = '1';
      footer.style.transform = 'translateY(0)';
    }, (lineEls.length + 1) * LINE_REVEAL_DELAY);
    revealTimers.push(footerTimer);
  }

  startReveal();

  // --- Close logic ---
  function closeModal() {
    for (var t = 0; t < revealTimers.length; t++) {
      clearTimeout(revealTimers[t]);
    }
    overlay.style.opacity = '0';
    document.body.style.overflow = '';
    setTimeout(function () { overlay.remove(); }, 300);
    document.removeEventListener('keydown', onKey);
  }

  function onKey(e) {
    if (e.key === 'Escape') closeModal();
  }

  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeModal();
  });
  document.addEventListener('keydown', onKey);

  // --- Button handlers ---

  // Download Image
  dlBtn.addEventListener('click', function () {
    var dataUrl = generatePoemCard(poemLines);
    var blob = dataUrlToBlob(dataUrl);
    downloadBlob(blob, 'generated-poem.png');
    showToast('Image downloaded');
  });

  // Share
  shareBtn.addEventListener('click', async function () {
    var dataUrl = generatePoemCard(poemLines);
    var blob = dataUrlToBlob(dataUrl);
    var file = new File([blob], 'generated-poem.png', { type: 'image/png' });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: 'Relentlessly Human — Generated Poem',
          text: 'A poem composed from ' + voiceCount + ' voices',
          files: [file],
        });
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }

    // Fallback: download
    downloadBlob(blob, 'generated-poem.png');
    showToast('Image downloaded');
  });

  // Copy Text
  copyBtn.addEventListener('click', async function () {
    var str = '';
    for (var c = 0; c < poemLines.length; c++) {
      str += poemLines[c].text + '\n';
      str += '  \u2014 ' + poemLines[c].author_name + '\n\n';
    }
    str += 'Composed from ' + voiceCount + ' voices\n';
    str += 'itsowol.com/poem';

    try {
      await navigator.clipboard.writeText(str);
      showToast('Poem copied to clipboard');
    } catch (e) {
      var ta = document.createElement('textarea');
      ta.value = str;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('Poem copied to clipboard');
    }
  });

  // Regenerate
  regenBtn.addEventListener('click', function () {
    // Clear current reveal
    for (var t = 0; t < revealTimers.length; t++) {
      clearTimeout(revealTimers[t]);
    }
    revealTimers = [];

    // Run algorithm again
    var newPoem = selectPoemLines(allLines, seedLine);

    // Update voice count
    var newAuthors = {};
    for (var na = 0; na < newPoem.length; na++) {
      var nm = (newPoem[na].author_name || '').toLowerCase().trim();
      if (nm) newAuthors[nm] = true;
    }
    var newVoiceCount = Object.keys(newAuthors).length;
    voicesLabel.textContent = '\u2014 Composed from ' + newVoiceCount + ' voices \u2014';

    // Update poem lines ref for actions
    poemLines = newPoem;

    // Reset and re-populate line elements
    poemContainer.innerHTML = '';
    lineEls = [];
    footer.style.opacity = '0';
    footer.style.transform = 'translateY(8px)';

    for (var nl = 0; nl < newPoem.length; nl++) {
      var lw = document.createElement('div');
      lw.style.cssText = [
        'opacity:0',
        'transform:translateY(12px)',
        'transition:opacity 0.5s ease, transform 0.5s ease',
      ].join(';');

      var lt = document.createElement('p');
      lt.style.cssText = [
        'font:italic 22px/1.6 Georgia, "Times New Roman", serif',
        'color:' + COLOR_TEXT,
        'margin:0',
        'text-align:center',
      ].join(';');
      lt.textContent = newPoem[nl].text;

      var la = document.createElement('span');
      la.style.cssText = [
        'display:block',
        'font:13px "Nunito Sans", sans-serif',
        'color:' + COLOR_MUTED,
        'text-align:center',
        'margin-top:4px',
      ].join(';');
      la.textContent = '\u2014 ' + newPoem[nl].author_name;

      lw.appendChild(lt);
      lw.appendChild(la);
      poemContainer.appendChild(lw);
      lineEls.push(lw);
    }

    startReveal();
  });
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Generates a mini-poem and shows it in a modal.
 *
 * @param {Array} allLines — all poem lines (from Supabase)
 * @param {Object|null} seedLine — specific line to build around, or null for random
 */
export function generatePoem(allLines, seedLine) {
  if (!allLines || allLines.length === 0) return;

  var poemLines = selectPoemLines(allLines, seedLine || null);
  showPoemModal(poemLines, allLines, seedLine || null);
}
