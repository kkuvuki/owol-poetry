/**
 * QR Poster Generator
 * Creates printable A4 posters with poem excerpts + QR code linking to itsowol.com/poem
 */

var QR_API = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://itsowol.com/poem';
var POSTER_W = 1240;
var POSTER_H = 1754;
var BG = '#13100D';
var GREEN = '#4ADE80';
var WHITE = '#F5F0EB';
var MUTED = '#A8998A';

function loadImage(src) {
  return new Promise(function (resolve, reject) {
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () { resolve(img); };
    img.onerror = function () { reject(new Error('Failed to load image: ' + src)); };
    img.src = src;
  });
}

function wrapText(ctx, text, maxWidth) {
  var words = text.split(' ');
  var lines = [];
  var current = '';
  for (var i = 0; i < words.length; i++) {
    var test = current ? current + ' ' + words[i] : words[i];
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = words[i];
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Generate a poster PNG blob
 * @param {Array<{text: string, author_name: string}>} lines - poem lines to feature
 * @param {object} [options]
 * @returns {Promise<Blob>}
 */
export async function generatePoster(lines, options) {
  options = options || {};
  var canvas = document.createElement('canvas');
  canvas.width = POSTER_W;
  canvas.height = POSTER_H;
  var ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, POSTER_W, POSTER_H);

  // Top green accent line
  ctx.strokeStyle = GREEN;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(100, 120);
  ctx.lineTo(POSTER_W - 100, 120);
  ctx.stroke();

  // Title
  ctx.fillStyle = WHITE;
  ctx.font = 'italic 64px Georgia, "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.fillText('Relentlessly Human', POSTER_W / 2, 200);

  // Subtitle
  ctx.fillStyle = MUTED;
  ctx.font = '24px Georgia, "Times New Roman", serif';
  ctx.fillText('A collaborative poem, written one line at a time', POSTER_W / 2, 260);

  // Green accent dot cluster
  ctx.fillStyle = GREEN;
  var dotPositions = [
    [POSTER_W / 2 - 20, 310], [POSTER_W / 2, 310], [POSTER_W / 2 + 20, 310]
  ];
  for (var d = 0; d < dotPositions.length; d++) {
    ctx.beginPath();
    ctx.arc(dotPositions[d][0], dotPositions[d][1], 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Poem lines
  var y = 400;
  var lineSpacing = 48;
  var maxTextWidth = POSTER_W - 240;

  for (var i = 0; i < lines.length && y < POSTER_H - 450; i++) {
    var line = lines[i];

    // Line text
    ctx.fillStyle = WHITE;
    ctx.font = '32px Georgia, "Times New Roman", serif';
    ctx.textAlign = 'center';

    var wrapped = wrapText(ctx, '"' + line.text + '"', maxTextWidth);
    for (var w = 0; w < wrapped.length; w++) {
      ctx.fillText(wrapped[w], POSTER_W / 2, y);
      y += 42;
    }

    // Author attribution
    ctx.fillStyle = GREEN;
    ctx.font = 'italic 22px Georgia, "Times New Roman", serif';
    ctx.fillText('-- ' + (line.author_name || 'Anonymous'), POSTER_W / 2, y + 8);

    y += lineSpacing + 30;
  }

  // Bottom section separator
  var bottomStart = POSTER_H - 380;
  ctx.strokeStyle = GREEN;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(100, bottomStart);
  ctx.lineTo(POSTER_W - 100, bottomStart);
  ctx.stroke();

  // Load QR code
  var qrY = bottomStart + 40;
  try {
    var qrImg = await loadImage(QR_API);
    var qrSize = 180;
    ctx.drawImage(qrImg, (POSTER_W - qrSize) / 2, qrY, qrSize, qrSize);
  } catch (e) {
    // Fallback: draw a placeholder box
    ctx.strokeStyle = MUTED;
    ctx.lineWidth = 2;
    ctx.strokeRect((POSTER_W - 180) / 2, qrY, 180, 180);
    ctx.fillStyle = MUTED;
    ctx.font = '18px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('QR Code', POSTER_W / 2, qrY + 95);
  }

  // "Scan to read the full poem" text
  var textY = qrY + 210;
  ctx.fillStyle = WHITE;
  ctx.font = '26px Georgia, "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.fillText('Scan to add your line', POSTER_W / 2, textY);

  // URL
  ctx.fillStyle = GREEN;
  ctx.font = '22px Georgia, "Times New Roman", serif';
  ctx.fillText('itsowol.com/poem', POSTER_W / 2, textY + 40);

  // Bottom green accent line
  ctx.strokeStyle = GREEN;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(100, POSTER_H - 80);
  ctx.lineTo(POSTER_W - 100, POSTER_H - 80);
  ctx.stroke();

  // OwOL branding
  ctx.fillStyle = MUTED;
  ctx.font = '18px Georgia, "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.fillText('OwOL — Our Way of Life', POSTER_W / 2, POSTER_H - 45);

  return new Promise(function (resolve) {
    canvas.toBlob(function (blob) {
      resolve(blob);
    }, 'image/png');
  });
}

/**
 * Trigger a download of the poster blob
 * @param {Blob} blob
 * @param {string} [filename]
 */
export function downloadPoster(blob, filename) {
  filename = filename || 'relentlessly-human-poster.png';
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
