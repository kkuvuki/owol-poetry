/**
 * Animated Share Card — typewriter-style video animation for social sharing.
 * Creates a Canvas-based animation of a poem line being "typed" out,
 * recordable as WebM video or exportable as a final-frame PNG.
 *
 * Exports:
 *   createAnimatedCard(text, authorName, options) — returns { canvas, play, stop, toBlob }
 *   recordAsVideo(canvas, durationMs) — records canvas as WebM Blob
 *   showAnimatedShareModal(lineText, authorName) — fullscreen modal with preview + share
 */

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

var CARD_W = 1080;
var CARD_H = 1080;
var DURATION = 3000; // total animation length in ms
var FPS = 30;
var MAX_CHARS_PER_LINE = 35;

// Colors matching the site palette
var COLOR_BG = '#13100D';
var COLOR_TEXT = '#EFF0ED';
var COLOR_ACCENT = '#79B939';
var COLOR_AUTHOR = '#908F8A';
var COLOR_WATERMARK = '#7A7B75';

/* ------------------------------------------------------------------ */
/*  Word Wrapping                                                      */
/* ------------------------------------------------------------------ */

/**
 * Wraps text into lines of at most maxChars characters,
 * breaking on word boundaries.
 * @param {string} text
 * @param {number} maxChars
 * @returns {string[]}
 */
