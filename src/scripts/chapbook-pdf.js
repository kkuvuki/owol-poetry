/**
 * Chapbook PDF Generator — creates a beautiful downloadable A5 chapbook
 * from the collaborative poem lines using jsPDF (loaded from CDN).
 *
 * Exports:
 *   generateChapbook(lines, options) → Promise<Blob>
 *   downloadChapbook(blob, filename) → void
 */

/* ── Constants ─────────────────────────────────────────────────────── */

var A5_W = 148;   // mm
var A5_H = 210;   // mm
var MARGIN_TOP = 24;
var MARGIN_BOTTOM = 18;
var MARGIN_LEFT = 20;
var MARGIN_RIGHT = 20;
var CONTENT_W = A5_W - MARGIN_LEFT - MARGIN_RIGHT;

var COLOR_BG       = '#F5F1EB';   // warm cream
var COLOR_DARK     = '#13100D';
var COLOR_TEXT      = '#2A2520';
var COLOR_MUTED     = '#7A7068';
var COLOR_GREEN     = '#79B939';
var COLOR_GREEN_DIM = 'rgba(121, 185, 57, 0.35)';
var COLOR_COVER_BG  = '#13100D';

var STANZA_SIZE_MIN = 4;
var STANZA_SIZE_MAX = 6;

/* ── jsPDF loader ──────────────────────────────────────────────────── */

var _jspdfPromise = null;

function loadJsPDF() {
  if (_jspdfPromise) return _jspdfPromise;
  _jspdfPromise = new Promise(function (resolve, reject) {
    if (window.jspdf) { resolve(window.jspdf); return; }
    var script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = function () { resolve(window.jspdf); };
    script.onerror = function () { reject(new Error('Failed to load jsPDF')); };
    document.head.appendChild(script);
  });
  return _jspdfPromise;
}

/* ── Helpers ───────────────────────────────────────────────────────── */

function formatDate(d) {
  var months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
}

/**
 * Split lines into stanzas of 4–6 lines each.
 */
function groupIntoStanzas(lines) {
  var stanzas = [];
  var i = 0;
  while (i < lines.length) {
    var remaining = lines.length - i;
    var size;
    if (remaining <= STANZA_SIZE_MAX) {
      size = remaining;
    } else if (remaining <= STANZA_SIZE_MAX + STANZA_SIZE_MIN) {
      // avoid a tiny trailing stanza
      size = Math.ceil(remaining / 2);
    } else {
      size = STANZA_SIZE_MIN + Math.floor(Math.random() * (STANZA_SIZE_MAX - STANZA_SIZE_MIN + 1));
    }
    stanzas.push(lines.slice(i, i + size));
    i += size;
  }
  return stanzas;
}

/**
 * Build a contributor list: { name, count } sorted by count desc.
 */
function buildContributors(lines) {
  var map = {};
  for (var i = 0; i < lines.length; i++) {
    var author = lines[i].author || lines[i].author_name || 'Anonymous';
    map[author] = (map[author] || 0) + 1;
  }
  var list = [];
  for (var name in map) {
    if (map.hasOwnProperty(name)) {
      list.push({ name: name, count: map[name] });
    }
  }
  list.sort(function (a, b) { return b.count - a.count; });
  return list;
}

/**
 * Fill a page with the cream background.
 */
function fillPageBg(doc) {
  doc.setFillColor(COLOR_BG);
  doc.rect(0, 0, A5_W, A5_H, 'F');
}

/**
 * Draw the subtle green accent line at the top of content pages.
 */
function drawTopAccent(doc) {
  doc.setDrawColor(COLOR_GREEN);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_LEFT, MARGIN_TOP - 4, A5_W - MARGIN_RIGHT, MARGIN_TOP - 4);
}

/**
 * Draw a page number at the bottom center.
 */
function drawPageNumber(doc, num) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(COLOR_MUTED);
  doc.text(String(num), A5_W / 2, A5_H - MARGIN_BOTTOM + 8, { align: 'center' });
}

/**
 * Wrap text to fit within maxWidth, returning an array of strings.
 */
function wrapText(doc, text, maxWidth) {
  return doc.splitTextToSize(text, maxWidth);
}

/* ── Page Renderers ────────────────────────────────────────────────── */

