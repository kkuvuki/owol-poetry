// Referral Tracking System for the OwOL Collaborative Poem
//
// Tracks how people arrive at the site and who referred them,
// creating a viral referral chain.
//
// SQL schema addition:
// ALTER TABLE poem_lines ADD COLUMN referred_by TEXT;
//
// To query the referral chain:
// SELECT author_name, referred_by, created_at
// FROM poem_lines
// WHERE referred_by IS NOT NULL
// ORDER BY created_at;

const STORAGE_KEY_REFERRED_BY = 'owol_referred_by';
const STORAGE_KEY_MY_CODE = 'owol_referral_code';
const SITE_URL = 'https://itsowol.com/poem';

/**
 * Generate a simple hash from a string, returning a 6-char alphanumeric code.
 */
function hashToCode(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  // Convert to positive number, then to base-36 (alphanumeric), take 6 chars
  const positive = Math.abs(hash);
  return positive.toString(36).padStart(6, '0').slice(0, 6);
}

/**
 * Build a browser fingerprint string from available signals.
 */
function getBrowserFingerprint() {
  const parts = [
    navigator.userAgent || '',
    `${screen.width}x${screen.height}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone || '',
  ];
  return parts.join('|');
}

/**
 * Reads `?ref=` from the current URL, stores in localStorage.
 * Call this on page load.
 * @returns {string|null} The referral code that brought this user, or null.
 */
export function initReferralTracking() {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref');

  if (ref && ref.length > 0) {
    // Only store if the ref code is not the user's own code
    const myCode = localStorage.getItem(STORAGE_KEY_MY_CODE);
    if (ref !== myCode) {
      localStorage.setItem(STORAGE_KEY_REFERRED_BY, ref);
    }
  }

  return localStorage.getItem(STORAGE_KEY_REFERRED_BY) || null;
}

/**
 * Generates or retrieves a stable referral code for the current user.
 * Based on a hash of the browser fingerprint, stored in localStorage.
 * @returns {string} A 6-character alphanumeric referral code.
 */
export function getMyReferralCode() {
  let code = localStorage.getItem(STORAGE_KEY_MY_CODE);
  if (code) return code;

  const fingerprint = getBrowserFingerprint();
  code = hashToCode(fingerprint);
  localStorage.setItem(STORAGE_KEY_MY_CODE, code);
  return code;
}

/**
 * Returns the referral code that brought this user to the site.
 * @returns {string|null} The referring user's code, or null if organic visit.
 */
export function getReferredBy() {
  return localStorage.getItem(STORAGE_KEY_REFERRED_BY) || null;
}

/**
 * Builds a share URL with the current user's referral code appended.
 * @param {string} [baseUrl] - The base URL to append to. Defaults to the poem page.
 * @returns {string} The full URL with `?ref=` parameter.
 */
export function buildShareUrl(baseUrl = SITE_URL) {
  const code = getMyReferralCode();
  const url = new URL(baseUrl);
  url.searchParams.set('ref', code);
  return url.toString();
}

/**
 * Returns pre-built share text with the referral URL included.
 * @param {string} lineText - The poem line the user contributed or is sharing.
 * @param {string} authorName - The author's display name.
 * @returns {string} Ready-to-share text with referral link.
 */
export function getShareText(lineText, authorName) {
  const shareUrl = buildShareUrl();
  return `"${lineText}" — ${authorName}\n\nAdd your line to the OwOL poem:\n${shareUrl}`;
}