function wrapText(text, maxChars) {
  var words = text.split(' ');
  var lines = [];
  var current = '';

  for (var i = 0; i < words.length; i++) {
    var word = words[i];
    var test = current ? current + ' ' + word : word;
    if (test.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/* ------------------------------------------------------------------ */
/*  Easing helpers                                                     */
/* ------------------------------------------------------------------ */

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function clamp01(t) {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

/* ------------------------------------------------------------------ */
/*  createAnimatedCard                                                 */
/* ------------------------------------------------------------------ */

/**
 * Creates a canvas-based animated poem card.
 *
 * @param {string} text — the poem line
 * @param {string} authorName — display name of the author
 * @param {Object} [options]
 * @param {number} [options.width=1080]
 * @param {number} [options.height=1080]
 * @param {number} [options.duration=3000] — total animation time in ms
 * @returns {{ canvas: HTMLCanvasElement, play: () => void, stop: () => void, toBlob: () => Promise<Blob> }}
 */
export function createAnimatedCard(text, authorName, options) {
  var opts = options || {};
  var w = opts.width || CARD_W;
  var h = opts.height || CARD_H;
  var dur = opts.duration || DURATION;

  var canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  var ctx = canvas.getContext('2d');

  var lines = wrapText(text, MAX_CHARS_PER_LINE);
  var totalChars = lines.join('').length;
  var rafId = null;
  var startTime = 0;
  var playing = false;

  // Timeline thresholds (normalised 0-1)
  var T_FADE_END = 0.1;       // 0 - 0.3s
  var T_ACCENT_END = 0.1;     // accent sweeps during fade
  var T_TYPE_START = 0.1;     // 0.3s
  var T_TYPE_END = 0.667;     // 2.0s
  var T_AUTHOR_START = 0.667; // 2.0s
  var T_AUTHOR_END = 0.833;   // 2.5s
  var T_FOOTER_START = 0.833; // 2.5s
  var T_FOOTER_END = 1.0;     // 3.0s

  /**
   * Renders a single frame at progress t (0-1).
   */
  function renderFrame(t) {
    // --- Background fade in ---
    var bgAlpha = clamp01(t / T_FADE_END);
    ctx.clearRect(0, 0, w, h);
    ctx.globalAlpha = bgAlpha;

    // Gradient background
    var bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, COLOR_BG);
    bg.addColorStop(1, '#1C1916');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Subtle border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    ctx.strokeRect(30, 30, w - 60, h - 60);

    ctx.globalAlpha = 1;

    // --- Accent line sweep across top ---
    var accentProgress = clamp01(t / T_ACCENT_END);
    var accentEased = easeOutCubic(accentProgress);
    var lineY = 80;
    var lineStartX = w * 0.3;
    var lineFullW = w * 0.4;
    var lineEndX = lineStartX + lineFullW * accentEased;

    ctx.strokeStyle = COLOR_ACCENT;
    ctx.lineWidth = 3;
    ctx.globalAlpha = bgAlpha;
    ctx.beginPath();
    ctx.moveTo(lineStartX, lineY);
    ctx.lineTo(lineEndX, lineY);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // --- Opening quote mark (appears with bg) ---
    ctx.fillStyle = 'rgba(121, 185, 57, 0.12)';
    ctx.font = 'italic 200px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.globalAlpha = bgAlpha * 0.8;
    ctx.fillText('\u201C', w / 2, 380);
    ctx.globalAlpha = 1;

    // --- Typewriter text ---
    if (t >= T_TYPE_START) {
      var typeProgress = clamp01((t - T_TYPE_START) / (T_TYPE_END - T_TYPE_START));
      var charsToShow = Math.floor(typeProgress * totalChars);

      ctx.fillStyle = COLOR_TEXT;
      ctx.font = 'italic 42px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      var lineHeight = 60;
      var blockH = lines.length * lineHeight;
      var startY = h / 2 - blockH / 2 + lineHeight / 2;
      var charCount = 0;

      for (var i = 0; i < lines.length; i++) {
        var lineStr = lines[i];
        var lineCharsVisible = Math.min(lineStr.length, Math.max(0, charsToShow - charCount));
        var visibleText = lineStr.substring(0, lineCharsVisible);
        charCount += lineStr.length;

        if (visibleText) {
          ctx.fillText(visibleText, w / 2, startY + i * lineHeight);
        }
      }

      // Blinking cursor
      var cursorVisible = (Math.floor(t * 8) % 2 === 0) || typeProgress < 1;
      if (cursorVisible && typeProgress < 1) {
        // Find cursor position at end of currently visible text
        var cursorLineIdx = 0;
        var remaining = charsToShow;
        for (var j = 0; j < lines.length; j++) {
          if (remaining <= lines[j].length) {
            cursorLineIdx = j;
            break;
          }
          remaining -= lines[j].length;
          cursorLineIdx = j;
        }

        var partialLine = lines[cursorLineIdx].substring(0, remaining);
        var textW = ctx.measureText(partialLine).width;
        var fullLineW = ctx.measureText(lines[cursorLineIdx].substring(0, Math.min(remaining, lines[cursorLineIdx].length))).width;
        var cursorX = w / 2 + fullLineW / 2 + 4;
        var cursorY = startY + cursorLineIdx * lineHeight;

        ctx.fillStyle = COLOR_ACCENT;
        ctx.globalAlpha = 0.9;
        ctx.fillRect(cursorX, cursorY - 20, 2, 40);
        ctx.globalAlpha = 1;
      }
    }

    // --- Author name fade in ---
    if (t >= T_AUTHOR_START) {
      var authorProgress = clamp01((t - T_AUTHOR_START) / (T_AUTHOR_END - T_AUTHOR_START));
      var authorAlpha = easeOutCubic(authorProgress);

      var lineHeight2 = 60;
      var blockH2 = lines.length * lineHeight2;
      var authorY = h / 2 + blockH2 / 2 + 50;

      ctx.globalAlpha = authorAlpha;
      ctx.fillStyle = COLOR_AUTHOR;
      ctx.font = '24px "Nunito Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('\u2014 ' + authorName, w / 2, authorY);
      ctx.globalAlpha = 1;
    }

    // --- Footer watermark + CTA ---
    if (t >= T_FOOTER_START) {
      var footerProgress = clamp01((t - T_FOOTER_START) / (T_FOOTER_END - T_FOOTER_START));
      var footerAlpha = easeOutCubic(footerProgress);

      ctx.globalAlpha = footerAlpha;

      // Watermark
      ctx.fillStyle = COLOR_WATERMARK;
      ctx.font = '18px "Nunito Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('itsowol.com/poem', w / 2, h - 80);

      // CTA
      ctx.fillStyle = COLOR_ACCENT;
      ctx.font = '20px "Nunito Sans", sans-serif';
      ctx.fillText('Add your line \u2192', w / 2, h - 48);

      ctx.globalAlpha = 1;
    }
  }

  /**
   * Animation loop.
   */
  function tick(timestamp) {
    if (!playing) return;
    if (!startTime) startTime = timestamp;

    var elapsed = timestamp - startTime;
    var t = (elapsed % dur) / dur; // loop
    renderFrame(t);
    rafId = requestAnimationFrame(tick);
  }

  function play() {
    if (playing) return;
    playing = true;
    startTime = 0;
    rafId = requestAnimationFrame(tick);
  }

  function stop() {
    playing = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  /**
   * Renders the final frame and returns it as a PNG Blob.
   * @returns {Promise<Blob>}
   */
  function toBlob() {
    renderFrame(1);
    return new Promise(function (resolve) {
      canvas.toBlob(function (blob) {
        resolve(blob);
      }, 'image/png');
    });
  }

  // Render initial frame
  renderFrame(0);

  return { canvas: canvas, play: play, stop: stop, toBlob: toBlob };
}

/* ------------------------------------------------------------------ */
/*  recordAsVideo                                                      */
/* ------------------------------------------------------------------ */

/**
 * Records a canvas animation as a WebM video Blob.
 *
 * @param {HTMLCanvasElement} canvas — the animated canvas
 * @param {number} durationMs — how long to record (should match animation duration)
 * @returns {Promise<Blob>} — video/webm Blob
 */
export function recordAsVideo(canvas, durationMs) {
  return new Promise(function (resolve, reject) {
    var stream = canvas.captureStream(FPS);
    var mimeType = 'video/webm;codecs=vp9';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm;codecs=vp8';
    }
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
    }

    var recorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType: mimeType });
    } catch (e) {
      reject(new Error('MediaRecorder not supported: ' + e.message));
      return;
    }

    var chunks = [];

    recorder.ondataavailable = function (e) {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    recorder.onstop = function () {
      var blob = new Blob(chunks, { type: mimeType });
      resolve(blob);
    };

    recorder.onerror = function (e) {
      reject(e.error || new Error('Recording failed'));
    };

    recorder.start();

    setTimeout(function () {
      if (recorder.state === 'recording') {
        recorder.stop();
      }
    }, durationMs + 100); // small buffer to capture final frames
  });
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Downloads a Blob as a file.
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
 * Brief toast notification.
 */
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

/* ------------------------------------------------------------------ */
/*  showAnimatedShareModal                                             */
/* ------------------------------------------------------------------ */

/**
 * Creates a fullscreen modal with live animated card preview and share options.
 *
 * @param {string} lineText — the poem line to animate
 * @param {string} authorName — author display name
 */
export function showAnimatedShareModal(lineText, authorName) {
  // Remove any existing modal
  var existing = document.getElementById('animated-share-modal');
  if (existing) existing.remove();

  var card = createAnimatedCard(lineText, authorName);

  // --- Build modal DOM ---
  var overlay = document.createElement('div');
  overlay.id = 'animated-share-modal';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Animated share card');
  overlay.style.cssText = [
    'position:fixed',
    'inset:0',
    'z-index:10000',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'background:rgba(0,0,0,0.85)',
    'backdrop-filter:blur(8px)',
    'padding:24px',
    'opacity:0',
    'transition:opacity 0.3s ease',
  ].join(';');

  var modal = document.createElement('div');
  modal.style.cssText = [
    'display:flex',
    'flex-direction:column',
    'align-items:center',
    'gap:20px',
    'max-width:560px',
    'width:100%',
  ].join(';');

  // Preview canvas — scale to fit
  card.canvas.style.cssText = [
    'width:100%',
    'max-width:480px',
    'height:auto',
    'border-radius:12px',
    'box-shadow:0 8px 40px rgba(0,0,0,0.5)',
  ].join(';');

  modal.appendChild(card.canvas);

  // Buttons row
  var btnRow = document.createElement('div');
  btnRow.style.cssText = [
    'display:flex',
    'gap:12px',
    'flex-wrap:wrap',
    'justify-content:center',
  ].join(';');

  var btnStyle = [
    'padding:10px 20px',
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

  // Share as Video button
  var videoBtn = document.createElement('button');
  videoBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg> Share as Video';
  videoBtn.style.cssText = btnStyle;
  videoBtn.addEventListener('mouseenter', function () { this.style.background = 'rgba(255,255,255,0.12)'; });
  videoBtn.addEventListener('mouseleave', function () { this.style.background = 'rgba(255,255,255,0.06)'; });

  // Share as Image button
  var imageBtn = document.createElement('button');
  imageBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> Share as Image';
  imageBtn.style.cssText = btnStyle;
  imageBtn.addEventListener('mouseenter', function () { this.style.background = 'rgba(255,255,255,0.12)'; });
  imageBtn.addEventListener('mouseleave', function () { this.style.background = 'rgba(255,255,255,0.06)'; });

  // Copy Link button
  var copyBtn = document.createElement('button');
  copyBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> Copy Link';
  copyBtn.style.cssText = btnStyle;
  copyBtn.addEventListener('mouseenter', function () { this.style.background = 'rgba(255,255,255,0.12)'; });
  copyBtn.addEventListener('mouseleave', function () { this.style.background = 'rgba(255,255,255,0.06)'; });

  btnRow.appendChild(videoBtn);
  btnRow.appendChild(imageBtn);
  btnRow.appendChild(copyBtn);
  modal.appendChild(btnRow);

  // Close button
  var closeBtn = document.createElement('button');
  closeBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.style.cssText = [
    'position:absolute',
    'top:16px',
    'right:16px',
    'background:none',
    'border:none',
    'color:#EFF0ED',
    'cursor:pointer',
    'padding:8px',
    'opacity:0.6',
    'transition:opacity 0.2s',
  ].join(';');
  closeBtn.addEventListener('mouseenter', function () { this.style.opacity = '1'; });
  closeBtn.addEventListener('mouseleave', function () { this.style.opacity = '0.6'; });

  overlay.appendChild(modal);
  overlay.appendChild(closeBtn);
  document.body.appendChild(overlay);

  // Fade in
  requestAnimationFrame(function () {
    overlay.style.opacity = '1';
  });

  // Start animation loop
  card.play();

  // --- Close logic ---
  function closeModal() {
    card.stop();
    overlay.style.opacity = '0';
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

  // Share as Video
  videoBtn.addEventListener('click', async function () {
    videoBtn.textContent = 'Recording...';
    videoBtn.disabled = true;

    try {
      // Create a fresh card to record one clean pass
      var recCard = createAnimatedCard(lineText, authorName);
      recCard.play();
      var videoBlob = await recordAsVideo(recCard.canvas, DURATION);
      recCard.stop();

      var file = new File([videoBlob], 'poem-animated.webm', { type: 'video/webm' });

      // Try Web Share API
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: 'Relentlessly Human',
            text: '\u201C' + lineText + '\u201D \u2014 ' + authorName,
            files: [file],
          });
          videoBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg> Share as Video';
          videoBtn.disabled = false;
          return;
        } catch (e) {
          if (e.name === 'AbortError') {
            videoBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg> Share as Video';
            videoBtn.disabled = false;
            return;
          }
        }
      }

      // Fallback: download
      downloadBlob(videoBlob, 'poem-animated.webm');
      showToast('Video downloaded');
    } catch (e) {
      showToast('Video recording not supported in this browser');
    }

    videoBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg> Share as Video';
    videoBtn.disabled = false;
  });

  // Share as Image (final frame)
  imageBtn.addEventListener('click', async function () {
    var blob = await card.toBlob();
    var file = new File([blob], 'poem-card.png', { type: 'image/png' });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: 'Relentlessly Human',
          text: '\u201C' + lineText + '\u201D \u2014 ' + authorName,
          files: [file],
        });
        // Restart animation after capture
        card.play();
        return;
      } catch (e) {
        if (e.name === 'AbortError') {
          card.play();
          return;
        }
      }
    }

    // Fallback: download
    downloadBlob(blob, 'poem-card.png');
    showToast('Image downloaded');
    // Restart animation after capture
    card.play();
  });

  // Copy Link
  copyBtn.addEventListener('click', async function () {
    var url = window.location.origin + '/poem';
    try {
      await navigator.clipboard.writeText(url);
      showToast('Link copied');
    } catch (e) {
      var ta = document.createElement('textarea');
      ta.value = url;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('Link copied');
    }
  });
}
