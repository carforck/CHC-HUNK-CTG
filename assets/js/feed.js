/* Club Hunk Cartagena · Feed de redes (TikTok en vivo + publicaciones del club y de la comunidad)
 * Vanilla, sin dependencias. Se monta en <div id="feed-root"></div>.
 *
 * FUENTE DE DATOS
 * - FEED_ENDPOINT = window.CHC_FEED_ENDPOINT || data-src de #feed-root || 'data/feed.json'.
 * - En producción el endpoint lo sirve una función serverless (en /api, la crea el coordinador)
 *   que junta y modera: TikTok propio (Display API), Instagram propio (Graph API /media),
 *   Instagram donde etiquetan al club (Graph API /tags) y el hashtag #ClubHunkCartagena
 *   (ig_hashtag_search), y devuelve el MISMO esquema que data/feed.json con "fuente":"api".
 * - Si el endpoint falla se intenta data/feed.json; si también falla (p. ej. file://) se usa
 *   un fallback embebido mínimo.
 * - Se refresca cada 5 min mientras la pestaña está visible; las publicaciones nuevas
 *   (deduplicadas por id) entran arriba con animación y un aviso "N publicaciones nuevas".
 */
(() => {
  'use strict';

  const root = document.getElementById('feed-root');
  if (!root) return;

  const ESTATICO = 'data/feed.json';
  const FEED_ENDPOINT = window.CHC_FEED_ENDPOINT || root.dataset.src || ESTATICO;
  const INTERVALO = 5 * 60 * 1000;
  const USER = 'clubhunkcartagena';
  const TIKTOK_URL = 'https://www.tiktok.com/@' + USER;
  const IG_URL = 'https://www.instagram.com/' + USER;
  const LOGO = 'recursos/logo/club-hunk-logo-circular.webp';
  const EMBED_JS = 'https://www.tiktok.com/embed.js';
  const EMBED_TIMEOUT = 8000;

  /* Fallback mínimo embebido */
  const FALLBACK = {
    fuente: 'estatico',
    actualizado: '2026-10-24T08:00:00-05:00',
    perfiles: {
      tiktok: { usuario: USER, url: TIKTOK_URL, seguidores: 1187, meGusta: 3060 },
      instagram: { usuario: USER, url: IG_URL },
    },
    publicaciones: [
      { id: 'tt-familia', origen: 'propio', red: 'tiktok', tipo: 'video', titulo: '¿Quieres hacer parte de esta hermosa familia? ¡Escríbenos!', imagen: 'recursos/fotos/integrantes.webp', url: TIKTOK_URL, vistas: 12600, fecha: '2026-09-28', anclado: true },
      { id: 'tt-rodada-nocturna', origen: 'propio', red: 'tiktok', tipo: 'video', titulo: 'Rodada nocturna del club', imagen: 'recursos/fotos/rodada-nocturna.webp', url: TIKTOK_URL, vistas: 10800, fecha: '2026-09-20', anclado: true },
      { id: 'tt-mirador-marias', origen: 'propio', red: 'tiktok', tipo: 'video', titulo: 'Rodada para el mirador de las marías', imagen: 'recursos/fotos/rodada-grupo.webp', url: TIKTOK_URL, vistas: 2453, fecha: '2026-10-12' },
      { id: 'ig-familia-chc', origen: 'propio', red: 'instagram', tipo: 'foto', titulo: 'Somos familia CHC ✌️🏍️', imagen: 'recursos/fotos/integrantes.webp', url: IG_URL, fecha: '2026-10-02' },
    ],
  };

  /* ---------- Datos ---------- */
  async function leer(url) {
    const res = await fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (!data || !Array.isArray(data.publicaciones)) throw new Error('Esquema inválido');
    return data;
  }

  /**
   * Devuelve { fuente, actualizado, perfiles, publicaciones[] } o null si no hay red.
   * Orden: endpoint configurable (serverless) → data/feed.json estático.
   */
  async function obtenerPublicaciones() {
    const urls = FEED_ENDPOINT === ESTATICO ? [ESTATICO] : [FEED_ENDPOINT, ESTATICO];
    for (const url of urls) {
      try { return await leer(url); } catch (e) { /* probar la siguiente fuente */ }
    }
    return null;
  }

  /* ---------- Utilidades ---------- */
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const nf = (n, dec = 0) => Number(n).toLocaleString('es-CO', { minimumFractionDigits: dec, maximumFractionDigits: dec });

  function formatoVistas(n) {
    if (typeof n !== 'number' || !isFinite(n)) return '';
    if (n >= 1e6) return nf(n / 1e6, 1).replace(/,0$/, '') + ' M';
    if (n >= 10000) return nf(n / 1000, 1).replace(/,0$/, '') + ' mil';
    return nf(n);
  }

  function aFecha(iso) {
    if (!iso) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso); // solo fecha → hora local
    const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(iso);
    return isNaN(d) ? null : d;
  }

  function formatoFecha(iso) {
    const d = aFecha(iso);
    return d ? d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/\./g, '') : '';
  }

  function hace(iso) {
    const d = aFecha(iso);
    if (!d) return '';
    const min = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
    if (min < 1) return 'hace un momento';
    if (min < 60) return 'hace ' + min + ' min';
    const h = Math.round(min / 60);
    if (h < 24) return 'hace ' + h + ' h';
    const dias = Math.round(h / 24);
    return dias === 1 ? 'hace 1 día' : 'hace ' + dias + ' días';
  }

  function el(tag, attrs, children) {
    const n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach((k) => {
      const v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'html') n.innerHTML = v; // solo SVG estáticos internos
      else n.setAttribute(k, v === true ? '' : v);
    });
    (children || []).forEach((c) => c && n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
    return n;
  }

  const ICON = {
    tiktok: '<svg viewBox="0 0 24 24" focusable="false"><path fill="currentColor" d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.6 2.6 0 0 1-2.6-2.6 2.6 2.6 0 0 1 3.4-2.47V9.68a5.7 5.7 0 0 0-.8-.06 5.69 5.69 0 0 0-5.69 5.69A5.69 5.69 0 0 0 9.86 21a5.69 5.69 0 0 0 5.68-5.69V9.01a7.34 7.34 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" focusable="false"><path fill="currentColor" d="M12 2.2c3.2 0 3.58 0 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85s0 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.65.07-4.85.07s-3.58 0-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92C2.17 15.58 2.16 15.2 2.16 12s0-3.58.07-4.85C2.38 3.92 3.9 2.38 7.15 2.23 8.42 2.17 8.8 2.16 12 2.16zM12 0C8.74 0 8.33 0 7.05.07 2.7.27.27 2.69.07 7.05 0 8.33 0 8.74 0 12s0 3.67.07 4.95c.2 4.36 2.62 6.78 6.98 6.98C8.33 24 8.74 24 12 24s3.67 0 4.95-.07c4.35-.2 6.78-2.62 6.98-6.98C24 15.67 24 15.26 24 12s0-3.67-.07-4.95c-.2-4.35-2.62-6.78-6.98-6.98C15.67 0 15.26 0 12 0zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.4-11.85a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88z"/></svg>',
    play: '<svg viewBox="0 0 24 24" focusable="false"><path fill="currentColor" d="M8 5.14v13.72a1 1 0 0 0 1.52.85l11-6.86a1 1 0 0 0 0-1.7l-11-6.86A1 1 0 0 0 8 5.14z"/></svg>',
    ver: '<svg viewBox="0 0 24 24" focusable="false"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
    pin: '<svg viewBox="0 0 24 24" focusable="false"><path fill="currentColor" d="M16 3a1 1 0 0 1 .7 1.7L15.4 6l2.6 5.2 1.3-1.3a1 1 0 0 1 1.4 1.4l-3.5 3.5-1.4-1.4L12 17.2V21l-1-1-2.8-2.8L4.7 20.7a1 1 0 0 1-1.4-1.4l3.5-3.5L4 13l-1-1h3.8l3.8-3.8-1.4-1.4 3.5-3.5A1 1 0 0 1 16 3z"/></svg>',
    ojo: '<svg viewBox="0 0 24 24" focusable="false"><path fill="currentColor" d="M12 5c-5 0-9 4.5-10 7 1 2.5 5 7 10 7s9-4.5 10-7c-1-2.5-5-7-10-7zm0 11.5a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9zm0-2.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/></svg>',
    arroba: '<svg viewBox="0 0 24 24" focusable="false"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0zm0 0v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-3.5 7.1"/></svg>',
    flecha: '<svg viewBox="0 0 24 24" focusable="false"><path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" d="M12 19V5M5 12l7-7 7 7"/></svg>',
  };
  const icon = (name, cls) => el('span', { class: 'feed-ico' + (cls ? ' ' + cls : ''), 'aria-hidden': 'true', html: ICON[name] });

  /* ---------- Estado ---------- */
  const ORIGENES = [
    { id: 'todo', label: 'Todo' },
    { id: 'propio', label: 'Del club' },
    { id: 'etiqueta', label: 'La comunidad' },
  ];
  const REDES = [
    { id: 'todas', label: 'Todas las redes' },
    { id: 'tiktok', label: 'TikTok', ico: 'tiktok' },
    { id: 'instagram', label: 'Instagram', ico: 'instagram' },
  ];
  const estado = { origen: 'todo', red: 'todas' };
  let datos = null;            // meta (perfiles, actualizado, fuente)
  let store = [];              // publicaciones deduplicadas
  let nuevosIds = new Set();   // recién llegadas en el último refresco

  const origenDe = (p) => (p.origen === 'etiqueta' ? 'etiqueta' : 'propio');
  const redDe = (p) => (p.red === 'instagram' ? 'instagram' : 'tiktok');
  const coincide = (p) =>
    (estado.origen === 'todo' || origenDe(p) === estado.origen) &&
    (estado.red === 'todas' || redDe(p) === estado.red);

  /* ---------- Estructura ---------- */
  root.textContent = '';
  const wrap = el('div', { class: 'feed' });

  const tablist = el('div', { class: 'feed-tabs', role: 'tablist', 'aria-label': 'Mostrar publicaciones' });
  const indicador = el('span', { class: 'feed-tabs__ind', 'aria-hidden': 'true' });
  tablist.appendChild(indicador);
  const tabs = ORIGENES.map((o) => {
    const b = el('button', {
      type: 'button', role: 'tab', class: 'feed-tab', id: 'feed-tab-' + o.id, 'data-origen': o.id,
      'aria-controls': 'feed-panel', 'aria-selected': String(o.id === estado.origen), tabindex: o.id === estado.origen ? '0' : '-1',
    }, [el('span', { text: o.label })]);
    tablist.appendChild(b);
    return b;
  });

  const chips = el('div', { class: 'feed-chips', role: 'group', 'aria-label': 'Filtrar por red social' });
  const chipBtns = REDES.map((r) => {
    const b = el('button', { type: 'button', class: 'feed-chip', 'data-red': r.id, 'aria-pressed': String(r.id === estado.red) },
      [r.ico ? icon(r.ico) : null, el('span', { text: r.label })]);
    chips.appendChild(b);
    return b;
  });

  const stats = el('p', { class: 'feed-stats' });
  const toolbar = el('div', { class: 'feed-toolbar' }, [
    el('div', { class: 'feed-filtros' }, [tablist, chips]),
    stats,
  ]);

  const panel = el('div', { class: 'feed-panel', role: 'tabpanel', id: 'feed-panel', 'aria-labelledby': 'feed-tab-' + estado.origen, tabindex: '-1' });

  /* Aviso de nuevas publicaciones (región viva) */
  const aviso = el('div', { class: 'feed-aviso', role: 'status', 'aria-live': 'polite' });
  const avisoBtn = el('button', { type: 'button', class: 'feed-aviso__btn', hidden: true }, [icon('flecha'), el('span')]);
  aviso.appendChild(avisoBtn);

  /* Zona TikTok en vivo */
  const live = el('div', { class: 'feed-live', 'data-estado': 'espera' });
  const skeleton = el('div', { class: 'feed-skeleton', role: 'status' }, [
    el('img', { class: 'feed-skeleton__logo', src: LOGO, alt: '', width: '72', height: '72', loading: 'lazy', decoding: 'async' }),
    el('span', { class: 'feed-skeleton__txt', text: 'Cargando TikTok en vivo…' }),
    el('span', { class: 'feed-skeleton__bars', 'aria-hidden': 'true' }, [el('i'), el('i'), el('i')]),
  ]);
  const embedBox = el('div', { class: 'feed-live__embed' });
  const fallback = el('div', { class: 'feed-live__fallback', hidden: true });
  live.append(skeleton, embedBox, fallback);

  const ctaComunidad = () => el('div', { class: 'feed-cta' }, [
    icon('arroba', 'feed-cta__ico'),
    el('p', { class: 'feed-cta__txt' }, [
      'Etiquétanos con ', el('strong', { text: '@' + USER }), ' o ', el('strong', { text: '#ClubHunkCartagena' }), ' y aparece aquí',
    ]),
  ]);
  const ctaPanel = ctaComunidad();

  const grid = el('ul', { class: 'feed-grid', role: 'list' });
  const vacio = el('p', { class: 'feed-vacio', hidden: true });
  panel.append(aviso, live, ctaPanel, grid, vacio);

  const sync = el('span', { class: 'feed-pie__txt', text: 'Feed sincronizado con nuestras redes' });
  const pie = el('div', { class: 'feed-pie' }, [
    ctaComunidad(),
    el('div', { class: 'feed-pie__btns' }, [
      el('a', { class: 'btn btn-primario feed-btn', href: TIKTOK_URL, target: '_blank', rel: 'noopener', 'data-magnetic': '0.25' }, [icon('tiktok'), 'Seguir en TikTok']),
      el('a', { class: 'btn btn-borde feed-btn', href: IG_URL, target: '_blank', rel: 'noopener', 'data-magnetic': '0.25' }, [icon('instagram'), 'Seguir en Instagram']),
    ]),
    el('p', { class: 'feed-pie__nota' }, [el('span', { class: 'feed-pulso', 'aria-hidden': 'true' }), sync]),
  ]);

  wrap.append(toolbar, panel, pie);
  root.appendChild(wrap);

  /* ---------- Controles ---------- */
  function moverIndicador() {
    const act = tabs.find((t) => t.getAttribute('aria-selected') === 'true');
    if (!act) return;
    indicador.style.width = act.offsetWidth + 'px';
    indicador.style.transform = 'translateX(' + act.offsetLeft + 'px)';
  }

  function setOrigen(id, enfocar) {
    estado.origen = id;
    tabs.forEach((t) => {
      const on = t.dataset.origen === id;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      if (on) { panel.setAttribute('aria-labelledby', t.id); if (enfocar) t.focus(); }
    });
    moverIndicador();
  }

  function setRed(id) {
    estado.red = id;
    chipBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.red === id)));
  }

  function cambiarFiltro() {
    nuevosIds.clear();
    wrap.classList.remove('sin-anim');
    render();
  }

  tablist.addEventListener('click', (e) => {
    const t = e.target.closest('[role="tab"]');
    if (t && t.getAttribute('aria-selected') !== 'true') { setOrigen(t.dataset.origen, false); cambiarFiltro(); }
  });
  tablist.addEventListener('keydown', (e) => {
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    const mapa = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: tabs.length - 1 };
    if (!(e.key in mapa)) return;
    e.preventDefault();
    const n = (mapa[e.key] + tabs.length) % tabs.length;
    setOrigen(tabs[n].dataset.origen, true);
    cambiarFiltro();
  });
  chips.addEventListener('click', (e) => {
    const b = e.target.closest('.feed-chip');
    if (!b || b.dataset.red === estado.red) return;
    setRed(b.dataset.red);
    cambiarFiltro();
  });
  window.addEventListener('resize', moverIndicador, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(moverIndicador);

  /* ---------- Tarjetas ---------- */
  function tarjeta(p, i) {
    const esVideo = p.tipo === 'video' || p.tipo === 'reel';
    const red = redDe(p);
    const redNombre = red === 'instagram' ? 'Instagram' : 'TikTok';
    const comunidad = origenDe(p) === 'etiqueta';
    const autor = comunidad && p.autor && p.autor.usuario ? String(p.autor.usuario).replace(/^@/, '') : '';
    const vistas = formatoVistas(p.vistas);
    const fecha = formatoFecha(p.fecha);
    const tipoTxt = p.tipo === 'reel' ? 'Reel' : esVideo ? 'Video' : 'Foto';
    const esNuevo = nuevosIds.has(p.id);

    const img = el('img', {
      src: p.imagen || LOGO, alt: '', loading: 'lazy', decoding: 'async',
      width: esVideo ? '360' : '400', height: esVideo ? '640' : '400',
    });
    img.addEventListener('error', () => { img.src = LOGO; }, { once: true });

    const media = el('div', { class: 'feed-card__media ' + (esVideo ? 'is-video' : 'is-foto') }, [
      img,
      el('span', { class: 'feed-card__overlay', 'aria-hidden': 'true' }, [icon(esVideo ? 'play' : 'ver', 'feed-card__play')]),
      el('span', { class: 'feed-badges' }, [
        el('span', { class: 'feed-badge feed-badge--' + red }, [icon(red), el('span', { text: redNombre })]),
        comunidad ? el('span', { class: 'feed-badge feed-badge--comunidad' }, [icon('arroba'), el('span', { text: 'Te etiquetó' })]) : null,
        p.anclado ? el('span', { class: 'feed-badge feed-badge--anclado' }, [icon('pin'), el('span', { text: 'Anclado' })]) : null,
        esNuevo ? el('span', { class: 'feed-badge feed-badge--nuevo', text: 'Nuevo' }) : null,
      ]),
      vistas ? el('span', { class: 'feed-card__vistas' }, [icon('ojo'), el('span', { text: vistas })]) : null,
    ]);

    const etiqueta = [
      p.titulo, tipoTxt + ' en ' + redNombre, autor ? 'Publicado por @' + autor + ', etiquetó al club' : '',
      vistas ? vistas + ' visualizaciones' : '', fecha, p.anclado ? 'Anclado' : '', esNuevo ? 'Nuevo' : '',
      '(se abre en una pestaña nueva)',
    ].filter(Boolean).join('. ');

    const fallbackUrl = red === 'instagram' ? IG_URL : TIKTOK_URL;
    return el('li', {
      class: 'feed-card' + (comunidad ? ' feed-card--comunidad' : '') + (esNuevo ? ' is-new' : ''),
      'data-red': red, 'data-origen': origenDe(p), 'data-id': p.id, style: '--i:' + Math.min(i, 12),
    }, [
      el('a', { class: 'feed-card__link', href: p.url || (autor && p.autor.url) || fallbackUrl, target: '_blank', rel: 'noopener', 'aria-label': etiqueta }, [
        media,
        el('div', { class: 'feed-card__body' }, [
          autor ? el('p', { class: 'feed-card__autor' }, ['por ', el('strong', { text: '@' + autor })]) : null,
          el('p', { class: 'feed-card__titulo', text: p.titulo || 'Publicación de @' + USER }),
          el('p', { class: 'feed-card__meta' }, [el('span', { text: tipoTxt }), fecha ? el('span', { text: fecha }) : null]),
        ]),
      ]),
    ]);
  }

  function ordenar(lista) {
    const porFecha = (a, b) => (aFecha(b.fecha) || 0) - (aFecha(a.fecha) || 0);
    const nuevos = lista.filter((p) => nuevosIds.has(p.id)).sort(porFecha);
    const resto = lista.filter((p) => !nuevosIds.has(p.id)).sort((a, b) =>
      (!!b.anclado - !!a.anclado) || porFecha(a, b));
    return nuevos.concat(resto);
  }

  function render() {
    live.hidden = estado.origen === 'etiqueta' || estado.red === 'instagram';
    ctaPanel.hidden = estado.origen !== 'etiqueta';
    if (!datos) return;
    const lista = ordenar(store.filter(coincide));
    const frag = document.createDocumentFragment();
    lista.forEach((p, i) => frag.appendChild(tarjeta(p, i)));
    grid.textContent = '';
    grid.appendChild(frag);
    grid.scrollLeft = 0;
    vacio.hidden = lista.length > 0;
    vacio.textContent = estado.origen === 'etiqueta'
      ? 'Aún no hay publicaciones de la comunidad aquí. ¡Sé el primero en etiquetarnos!'
      : 'Pronto verás aquí nuevas publicaciones.';
    renderStats();
  }

  function renderStats() {
    const pf = (datos && datos.perfiles) || {};
    const tt = pf.tiktok || {};
    const ig = pf.instagram || {};
    const partes = [];
    if (estado.red !== 'instagram' && tt.seguidores) partes.push(nf(tt.seguidores) + ' seguidores en TikTok');
    if (estado.red !== 'instagram' && tt.meGusta) partes.push(nf(tt.meGusta) + ' me gusta');
    if (estado.red !== 'tiktok' && ig.seguidores) partes.push(nf(ig.seguidores) + ' en Instagram');
    stats.textContent = partes.join(' · ');
    stats.hidden = !partes.length;
  }

  function renderSync() {
    const txt = datos && hace(datos.actualizado);
    sync.textContent = 'Feed sincronizado con nuestras redes' + (txt ? ' · Actualizado ' + txt : '');
  }

  /* ---------- Fusión y aviso ---------- */
  function deduplicar(lista) {
    const m = new Map();
    lista.forEach((p) => { if (p && p.id && !m.has(p.id)) m.set(p.id, p); });
    return Array.from(m.values());
  }

  // Sustituye el store por los datos recibidos y devuelve las publicaciones que no existían
  function fusionar(d, inicial) {
    const previos = new Set(store.map((p) => p.id));
    const lista = deduplicar(d.publicaciones);
    const agregados = inicial ? [] : lista.filter((p) => !previos.has(p.id));
    const cambio = inicial || agregados.length > 0 || lista.length !== store.length;
    datos = d;
    store = lista;
    return { agregados, cambio };
  }

  let avisoTimer = 0;
  function mostrarAviso(agregados) {
    const n = agregados.length;
    const visibles = agregados.filter(coincide).length;
    avisoBtn.lastChild.textContent = n === 1 ? '1 publicación nueva' : n + ' publicaciones nuevas';
    avisoBtn.dataset.fuera = visibles ? '' : '1';
    avisoBtn.hidden = false;
    clearTimeout(avisoTimer);
    avisoTimer = setTimeout(() => { avisoBtn.hidden = true; }, 15000);
  }
  avisoBtn.addEventListener('click', () => {
    avisoBtn.hidden = true;
    if (avisoBtn.dataset.fuera) { // las nuevas no encajan en el filtro actual → mostrar todo
      const guardados = new Set(nuevosIds);
      setOrigen('todo'); setRed('todas');
      nuevosIds = guardados;
      render();
    }
    grid.scrollLeft = 0;
    (grid.querySelector('.feed-card.is-new') || grid).scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
  });

  /* ---------- Auto-actualización ---------- */
  let ultimo = 0;
  let refrescoTimer = 0;
  let pidiendo = false;

  async function refrescar() {
    if (pidiendo) return;
    pidiendo = true;
    const d = await obtenerPublicaciones();
    pidiendo = false;
    ultimo = Date.now();
    if (d) {
      const { agregados, cambio } = fusionar(d, false);
      if (agregados.length) {
        nuevosIds = new Set(agregados.map((p) => p.id));
        wrap.classList.add('sin-anim'); // solo animan las nuevas
        render();
        mostrarAviso(agregados);
      } else if (cambio) {
        wrap.classList.add('sin-anim');
        render();
      } else {
        renderStats();
      }
      renderSync();
    }
    programar();
  }

  function programar() {
    clearTimeout(refrescoTimer);
    if (document.hidden) return;
    refrescoTimer = setTimeout(refrescar, Math.max(0, INTERVALO - (Date.now() - ultimo)));
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearTimeout(refrescoTimer);
    else { renderSync(); programar(); }
  });
  setInterval(() => { if (!document.hidden) renderSync(); }, 60000);

  /* ---------- TikTok embed diferido ---------- */
  let embedIniciado = false;

  function mostrarFallback() {
    if (live.dataset.estado === 'listo') return;
    live.dataset.estado = 'error';
    embedBox.hidden = true;
    const tt = (datos && datos.perfiles && datos.perfiles.tiktok) || FALLBACK.perfiles.tiktok;
    fallback.textContent = '';
    fallback.append(
      el('img', { class: 'feed-live__logo', src: LOGO, alt: '', width: '88', height: '88', loading: 'lazy', decoding: 'async' }),
      el('div', { class: 'feed-live__info' }, [
        el('p', { class: 'feed-live__user' }, [icon('tiktok'), el('span', { text: '@' + (tt.usuario || USER) })]),
        el('p', { class: 'feed-live__datos', text: [tt.seguidores ? nf(tt.seguidores) + ' seguidores' : '', tt.meGusta ? nf(tt.meGusta) + ' me gusta' : ''].filter(Boolean).join(' · ') }),
        el('p', { class: 'feed-live__msg', text: 'No pudimos cargar el feed en vivo aquí. Mira nuestras rodadas directamente en TikTok.' }),
      ]),
      el('a', { class: 'btn btn-cta feed-btn', href: tt.url || TIKTOK_URL, target: '_blank', rel: 'noopener' }, [icon('tiktok'), 'Ver en TikTok']),
    );
    fallback.hidden = false;
  }

  function iniciarEmbed() {
    if (embedIniciado) return;
    embedIniciado = true;
    live.dataset.estado = 'cargando';

    embedBox.innerHTML =
      '<blockquote class="tiktok-embed" cite="https://www.tiktok.com/@clubhunkcartagena" data-unique-id="clubhunkcartagena" data-embed-type="creator" style="max-width: 780px; min-width: 288px;">' +
      '<section><a target="_blank" rel="noopener" href="https://www.tiktok.com/@clubhunkcartagena?refer=creator_embed">@clubhunkcartagena</a></section></blockquote>';

    let obs = null;
    const timer = setTimeout(() => {
      if (live.dataset.estado !== 'listo') { if (obs) obs.disconnect(); mostrarFallback(); }
    }, EMBED_TIMEOUT);

    // embed.js sustituye el blockquote por un iframe: lo detectamos y esperamos su "load"
    obs = new MutationObserver(() => {
      const iframe = embedBox.querySelector('iframe');
      if (!iframe) return;
      obs.disconnect();
      iframe.setAttribute('title', 'Perfil de TikTok de @' + USER);
      iframe.addEventListener('load', () => {
        clearTimeout(timer);
        if (live.dataset.estado !== 'error') live.dataset.estado = 'listo';
      }, { once: true });
    });
    obs.observe(embedBox, { childList: true, subtree: true });

    const s = document.createElement('script');
    s.src = EMBED_JS;
    s.async = true;
    s.onerror = () => { clearTimeout(timer); obs.disconnect(); mostrarFallback(); };
    document.body.appendChild(s);
  }

  /* ---------- Arranque ---------- */
  function alEntrar(cb, margin) {
    if (!('IntersectionObserver' in window)) return cb();
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); cb(); }
    }, { rootMargin: margin });
    io.observe(root);
  }

  render();
  moverIndicador();

  obtenerPublicaciones().then((d) => {
    ultimo = Date.now();
    fusionar(d || FALLBACK, true);
    render();
    renderSync();
    wrap.classList.add('is-ready');
    programar();
  });

  if (reduce) wrap.classList.add('is-in');
  else alEntrar(() => wrap.classList.add('is-in'), '0px 0px -15% 0px');
  alEntrar(iniciarEmbed, '400px 0px');
})();
