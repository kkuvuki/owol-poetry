/**
 * Relentlessly Human — Client-side logic
 *
 * Handles Supabase integration, real-time updates, form submission,
 * and all animations for the collaborative poem feature.
 *
 * Threading/Reply feature requires a `reply_to` column on poem_lines:
 *   ALTER TABLE poem_lines ADD COLUMN reply_to UUID REFERENCES poem_lines(id);
 */

import { supabase } from './supabase.js';
import { shareLine } from './share-card.js';
import { fetchResonanceCounts, fetchUserResonance, toggleResonance, getCount, hasResonated } from './resonance.js';
import { initAudioRecorder, uploadAudio, getAudioUrl } from './audio-recorder.js';
import { showProofModal } from './proof-of-authorship.js';

const STORAGE_KEY = 'rh_contributed';

const SEASONAL_PROMPTS = {
  valentine: {
    name: 'Love Letters',
    emoji: '\u2764\uFE0F',
    start: [2, 1],
    end: [2, 28],
    intro: 'Season of love \u2014 write from the heart',
    prompts: [
      'What does love sound like at 2am?',
      'Describe a kiss you still carry.',
      'Write the words you never sent.',
      'What would you say to the one who got away?',
      'Describe the exact moment you knew.',
      'What does longing taste like?',
      'Write about the space between two hands.',
      'What did love teach you about silence?',
    ],
  },
  remembrance: {
    name: 'Remembrance',
    emoji: '\uD83D\uDD6F\uFE0F',
    start: [11, 1],
    end: [11, 15],
    intro: 'Honor those who came before',
    prompts: [
      'What would you ask your ancestors?',
      'Describe a voice you can no longer hear.',
      'What did they leave in your hands?',
      'Write about a place that no longer exists.',
      'What do the dead know that we don\u2019t?',
      'Describe the weight of an empty chair.',
      'What would you cook for someone who\u2019s gone?',
      'Write the eulogy no one gave.',
    ],
  },
  spring: {
    name: 'Spring \u2014 Renewal',
    emoji: '\uD83C\uDF31',
    start: [3, 20],
    end: [6, 20],
    intro: 'Everything begins again',
    prompts: [
      'What is trying to bloom inside you?',
      'Describe the first warm day after winter.',
      'What would you plant if you could grow anything?',
      'Write about something breaking open.',
      'What does the morning owe you?',
      'Describe the color of a new beginning.',
      'What are you ready to become?',
      'Write about rain that feels like forgiveness.',
    ],
  },
  summer: {
    name: 'Summer \u2014 Light',
    emoji: '\u2600\uFE0F',
    start: [6, 21],
    end: [9, 22],
    intro: 'The long days hold everything',
    prompts: [
      'What does freedom smell like?',
      'Describe a moment that lasted all day.',
      'What would you do with one endless afternoon?',
      'Write about heat on bare skin.',
      'What does the sun know about you?',
      'Describe the sound of a wide-open window.',
      'What are you most alive doing?',
      'Write about a night you didn\u2019t want to end.',
    ],
  },
  autumn: {
    name: 'Autumn \u2014 Letting Go',
    emoji: '\uD83C\uDF42',
    start: [9, 23],
    end: [12, 20],
    intro: 'Beauty in what falls away',
    prompts: [
      'What have you been carrying too long?',
      'Describe the sound of something ending.',
      'What would you release if you could?',
      'Write about a door you finally closed.',
      'What does the wind take with it?',
      'Describe the color of letting go.',
      'What are you harvesting from this year?',
      'Write about the last warm night.',
    ],
  },
  winter: {
    name: 'Winter \u2014 Stillness',
    emoji: '\u2744\uFE0F',
    start: [12, 21],
    end: [3, 19],
    intro: 'In the quiet, listen closer',
    prompts: [
      'What do you hear when the world goes silent?',
      'Describe the warmth inside the cold.',
      'What survives the longest nights?',
      'Write about a fire that kept you going.',
      'What does endurance look like at midnight?',
      'Describe the weight of a dark afternoon.',
      'What are you saving for spring?',
      'Write about rest that feels earned.',
    ],
  },
};

function getCurrentSeason() {
  var now = new Date();
  var month = now.getMonth() + 1;
  var day = now.getDate();
  var md = month * 100 + day; // e.g. March 20 = 320, Nov 5 = 1105

  // Check special themes first
  var specials = ['valentine', 'remembrance'];
  for (var i = 0; i < specials.length; i++) {
    var s = SEASONAL_PROMPTS[specials[i]];
    var start = s.start[0] * 100 + s.start[1];
    var end = s.end[0] * 100 + s.end[1];
    if (md >= start && md <= end) return specials[i];
  }

  // Check standard seasons (winter wraps around year boundary)
  var standards = ['spring', 'summer', 'autumn', 'winter'];
  for (var j = 0; j < standards.length; j++) {
    var s = SEASONAL_PROMPTS[standards[j]];
    var start = s.start[0] * 100 + s.start[1];
    var end = s.end[0] * 100 + s.end[1];
    if (start <= end) {
      if (md >= start && md <= end) return standards[j];
    } else {
      // Wraps around year (winter: Dec 21 - Mar 19)
      if (md >= start || md <= end) return standards[j];
    }
  }

  return 'spring'; // fallback
}

