(() => {
  'use strict';

  const root = document.documentElement;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isCoarsePointer = window.matchMedia('(hover: none)').matches || window.innerWidth < 900;

  /* ---- Theme toggle (persisted per-viewer, best-effort) ---- */
  const themeToggle = document.getElementById('themeToggle');
  const applyTheme = (theme) => {
    root.setAttribute('data-theme', theme);
    themeToggle.setAttribute('aria-pressed', String(theme === 'light'));
  };
  try {
    const saved = localStorage.getItem('aqeela-theme');
    if (saved) applyTheme(saved);
    else if (window.matchMedia('(prefers-color-scheme: light)').matches) applyTheme('light');
  } catch (_) { /* storage unavailable */ }

  themeToggle.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem('aqeela-theme', next); } catch (_) { /* ignore */ }
  });

  /* ---- Mobile menu ---- */
  const menuToggle = document.getElementById('menuToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  const closeMenu = () => {
    mobileMenu.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
  };
  menuToggle.addEventListener('click', () => {
    const isOpen = mobileMenu.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
  });
  mobileMenu.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMenu));

  /* ---- Nav scroll state + scroll-spy ---- */
  const nav = document.getElementById('nav');
  const sections = document.querySelectorAll('main section[id]');
  const navAnchors = document.querySelectorAll('.nav-link-item');

  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 12);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  if ('IntersectionObserver' in window && sections.length) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = entry.target.getAttribute('id');
        navAnchors.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#${id}`));
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    sections.forEach((s) => spy.observe(s));
  }

  /* ---- Scroll-reveal (.reveal + .split-in) ---- */
  const revealTargets = document.querySelectorAll('.reveal, .split-in');

  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    revealTargets.forEach((el) => el.classList.add('in-view'));
  } else {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const delay = Number(el.dataset.delay || 0);
        if (delay) {
          setTimeout(() => el.classList.add('in-view'), delay);
        } else {
          el.classList.add('in-view');
        }
        revealObserver.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealTargets.forEach((el) => revealObserver.observe(el));
  }

  /* ---- Timeline fill + dot pulse ---- */
  const timeline = document.querySelector('.timeline');
  if (timeline) {
    const fill = timeline.querySelector('.timeline-fill');
    const items = timeline.querySelectorAll('.timeline-item');

    if (!prefersReducedMotion && 'IntersectionObserver' in window) {
      const itemObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('in-view');
        });
      }, { threshold: 0.4 });
      items.forEach((item) => itemObserver.observe(item));

      const updateFill = () => {
        const rect = timeline.getBoundingClientRect();
        const total = rect.height;
        const visible = Math.min(Math.max(window.innerHeight * 0.75 - rect.top, 0), total);
        if (fill) fill.style.height = `${(visible / total) * 100}%`;
      };
      updateFill();
      window.addEventListener('scroll', updateFill, { passive: true });
      window.addEventListener('resize', updateFill);
    } else {
      items.forEach((item) => item.classList.add('in-view'));
      if (fill) fill.style.height = '100%';
    }
  }

  /* ---- Animated stat counters ---- */
  const counters = document.querySelectorAll('.stat-num');
  const animateCounter = (el) => {
    const target = parseFloat(el.dataset.count);
    const isDecimal = el.dataset.decimal === 'true';
    const duration = 1400;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = target * eased;
      el.textContent = isDecimal ? value.toFixed(2) : Math.round(value);
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = isDecimal ? target.toFixed(2) : target;
    };
    requestAnimationFrame(tick);
  };

  if (counters.length) {
    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      counters.forEach((el) => {
        const target = parseFloat(el.dataset.count);
        el.textContent = el.dataset.decimal === 'true' ? target.toFixed(2) : target;
      });
    } else {
      const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            counterObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.5 });
      counters.forEach((el) => counterObserver.observe(el));
    }
  }

  /* ---- Cursor glow (desktop only) ---- */
  const cursorGlow = document.getElementById('cursorGlow');
  if (cursorGlow && !isCoarsePointer && !prefersReducedMotion) {
    let gx = window.innerWidth / 2, gy = window.innerHeight / 2;
    let tx = gx, ty = gy;
    window.addEventListener('mousemove', (e) => {
      tx = e.clientX; ty = e.clientY;
      cursorGlow.classList.add('active');
    });
    const raf = () => {
      gx += (tx - gx) * 0.12;
      gy += (ty - gy) * 0.12;
      cursorGlow.style.transform = `translate(${gx}px, ${gy}px) translate(-50%, -50%)`;
      requestAnimationFrame(raf);
    };
    raf();
  }

  /* ---- Magnetic buttons ---- */
  if (!isCoarsePointer && !prefersReducedMotion) {
    document.querySelectorAll('.magnetic').forEach((el) => {
      let bounds;
      el.addEventListener('mouseenter', () => { bounds = el.getBoundingClientRect(); });
      el.addEventListener('mousemove', (e) => {
        if (!bounds) bounds = el.getBoundingClientRect();
        const relX = e.clientX - bounds.left - bounds.width / 2;
        const relY = e.clientY - bounds.top - bounds.height / 2;
        el.style.transform = `translate(${relX * 0.28}px, ${relY * 0.28}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = 'translate(0,0)'; });
    });
  }

  /* ---- Tilt cards (3D hover) ---- */
  if (!isCoarsePointer && !prefersReducedMotion) {
    document.querySelectorAll('.tilt').forEach((card) => {
      let bounds;
      card.addEventListener('mouseenter', () => { bounds = card.getBoundingClientRect(); });
      card.addEventListener('mousemove', (e) => {
        if (!bounds) bounds = card.getBoundingClientRect();
        const px = (e.clientX - bounds.left) / bounds.width;
        const py = (e.clientY - bounds.top) / bounds.height;
        const rotateX = (0.5 - py) * 10;
        const rotateY = (px - 0.5) * 10;
        card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(900px) rotateX(0) rotateY(0) translateY(0)';
      });
    });
  }

  /* ---- Back to top ---- */
  const toTop = document.getElementById('toTop');
  if (toTop) {
    toTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });
  }

  /* ---- Footer year ---- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
