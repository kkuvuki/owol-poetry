/**
 * OwOL Poetry — Main JavaScript
 *
 * Handles:
 * - Smooth scrolling (native + Lenis-inspired easing via CSS)
 * - Scroll-triggered reveal animations (Intersection Observer)
 * - Header scroll state
 * - Mobile menu toggle
 *
 * Zero dependencies. Vanilla JS. Progressive enhancement.
 */

(function () {
  'use strict';

  /* ══════════════════════════════════════════
   * Scroll Reveal — Intersection Observer
   * ══════════════════════════════════════════ */

  const REVEAL_THRESHOLD = 0.15;
  const REVEAL_ROOT_MARGIN = '0px 0px -60px 0px';

  function initReveal() {
    const elements = document.querySelectorAll('.reveal');

    if (!elements.length) return;

    // Check reduced motion preference.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      elements.forEach(function (el) {
        el.classList.add('is-visible');
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;

          var el = entry.target;
          var delay = parseInt(el.getAttribute('data-reveal-delay') || '0', 10);

          if (delay > 0) {
            setTimeout(function () {
              el.classList.add('is-visible');
            }, delay);
          } else {
            el.classList.add('is-visible');
          }

          observer.unobserve(el);
        });
      },
      {
        threshold: REVEAL_THRESHOLD,
        rootMargin: REVEAL_ROOT_MARGIN,
      }
    );

    elements.forEach(function (el) {
      observer.observe(el);
    });
  }

  /* ══════════════════════════════════════════
   * Header — scroll state
   * ══════════════════════════════════════════ */

  function initHeader() {
    var header = document.querySelector('.site-header');
    if (!header) return;

    var scrollThreshold = 80;
    var ticking = false;

    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(function () {
          if (window.scrollY > scrollThreshold) {
            header.classList.add('is-scrolled');
          } else {
            header.classList.remove('is-scrolled');
          }
          ticking = false;
        });
        ticking = true;
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });

    // Set initial state.
    onScroll();
  }

  /* ══════════════════════════════════════════
   * Mobile Menu Toggle
   * ══════════════════════════════════════════ */

  function initMobileMenu() {
    var toggle = document.querySelector('.site-nav__toggle');
    var menu = document.getElementById('primary-menu');

    if (!toggle || !menu) return;

    toggle.addEventListener('click', function () {
      var isOpen = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!isOpen));
      menu.classList.toggle('is-open');

      // Prevent body scroll when menu is open.
      document.body.style.overflow = isOpen ? '' : 'hidden';
    });

    // Close menu when a link is clicked.
    menu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        toggle.setAttribute('aria-expanded', 'false');
        menu.classList.remove('is-open');
        document.body.style.overflow = '';
      });
    });

    // Close menu on Escape key.
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) {
        toggle.setAttribute('aria-expanded', 'false');
        menu.classList.remove('is-open');
        document.body.style.overflow = '';
        toggle.focus();
      }
    });
  }

  /* ══════════════════════════════════════════
   * Smooth Scroll Enhancement
   * Uses native CSS scroll-behavior: smooth as
   * the baseline, enhanced with JS for anchor
   * links to respect the fixed header offset.
   * ══════════════════════════════════════════ */

  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener('click', function (e) {
        var targetId = this.getAttribute('href');
        if (targetId === '#') return;

        var target = document.querySelector(targetId);
        if (!target) return;

        e.preventDefault();

        var headerHeight = document.querySelector('.site-header')?.offsetHeight || 0;
        var targetPosition = target.getBoundingClientRect().top + window.scrollY - headerHeight - 24;

        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth',
        });

        // Update URL without jumping.
        history.pushState(null, '', targetId);
      });
    });
  }

  /* ══════════════════════════════════════════
   * Parallax-style scroll hint fade-out
   * The hero scroll hint fades as user scrolls.
   * ══════════════════════════════════════════ */

  function initScrollHintFade() {
    var hint = document.querySelector('.hero__scroll-hint');
    if (!hint) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var ticking = false;

    window.addEventListener(
      'scroll',
      function () {
        if (!ticking) {
          window.requestAnimationFrame(function () {
            var scrollY = window.scrollY;
            var fadeDistance = 200;
            var opacity = Math.max(0, 1 - scrollY / fadeDistance);
            hint.style.opacity = opacity;
            ticking = false;
          });
          ticking = true;
        }
      },
      { passive: true }
    );
  }

  /* ══════════════════════════════════════════
   * Init
   * ══════════════════════════════════════════ */

  function init() {
    initReveal();
    initHeader();
    initMobileMenu();
    initSmoothScroll();
    initScrollHintFade();
  }

  // Run on DOM ready.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