const FINGERPRINT_KEY = 'rh_fingerprint';

/* ══════════════════════════════════════════
 * DOM References
 * ══════════════════════════════════════════ */

let els = {};

function cacheElements() {
  els = {
    poem: document.querySelector('.rh__poem'),
    loading: document.querySelector('.rh__loading'),
    empty: document.querySelector('.rh__empty'),
    pills: document.querySelectorAll('.rh__pill'),
    depthText: document.querySelector('.rh__depth-text'),
    contribute: document.getElementById('rh-contribute'),
    contributed: document.getElementById('rh-contributed'),
    afterglow: document.getElementById('rh-afterglow'),
    form: document.getElementById('rh-form'),
    lineInput: document.getElementById('rh-line-input'),
    nameInput: document.getElementById('rh-name-input'),
    socialInputs: document.querySelectorAll('.rh__input--social'),
    covenant: document.getElementById('rh-covenant'),
    submit: document.getElementById('rh-submit'),
    submitText: null,
    submitSending: null,
    charCount: document.querySelector('.rh__char-count'),
    contextLines: document.querySelector('.rh__context-lines'),
    error: document.getElementById('rh-error'),
    lineCount: document.getElementById('rh-line-count'),
    authorCount: document.getElementById('rh-author-count'),
    replyingTo: document.getElementById('rh-replying-to'),
  };

  if (els.submit) {
    els.submitText = els.submit.querySelector('.rh__submit-text');
    els.submitSending = els.submit.querySelector('.rh__submit-sending');
  }
}

/* ══════════════════════════════════════════
 * Fingerprint (client-side, privacy-respecting)
 * ══════════════════════════════════════════ */

function generateFingerprint() {
  const stored = localStorage.getItem(FINGERPRINT_KEY);
  if (stored) return stored;

  const raw = [
    navigator.userAgent || '',
    screen.width + 'x' + screen.height,
    Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    navigator.language || '',
    new Date().getTimezoneOffset(),
  ].join('|');

  // Simple hash (djb2)
  let hash = 5381;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) + hash + raw.charCodeAt(i)) & 0xffffffff;
  }
  const fp = Math.abs(hash).toString(36);
  localStorage.setItem(FINGERPRINT_KEY, fp);
  return fp;
}

/* ══════════════════════════════════════════
 * Data Fetching
 * ══════════════════════════════════════════ */

let currentLines = [];
let currentLimit = 10;
let subscription = null;
let replyToId = null;
let audioRecorderCtrl = null;

async function fetchLines(limit) {
  let query = supabase
    .from('poem_lines')
    .select('*')
    .eq('flagged', false)
    .order('created_at', { ascending: false });

  if (limit > 0) {
    query = query.limit(limit);
  } else {
    query = query.limit(500); // Safety cap for "All"
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch poem lines:', error);
    return [];
  }

  return data || [];
}

function subscribeToLines() {
  if (subscription) {
    subscription.unsubscribe();
  }

  subscription = supabase
    .channel('poem_lines_realtime')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'poem_lines' },
      (payload) => {
        if (payload.new && !payload.new.flagged) {
          animateNewLine(payload.new);
          bumpLineCount();
        }
      }
    )
    .subscribe();
}

/* ══════════════════════════════════════════
 * Stats Counter
 * ══════════════════════════════════════════ */

async function fetchAndDisplayStats() {
  // Get total line count
  const { count: lineCount, error: countErr } = await supabase
    .from('poem_lines')
    .select('*', { count: 'exact', head: true })
    .eq('flagged', false);

  // Get unique author count
  const { data: authors, error: authErr } = await supabase
    .from('poem_lines')
    .select('author_name')
    .eq('flagged', false);

  var uniqueAuthors = 0;
  if (authors) {
    var seen = {};
    authors.forEach(function (a) {
      var name = (a.author_name || '').toLowerCase().trim();
      if (name && !seen[name]) {
        seen[name] = true;
        uniqueAuthors++;
      }
    });
  }

  animateCounter(els.lineCount, countErr ? 0 : (lineCount || 0));
  animateCounter(els.authorCount, uniqueAuthors);
}

