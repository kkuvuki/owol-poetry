/**
 * Relentlessly Human — Client-side logic
 *
 * Handles Supabase integration, real-time updates, form submission,
 * and all animations for the collaborative poem feature.
 */

import { supabase } from './supabase.js';
import { shareLine } from './share-card.js';
import { fetchResonanceCounts, fetchUserResonance, toggleResonance, getCount, hasResonated } from './resonance.js';

const STORAGE_KEY = 'rh_contributed';

const WRITING_PROMPTS = [
  'What would you say to your younger self?',
  'Describe a sound you\u2019ll never forget.',
  'What does home smell like?',
  'Write what silence sounds like to you.',
  'Name something you\u2019re afraid to want.',
  'What do your hands remember?',
  'Describe the color of a feeling.',
  'What would you whisper to the night?',
  'Write about something you almost said.',
  'What does the rain know about you?',
  'Describe the weight of a memory.',
  'What are you still learning to forgive?',
  'Write the first line of your unwritten letter.',
  'What does your reflection think about?',
  'Describe love without using the word.',
];
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
  shareBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>';
  shareBtn.addEventListener('click', function () {
    shareLine(line.text, line.author_name);
  });

  // Language tag
  if (socials && socials.lang) {
    var langTag = document.createElement('span');
    langTag.className = 'rh-line__lang';
    langTag.textContent = socials.lang;
    meta.appendChild(langTag);
  }

  var resonanceBtn = document.createElement('button');
  resonanceBtn.className = 'rh-line__resonate';
  resonanceBtn.type = 'button';
  resonanceBtn.setAttribute('aria-label', 'This line moved me');
  var resonanceCount = document.createElement('span');
  resonanceCount.className = 'rh-line__resonate-count';
  var count = getCount(line.id);
  resonanceCount.textContent = count > 0 ? count : '';
  resonanceBtn.innerHTML = '<span class="rh-line__resonate-dot"></span>';
  resonanceBtn.appendChild(resonanceCount);
  if (hasResonated(line.id)) resonanceBtn.classList.add('is-resonated');
  resonanceBtn.addEventListener('click', async function () {
    var fp = generateFingerprint();
    var newCount = await toggleResonance(line.id, fp);
    resonanceCount.textContent = newCount > 0 ? newCount : '';
    resonanceBtn.classList.toggle('is-resonated');
  });

  meta.appendChild(author);
  meta.appendChild(time);
  meta.appendChild(resonanceBtn);
  meta.appendChild(shareBtn);
  container.appendChild(text);
  container.appendChild(meta);

  return container;
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
  const authorLink = Object.keys(socials).length > 0 ? JSON.stringify(socials) : '';

  if (!text || !authorName) return;

  // Disable form
  els.submit.disabled = true;
  if (els.submitText) els.submitText.hidden = true;
  if (els.submitSending) els.submitSending.hidden = false;
  if (els.error) els.error.hidden = true;

  const fingerprint = generateFingerprint();

  const { data, error } = await supabase.from('poem_lines').insert([
    {
      text: text,
      author_name: authorName,
      author_link: authorLink || null,
      ip_hash: fingerprint,
    },
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
  markAsContributed();

  // Animate the submitted line into the poem
  if (data && data[0]) {
    animateNewLine(data[0]);
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

  var index = Math.floor(Math.random() * WRITING_PROMPTS.length);
  promptEl.textContent = WRITING_PROMPTS[index];

  // Rotate every 8 seconds
  setInterval(function () {
    promptEl.style.opacity = '0';
    setTimeout(function () {
      index = (index + 1) % WRITING_PROMPTS.length;
      promptEl.textContent = WRITING_PROMPTS[index];
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
