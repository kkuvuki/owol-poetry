/**
 * Contributor Streaks & Milestones
 * Tracks contributor activity streaks and achievement milestones.
 */

const MILESTONES = [
  { type: 'lines', threshold: 1, badge: 'First Voice', description: 'You spoke into the void', emoji: '\u2728' },
  { type: 'lines', threshold: 5, badge: 'Recurring Whisper', description: 'Your voice echoes', emoji: '\uD83C\uDF2C\uFE0F' },
  { type: 'lines', threshold: 10, badge: 'Devoted Pen', description: 'The poem knows your hand', emoji: '\uD83D\uDD8A\uFE0F' },
  { type: 'lines', threshold: 25, badge: 'Poet Laureate', description: 'A pillar of this poem', emoji: '\uD83C\uDFC6' },
  { type: 'lines', threshold: 50, badge: 'Living Legend', description: 'The poem would be different without you', emoji: '\uD83C\uDF1F' },
  { type: 'streak', threshold: 3, badge: 'On a Roll', description: 'Three days, three breaths', emoji: '\uD83C\uDFB2' },
  { type: 'streak', threshold: 7, badge: 'Weekly Ritual', description: 'Poetry is your practice', emoji: '\uD83D\uDD2E' },
  { type: 'streak', threshold: 30, badge: 'Relentlessly Human', description: 'You embody the poem\'s name', emoji: '\uD83D\uDC96' },
];

/**
 * Simple hash of author name for localStorage key.
 */
function hashAuthor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  return 'streak_' + Math.abs(hash).toString(36);
}

/**
 * Parse a date from a line object. Expects line.date or line.timestamp as
 * ISO string or Date. Returns a Date normalised to midnight UTC.
 */
function parseDateFromLine(line) {
  const raw = line.date || line.timestamp || line.created_at;
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d)) return null;
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

/**
 * Detect language from a line's text using simple heuristics.
 */
function detectLanguage(text) {
  if (!text || typeof text !== 'string') return null;
  const t = text.trim().toLowerCase();

  // Very lightweight detection — extendable later
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(t)) return 'Japanese';
  if (/[\u4E00-\u9FFF]/.test(t)) return 'Chinese';
  if (/[\uAC00-\uD7AF]/.test(t)) return 'Korean';
  if (/[\u0600-\u06FF]/.test(t)) return 'Arabic';
  if (/[\u0900-\u097F]/.test(t)) return 'Hindi';
  if (/[\u00C0-\u00FF]/.test(t) && /\b(le|la|les|de|du|des|un|une|et|est|avec)\b/.test(t)) return 'French';
  if (/\b(el|la|los|las|de|del|un|una|y|es|con|por)\b/.test(t)) return 'Spanish';
  if (/\b(der|die|das|und|ist|mit|ein|eine)\b/.test(t)) return 'German';
  return 'English';
}

/**
 * Count words in a text string.
 */