function renderCover(doc, options) {
  var title = options.title || 'Relentlessly Human';
  var subtitle = options.subtitle || 'A collaborative poem written by strangers, for strangers';
  var date = formatDate(options.date || new Date());

  // Dark background
  doc.setFillColor(COLOR_COVER_BG);
  doc.rect(0, 0, A5_W, A5_H, 'F');

  // Green accent bar
  doc.setFillColor(COLOR_GREEN);
  doc.rect(MARGIN_LEFT, 58, 32, 1.2, 'F');

  // Title
  doc.setFont('times', 'bold');
  doc.setFontSize(28);
  doc.setTextColor('#FFFFFF');
  doc.text(title, MARGIN_LEFT, 72);

  // Subtitle — wrap it
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(COLOR_MUTED);
  var subtitleLines = wrapText(doc, subtitle, CONTENT_W);
  doc.text(subtitleLines, MARGIN_LEFT, 82);

  // Date
  doc.setFontSize(8);
  doc.setTextColor(COLOR_GREEN);
  doc.text(date, MARGIN_LEFT, 82 + subtitleLines.length * 5 + 8);

  // Bottom branding
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(COLOR_MUTED);
  doc.text('itsowol.com', MARGIN_LEFT, A5_H - MARGIN_BOTTOM);

  // Decorative bottom green line
  doc.setDrawColor(COLOR_GREEN);
  doc.setLineWidth(0.4);
  doc.line(MARGIN_LEFT, A5_H - MARGIN_BOTTOM - 6, MARGIN_LEFT + 20, A5_H - MARGIN_BOTTOM - 6);
}

function renderTOC(doc, contributors, pageNum) {
  fillPageBg(doc);
  drawTopAccent(doc);

  // Heading
  doc.setFont('times', 'italic');
  doc.setFontSize(16);
  doc.setTextColor(COLOR_DARK);
  doc.text('Contributors', MARGIN_LEFT, MARGIN_TOP + 6);

  doc.setDrawColor(COLOR_GREEN);
  doc.setLineWidth(0.25);
  doc.line(MARGIN_LEFT, MARGIN_TOP + 9, MARGIN_LEFT + 24, MARGIN_TOP + 9);

  var y = MARGIN_TOP + 20;
  var lineHeight = 5.2;
  var maxY = A5_H - MARGIN_BOTTOM - 10;

  for (var i = 0; i < contributors.length; i++) {
    if (y > maxY) break; // don't overflow (unlikely for reasonable contributor counts)

    var c = contributors[i];
    var label = c.count === 1 ? '1 line' : c.count + ' lines';

    // Name
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(COLOR_TEXT);
    doc.text(c.name, MARGIN_LEFT, y);

    // Line count — right-aligned
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(COLOR_MUTED);
    doc.text(label, A5_W - MARGIN_RIGHT, y, { align: 'right' });

    // Dotted leader
    doc.setDrawColor(COLOR_MUTED);
    doc.setLineDashPattern([0.5, 1.5], 0);
    doc.setLineWidth(0.15);
    var nameW = doc.getTextWidth(c.name);
    var labelW = doc.getTextWidth(label);
    var leaderStart = MARGIN_LEFT + nameW + 2;
    var leaderEnd = A5_W - MARGIN_RIGHT - labelW - 2;
    if (leaderEnd > leaderStart + 4) {
      doc.line(leaderStart, y - 0.5, leaderEnd, y - 0.5);
    }
    doc.setLineDashPattern([], 0);

    y += lineHeight;
  }

  drawPageNumber(doc, pageNum);
}

function renderPoemPages(doc, stanzas, startPageNum) {
  var pageNum = startPageNum;
  var y = MARGIN_TOP + 4;
  var lineHeightPoem = 5.8;
  var lineHeightAuthor = 4;
  var stanzaGap = 7;
  var maxY = A5_H - MARGIN_BOTTOM - 6;
  var isFirstPage = true;

  function newPage() {
    doc.addPage([A5_W, A5_H]);
    fillPageBg(doc);
    drawTopAccent(doc);
    pageNum++;
    y = MARGIN_TOP + 4;
    isFirstPage = false;
  }

  // First poem page is already added by caller
  fillPageBg(doc);
  drawTopAccent(doc);

  for (var s = 0; s < stanzas.length; s++) {
    var stanza = stanzas[s];

    // Estimate height for this stanza
    var estHeight = 0;
    for (var k = 0; k < stanza.length; k++) {
      var textLines = wrapText(doc, stanza[k].text || stanza[k].line || '', CONTENT_W - 4);
      estHeight += textLines.length * lineHeightPoem + lineHeightAuthor;
    }
    estHeight += stanzaGap;

    // If stanza won't fit, start a new page
    if (!isFirstPage && y + estHeight > maxY) {
      drawPageNumber(doc, pageNum);
      newPage();
    } else if (isFirstPage && y + estHeight > maxY) {
      // Even the first page may need a break for very large stanzas
      drawPageNumber(doc, pageNum);
      newPage();
    }

    for (var j = 0; j < stanza.length; j++) {
      var line = stanza[j];
      var text = line.text || line.line || '';
      var author = line.author || line.author_name || 'Anonymous';

      // Wrap the poem line
      var wrapped = wrapText(doc, text, CONTENT_W - 4);

      // Check if this single line fits
      var singleHeight = wrapped.length * lineHeightPoem + lineHeightAuthor + 1;
      if (y + singleHeight > maxY) {
        drawPageNumber(doc, pageNum);
        newPage();
      }

      // Poem text — italic serif
      doc.setFont('times', 'italic');
      doc.setFontSize(10);
      doc.setTextColor(COLOR_TEXT);
      for (var w = 0; w < wrapped.length; w++) {
        doc.text(wrapped[w], MARGIN_LEFT + 2, y);
        y += lineHeightPoem;
      }

      // Author attribution — small sans
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(COLOR_MUTED);
      doc.text('\u2014 ' + author, MARGIN_LEFT + 6, y);
      y += lineHeightAuthor + 1;
    }

    // Stanza gap
    y += stanzaGap;
  }

  // Final page number
  drawPageNumber(doc, pageNum);
  return pageNum;
}

