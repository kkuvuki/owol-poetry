/**
 * Mood/Sentiment Heatmap Module
 *
 * Analyzes poem lines for emotional sentiment and renders a visual
 * heatmap strip showing the poem's emotional journey.
 */

const POSITIVE_WORDS = new Set([
  'love', 'light', 'hope', 'dream', 'beauty', 'joy', 'warm', 'bright',
  'sun', 'smile', 'laugh', 'dance', 'sing', 'bloom', 'gentle', 'kind',
  'peace', 'wonder', 'magic', 'free', 'soar', 'rise', 'grace', 'tender',
  'sweet', 'bliss', 'glow',
]);

const NEGATIVE_WORDS = new Set([
  'dark', 'pain', 'loss', 'shadow', 'cold', 'fear', 'grief', 'alone',
  'broken', 'tears', 'fade', 'fall', 'hollow', 'empty', 'silent', 'drown',
  'bleed', 'ache', 'sorrow', 'mourn', 'weep', 'lost', 'wither', 'numb',
  'heavy', 'shatter',
]);

const MOOD_THRESHOLDS = [
  { min: 0.4, label: 'Radiant', color: '#D4A574' },
  { min: 0.15, label: 'Hopeful', color: '#79B939' },
  { min: -0.15, label: 'Contemplative', color: '#908F8A' },
  { min: -0.4, label: 'Melancholy', color: '#6B8BA4' },
  { min: -Infinity, label: 'Anguished', color: '#8B5E8B' },
];

/**
 * Classify a score into a mood label and color.
 */
function classifyMood(score) {
  for (const threshold of MOOD_THRESHOLDS) {
    if (score >= threshold.min) {
      return { label: threshold.label, color: threshold.color };
    }
  }
  // Fallback (should never reach here)
  return { label: 'Contemplative', color: '#908F8A' };
}

/**
 * Analyze the sentiment of a text string.
 * Returns { score: number (-1 to 1), mood: string, color: string }
 */
export function analyzeSentiment(text) {
  const words = text
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 0);

  if (words.length === 0) {
    const { label, color } = classifyMood(0);
    return { score: 0, mood: label, color };
  }

  let totalScore = 0;
  let scoredCount = 0;

  for (const word of words) {
    if (POSITIVE_WORDS.has(word)) {
      totalScore += 0.3;
      scoredCount++;
    } else if (NEGATIVE_WORDS.has(word)) {
      totalScore -= 0.3;
      scoredCount++;
    }
  }

  // Average over all words (not just scored ones) to dilute sentiment
  // in longer lines with fewer emotional words
  const raw = totalScore / words.length;
  const score = Math.max(-1, Math.min(1, raw));
  const { label, color } = classifyMood(score);

  return { score, mood: label, color };
}

/**
 * Generate mood data for an array of poem lines.
 * Returns array of { lineId, score, mood, color }
 */
export function generateMoodData(lines) {
  return lines.map((line, index) => {
    const { score, mood, color } = analyzeSentiment(line);
    return { lineId: index, score, mood, color };
  });
}

/**
 * Render a horizontal heatmap strip into a container element.
 * Each line gets a colored segment; hovering shows a tooltip.
 */
export function renderMoodStrip(container, moodData) {
  if (!container || !moodData || moodData.length === 0) return;

  // Clear existing content
  container.innerHTML = '';

  // --- Build the gradient strip ---
  const strip = document.createElement('div');
  strip.className = 'mood-strip';

  // Build CSS linear-gradient with smooth transitions
  const stops = [];
  moodData.forEach((entry, i) => {
    const pctStart = (i / moodData.length) * 100;
    const pctEnd = ((i + 1) / moodData.length) * 100;
    stops.push(`${entry.color} ${pctStart}%`);
    stops.push(`${entry.color} ${pctEnd}%`);
  });

  Object.assign(strip.style, {
    width: '100%',
    height: '32px',
    borderRadius: '6px',
    background: `linear-gradient(to right, ${stops.join(', ')})`,
    position: 'relative',
    cursor: 'crosshair',
    overflow: 'visible',
  });

  // --- Tooltip element ---
  const tooltip = document.createElement('div');
  tooltip.className = 'mood-tooltip';
  Object.assign(tooltip.style, {
    position: 'absolute',
    bottom: '110%',
    left: '0',
    transform: 'translateX(-50%)',
    background: 'rgba(20, 20, 20, 0.92)',
    color: '#f0f0f0',
    padding: '6px 10px',
    borderRadius: '6px',
    fontSize: '0.78rem',
    lineHeight: '1.4',
    whiteSpace: 'nowrap',
    maxWidth: '300px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    pointerEvents: 'none',
    opacity: '0',
    transition: 'opacity 0.15s ease',
    zIndex: '10',
  });
  strip.appendChild(tooltip);

  // --- Hover interaction ---
  strip.addEventListener('mousemove', (e) => {
    const rect = strip.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    const idx = Math.min(
      Math.floor(pct * moodData.length),
      moodData.length - 1
    );
    const entry = moodData[idx];

    // Retrieve the original line text if available (stored on container)
    const lines = container._poemLines || [];
    const lineText =
      lines[idx] !== undefined
        ? lines[idx].length > 60
          ? lines[idx].slice(0, 57) + '...'
          : lines[idx]
        : `Line ${idx + 1}`;

    tooltip.textContent = `${lineText} — ${entry.mood}`;
    tooltip.style.left = `${x}px`;
    tooltip.style.opacity = '1';
  });

  strip.addEventListener('mouseleave', () => {
    tooltip.style.opacity = '0';
  });

  container.appendChild(strip);

  // --- Summary line below the strip ---
  const summary = getMoodSummary(moodData);
  const summaryEl = document.createElement('p');
  summaryEl.className = 'mood-summary';
  Object.assign(summaryEl.style, {
    marginTop: '8px',
    fontSize: '0.85rem',
    color: '#908F8A',
    lineHeight: '1.5',
  });

  const breakdownParts = Object.entries(summary.breakdown)
    .sort((a, b) => b[1] - a[1])
    .map(([mood, pct]) => `${mood} ${pct}%`);

  summaryEl.innerHTML =
    `This poem feels mostly <strong style="color:${summary.dominantColor}">${summary.dominant}</strong>` +
    ` <span style="opacity:0.7">(${breakdownParts.join(', ')})</span>`;

  container.appendChild(summaryEl);
}

/**
 * Get overall mood statistics for a poem.
 * Returns { dominant, dominantColor, averageScore, breakdown }
 * where breakdown is { [moodLabel]: percentage }
 */
export function getMoodSummary(moodData) {
  if (!moodData || moodData.length === 0) {
    return {
      dominant: 'Contemplative',
      dominantColor: '#908F8A',
      averageScore: 0,
      breakdown: { Contemplative: 100 },
    };
  }

  const totalScore = moodData.reduce((sum, d) => sum + d.score, 0);
  const averageScore = totalScore / moodData.length;

  // Count occurrences of each mood
  const counts = {};
  for (const entry of moodData) {
    counts[entry.mood] = (counts[entry.mood] || 0) + 1;
  }

  // Build percentage breakdown
  const breakdown = {};
  for (const [mood, count] of Object.entries(counts)) {
    breakdown[mood] = Math.round((count / moodData.length) * 100);
  }

  // Find dominant mood (most frequent)
  let dominant = 'Contemplative';
  let maxCount = 0;
  for (const [mood, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      dominant = mood;
    }
  }

  const dominantColor =
    MOOD_THRESHOLDS.find((t) => t.label === dominant)?.color || '#908F8A';

  return { dominant, dominantColor, averageScore, breakdown };
}
