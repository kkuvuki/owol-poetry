/**
 * Shareable Line Cards — generates a dark, branded PNG from a poem line.
 * Used on both the homepage RH section and the /poem page.
 */

var CARD_W = 1080;
var CARD_H = 1080;

/**
 * Renders a line card to a canvas and returns a Blob URL.
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

/**
 * Triggers share or download for a line.
 * Uses Web Share API if available, falls back to download.
 */
export async function shareLine(text, author) {
  var blobUrl = await renderCard(text, author);

  // Try Web Share API first (mobile-friendly)
  if (navigator.share && navigator.canShare) {
    try {
      var response = await fetch(blobUrl);
      var blob = await response.blob();
      var file = new File([blob], 'poem-line.png', { type: 'image/png' });

      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Relentlessly Human',
          text: '"' + text + '" \u2014 ' + author,
          files: [file],
        });
        URL.revokeObjectURL(blobUrl);
        return;
      }
    } catch (e) {
      // User cancelled or share failed — fall through to download
    }
  }

  // Fallback: download the image
  var a = document.createElement('a');
  a.href = blobUrl;
  a.download = 'poem-line.png';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function () { URL.revokeObjectURL(blobUrl); }, 1000);
}