function animateCounter(el, target) {
  if (!el) return;

  var current = parseInt(el.textContent, 10) || 0;
  if (current === target && target > 0) return;

  // For first load (from "—"), just set it
  if (el.textContent === '—' || isNaN(current)) {
    el.textContent = target;
    el.classList.add('is-updating');
    setTimeout(function () { el.classList.remove('is-updating'); }, 400);
    return;
  }

  // Animate counting up
  var diff = target - current;
  var steps = Math.min(Math.abs(diff), 20);
  var stepTime = Math.max(30, 600 / steps);
  var i = 0;

  el.classList.add('is-updating');

  var interval = setInterval(function () {
    i++;
    var progress = i / steps;
    // Ease out
    var easedProgress = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(current + diff * easedProgress);
    if (i >= steps) {
      clearInterval(interval);
      el.textContent = target;
      setTimeout(function () { el.classList.remove('is-updating'); }, 200);
    }
  }, stepTime);
}

function bumpLineCount() {
  if (!els.lineCount) return;
  var current = parseInt(els.lineCount.textContent, 10) || 0;
  animateCounter(els.lineCount, current + 1);
}

/* ══════════════════════════════════════════
 * Rendering
 * ══════════════════════════════════════════ */

function renderLines(lines, animate) {
  if (!els.poem) return;

  els.poem.innerHTML = '';

  if (lines.length === 0) {
    if (els.empty) els.empty.hidden = false;
    updateDepth(0);
    return;
  }

  if (els.empty) els.empty.hidden = true;

  // Reverse so oldest is at top, newest at bottom (reading order)
  var ordered = lines.slice().reverse();

  ordered.forEach(function (line, i) {
    const el = createLineElement(line);

    if (animate) {
      el.style.animationDelay = Math.min(i * 50, 2000) + 'ms';
      el.classList.add('rh-line--entering');
    }

    // Time-based opacity: oldest fades to 0.55, newest = 1
    const ageRatio = ordered.length > 1 ? (ordered.length - 1 - i) / (ordered.length - 1) : 0;
    const opacity = 1 - ageRatio * 0.45;
    el.style.setProperty('--line-opacity', opacity);

    els.poem.appendChild(el);
  });

  updateDepth(lines.length);
  updateContextLines(lines);
}

