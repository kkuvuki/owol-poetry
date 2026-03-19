/**
 * OwOL Poetry — Main JavaScript
 *
 * Handles:
 * - Lenis smooth scrolling
 * - Scroll-triggered reveal animations (Intersection Observer)
 * - Header scroll state
 * - Mobile menu toggle
 */

import Lenis from 'lenis';

(function () {
  'use strict';

  /* ══════════════════════════════════════════
   * Lenis Smooth Scroll
   * ══════════════════════════════════════════ */

  var lenis = null;
  var lenisRafId = null;

  function initLenis() {
    // Respect reduced motion preference.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    lenis = new Lenis({
      duration: 1.2,
      easing: function (t) {
        return Math.min(1, 1.001 - Math.pow(2, -10 * t));
      },
      smooth: true,
      smoothTouch: false,
    });

    function raf(time) {
      lenis.raf(time);
      lenisRafId = requestAnimationFrame(raf);
    }

    lenisRafId = requestAnimationFrame(raf);
  }

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

      // Pause/resume Lenis when menu opens/closes.
      if (lenis) {
        if (!isOpen) {
          lenis.stop();
        } else {
          lenis.start();
        }
      }
    });

    // Close menu when a link is clicked.
    menu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        toggle.setAttribute('aria-expanded', 'false');
        menu.classList.remove('is-open');
        document.body.style.overflow = '';
        if (lenis) lenis.start();
      });
    });

    // Close menu on Escape key.
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) {
        toggle.setAttribute('aria-expanded', 'false');
        menu.classList.remove('is-open');
        document.body.style.overflow = '';
        if (lenis) lenis.start();
        toggle.focus();
      }
    });
  }

  /* ══════════════════════════════════════════
   * Smooth Scroll Enhancement for Anchor Links
   * Uses Lenis scrollTo when available, falls
   * back to native smooth scroll.
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

        if (lenis) {
          lenis.scrollTo(target, { offset: -(headerHeight + 24) });
        } else {
          var targetPosition = target.getBoundingClientRect().top + window.scrollY - headerHeight - 24;
          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth',
          });
        }

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
    initLenis();
    initReveal();
    initHeader();
    initMobileMenu();
    initSmoothScroll();
    initScrollHintFade();
  }

  // Use astro:page-load which fires on initial load AND view transitions.
  // This replaces DOMContentLoaded to avoid double-initialization.
  document.addEventListener('astro:page-load', function () {
    // Cancel rAF and destroy Lenis to avoid stale DOM references.
    if (lenisRafId) {
      cancelAnimationFrame(lenisRafId);
      lenisRafId = null;
    }
    if (lenis) {
      lenis.destroy();
      lenis = null;
    }
    initLenis();
    initReveal();
    initHeader();
    initMobileMenu();
    initSmoothScroll();
    initScrollHintFade();
  });
})();

