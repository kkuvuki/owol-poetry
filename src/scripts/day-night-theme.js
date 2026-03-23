/**
 * Day/Night Auto-Theme Module
 *
 * Subtly shifts the dark palette based on the user's local time.
 * The site remains dark at all times — this is NOT a light/dark toggle.
 *
 * Time periods:
 *   Dawn  (5am–8am)  — warmer background tint, amber-tinted accent
 *   Day   (8am–5pm)  — default palette (no changes)
 *   Dusk  (5pm–8pm)  — purple/rose accent, warmer muted tones
 *   Night (8pm–5am)  — deeper blacks, cooler/bluer text, dimmer accent
 */

const BASE_PALETTE = {
  '--color-bg':              '#13100D',
  '--color-bg-surface':      '#1C1916',
  '--color-bg-elevated':     '#252119',
  '--color-text-primary':    '#EFF0ED',
  '--color-text-secondary':  '#B0B1AB',
  '--color-text-muted':      '#908F8A',
  '--color-accent-green':    '#79B939',
  '--color-accent-green-hover': '#8AC44F',
  '--color-separator':       'rgba(255, 255, 255, 0.06)',
  '--color-card-border':     'rgba(255, 255, 255, 0.04)',
};

const THEME_SHIFTS = {
  dawn: {
    '--color-bg':              '#161110',
    '--color-bg-surface':      '#1F1914',
    '--color-bg-elevated':     '#28211A',
    '--color-text-primary':    '#F0EDE6',
    '--color-text-secondary':  '#B5AFA3',
    '--color-text-muted':      '#969085',
    '--color-accent-green':    '#A0A632',
    '--color-accent-green-hover': '#B2B844',
    '--color-separator':       'rgba(255, 240, 220, 0.06)',
    '--color-card-border':     'rgba(255, 240, 220, 0.04)',
  },
  day: { ...BASE_PALETTE },
  dusk: {
    '--color-bg':              '#14100F',
    '--color-bg-surface':      '#1D1818',
    '--color-bg-elevated':     '#26201F',
    '--color-text-primary':    '#EDE9EC',
    '--color-text-secondary':  '#AEA8B0',
    '--color-text-muted':      '#948D94',
    '--color-accent-green':    '#8AAD52',
    '--color-accent-green-hover': '#9ABE62',
    '--color-separator':       'rgba(255, 230, 245, 0.06)',
    '--color-card-border':     'rgba(255, 230, 245, 0.04)',
  },
  night: {
    '--color-bg':              '#0E0C0A',
    '--color-bg-surface':      '#161412',
    '--color-bg-elevated':     '#1E1B17',
    '--color-text-primary':    '#E4E8EF',
    '--color-text-secondary':  '#A5AAB3',
    '--color-text-muted':      '#858990',
    '--color-accent-green':    '#6BA332',
    '--color-accent-green-hover': '#7DB544',
    '--color-separator':       'rgba(200, 220, 255, 0.05)',
    '--color-card-border':     'rgba(200, 220, 255, 0.03)',
  },
};

/** Determine the current time period based on the user's local hour. */
export function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'dusk';
  return 'night';
}

/** Apply a theme's CSS custom properties to :root. */
export function applyTheme(period) {
  const palette = THEME_SHIFTS[period];
  if (!palette) return;

  const root = document.documentElement;
  for (const [prop, value] of Object.entries(palette)) {
    root.style.setProperty(prop, value);
  }

  // Tag the current period on <html> for any CSS that wants to hook into it
  root.dataset.timePeriod = period;
}

let _interval = null;

/**
 * Initialise the day/night theme system.
 * Reads local time, applies the matching palette, and sets up:
 *   - an hourly re-check via setInterval
 *   - a visibilitychange listener so the theme updates when the tab refocuses
 */
export function initDayNightTheme() {
  // Inject a smooth transition so palette shifts are not jarring
  const style = document.createElement('style');
  style.textContent = `
    *, *::before, *::after {
      transition: background-color 2s ease, color 2s ease, border-color 2s ease, box-shadow 2s ease;
    }
  `;
  document.head.appendChild(style);

  // Apply immediately
  applyTheme(getTimeOfDay());

  // Re-check every hour (3 600 000 ms)
  if (_interval) clearInterval(_interval);
  _interval = setInterval(() => {
    applyTheme(getTimeOfDay());
  }, 3_600_000);

  // Also update when the user returns to the tab
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      applyTheme(getTimeOfDay());
    }
  });
}
