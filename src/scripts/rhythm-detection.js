/**
 * rhythm-detection.js
 * Analyzes poem lines for rhythmic patterns and provides
 * gentle guidance to contributors.
 */

// --- Vowel pattern used throughout ---
const VOWELS = 'aeiouy';

/**
 * Estimates syllable count for a single word.
 *
 * Algorithm:
 *  1. Count vowel groups (y counts except when leading)
 *  2. Subtract silent-e at end
 *  3. Handle -tion, -sion (1 syllable), -ed (sometimes silent)
 *  4. Minimum 1
 */
export function getSyllableCount(word) {
  if (!word || typeof word !== 'string') return 0;

  let w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length === 0) return 0;

  // Treat y as vowel only when not leading
  const vowelAt = (ch, idx) =>
    ch === 'y' ? idx > 0 : 'aeiou'.includes(ch);

  let count = 0;
  let prevVowel = false;

  for (let i = 0; i < w.length; i++) {
    const isV = vowelAt(w[i], i);
    if (isV && !prevVowel) count++;
    prevVowel = isV;
  }

  // Silent e at end (but not words like "the", "be")
  if (w.length > 2 && w.endsWith('e') && !w.endsWith('le')) {
    const beforeE = w[w.length - 2];
    if (!'aeiou'.includes(beforeE)) {
      count--;
    }
  }

  // -tion, -sion collapse to 1 syllable (already counted as 2 vowel groups)
  if (/[ts]ion$/.test(w)) {
    count--;
  }

  // Silent -ed: if preceded by t or d, -ed is voiced; otherwise silent
  if (w.endsWith('ed') && w.length > 3) {
    const before = w[w.length - 3];
    if (before !== 't' && before !== 'd') {
      count--;
    }
  }

  return Math.max(1, count);
}

/**
 * Returns a simplified stress pattern for a word.
 *
 * Uses heuristics:
 *  - 1-syllable → 'S' (stressed)
 *  - 2-syllable → 'Su' (stress first) by default
 *  - Words ending -tion/-sion/-ic → stress penultimate
 *  - Otherwise alternate starting unstressed
 *
 * Returns string of 'S' (stressed) and 'u' (unstressed).
 */
function wordStress(word) {
  const n = getSyllableCount(word);
  if (n <= 0) return '';
  if (n === 1) return 'S';

  const w = word.toLowerCase().replace(/[^a-z]/g, '');

  // Stress on penultimate for -tion, -sion, -ic
  if (/(?:[ts]ion|ic)$/.test(w)) {
    const pattern = Array(n).fill('u');
    pattern[n - 2] = 'S';
    return pattern.join('');
  }

  // Two-syllable words: stress first
  if (n === 2) return 'Su';

  // Default: alternate starting unstressed (uS uS uS …)
  return Array.from({ length: n }, (_, i) => (i % 2 === 0 ? 'u' : 'S')).join('');
}

/**
 * Identifies common meters from a stress pattern string.
 *
 * Recognized feet:
 *  - iambic:    uS
 *  - trochaic:  Su
 *  - anapestic: uuS
 *  - dactylic:  Suu
 *  - spondaic:  SS
 *
 * Returns { name, feet, confidence } where confidence is 0-1.
 */
export function detectMeter(stressPattern) {
  if (!stressPattern || stressPattern.length < 2) {
    return { name: 'free verse', feet: 0, confidence: 0 };
  }

  const patterns = [
    { name: 'iambic', foot: 'uS' },
    { name: 'trochaic', foot: 'Su' },
    { name: 'anapestic', foot: 'uuS' },
    { name: 'dactylic', foot: 'Suu' },
    { name: 'spondaic', foot: 'SS' },
  ];

  let best = { name: 'free verse', feet: 0, confidence: 0 };

  for (const { name, foot } of patterns) {
    const footLen = foot.length;
    const totalFeet = Math.floor(stressPattern.length / footLen);
    if (totalFeet === 0) continue;

    let matched = 0;
    for (let i = 0; i < totalFeet; i++) {
      const slice = stressPattern.slice(i * footLen, (i + 1) * footLen);
      if (slice === foot) matched++;
    }

    const confidence = matched / totalFeet;
    if (confidence > best.confidence) {
      best = { name, feet: totalFeet, confidence };
    }
  }

  // Add line-length names
  if (best.confidence >= 0.5 && best.feet > 0) {
    const lengthNames = {
      1: 'monometer',
      2: 'dimeter',
      3: 'trimeter',
      4: 'tetrameter',
      5: 'pentameter',
      6: 'hexameter',
      7: 'heptameter',
    };
    const ln = lengthNames[best.feet];
    if (ln) {
      best.name = `${best.name} ${ln}`;
    }
  }

  return best;
}