function renderColophon(doc, lineCount, contributorCount, pageNum) {
  fillPageBg(doc);

  var centerX = A5_W / 2;
  var y = A5_H * 0.35;

  // Green ornament
  doc.setFillColor(COLOR_GREEN);
  doc.rect(centerX - 8, y - 12, 16, 0.8, 'F');

  // Main text
  doc.setFont('times', 'italic');
  doc.setFontSize(9.5);
  doc.setTextColor(COLOR_TEXT);

  var colophonText =
    'This poem was written by ' + contributorCount + ' voices from around the world. ' +
    'Each line was contributed freely. No AI. Only what we carry inside.';

  var wrapped = wrapText(doc, colophonText, CONTENT_W - 10);
  var blockX = centerX;
  for (var i = 0; i < wrapped.length; i++) {
    doc.text(wrapped[i], blockX, y, { align: 'center' });
    y += 5.4;
  }

  // Line count
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(COLOR_MUTED);
  doc.text(lineCount + ' lines total', centerX, y, { align: 'center' });

  // Generation date
  y += 8;
  doc.setFontSize(7);
  doc.setTextColor(COLOR_MUTED);
  doc.text('Generated ' + formatDate(new Date()), centerX, y, { align: 'center' });

  // Bottom branding
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(COLOR_GREEN);
  doc.text('itsowol.com', centerX, A5_H - MARGIN_BOTTOM, { align: 'center' });

  // Bottom accent
  doc.setDrawColor(COLOR_GREEN);
  doc.setLineWidth(0.3);
  doc.line(centerX - 10, A5_H - MARGIN_BOTTOM - 5, centerX + 10, A5_H - MARGIN_BOTTOM - 5);

  drawPageNumber(doc, pageNum);
}

/* ── Public API ─────────────────────────────────────────────────────── */

/**
 * Generate a chapbook PDF from poem lines.
 *
 * @param {Array<{text?: string, line?: string, author?: string, author_name?: string}>} lines
 * @param {Object} [options]
 * @param {string}  [options.title]    — cover title (default: "Relentlessly Human")
 * @param {string}  [options.subtitle] — cover subtitle
 * @param {Date}    [options.date]     — cover date (default: now)
 * @returns {Promise<Blob>} PDF blob
 */
export async function generateChapbook(lines, options) {
  if (!lines || lines.length === 0) {
    throw new Error('No lines provided for chapbook generation');
  }

  var opts = options || {};
  var jspdf = await loadJsPDF();
  var doc = new jspdf.jsPDF({
    unit: 'mm',
    format: [A5_W, A5_H],
    orientation: 'portrait',
    compress: true
  });

  var contributors = buildContributors(lines);
  var stanzas = groupIntoStanzas(lines);

  // ── Page 1: Cover ──
  renderCover(doc, opts);

  // ── Page 2: Table of Contents ──
  doc.addPage([A5_W, A5_H]);
  renderTOC(doc, contributors, 1);

  // ── Pages 3+: Poem ──
  doc.addPage([A5_W, A5_H]);
  var lastPageNum = renderPoemPages(doc, stanzas, 2);

  // ── Final page: Colophon ──
  doc.addPage([A5_W, A5_H]);
  renderColophon(doc, lines.length, contributors.length, lastPageNum + 1);

  return doc.output('blob');
}

/**
 * Trigger a browser download for a Blob.
 *
 * @param {Blob} blob — the PDF blob
 * @param {string} [filename] — download filename (default: "relentlessly-human-chapbook.pdf")
 */
export function downloadChapbook(blob, filename) {
  var name = filename || 'relentlessly-human-chapbook.pdf';
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(function () {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}
