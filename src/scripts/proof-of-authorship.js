/**
 * Proof of Authorship — generates a unique cryptographic receipt
 * that serves as proof that a contributor wrote a specific line.
 *
 * The receipt includes:
 * - The line text and author name
 * - A timestamp
 * - A unique verification code (SHA-256 hash)
 * - A beautiful downloadable certificate image
 */

/**
 * Generate a SHA-256 hash of the input string.
 * @param {string} str
 * @returns {Promise<string>} hex hash
 */
async function sha256(str) {
  var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(function (b) {
    return b.toString(16).padStart(2, '0');
  }).join('');
}

/**
 * Generate a short verification code from a hash.
 * Format: XXXX-XXXX-XXXX (alphanumeric uppercase)
 */
function shortCode(hash) {
  var chars = hash.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 12);
  return chars.substring(0, 4) + '-' + chars.substring(4, 8) + '-' + chars.substring(8, 12);
}

/**
 * Generate the proof of authorship data.
 * @param {object} line — { id, text, author_name, created_at }
 * @returns {Promise<object>} — { code, hash, line, author, timestamp, verifyUrl }
 */
export async function generateProof(line) {
  var payload = [line.id, line.text, line.author_name, line.created_at].join('|');
  var hash = await sha256(payload);
  var code = shortCode(hash);

  return {
    code: code,
    hash: hash,
    line: line.text,
    author: line.author_name,
    timestamp: line.created_at,
    lineId: line.id,
    verifyUrl: 'https://itsowol.com/poem#line-' + line.id,
  };
}

/**
 * Render a beautiful certificate image as a canvas.
 * @param {object} proof — from generateProof()
 * @returns {Promise<Blob>} PNG blob
 */
export async function renderCertificate(proof) {
  var W = 1200;
  var H = 800;
  var canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  var ctx = canvas.getContext('2d');

  // Background with subtle gradient
  var bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#13100D');
  bg.addColorStop(1, '#1A1714');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Decorative border
  ctx.strokeStyle = 'rgba(121, 185, 57, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(30, 30, W - 60, H - 60);

  // Inner border
  ctx.strokeStyle = 'rgba(121, 185, 57, 0.1)';
  ctx.strokeRect(40, 40, W - 80, H - 80);

  // Top accent bar
  ctx.fillStyle = '#79B939';
  ctx.fillRect(60, 50, W - 120, 3);

  // Corner ornaments (small green dots)
  var corners = [[50, 50], [W - 50, 50], [50, H - 50], [W - 50, H - 50]];
  ctx.fillStyle = '#79B939';
  corners.forEach(function (c) {
    ctx.beginPath();
    ctx.arc(c[0], c[1], 4, 0, Math.PI * 2);
    ctx.fill();
  });

  // Title
  ctx.fillStyle = 'rgba(121, 185, 57, 0.8)';
  ctx.font = '14px "Nunito Sans", -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.letterSpacing = '4px';
  ctx.fillText('PROOF OF AUTHORSHIP', W / 2, 110);

  // Certificate title
  ctx.fillStyle = '#EFF0ED';
  ctx.font = 'italic 42px Georgia, "Times New Roman", serif';
  ctx.fillText('Certificate of Contribution', W / 2, 170);

  // Thin separator
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(200, 200);
  ctx.lineTo(W - 200, 200);
  ctx.stroke();

  // "This certifies that" text
  ctx.fillStyle = '#908F8A';
  ctx.font = '18px Georgia, serif';
  ctx.fillText('This certifies that', W / 2, 250);

  // Author name (large)
  ctx.fillStyle = '#EFF0ED';
  ctx.font = '36px Georgia, "Times New Roman", serif';
  ctx.fillText(proof.author, W / 2, 300);

  // "contributed the following line"
  ctx.fillStyle = '#908F8A';
  ctx.font = '18px Georgia, serif';
  ctx.fillText('contributed the following line to Relentlessly Human:', W / 2, 350);

  // The line itself (quoted, green accent)
  ctx.fillStyle = '#79B939';
  ctx.font = 'italic 28px Georgia, "Times New Roman", serif';

  // Word-wrap the line
  var words = proof.line.split(' ');
  var lines = [];
  var current = '';
  var maxWidth = W - 200;
  words.forEach(function (word) {
    var test = current ? current + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = test;
    }
  });
  if (current) lines.push(current);

  var lineY = 410;
  ctx.fillStyle = '#EFF0ED';
  lines.forEach(function (l, i) {
    if (i === 0) l = '\u201C' + l;
    if (i === lines.length - 1) l = l + '\u201D';
    ctx.fillText(l, W / 2, lineY + i * 38);
  });

  // Verification section
  var verifyY = lineY + lines.length * 38 + 50;

  // Separator
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.beginPath();
  ctx.moveTo(200, verifyY);
  ctx.lineTo(W - 200, verifyY);
  ctx.stroke();

  // Date
  var date = new Date(proof.timestamp);
  var dateStr = date.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  ctx.fillStyle = '#908F8A';
  ctx.font = '16px "Nunito Sans", -apple-system, sans-serif';
  ctx.fillText(dateStr, W / 2, verifyY + 40);

  // Verification code (the star of the show)
  ctx.fillStyle = '#79B939';
  ctx.font = '600 24px "Nunito Sans", -apple-system, monospace';
  ctx.fillText(proof.code, W / 2, verifyY + 80);

  ctx.fillStyle = '#7A7B75';
  ctx.font = '12px "Nunito Sans", -apple-system, sans-serif';
  ctx.fillText('Verification Code', W / 2, verifyY + 105);

  // Bottom branding
  ctx.fillStyle = '#7A7B75';
  ctx.font = '14px "Nunito Sans", -apple-system, sans-serif';
  ctx.fillText('itsowol.com/poem', W / 2, H - 70);

  // Bottom accent bar
  ctx.fillStyle = '#79B939';
  ctx.fillRect(60, H - 53, W - 120, 3);

  return new Promise(function (resolve) {
    canvas.toBlob(function (blob) {
      resolve(blob);
    }, 'image/png');
  });
}