function createLineElement(line) {
  const container = document.createElement('div');
  container.className = 'rh-line';
  container.setAttribute('role', 'listitem');
  container.dataset.id = line.id;

  const text = document.createElement('p');
  text.className = 'rh-line__text';
  text.textContent = line.text;

  const meta = document.createElement('div');
  meta.className = 'rh-line__meta';

  const author = document.createElement('span');
  author.className = 'rh-line__author';

  // Parse social links (stored as JSON or plain URL)
  var socials = null;
  if (line.author_link) {
    try { socials = JSON.parse(line.author_link); } catch (e) { socials = null; }
  }

  if (socials && typeof socials === 'object') {
    // Show name + social icons
    var nameSpan = document.createElement('span');
    nameSpan.textContent = line.author_name;
    author.appendChild(nameSpan);

    var iconsWrap = document.createElement('span');
    iconsWrap.className = 'rh-line__socials';

    var iconMap = {
      linkedin: { url: function(v) { return v.startsWith('http') ? v : 'https://linkedin.com/in/' + v; }, svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>' },
      instagram: { url: function(v) { return v.startsWith('http') ? v : 'https://instagram.com/' + v.replace('@', ''); }, svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>' },
      email: { url: function(v) { return 'mailto:' + v; }, svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>' },
      website: { url: function(v) { return v.startsWith('http') ? v : 'https://' + v; }, svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>' },
    };

    var ALLOWED_SOCIALS = ['linkedin', 'instagram', 'email', 'website'];
    Object.keys(socials).forEach(function (key) {
      if (ALLOWED_SOCIALS.indexOf(key) === -1 || !iconMap[key]) return;
      var a = document.createElement('a');
      a.href = iconMap[key].url(socials[key]);
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.className = 'rh-line__social-icon';
      a.setAttribute('aria-label', key);
      a.innerHTML = iconMap[key].svg;
      iconsWrap.appendChild(a);
    });

    author.appendChild(iconsWrap);
  } else if (line.author_link) {
    // Legacy: plain URL
    var link = document.createElement('a');
    link.href = line.author_link;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = line.author_name;
    link.className = 'rh-line__author-link';
    author.appendChild(link);
  } else {
    author.textContent = line.author_name;
  }

  const time = document.createElement('time');
  time.className = 'rh-line__time';
  time.dateTime = line.created_at;
  time.textContent = formatTimeAgo(line.created_at);

  var shareBtn = document.createElement('button');
  shareBtn.className = 'rh-line__share';
  shareBtn.type = 'button';
  shareBtn.setAttribute('aria-label', 'Share this line');
  shareBtn.title = 'Share this line';
  shareBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>';
  shareBtn.addEventListener('click', function () {
    shareLine(line.text, line.author_name);
  });

  var replyBtn = document.createElement('button');
  replyBtn.className = 'rh-line__reply';
  replyBtn.type = 'button';
  replyBtn.setAttribute('aria-label', 'Reply to this line');
  replyBtn.title = 'Reply';
  replyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>';
  replyBtn.addEventListener('click', function () {
    setReplyTo(line.id, line.text);
  });

  // Language tag
  if (socials && socials.lang) {
    var langTag = document.createElement('span');
    langTag.className = 'rh-line__lang';
    langTag.textContent = socials.lang;
    meta.appendChild(langTag);
  }

  // Location tag
  if (socials && (socials.city || socials.country)) {
    var locTag = document.createElement('span');
    locTag.className = 'rh-line__location';
    var locParts = [socials.city, socials.country].filter(Boolean);
    locTag.textContent = locParts.join(', ');
    meta.appendChild(locTag);
  }

  var resonanceBtn = document.createElement('button');
  resonanceBtn.className = 'rh-line__resonate';
  resonanceBtn.type = 'button';
  resonanceBtn.setAttribute('aria-label', 'This line moved me');
  resonanceBtn.title = 'Like this line';
  var resonanceCount = document.createElement('span');
  resonanceCount.className = 'rh-line__resonate-count';
  var count = getCount(line.id);
  resonanceCount.textContent = count > 0 ? count : '';
  resonanceBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M14 9V5a3 3 0 0 0-6 0v1.12L14 9zm5.5 1H15l.77 3.35L10 17.53V21h7l1.94-6.65A2.5 2.5 0 0 0 19.5 10zM1 11h4v10H1z"/></svg>';
  resonanceBtn.appendChild(resonanceCount);
  if (hasResonated(line.id)) resonanceBtn.classList.add('is-resonated');
  resonanceBtn.addEventListener('click', async function () {
    var fp = generateFingerprint();
    var newCount = await toggleResonance(line.id, fp);
    resonanceCount.textContent = newCount > 0 ? newCount : '';
    resonanceBtn.classList.toggle('is-resonated');
  });

  // Translate button
  var translateBtn = document.createElement('button');
  translateBtn.className = 'rh-line__translate';
  translateBtn.type = 'button';
  translateBtn.setAttribute('aria-label', 'Translate this line');
  translateBtn.title = 'Translate';
  translateBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';
  translateBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    showTranslatePopup(translateBtn, line.text);
  });

  // Audio play button (if audio exists)
  var audioBtn = document.createElement('button');
  audioBtn.className = 'rh-line__audio';
  audioBtn.type = 'button';
  audioBtn.setAttribute('aria-label', 'Listen to this line');
  audioBtn.title = 'Listen';
  audioBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>';
  audioBtn.hidden = true;
  audioBtn.dataset.lineId = line.id;
  // Check for audio asynchronously
  var audioUrl = getAudioUrl(line.id);
  fetch(audioUrl, { method: 'HEAD' }).then(function (res) {
    if (res.ok) {
      audioBtn.hidden = false;
      audioBtn.addEventListener('click', function () {
        var audio = new Audio(audioUrl);
        audio.play();
        audioBtn.classList.add('is-playing');
        audio.addEventListener('ended', function () {
          audioBtn.classList.remove('is-playing');
        });
      });
    }
  }).catch(function () {});

  meta.appendChild(author);
  meta.appendChild(time);
  meta.appendChild(resonanceBtn);
  meta.appendChild(shareBtn);
  meta.appendChild(translateBtn);
  meta.appendChild(audioBtn);
  meta.appendChild(replyBtn);
  // Word reaction — double-click/tap to show feeling picker
  container.addEventListener('dblclick', function (e) {
    e.preventDefault();
    showWordPicker(container, e);
  });

  container.appendChild(text);
  container.appendChild(meta);

  return container;
}

var FEELING_WORDS = ['ache', 'yes', 'home', 'truth', 'fire', 'still', 'raw', 'light'];

function showWordPicker(lineEl, event) {
  // Remove any existing picker
  var existing = document.querySelector('.rh-word-picker');
  if (existing) existing.remove();

  var picker = document.createElement('div');
  picker.className = 'rh-word-picker';

  FEELING_WORDS.forEach(function (word) {
    var btn = document.createElement('button');
    btn.className = 'rh-word-picker__word';
    btn.textContent = word;
    btn.type = 'button';
    btn.addEventListener('click', function () {
      floatWord(lineEl, word);
      picker.remove();
    });
    picker.appendChild(btn);
  });

  // Position near the click
  var rect = lineEl.getBoundingClientRect();
  picker.style.top = (rect.top + window.scrollY - 40) + 'px';
  picker.style.left = (rect.left + rect.width / 2) + 'px';
  document.body.appendChild(picker);

  // Remove picker on outside click
  setTimeout(function () {
    document.addEventListener('click', function handler(e) {
      if (!picker.contains(e.target)) {
        picker.remove();
        document.removeEventListener('click', handler);
      }
    });
  }, 10);
}

function floatWord(lineEl, word) {
  var float = document.createElement('span');
  float.className = 'rh-word-float';
  float.textContent = word;

  var rect = lineEl.getBoundingClientRect();
  float.style.left = (rect.left + Math.random() * rect.width * 0.6 + rect.width * 0.2) + 'px';
  float.style.top = (rect.top + window.scrollY) + 'px';

  document.body.appendChild(float);
  setTimeout(function () { float.remove(); }, 2000);
}

var TRANSLATE_LANGS = [
  { code: 'es', name: 'Espa\u00f1ol' },
  { code: 'fr', name: 'Fran\u00e7ais' },
  { code: 'pt', name: 'Portugu\u00eas' },
  { code: 'ja', name: '\u65e5\u672c\u8a9e' },
  { code: 'ar', name: '\u0627\u0644\u0639\u0631\u0628\u064a\u0629' },
  { code: 'zh', name: '\u4e2d\u6587' },
];

function showTranslatePopup(anchorEl, text) {
  var existing = document.querySelector('.rh-line__translate-popup');
  if (existing) existing.remove();

  var popup = document.createElement('div');
  popup.className = 'rh-line__translate-popup';

  TRANSLATE_LANGS.forEach(function (lang) {
    var a = document.createElement('a');
    a.className = 'rh-line__translate-link';
    a.href = 'https://translate.google.com/?sl=auto&tl=' + lang.code + '&text=' + encodeURIComponent(text);
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = lang.name;
    popup.appendChild(a);
  });

  var rect = anchorEl.getBoundingClientRect();
  popup.style.top = (rect.bottom + window.scrollY + 4) + 'px';
  popup.style.left = (rect.left + rect.width / 2) + 'px';
  document.body.appendChild(popup);

  setTimeout(function () {
    document.addEventListener('click', function handler(e) {
      if (!popup.contains(e.target)) {
        popup.remove();
        document.removeEventListener('click', handler);
      }
    });
  }, 10);
}

function setReplyTo(lineId, lineText) {
  replyToId = lineId;
  if (els.replyingTo) {
    var textEl = els.replyingTo.querySelector('.rh__replying-to-text');
    if (textEl) {
      var truncated = lineText.length > 60 ? lineText.substring(0, 60) + '...' : lineText;
      textEl.textContent = truncated;
    }
    els.replyingTo.hidden = false;
  }
  // Scroll to and focus the contribution form
  if (els.lineInput) {
    els.lineInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(function () { els.lineInput.focus(); }, 400);
  }
}

function clearReplyTo() {
  replyToId = null;
  if (els.replyingTo) {
    els.replyingTo.hidden = true;
  }
}

function animateNewLine(lineData) {
  if (!els.poem) return;

  // Check if line already exists (avoid duplicates from own submission + realtime)
  if (els.poem.querySelector('[data-id="' + lineData.id + '"]')) return;

  const el = createLineElement(lineData);
  el.classList.add('rh-line--new');
  el.style.setProperty('--line-opacity', 1);

  // Shift existing lines' opacity — older lines fade more
  const existingLines = els.poem.querySelectorAll('.rh-line');
  const total = existingLines.length + 1;
  existingLines.forEach(function (existing, i) {
    const ageRatio = (total - 1 - i) / (total - 1 || 1);
    const opacity = 1 - ageRatio * 0.45;
    existing.style.setProperty('--line-opacity', opacity);
  });

  els.poem.appendChild(el);

  // Smooth scroll to the new line
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // Update context lines (currentLines is newest-first)
  currentLines.unshift(lineData);
  updateContextLines(currentLines);
  updateDepth(els.poem.querySelectorAll('.rh-line').length);
}

function updateDepth(count) {
  if (!els.depthText) return;

  if (count === 0) {
    els.depthText.textContent = '';
  } else if (count === 1) {
    els.depthText.textContent = '1 line deep';
  } else {
    els.depthText.textContent = count + ' lines deep';
  }
}

function updateContextLines(lines) {
  if (!els.contextLines) return;
  els.contextLines.innerHTML = '';

  const contextCount = Math.min(4, lines.length);
  // Show the most recent lines in chronological order (oldest first for reading flow)
  const contextSlice = lines.slice(0, contextCount).reverse();

  contextSlice.forEach(function (line) {
    const p = document.createElement('p');
    p.className = 'rh__context-line';
    p.textContent = line.text;
    els.contextLines.appendChild(p);
  });
}

/* ══════════════════════════════════════════
 * Time Formatting
 * ══════════════════════════════════════════ */

function formatTimeAgo(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return diffMins + 'm ago';
  if (diffHours < 24) return diffHours + 'h ago';
  if (diffDays < 30) return diffDays + 'd ago';

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ══════════════════════════════════════════
 * Contribution State
 * ══════════════════════════════════════════ */

function checkIfContributed() {
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

function markAsContributed() {
  localStorage.setItem(STORAGE_KEY, 'true');
}

function showContributeForm() {
  if (!els.contribute || !els.contributed) return;

  if (checkIfContributed()) {
    els.contribute.hidden = true;
    els.contributed.hidden = false;
    // Re-trigger reveal on the card inside
    const card = els.contributed.querySelector('.reveal');
    if (card) {
      requestAnimationFrame(function () {
        card.classList.add('is-visible');
      });
    }
  } else {
    els.contribute.hidden = false;
    els.contributed.hidden = true;
    // Re-trigger reveal on the card inside
    const card = els.contribute.querySelector('.reveal');
    if (card) {
      requestAnimationFrame(function () {
        card.classList.add('is-visible');
      });
    }
  }
}

/* ══════════════════════════════════════════
 * Form Handling
 * ══════════════════════════════════════════ */

function initForm() {
  if (!els.form || !els.lineInput || !els.nameInput || !els.covenant || !els.submit) return;

  // Character count
  els.lineInput.addEventListener('input', function () {
    const len = this.value.length;
    if (els.charCount) {
      els.charCount.textContent = len + ' / 150';
      els.charCount.classList.toggle('is-near-limit', len > 130);
      els.charCount.classList.toggle('is-at-limit', len >= 150);
    }
    validateForm();
  });

  els.nameInput.addEventListener('input', validateForm);
  els.covenant.addEventListener('change', validateForm);

  // Focus mode: dim surroundings when writing
  var rhSection = document.querySelector('.rh');
  els.lineInput.addEventListener('focus', function () {
    if (rhSection) rhSection.classList.add('is-focus-mode');
  });

  els.lineInput.addEventListener('blur', function () {
    if (rhSection) rhSection.classList.remove('is-focus-mode');
  });

  // Submit
  els.form.addEventListener('submit', handleSubmit);
}

function validateForm() {
  if (!els.lineInput || !els.nameInput || !els.covenant || !els.submit) return;

  const lineOk = els.lineInput.value.trim().length > 0 && els.lineInput.value.length <= 150;
  const nameOk = els.nameInput.value.trim().length > 0;
  const covenantOk = els.covenant.checked;

  els.submit.disabled = !(lineOk && nameOk && covenantOk);
}

async function handleSubmit(e) {
  e.preventDefault();

  if (!els.lineInput || !els.nameInput || !els.submit) return;

  const text = els.lineInput.value.trim();
  const authorName = els.nameInput.value.trim();

  // Collect social links into a JSON object
  const socials = {};
  if (els.socialInputs) {
    els.socialInputs.forEach(function (input) {
      var val = input.value.trim();
      if (val) socials[input.dataset.social] = val;
    });
  }
  var langInput = document.getElementById('rh-lang');
  var lang = langInput ? langInput.value.trim() : '';
  if (lang) socials.lang = lang;

  var cityInput = document.getElementById('rh-city');
  var countryInput = document.getElementById('rh-country');
  var city = cityInput ? cityInput.value.trim() : '';
  var country = countryInput ? countryInput.value.trim() : '';
  if (city) socials.city = city;
  if (country) socials.country = country;

  const authorLink = Object.keys(socials).length > 0 ? JSON.stringify(socials) : '';

  if (!text || !authorName) return;

  // Content moderation — block obvious spam/slurs
  var blocked = /\b(fuck|shit|bitch|nigger|faggot|cunt|retard|viagra|crypto|buy now|click here|subscribe)\b/i;
  if (blocked.test(text) || blocked.test(authorName)) {
    if (els.error) {
      els.error.textContent = 'Your submission contains language that can\'t be included. Please revise.';
      els.error.hidden = false;
    }
    return;
  }

  // Rate limiting — 1 submission per 24 hours
  var RATE_KEY = 'rh_last_submit';
  var lastSubmit = localStorage.getItem(RATE_KEY);
  if (lastSubmit) {
    var elapsed = Date.now() - parseInt(lastSubmit, 10);
    if (elapsed < 86400000) {
      var hoursLeft = Math.ceil((86400000 - elapsed) / 3600000);
      if (els.error) {
        els.error.textContent = 'You can add another line in ' + hoursLeft + ' hour' + (hoursLeft !== 1 ? 's' : '') + '. One line a day keeps it meaningful.';
        els.error.hidden = false;
      }
      return;
    }
  }

  // Disable form
  els.submit.disabled = true;
  if (els.submitText) els.submitText.hidden = true;
  if (els.submitSending) els.submitSending.hidden = false;
  if (els.error) els.error.hidden = true;

  const fingerprint = generateFingerprint();

  var insertPayload = {
    text: text,
    author_name: authorName,
    author_link: authorLink || null,
    ip_hash: fingerprint,
  };
  if (replyToId) {
    insertPayload.reply_to = replyToId;
  }

  const { data, error } = await supabase.from('poem_lines').insert([
    insertPayload,
  ]).select();

  if (error) {
    console.error('Submit error:', error);
    if (els.error) {
      els.error.textContent = 'Something went wrong. Please try again.';
      els.error.hidden = false;
    }
    els.submit.disabled = false;
    if (els.submitText) els.submitText.hidden = false;
    if (els.submitSending) els.submitSending.hidden = true;
    return;
  }

  // Success
  localStorage.setItem(RATE_KEY, String(Date.now()));
  markAsContributed();
  clearReplyTo();

  // Upload audio if recorded
  if (data && data[0] && audioRecorderCtrl && audioRecorderCtrl.getBlob()) {
    uploadAudio(audioRecorderCtrl.getBlob(), data[0].id).catch(function (e) {
      console.warn('Audio upload failed:', e);
    });
    audioRecorderCtrl.reset();
  }

  // Animate the submitted line into the poem
  if (data && data[0]) {
    animateNewLine(data[0]);
    // Show proof of authorship modal (non-blocking)
    showProofModal(data[0]);
  }

  // Transition: hide form, show afterglow
  els.form.classList.add('rh__form--success');

  setTimeout(function () {
    if (els.contribute) els.contribute.hidden = true;

    // Show afterglow
    if (els.afterglow) {
      els.afterglow.hidden = false;
      const text = els.afterglow.querySelector('.reveal');
      if (text) {
        requestAnimationFrame(function () {
          text.classList.add('is-visible');
        });
      }
    }

    // After afterglow, fade out then show "contributed" message
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var afterglowDelay = reducedMotion ? 500 : 5500;
    var fadeDelay = reducedMotion ? 0 : 1000;

    setTimeout(function () {
      if (els.afterglow && !reducedMotion) {
        els.afterglow.style.transition = 'opacity 1s ease-out';
        els.afterglow.style.opacity = '0';
      }

      // Wait for fade-out to finish, then swap
      setTimeout(function () {
        if (els.afterglow) els.afterglow.hidden = true;
        if (els.contributed) {
          els.contributed.hidden = false;
          const card = els.contributed.querySelector('.reveal');
          if (card) {
            requestAnimationFrame(function () {
              card.classList.add('is-visible');
            });
          }
        }
      }, fadeDelay);
    }, afterglowDelay);
  }, 800);
}

/* ══════════════════════════════════════════
 * Reading Depth Pills
 * ══════════════════════════════════════════ */

function initPills() {
  els.pills.forEach(function (pill) {
    pill.addEventListener('click', async function () {
      const limit = parseInt(this.dataset.limit, 10);
      currentLimit = limit;

      // Update active state
      els.pills.forEach(function (p) {
        p.classList.remove('is-active');
        p.setAttribute('aria-pressed', 'false');
      });
      this.classList.add('is-active');
      this.setAttribute('aria-pressed', 'true');

      // "None" mode: hide poem entirely for blind writing
      if (limit === 0) {
        if (els.poem) els.poem.hidden = true;
        if (els.empty) els.empty.hidden = true;
        if (els.depthText) els.depthText.textContent = 'Write blind — no context';
        // Hide context lines in the form too
        if (els.contextLines) els.contextLines.innerHTML = '';
        var contextLabel = document.querySelector('.rh__context-label');
        if (contextLabel) contextLabel.textContent = 'Write without seeing the poem...';
        return;
      }

      // Restore poem visibility if coming from "None"
      if (els.poem) els.poem.hidden = false;
      var contextLabel = document.querySelector('.rh__context-label');
      if (contextLabel) contextLabel.textContent = 'The poem so far...';

      this.setAttribute('aria-busy', 'true');

      // Show loading briefly
      if (els.loading) els.loading.style.display = 'flex';
      if (els.poem) els.poem.style.opacity = '0.3';

      try {
        currentLines = await fetchLines(limit);
        renderLines(currentLines, true);
      } catch (err) {
        console.error('Failed to load lines:', err);
        renderLines(currentLines, false);
      } finally {
        if (els.loading) els.loading.style.display = 'none';
        if (els.poem) els.poem.style.opacity = '1';
        this.setAttribute('aria-busy', 'false');
      }
    });
  });
}

/* ══════════════════════════════════════════
 * Writing Prompts
 * ══════════════════════════════════════════ */

function initPrompt() {
  var promptEl = document.getElementById('rh-prompt');
  if (!promptEl) return;

  var seasonKey = getCurrentSeason();
  var season = SEASONAL_PROMPTS[seasonKey];
  var prompts = season.prompts;

  // Show themed banner
  var bannerEl = document.getElementById('rh-season-banner');
  if (bannerEl) {
    bannerEl.textContent = season.emoji + ' ' + season.name + ' \u2014 ' + season.intro;
    bannerEl.hidden = false;
    bannerEl.dataset.season = seasonKey;
  }

  var index = Math.floor(Math.random() * prompts.length);
  promptEl.textContent = prompts[index];

  // Rotate every 8 seconds
  setInterval(function () {
    promptEl.style.opacity = '0';
    setTimeout(function () {
      index = (index + 1) % prompts.length;
      promptEl.textContent = prompts[index];
      promptEl.style.opacity = '1';
    }, 400);
  }, 8000);
}

/* ══════════════════════════════════════════
 * Initialization
 * ══════════════════════════════════════════ */

async function init() {
  // Only initialize if the section exists on this page
  if (!document.querySelector('.rh')) return;

  cacheElements();

  // Fetch initial lines
  currentLines = await fetchLines(currentLimit);

  // Hide loading, render
  if (els.loading) els.loading.style.display = 'none';
  renderLines(currentLines, true);

  // Fetch and display stats
  fetchAndDisplayStats();

  // Load resonance data, then re-render to update dots
  var lineIds = currentLines.map(function (l) { return l.id; });
  var fp = generateFingerprint();
  Promise.all([fetchResonanceCounts(lineIds), fetchUserResonance(lineIds, fp)]).then(function () {
    renderLines(currentLines, false);
  });

  // Show contribution area when poem container scrolls into view
  const poemContainer = document.querySelector('.rh__poem-container');
  if (poemContainer && 'IntersectionObserver' in window) {
    const formObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            showContributeForm();
            formObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3, rootMargin: '0px 0px -40px 0px' }
    );
    formObserver.observe(poemContainer);
  } else {
    // Fallback for browsers without IO
    showContributeForm();
  }

  // Set up interactions
  initPills();
  initForm();
  subscribeToLines();
  initPrompt();
  initInvite();

  // Reply cancel button
  var replyCancelBtn = document.getElementById('rh-replying-to-cancel');
  if (replyCancelBtn) {
    replyCancelBtn.addEventListener('click', clearReplyTo);
  }

  // Audio recorder
  audioRecorderCtrl = initAudioRecorder({
    recordBtn: document.getElementById('rh-audio-record'),
    btnText: document.getElementById('rh-audio-btn-text'),
    wave: document.getElementById('rh-audio-wave'),
    canvas: document.getElementById('rh-audio-canvas'),
    preview: document.getElementById('rh-audio-preview'),
    playBtn: document.getElementById('rh-audio-play'),
    durationEl: document.getElementById('rh-audio-duration'),
    deleteBtn: document.getElementById('rh-audio-delete'),
    timerEl: document.getElementById('rh-audio-timer'),
  });
}

function initInvite() {
  // Notification opt-in
  var notifyForm = document.getElementById('rh-notify-form');
  if (notifyForm) {
    notifyForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var emailInput = document.getElementById('rh-notify-email');
      var btn = document.getElementById('rh-notify-btn');
      var done = document.getElementById('rh-notify-done');
      if (!emailInput || !emailInput.value.trim()) return;

      if (btn) btn.disabled = true;
      await supabase.from('email_signups').insert([{ email: emailInput.value.trim() }]);
      if (notifyForm) notifyForm.hidden = true;
      if (done) done.hidden = false;
    });
  }

  var copyBtn = document.getElementById('rh-invite-copy');
  var shareBtn = document.getElementById('rh-invite-share');
  var inviteUrl = window.location.origin + '/#relentlessly-human';
  var inviteText = 'Add your line to this collaborative poem — written by strangers, for strangers.';

  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      navigator.clipboard.writeText(inviteUrl).then(function () {
        var label = document.getElementById('rh-invite-copy-label');
        if (label) {
          label.textContent = 'Copied!';
          setTimeout(function () { label.textContent = 'Copy link'; }, 2000);
        }
      });
    });
  }

  if (shareBtn) {
    shareBtn.addEventListener('click', function () {
      if (navigator.share) {
        navigator.share({ title: 'Relentlessly Human', text: inviteText, url: inviteUrl });
      } else {
        // Fallback: copy
        navigator.clipboard.writeText(inviteUrl);
      }
    });
  }
}

// Clean up realtime subscription before navigating away
document.addEventListener('astro:before-preparation', function () {
  if (subscription) {
    subscription.unsubscribe();
    subscription = null;
  }
});

// Support both initial load and Astro view transitions
document.addEventListener('astro:page-load', init);
