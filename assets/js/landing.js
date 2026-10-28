/* Club Hunk Cartagena · Landing: animaciones e interacción (vanilla, sin dependencias) */
(() => {
  'use strict';

  const doc = document.documentElement;
  doc.classList.add('js');

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mqFino = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reduce = () => mqReduce.matches;
  const hasIO = 'IntersectionObserver' in window;
  const passive = { passive: true };

  /* ---------- 1. Reveal al scroll ---------- */
  function initReveal() {
    const els = $$('[data-reveal]');
    if (!els.length) return;
    els.forEach((el) => {
      const d = parseInt(el.dataset.delay, 10);
      if (d > 0) el.style.transitionDelay = d + 'ms';
    });
    if (reduce() || !hasIO) {
      els.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-visible');
        obs.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    els.forEach((el) => io.observe(el));
  }

  /* ---------- 2. Contadores ---------- */
  function initCounters() {
    const els = $$('[data-count]');
    if (!els.length) return;
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const render = (el, value, decimals) => {
      el.textContent = value.toLocaleString('es-CO', {
        useGrouping: !el.hasAttribute('data-sin-miles'),
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }) + (el.dataset.suffix || '');
    };

    const animate = (el) => {
      const raw = String(el.dataset.count).trim().replace(',', '.');
      const target = parseFloat(raw);
      if (!isFinite(target)) return;
      const decimals = (raw.split('.')[1] || '').length;
      if (reduce()) return render(el, target, decimals);
      const dur = 1600;
      let start = null;
      const step = (ts) => {
        if (start === null) start = ts;
        const p = Math.min((ts - start) / dur, 1);
        render(el, target * easeOutCubic(p), decimals);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    if (!hasIO) return els.forEach(animate);
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        animate(e.target);
        obs.unobserve(e.target);
      });
    }, { threshold: 0.4 });
    els.forEach((el) => io.observe(el));
  }

  /* ---------- 3. Header: .is-scrolled / .is-hidden + 4. barra de progreso ---------- */
  function initScrollUI() {
    const nav = $('#top-nav');
    const bar = document.createElement('div');
    bar.className = 'scroll-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.prepend(bar);

    let lastY = window.scrollY;
    let ticking = false;

    const update = () => {
      ticking = false;
      const y = window.scrollY;
      const max = doc.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(y / max, 1) : 0) + ')';

      if (nav) {
        nav.classList.toggle('is-scrolled', y > 40);
        const delta = y - lastY;
        const menuAbierto = document.body.classList.contains('nav-open');
        const focoDentro = nav.contains(document.activeElement);
        if (y < 120 || menuAbierto || focoDentro) nav.classList.remove('is-hidden');
        else if (delta > 6) nav.classList.add('is-hidden');
        else if (delta < -6) nav.classList.remove('is-hidden');
      }
      lastY = y;
    };

    const onScroll = () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    };
    window.addEventListener('scroll', onScroll, passive);
    window.addEventListener('resize', onScroll, passive);
    if (nav) nav.addEventListener('focusin', () => nav.classList.remove('is-hidden'));
    update();
  }

  /* ---------- 5. Menú móvil ---------- */
  function initMenu() {
    const toggle = $('.nav-toggle');
    const menu = $('#nav-menu');
    if (!toggle) return;

    const set = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('nav-open', open);
    };
    set(false);

    toggle.addEventListener('click', () => set(toggle.getAttribute('aria-expanded') !== 'true'));
    if (menu) {
      menu.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.body.classList.contains('nav-open')) {
        set(false);
        toggle.focus();
      }
    });
    const mqDesk = window.matchMedia('(min-width: 1024px)');
    const onDesk = (e) => { if (e.matches) set(false); };
    if (mqDesk.addEventListener) mqDesk.addEventListener('change', onDesk);
    else if (mqDesk.addListener) mqDesk.addListener(onDesk);
  }

  /* ---------- 6. Scroll-spy ---------- */
  function initScrollSpy() {
    const menu = $('#nav-menu');
    if (!menu || !hasIO) return;
    const pares = [];
    $$('a[href^="#"]', menu).forEach((a) => {
      const id = decodeURIComponent(a.getAttribute('href').slice(1));
      const sec = id && document.getElementById(id);
      if (sec) pares.push([sec, a]);
    });
    if (!pares.length) return;
    // Orden documental: así "la sección visible más arriba" es la primera del Map
    pares.sort(([a], [b]) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    const map = new Map(pares);

    const visibles = new Set();
    const marcar = () => {
      let activo = null;
      // La sección visible más arriba en el documento gana
      map.forEach((a, sec) => { if (!activo && visibles.has(sec)) activo = a; });
      map.forEach((a) => {
        const on = a === activo;
        a.classList.toggle('is-active', on);
        if (on) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? visibles.add(e.target) : visibles.delete(e.target)));
      marcar();
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    map.forEach((a, sec) => io.observe(sec));
  }

  /* ---------- 7. Parallax ---------- */
  function initParallax() {
    const els = $$('[data-parallax]');
    if (!els.length) return;
    const mqAncho = window.matchMedia('(min-width: 768px)');
    let ticking = false;
    let activos = new Set(els);

    if (hasIO) {
      activos = new Set();
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => (e.isIntersecting ? activos.add(e.target) : activos.delete(e.target)));
      }, { rootMargin: '200px 0px' });
      els.forEach((el) => io.observe(el));
    }

    const update = () => {
      ticking = false;
      const on = mqAncho.matches && !reduce();
      const vh = window.innerHeight;
      els.forEach((el) => {
        if (!on) { el.style.transform = ''; return; }
        if (!activos.has(el)) return;
        const speed = parseFloat(el.dataset.parallax) || 0.2;
        const r = el.getBoundingClientRect();
        const offset = (r.top + r.height / 2 - vh / 2) * -speed;
        el.style.transform = 'translate3d(0,' + offset.toFixed(1) + 'px,0)';
      });
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', onScroll, passive);
    window.addEventListener('resize', onScroll, passive);
    els.forEach((el) => { el.style.willChange = 'transform'; });
    requestAnimationFrame(update);
  }

  /* ---------- 8. Tilt 3D [data-tilt] y magnético [data-magnetic] (solo puntero fino) ---------- */
  function initPointerFx() {
    if (reduce() || !mqFino.matches) return;

    $$('[data-tilt]').forEach((el) => {
      const max = parseFloat(el.dataset.tilt) || 8; // grados máximos
      let raf = 0;
      el.style.transformStyle = 'preserve-3d';
      el.style.transition = 'transform .4s var(--ease, ease)';
      el.addEventListener('pointermove', (e) => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          const r = el.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width - 0.5;
          const y = (e.clientY - r.top) / r.height - 0.5;
          el.style.transition = 'transform .08s linear';
          el.style.transform = 'perspective(900px) rotateX(' + (-y * max).toFixed(2) +
            'deg) rotateY(' + (x * max).toFixed(2) + 'deg) translateZ(0)';
          el.style.setProperty('--tilt-x', ((x + 0.5) * 100).toFixed(1) + '%');
          el.style.setProperty('--tilt-y', ((y + 0.5) * 100).toFixed(1) + '%');
        });
      }, passive);
      el.addEventListener('pointerleave', () => {
        cancelAnimationFrame(raf);
        el.style.transition = 'transform .5s var(--ease, ease)';
        el.style.transform = '';
      });
    });

    $$('[data-magnetic]').forEach((el) => {
      const fuerza = parseFloat(el.dataset.magnetic) || 0.3;
      let raf = 0;
      el.addEventListener('pointermove', (e) => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          const r = el.getBoundingClientRect();
          const dx = (e.clientX - (r.left + r.width / 2)) * fuerza;
          const dy = (e.clientY - (r.top + r.height / 2)) * fuerza;
          el.style.transition = 'transform .15s ease-out';
          el.style.transform = 'translate3d(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px,0)';
        });
      }, passive);
      el.addEventListener('pointerleave', () => {
        cancelAnimationFrame(raf);
        el.style.transition = 'transform .45s cubic-bezier(.2,.8,.2,1)';
        el.style.transform = '';
      });
    });
  }

  let iniciado = false;
  function init() {
    if (iniciado) return;
    iniciado = true;
    initReveal();
    initCounters();
    initScrollUI();
    initMenu();
    initScrollSpy();
    initParallax();
    initPointerFx();
  }

  // Con defer, esperamos a DOMContentLoaded para que feed.js ya haya montado su DOM
  // (sus botones usan data-magnetic). 'load' es solo una red de seguridad.
  if (document.readyState === 'complete') init();
  else {
    document.addEventListener('DOMContentLoaded', init, { once: true });
    window.addEventListener('load', init, { once: true });
  }
})();