/**
 * Extracts the last vowel+consonant cluster from a word
 * for approximate rhyme matching.
 *
 * "night" → "ight", "singing" → "ing", "day" → "ay"
 */
export function getRhymeSound(word) {
  if (!word || typeof word !== 'string') return '';

  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length === 0) return '';

  // Find last vowel position
  let lastVowelStart = -1;
  for (let i = w.length - 1; i >= 0; i--) {
    if ('aeiouy'.includes(w[i])) {
      lastVowelStart = i;
      // Walk back through contiguous vowels
      while (lastVowelStart > 0 && 'aeiouy'.includes(w[lastVowelStart - 1])) {
        lastVowelStart--;
      }
      break;
    }
  }

  if (lastVowelStart === -1) return w.slice(-2) || w;

  return w.slice(lastVowelStart);
}

/**
 * Full-line rhythm analysis.
 *
 * @param {string} text — a single line of poetry
 * @returns {{ syllables: number, stress: string, meter: object, rhymeEnd: string, suggestions: string[] }}
 */
export function analyzeRhythm(text) {
  if (!text || typeof text !== 'string') {
    return {
      syllables: 0,
      stress: '',
      meter: { name: 'free verse', feet: 0, confidence: 0 },
      rhymeEnd: '',
      suggestions: [],
    };
  }

  const words = text.replace(/[^a-zA-Z\s'-]/g, '').split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return {
      syllables: 0,
      stress: '',
      meter: { name: 'free verse', feet: 0, confidence: 0 },
      rhymeEnd: '',
      suggestions: [],
    };
  }

  let totalSyllables = 0;
  let stressPattern = '';

  for (const w of words) {
    totalSyllables += getSyllableCount(w);
    stressPattern += wordStress(w);
  }

  const meter = detectMeter(stressPattern);
  const lastWord = words[words.length - 1];
  const rhymeEnd = getRhymeSound(lastWord);

  const suggestions = [];

  if (meter.confidence < 0.4 && totalSyllables > 4) {
    suggestions.push(
      'This line dances freely — if you want a steadier pulse, try evening out the stressed and unstressed beats.'
    );
  }

  if (totalSyllables > 14) {
    suggestions.push(
      'A long breath — consider splitting this into two lines so each can breathe.'
    );
  }

  if (totalSyllables < 3 && totalSyllables > 0) {
    suggestions.push(
      'Short and sharp. Beautiful if intentional — make sure it carries the weight you want.'
    );
  }

  return {
    syllables: totalSyllables,
    stress: stressPattern,
    meter,
    rhymeEnd,
    suggestions,
  };
}

/**
 * Provides gentle writing guidance based on recent lines and a current draft.
 *
 * Looks at the last 3 lines to detect emerging patterns, then nudges
 * (never dictates) the writer toward rhythmic cohesion.
 *
 * @param {string[]} recentLines — the last few completed lines
 * @param {string} currentDraft — what the writer is composing now
 * @returns {{ hint: string, meterSuggestion: string|null, rhymeSuggestion: string|null }}
 */
