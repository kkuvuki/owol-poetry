/**
 * Milestone Moments — Celebrates special line numbers
 *
 * When a user submits a line that hits a milestone number (#10, #50, #100, #500, #1000, etc.),
 * they get a special celebration with confetti, a unique share card, and bragging rights.
 */

var MILESTONES = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

/**
 * Check if a line count is a milestone number
 */
export function isMilestone(count) {
  return MILESTONES.indexOf(count) !== -1;
}

/**
 * Get the milestone label for a count
 */
export function getMilestoneLabel(count) {
  var labels = {
    10: 'First Ten',
    25: 'Silver Thread',
    50: 'Half Century',
    100: 'The Centennial Line',
    250: 'A Quarter Thousand',
    500: 'Five Hundred Voices',
    1000: 'The Thousandth Whisper',
    2500: 'Epic',
    5000: 'Legendary',
    10000: 'Eternal',
  };
  return labels[count] || 'Milestone #' + count;
}

/**
 * Launch confetti effect (CSS-based, no library needed)
 */
export function launchConfetti(container) {
  var colors = ['#79B939', '#8AC44F', '#D4A574', '#EFF0ED', '#B94EC8'];
  var confettiCount = 60;
  var wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:99999;overflow:hidden;';

  for (var i = 0; i < confettiCount; i++) {
    var piece = document.createElement('div');
    var color = colors[Math.floor(Math.random() * colors.length)];
    var left = Math.random() * 100;
    var delay = Math.random() * 0.5;
    var duration = 2 + Math.random() * 2;
    var size = 4 + Math.random() * 8;
    var rotation = Math.random() * 360;

    piece.style.cssText = [
      'position:absolute',
      'top:-20px',
      'left:' + left + '%',
      'width:' + size + 'px',
      'height:' + (size * 0.6) + 'px',
      'background:' + color,
      'border-radius:2px',
      'transform:rotate(' + rotation + 'deg)',
      'animation:confetti-fall ' + duration + 's ' + delay + 's ease-in forwards',
    ].join(';');

    wrapper.appendChild(piece);
  }

  // Add keyframes if not already present
  if (!document.getElementById('confetti-keyframes')) {
    var style = document.createElement('style');
    style.id = 'confetti-keyframes';
    style.textContent = '@keyframes confetti-fall{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(100vh) rotate(720deg);opacity:0}}';
    document.head.appendChild(style);
  }

  (container || document.body).appendChild(wrapper);
  setTimeout(function () { wrapper.remove(); }, 5000);
}

/**
 * Show milestone celebration modal
 */
export function showMilestoneCelebration(lineCount, lineText, authorName) {
  if (!isMilestone(lineCount)) return;

  var label = getMilestoneLabel(lineCount);

  // Launch confetti
  launchConfetti();

  // Create celebration overlay
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(19,16,13,0.92);z-index:9998;display:flex;align-items:center;justify-content:center;animation:fadeIn 0.5s ease;';

  var card = document.createElement('div');
  card.style.cssText = 'text-align:center;max-width:480px;padding:48px 32px;animation:scaleIn 0.6s cubic-bezier(0.16,1,0.3,1);';

  card.innerHTML = [
    '<div style="font-size:48px;margin-bottom:16px;">&#127881;</div>',
    '<div style="color:#79B939;font-size:12px;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px;">MILESTONE</div>',
    '<h2 style="color:#EFF0ED;font-family:Playfair Display,Georgia,serif;font-size:32px;margin:0 0 8px;">' + label + '</h2>',
    '<p style="color:#A6A5A0;font-size:14px;margin:0 0 24px;">Line #' + lineCount + ' of the poem</p>',
    '<p style="color:#EFF0ED;font-style:italic;font-family:Lora,Georgia,serif;font-size:20px;margin:0 0 8px;">&ldquo;' + escHtml(lineText) + '&rdquo;</p>',
    '<p style="color:#79B939;font-size:14px;margin:0 0 32px;">&mdash; ' + escHtml(authorName) + '</p>',
    '<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">',
    '  <button id="milestone-share" style="padding:10px 24px;background:#79B939;color:#13100D;border:none;border-radius:100px;font-weight:600;cursor:pointer;font-size:14px;">Share this moment</button>',
    '  <button id="milestone-close" style="padding:10px 24px;background:none;border:1px solid rgba(255,255,255,0.1);color:#A6A5A0;border-radius:100px;cursor:pointer;font-size:14px;">Close</button>',
    '</div>',
  ].join('');

  overlay.appendChild(card);

  // Add animations
  if (!document.getElementById('milestone-keyframes')) {
    var style = document.createElement('style');
    style.id = 'milestone-keyframes';
    style.textContent = '@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes scaleIn{from{opacity:0;transform:scale(0.9)}to{opacity:1;transform:scale(1)}}';
    document.head.appendChild(style);
  }

  document.body.appendChild(overlay);

  // Close handler
  overlay.querySelector('#milestone-close').addEventListener('click', function () {
    overlay.style.animation = 'fadeIn 0.3s ease reverse forwards';
    setTimeout(function () { overlay.remove(); }, 300);
  });

  // Share handler
  overlay.querySelector('#milestone-share').addEventListener('click', function () {
    var shareText = 'I wrote line #' + lineCount + ' of Relentlessly Human — "' + lineText + '"\n\nA collaborative poem, written by strangers, for strangers.\n\nAdd your line: itsowol.com/poem';
    if (navigator.share) {
      navigator.share({ title: label + ' — Relentlessly Human', text: shareText, url: 'https://itsowol.com/poem' });
    } else {
      navigator.clipboard.writeText(shareText).then(function () {
        var btn = overlay.querySelector('#milestone-share');
        btn.textContent = 'Copied!';
        setTimeout(function () { btn.textContent = 'Share this moment'; }, 2000);
      });
    }
  });

  // Auto-close after 15 seconds
  setTimeout(function () {
    if (overlay.parentNode) {
      overlay.style.animation = 'fadeIn 0.3s ease reverse forwards';
      setTimeout(function () { overlay.remove(); }, 300);
    }
  }, 15000);
}

function escHtml(s) {
  var div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
