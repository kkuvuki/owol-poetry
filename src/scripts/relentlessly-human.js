/**
 * Relentlessly Human — Client-side logic
 *
 * Handles Supabase integration, real-time updates, form submission,
 * and all animations for the collaborative poem feature.
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jebbvyeenafpjrdhneoi.supabase.co',
  'sb_publishable_fM_rNj8c0L8gSlc1IuXwIA_466dQW4x'
);

const STORAGE_KEY = 'rh_contributed';
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
    linkInput: document.getElementById('rh-link-input'),
    covenant: document.getElementById('rh-covenant'),
    submit: document.getElementById('rh-submit'),
    submitText: null,
    submitSending: null,
    charCount: document.querySelector('.rh__char-count'),
    contextLines: document.querySelector('.rh__context-lines'),
    error: document.getElementById('rh-error'),
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
        }
      }
    )
    .subscribe();
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

  lines.forEach(function (line, i) {
    const el = createLineElement(line);

    if (animate) {
      el.style.animationDelay = Math.min(i * 50, 2000) + 'ms';
      el.classList.add('rh-line--entering');
    }

    // Time-based opacity: newest = 1, oldest fades to 0.55
    const ageRatio = lines.length > 1 ? i / (lines.length - 1) : 0;
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

  if (line.author_link) {
    const link = document.createElement('a');
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

  meta.appendChild(author);
  meta.appendChild(time);
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

  // Shift existing lines' opacity down slightly
  const existingLines = els.poem.querySelectorAll('.rh-line');
  const total = existingLines.length + 1;
  existingLines.forEach(function (existing, i) {
    const ageRatio = (i + 1) / (total - 1 || 1);
    const opacity = 1 - ageRatio * 0.45;
    existing.style.setProperty('--line-opacity', opacity);
  });

  els.poem.prepend(el);

  // Update context lines
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
      els.charCount.classList.toggle('rh__char-count--warn', len > 130);
      els.charCount.classList.toggle('rh__char-count--max', len >= 150);
    }
    validateForm();
  });

  els.nameInput.addEventListener('input', validateForm);
  els.covenant.addEventListener('change', validateForm);

  // Focus mode: dim surroundings
  els.lineInput.addEventListener('focus', function () {
    els.form.classList.add('rh__form--focus');
  });

  els.lineInput.addEventListener('blur', function () {
    els.form.classList.remove('rh__form--focus');
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
  const authorLink = els.linkInput ? els.linkInput.value.trim() : '';

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

    // After afterglow, show "contributed" message
    setTimeout(function () {
      if (els.contributed) {
        els.contributed.hidden = false;
        const card = els.contributed.querySelector('.reveal');
        if (card) {
          requestAnimationFrame(function () {
            card.classList.add('is-visible');
          });
        }
      }
    }, 3000);
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

      // Show loading briefly
      if (els.loading) els.loading.style.display = 'flex';
      if (els.poem) els.poem.style.opacity = '0.3';

      currentLines = await fetchLines(limit);

      if (els.loading) els.loading.style.display = 'none';
      if (els.poem) els.poem.style.opacity = '1';

      renderLines(currentLines, true);
    });
  });
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

  // Show contribution area after a brief delay
  setTimeout(function () {
    showContributeForm();
  }, 600);

  // Set up interactions
  initPills();
  initForm();
  subscribeToLines();
}

// Support both initial load and Astro view transitions
document.addEventListener('astro:page-load', init);