export function getWritingHint(recentLines = [], currentDraft = '') {
  const result = {
    hint: 'Write what feels true — the rhythm will follow.',
    meterSuggestion: null,
    rhymeSuggestion: null,
  };

  // Analyze the last 3 lines
  const context = recentLines.slice(-3);
  if (context.length === 0) return result;

  const analyses = context.map(analyzeRhythm);
  const currentAnalysis = currentDraft ? analyzeRhythm(currentDraft) : null;

  // --- Detect emerging meter ---
  const meterNames = analyses
    .filter((a) => a.meter.confidence >= 0.5)
    .map((a) => a.meter.name);

  // Check if a meter appears in at least 2 of the recent lines
  const meterCounts = {};
  for (const m of meterNames) {
    meterCounts[m] = (meterCounts[m] || 0) + 1;
  }

  let dominantMeter = null;
  for (const [name, count] of Object.entries(meterCounts)) {
    if (count >= 2) {
      dominantMeter = name;
      break;
    }
  }

  if (dominantMeter) {
    // Friendly meter descriptions
    const meterFeel = {
      iambic: 'a heartbeat',
      trochaic: 'a drum calling out',
      anapestic: 'a gallop',
      dactylic: 'a waltz',
      spondaic: 'steady, heavy footsteps',
    };

    const baseWord = dominantMeter.split(' ')[0];
    const feel = meterFeel[baseWord] || 'a steady pulse';

    result.meterSuggestion = dominantMeter;
    result.hint = `The rhythm is building — like ${feel}. Try matching its pulse.`;

    // If the current draft breaks the pattern, gently note it
    if (currentAnalysis && currentAnalysis.meter.confidence >= 0.5) {
      const currentBase = currentAnalysis.meter.name.split(' ')[0];
      if (currentBase !== baseWord) {
        result.hint = `Your earlier lines have ${feel} in them. This line shifts — which can be powerful, or you could lean back into the rhythm.`;
      } else {
        result.hint = `Beautiful — this line flows with the same pulse as the ones before it.`;
      }
    }
  }

  // --- Detect rhyme opportunity ---
  const recentRhymes = analyses.map((a) => a.rhymeEnd).filter(Boolean);
  if (recentRhymes.length > 0) {
    const lastRhyme = recentRhymes[recentRhymes.length - 1];

    // Check for existing rhyme pattern (AA, ABAB, etc.)
    if (recentRhymes.length >= 2) {
      const secondLast = recentRhymes[recentRhymes.length - 2];

      // Couplet pattern: last two lines rhyme
      if (lastRhyme === secondLast) {
        result.rhymeSuggestion = null; // Couplet already complete
        if (!dominantMeter) {
          result.hint = 'A couplet just formed — you could start a new pair, or let it stand alone.';
        }
      } else {
        // Suggest rhyming with the previous line (ABAB potential)
        result.rhymeSuggestion = lastRhyme;
        if (!dominantMeter) {
          result.hint = `The last line ends on a "${lastRhyme}" sound — you could echo it, or let it ring on its own.`;
        }
      }
    } else {
      result.rhymeSuggestion = lastRhyme;
      if (!dominantMeter) {
        result.hint = `The last line trails off with a "${lastRhyme}" sound — a rhyme could bring it home, or silence could say more.`;
      }
    }

    // If current draft already rhymes, acknowledge it
    if (currentAnalysis && currentAnalysis.rhymeEnd === lastRhyme) {
      result.rhymeSuggestion = null;
      if (!dominantMeter) {
        result.hint = 'A rhyme just landed — that echo gives the lines a sense of belonging.';
      }
    }
  }

  // --- Syllable count consistency ---
  if (!dominantMeter && analyses.length >= 2) {
    const syllCounts = analyses.map((a) => a.syllables);
    const avg = syllCounts.reduce((a, b) => a + b, 0) / syllCounts.length;
    const allClose = syllCounts.every((s) => Math.abs(s - avg) <= 2);

    if (allClose && currentAnalysis && Math.abs(currentAnalysis.syllables - avg) > 3) {
      result.hint = `Your lines have been breathing at a similar length — this one stretches (or shortens) noticeably. That could be a lovely surprise, or you might want to match the others.`;
    }
  }

  return result;
}
