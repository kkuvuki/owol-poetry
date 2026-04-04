/**
 * OG Card Generator — creates branded share images using Canvas API.
 *
 * Two formats:
 *   1. Standard OG (1200x630) — for link previews & general sharing
 *   2. Story (1080x1920) — for Instagram/WhatsApp Stories
 */

var OG_W = 1200;
var OG_H = 630;
var STORY_W = 1080;
var STORY_H = 1920;

/**
 * Word-wrap helper — splits text into lines that fit within maxWidth.
 */
function wrapText(ctx, text, maxWidth) {
  var words = text.split(' ');
  var lines = [];
  var currentLine = '';

  words.forEach(function (word) {
    var testLine = currentLine ? currentLine + ' ' + word : word;
    if (ctx.measureText(testLine).width > maxWidth) {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  });
  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * Draws the dark branded background with gradient.
 */
function drawBackground(ctx, w, h) {
  var bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#13100D');
  bg.addColorStop(1, '#1C1916');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
}

/**
 * Generates a standard OG image (1200x630) for link previews.
 *
 * @param {string} text — the poem line
 * @param {string} authorName — author attribution
 * @returns {Promise<string>} data URL of the PNG
 */
export function generateLineCard(text, authorName) {
  return new Promise(function (resolve) {
    var canvas = document.createElement('canvas');
    canvas.width = OG_W;
    canvas.height = OG_H;
    var ctx = canvas.getContext('2d');

    // Background
    drawBackground(ctx, OG_W, OG_H);

    // Green accent bar at top
    ctx.fillStyle = '#79B939';
    ctx.fillRect(0, 0, OG_W, 4);

    // Opening quote mark (decorative)
    ctx.fillStyle = 'rgba(121, 185, 57, 0.10)';
    ctx.font = 'italic 180px Georgia, "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.fillText('\u201C', 200, 240);

    // Main text — centered, word-wrapped, max 3 lines
    ctx.fillStyle = '#EFF0ED';
    ctx.font = 'italic 40px Georgia, "Times New Roman", serif';
    ctx.textAlign = 'center';

    var maxWidth = OG_W - 200;
    var lines = wrapText(ctx, text, maxWidth);
    if (lines.length > 3) {
      lines = lines.slice(0, 3);
      lines[2] = lines[2].replace(/\s+\S*$/, '') + '...';
    }

    var lineHeight = 56;
    var blockHeight = lines.length * lineHeight;
    var startY = (OG_H / 2) - (blockHeight / 2) + 20;

    lines.forEach(function (line, i) {
      ctx.fillText(line, OG_W / 2, startY + i * lineHeight);
    });

    // Author attribution
    ctx.fillStyle = '#A6A5A0';
    ctx.font = '22px "Nunito Sans", -apple-system, "Segoe UI", sans-serif';
    ctx.fillText('\u2014 ' + authorName, OG_W / 2, startY + blockHeight + 40);

    // Bottom watermark
    ctx.fillStyle = '#7A7B75';
    ctx.font = '16px "Nunito Sans", -apple-system, "Segoe UI", sans-serif';
    ctx.fillText('itsowol.com/poem', OG_W / 2, OG_H - 40);

    // Subtle border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    ctx.strokeRect(20, 20, OG_W - 40, OG_H - 40);

    resolve(canvas.toDataURL('image/png'));
  });
}

/**
 * Generates a portrait Story image (1080x1920) for Instagram/WhatsApp Stories.
 * Larger text, more dramatic layout.
 *
 * @param {string} text — the poem line
 * @param {string} authorName — author attribution
 * @returns {Promise<string>} data URL of the PNG
 */
export function generateStoryCard(text, authorName) {
  return new Promise(function (resolve) {
    var canvas = document.createElement('canvas');
    canvas.width = STORY_W;
    canvas.height = STORY_H;
    var ctx = canvas.getContext('2d');

    // Background
    drawBackground(ctx, STORY_W, STORY_H);

    // Green accent bar at top
    ctx.fillStyle = '#79B939';
    ctx.fillRect(0, 0, STORY_W, 4);

    // Decorative vertical line (left side)
    ctx.strokeStyle = 'rgba(121, 185, 57, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(100, 600);
    ctx.lineTo(100, 1300);
    ctx.stroke();

    // Large opening quote mark
    ctx.fillStyle = 'rgba(121, 185, 57, 0.08)';
    ctx.font = 'italic 400px Georgia, "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.fillText('\u201C', STORY_W / 2, 750);

    // Main text — large, centered
    ctx.fillStyle = '#EFF0ED';
    ctx.font = 'italic 56px Georgia, "Times New Roman", serif';
    ctx.textAlign = 'center';

    var maxWidth = STORY_W - 200;
    var lines = wrapText(ctx, text, maxWidth);
    if (lines.length > 6) {
      lines = lines.slice(0, 6);
      lines[5] = lines[5].replace(/\s+\S*$/, '') + '...';
    }

    var lineHeight = 78;
    var blockHeight = lines.length * lineHeight;
    var startY = (STORY_H / 2) - (blockHeight / 2) + 40;

    lines.forEach(function (line, i) {
      ctx.fillText(line, STORY_W / 2, startY + i * lineHeight);
    });

    // Author attribution
    ctx.fillStyle = '#A6A5A0';
    ctx.font = '28px "Nunito Sans", -apple-system, "Segoe UI", sans-serif';
    ctx.fillText('\u2014 ' + authorName, STORY_W / 2, startY + blockHeight + 60);

    // Accent line below author
    ctx.strokeStyle = 'rgba(121, 185, 57, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(STORY_W / 2 - 80, startY + blockHeight + 100);
    ctx.lineTo(STORY_W / 2 + 80, startY + blockHeight + 100);
    ctx.stroke();

    // Bottom branding
    ctx.fillStyle = '#7A7B75';
    ctx.font = '20px "Nunito Sans", -apple-system, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Relentlessly Human', STORY_W / 2, STORY_H - 140);
    ctx.font = '16px "Nunito Sans", -apple-system, "Segoe UI", sans-serif';
    ctx.fillText('itsowol.com/poem', STORY_W / 2, STORY_H - 100);

    // Subtle border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    ctx.strokeRect(30, 30, STORY_W - 60, STORY_H - 60);

    resolve(canvas.toDataURL('image/png'));
  });
}

/**
 * Converts a data URL to a Blob.
 * @param {string} dataUrl
 * @returns {Blob}
 */
export function dataUrlToBlob(dataUrl) {
  var parts = dataUrl.split(',');
  var mime = parts[0].match(/:(.*?);/)[1];
  var raw = atob(parts[1]);
  var arr = new Uint8Array(raw.length);
  for (var i = 0; i < raw.length; i++) {
    arr[i] = raw.charCodeAt(i);
  }
  return new Blob([arr], { type: mime });
}