function countWords(text) {
  if (!text || typeof text !== 'string') return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Calculate consecutive-day streak ending at the latest contribution.
 * `sortedDates` must be an array of Date objects sorted ascending (midnight UTC).
 */
function calculateStreak(sortedDates) {
  if (sortedDates.length === 0) return { current: 0, longest: 0 };

  // Deduplicate by day
  const days = [];
  let prev = null;
  for (const d of sortedDates) {
    const key = d.getTime();
    if (prev !== key) {
      days.push(key);
      prev = key;
    }
  }

  const ONE_DAY = 86400000;
  let longest = 1;
  let current = 1;

  for (let i = 1; i < days.length; i++) {
    const diff = days[i] - days[i - 1];
    if (diff === ONE_DAY) {
      current++;
      if (current > longest) longest = current;
    } else if (diff > ONE_DAY) {
      current = 1;
    }
    // diff === 0 handled by dedup above
  }

  return { current, longest };
}

/**
 * Load persisted streak data from localStorage.
 */
function loadStoredStreak(authorName) {
  if (typeof localStorage === 'undefined') return null;
  try {
    const key = hashAuthor(authorName);
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Persist streak data to localStorage.
 */
function saveStreak(authorName, stats) {
  if (typeof localStorage === 'undefined') return;
  try {
    const key = hashAuthor(authorName);
    localStorage.setItem(key, JSON.stringify({
      totalLines: stats.totalLines,
      streakDays: stats.streakDays,
      longestStreak: stats.longestStreak,
      latestContribution: stats.latestContribution,
      earnedMilestones: checkMilestones(stats).map(m => m.badge),
    }));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

// ─── Exported Functions ──────────────────────────────────────────────

/**
 * Analyze a contributor's lines and return stats.
 * @param {string} authorName
 * @param {Array<{text: string, date?: string, timestamp?: string}>} lines
 * @returns {object} stats
 */
export function getContributorStats(authorName, lines) {
  if (!lines || lines.length === 0) {
    return {
      totalLines: 0,
      firstContribution: null,
      latestContribution: null,
      streakDays: 0,
      longestStreak: 0,
      avgWordsPerLine: 0,
      languages: [],
    };
  }

  const dates = [];
  const languageSet = new Set();
  let totalWords = 0;

  for (const line of lines) {
    const d = parseDateFromLine(line);
    if (d) dates.push(d);

    const text = line.text || line.content || '';
    totalWords += countWords(text);

    const lang = detectLanguage(text);
    if (lang) languageSet.add(lang);
  }

  dates.sort((a, b) => a - b);

  const { current, longest } = calculateStreak(dates);

  const stats = {
    totalLines: lines.length,
    firstContribution: dates.length ? dates[0].toISOString() : null,
    latestContribution: dates.length ? dates[dates.length - 1].toISOString() : null,
    streakDays: current,
    longestStreak: longest,
    avgWordsPerLine: lines.length ? Math.round((totalWords / lines.length) * 10) / 10 : 0,
    languages: [...languageSet],
  };

  // Persist to localStorage
  saveStreak(authorName, stats);

  return stats;
}

/**
 * Return an array of earned milestone objects for the given stats.
 */
export function checkMilestones(stats) {
  const earned = [];
  for (const m of MILESTONES) {
    if (m.type === 'lines' && stats.totalLines >= m.threshold) {
      earned.push({ ...m });
    }
    if (m.type === 'streak' && stats.streakDays >= m.threshold) {
      earned.push({ ...m });
    }
  }
  return earned;
}

/**
 * Return an HTML string for a small inline streak indicator.
 * Only renders if streak >= 2.
 */
export function renderStreakBadge(stats) {
  if (!stats || stats.streakDays < 2) return '';
  return `<span class="streak-badge" aria-label="${stats.streakDays}-day streak">\uD83D\uDD25 ${stats.streakDays}</span>`;
}

/**
 * Return an HTML string for a celebration toast notification.
 */
export function renderMilestoneToast(milestone) {
  if (!milestone) return '';
  return `<div class="milestone-toast" role="alert" aria-live="polite">
  <span class="milestone-toast__emoji">${milestone.emoji}</span>
  <div class="milestone-toast__body">
    <strong class="milestone-toast__title">${milestone.badge}</strong>
    <p class="milestone-toast__desc">${milestone.description}</p>
  </div>
</div>
<style>
  .milestone-toast {
    position: fixed;
    top: 1.5rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.85rem 1.5rem;
    background: rgba(15, 23, 42, 0.92);
    border: 1px solid rgba(74, 222, 128, 0.4);
    border-radius: 0.75rem;
    box-shadow: 0 0 24px rgba(74, 222, 128, 0.25), 0 4px 12px rgba(0, 0, 0, 0.3);
    color: #f1f5f9;
    font-family: inherit;
    z-index: 9999;
    animation: milestoneGlow 2s ease-in-out infinite, milestoneSlideIn 0.4s ease-out;
    pointer-events: none;
  }

  .milestone-toast__emoji {
    font-size: 1.6rem;
    line-height: 1;
  }

  .milestone-toast__title {
    display: block;
    font-size: 0.95rem;
    color: #4ade80;
  }

  .milestone-toast__desc {
    margin: 0.15rem 0 0;
    font-size: 0.8rem;
    color: #94a3b8;
  }

  .milestone-toast--dismissing {
    animation: milestoneFadeOut 0.5s ease-in forwards;
  }

  @keyframes milestoneGlow {
    0%, 100% { box-shadow: 0 0 24px rgba(74, 222, 128, 0.25), 0 4px 12px rgba(0, 0, 0, 0.3); }
    50% { box-shadow: 0 0 32px rgba(74, 222, 128, 0.45), 0 4px 16px rgba(0, 0, 0, 0.3); }
  }

  @keyframes milestoneSlideIn {
    from { opacity: 0; transform: translateX(-50%) translateY(-1rem); }
    to { opacity: 1; transform: translateX(-50%) translateY(0); }
  }

  @keyframes milestoneFadeOut {
    from { opacity: 1; transform: translateX(-50%) translateY(0); }
    to { opacity: 0; transform: translateX(-50%) translateY(-1rem); }
  }
</style>`;
}

/**
 * Show a brief celebration animation for a milestone.
 * Inserts a toast into the given container (or document.body) and
 * auto-dismisses after 5 seconds.
 */
export function showMilestoneAnimation(milestone, container) {
  if (!milestone) return;

  const target = container || document.body;
  const wrapper = document.createElement('div');
  wrapper.innerHTML = renderMilestoneToast(milestone);

  // Move the <style> and toast element into the DOM
  const nodes = Array.from(wrapper.children);
  nodes.forEach(node => target.appendChild(node));

  const toast = target.querySelector('.milestone-toast:last-of-type');
  if (!toast) return;

  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    toast.classList.add('milestone-toast--dismissing');
    toast.addEventListener('animationend', () => {
      // Remove toast and its associated <style> tag
      nodes.forEach(node => {
        if (node.parentNode) node.parentNode.removeChild(node);
      });
    }, { once: true });
  }, 5000);
}
