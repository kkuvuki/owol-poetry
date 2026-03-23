/**
 * Ink Trail — Cursor-following ink glow on poem lines
 *
 * Updates CSS custom properties (--ink-x, --ink-y) on poem line elements
 * to create a subtle radial glow that follows the mouse, simulating
 * an ink trail or pen light moving across the text.
 */

export function initInkTrail() {
  function handleMouseMove(e) {
    var target = e.target.closest('.rh-line, .poem-page__line');
    if (!target) return;
    var rect = target.getBoundingClientRect();
    target.style.setProperty('--ink-x', (e.clientX - rect.left) + 'px');
    target.style.setProperty('--ink-y', (e.clientY - rect.top) + 'px');
  }

  document.addEventListener('mousemove', handleMouseMove, { passive: true });

  return {
    destroy: function () {
      document.removeEventListener('mousemove', handleMouseMove);
    }
  };
}