/**
 * Show the proof modal after contribution.
 * @param {object} line — the submitted line data from Supabase
 */
export async function showProofModal(line) {
  var proof = await generateProof(line);

  // Create modal overlay
  var overlay = document.createElement('div');
  overlay.className = 'proof-modal';
  overlay.innerHTML = [
    '<div class="proof-modal__card">',
    '  <button class="proof-modal__close" type="button" aria-label="Close">&times;</button>',
    '  <div class="proof-modal__badge">',
    '    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#79B939" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    '  </div>',
    '  <h3 class="proof-modal__title">Your line is part of the poem</h3>',
    '  <p class="proof-modal__line">\u201C' + escHtml(proof.line) + '\u201D</p>',
    '  <div class="proof-modal__code-wrap">',
    '    <span class="proof-modal__code-label">Your verification code</span>',
    '    <span class="proof-modal__code">' + proof.code + '</span>',
    '    <span class="proof-modal__code-hint">This code proves you wrote this line. Save it.</span>',
    '  </div>',
    '  <div class="proof-modal__actions">',
    '    <button class="proof-modal__btn proof-modal__btn--download" type="button">Download certificate</button>',
    '    <button class="proof-modal__btn proof-modal__btn--copy" type="button">Copy code</button>',
    '  </div>',
    '</div>',
  ].join('\n');

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  // Close handler
  var closeBtn = overlay.querySelector('.proof-modal__close');
  closeBtn.addEventListener('click', function () {
    overlay.remove();
    document.body.style.overflow = '';
  });
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) {
      overlay.remove();
      document.body.style.overflow = '';
    }
  });

  // Download certificate
  var downloadBtn = overlay.querySelector('.proof-modal__btn--download');
  downloadBtn.addEventListener('click', async function () {
    downloadBtn.textContent = 'Generating...';
    var blob = await renderCertificate(proof);
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'proof-of-authorship-' + proof.code + '.png';
    a.click();
    URL.revokeObjectURL(url);
    downloadBtn.textContent = 'Downloaded!';
    setTimeout(function () { downloadBtn.textContent = 'Download certificate'; }, 2000);
  });

  // Copy code
  var copyBtn = overlay.querySelector('.proof-modal__btn--copy');
  copyBtn.addEventListener('click', function () {
    navigator.clipboard.writeText(proof.code).then(function () {
      copyBtn.textContent = 'Copied!';
      setTimeout(function () { copyBtn.textContent = 'Copy code'; }, 2000);
    });
  });
}

function escHtml(str) {
  var div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
