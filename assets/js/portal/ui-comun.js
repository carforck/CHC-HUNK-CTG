// Club Hunk Cartagena · Portal · utilidades de interfaz compartidas
// (iconos, toasts, botones con carga, diálogos, fechas, estados, confeti, banner demo)

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

export function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------- Iconos (sprite inline, trazo) ---------- */
const ICONOS = {
  home: '<path d="M3 11 12 3l9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
  id: '<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="11" r="2"/><path d="M5 16a3 3 0 0 1 6 0"/><path d="M14 10h5M14 14h4"/>',
  qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM21 14v.01M14 21h.01M17 21h4v-4"/>',
  route: '<circle cx="6" cy="19" r="3"/><circle cx="18" cy="5" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>',
  users: '<circle cx="9" cy="7" r="4"/><path d="M2 21v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1"/><path d="M16 3.1a4 4 0 0 1 0 7.8M22 21v-1a5 5 0 0 0-3.5-4.8"/>',
  userplus: '<circle cx="9" cy="7" r="4"/><path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2"/><path d="M19 8v6M22 11h-6"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
  login: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="m10 17 5-5-5-5M15 12H3"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  checkc: '<circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  bike: '<circle cx="5" cy="17" r="3"/><circle cx="19" cy="17" r="3"/><path d="M5 17l4-6h6l4 6"/><path d="M15 11l-2-4h3.5"/><path d="M9 11 7.5 8.5H5"/>',
  heart: '<path d="M19.5 12.6 12 20l-7.5-7.4A5 5 0 1 1 12 6a5 5 0 1 1 7.5 6.6"/><path d="M3.5 12H8l1.5-2.5 3 5 1.5-2.5h6"/>',
  drop: '<path d="M12 2.7s7 7.2 7 12.3a7 7 0 0 1-14 0c0-5.1 7-12.3 7-12.3z"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
  printer: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff: '<path d="M17.9 17.9A10.1 10.1 0 0 1 12 20C5 20 1 12 1 12a18.5 18.5 0 0 1 5.1-5.9M9.9 4.2A9.1 9.1 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.2 3.2"/><path d="M14.1 14.1a3 3 0 1 1-4.2-4.2M1 1l22 22"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/><path d="M12 15v2"/>',
  left: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
  right: '<path d="M5 12h14M12 5l7 7-7 7"/>',
  award: '<circle cx="12" cy="8" r="6"/><path d="M8.2 13 7 22l5-3 5 3-1.2-9"/>',
  gauge: '<path d="M3.5 17a9 9 0 1 1 17 0"/><path d="m12 15 4.5-5"/><circle cx="12" cy="15" r="1.6"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  flag: '<path d="M4 22V3"/><path d="M4 4h15l-2.5 5 2.5 5H4"/>',
  helmet: '<path d="M3 15.5a9 9 0 0 1 18-2.5v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M21 12.5h-7.5a2 2 0 0 0-2 2V19"/>',
  pin: '<path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
  store: '<path d="M3 9 5 3h14l2 6"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/><path d="M5 12v9h14v-9"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h4"/>',
  pill: '<path d="M10.5 20.5a5 5 0 0 1-7-7l10-10a5 5 0 0 1 7 7z"/><path d="m8.5 8.5 7 7"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
  sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>',
  wa: '<path d="M3 21l1.7-5A9 9 0 1 1 8 19.3z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 1c-1-.5-2-1.5-2.5-2.5l1-1-1-2z"/>',
};

export function icono(nombre, clase = '') {
  return `<svg class="i ${clase}" aria-hidden="true" focusable="false"><use href="#i-${nombre}"/></svg>`;
}

export function inyectarIconos() {
  if (document.getElementById('chc-iconos')) return;
  const simbolos = Object.entries(ICONOS).map(([k, v]) => `<symbol id="i-${k}" viewBox="0 0 24 24">${v}</symbol>`).join('');
  const div = document.createElement('div');
  div.innerHTML = `<svg id="chc-iconos" width="0" height="0" style="position:absolute" aria-hidden="true">${simbolos}</svg>`;
  document.body.prepend(div.firstChild);
}

/* ---------- Toasts ---------- */
export function toast(mensaje, tipo = 'info', ms = 4200) {
  let cont = document.getElementById('toasts');
  if (!cont) {
    cont = document.createElement('div');
    cont.id = 'toasts';
    cont.className = 'toasts';
    cont.setAttribute('role', 'status');
    cont.setAttribute('aria-live', 'polite');
    document.body.appendChild(cont);
  }
  const ic = { ok: 'checkc', error: 'alert', aviso: 'alert', info: 'info' }[tipo] || 'info';
  const t = document.createElement('div');
  t.className = `toast toast-${tipo}`;
  t.innerHTML = `${icono(ic)}<span>${esc(mensaje)}</span><button type="button" class="toast-x" aria-label="Cerrar aviso">${icono('x')}</button>`;
  const quitar = () => { t.classList.add('saliendo'); setTimeout(() => t.remove(), 300); };
  t.querySelector('.toast-x').addEventListener('click', quitar);
  cont.appendChild(t);
  setTimeout(quitar, ms);
}

/* ---------- Botones con estado de carga ---------- */
export async function conCarga(btn, fn, textoCarga = 'Procesando…') {
  if (!btn) return fn();
  if (btn.dataset.cargando) return undefined;
  const html = btn.innerHTML;
  const ancho = btn.offsetWidth;
  btn.dataset.cargando = '1';
  btn.disabled = true;
  btn.setAttribute('aria-busy', 'true');
  btn.classList.add('cargando');
  if (ancho) btn.style.minWidth = ancho + 'px';
  btn.innerHTML = `<span class="spinner" aria-hidden="true"></span><span>${esc(textoCarga)}</span>`;
  try {
    return await fn();
  } finally {
    btn.innerHTML = html;
    btn.disabled = false;
    btn.removeAttribute('aria-busy');
    btn.classList.remove('cargando');
    btn.style.minWidth = '';
    delete btn.dataset.cargando;
  }
}

export function mensajeError(e) {
  return (e && e.message) ? e.message : 'Ocurrió un error inesperado. Intenta de nuevo.';
}

/* ---------- Banner modo demo ---------- */
export function bannerDemo(modo) {
  if (modo !== 'demo' || document.querySelector('.banner-demo')) return;
  const b = document.createElement('div');
  b.className = 'banner-demo';
  b.setAttribute('role', 'note');
  b.innerHTML = `${icono('info')}<span><b>Modo demostración:</b> los datos se guardan solo en este navegador.</span>`;
  document.body.prepend(b);
}

/* ---------- Diálogos ---------- */
export function dialogo({ titulo, contenido = '', clase = '', alCerrar } = {}) {
  const d = document.createElement('dialog');
  d.className = `dlg ${clase}`;
  const idT = 'dlg-t-' + Math.random().toString(36).slice(2, 8);
  d.setAttribute('aria-labelledby', idT);
  d.innerHTML = `<div class="dlg-caja">
    <header class="dlg-cab"><h2 id="${idT}">${esc(titulo)}</h2>
      <button type="button" class="btn-icono dlg-x" aria-label="Cerrar">${icono('x')}</button></header>
    <div class="dlg-cuerpo">${contenido}</div></div>`;
  document.body.appendChild(d);
  const cerrar = (valor) => {
    if (!d.open) return;
    d.classList.add('cerrando');
    setTimeout(() => { d.close(valor); d.remove(); alCerrar && alCerrar(valor); }, 180);
  };
  d.querySelector('.dlg-x').addEventListener('click', () => cerrar());
  d.addEventListener('cancel', (e) => { e.preventDefault(); cerrar(); });
  d.addEventListener('click', (e) => { if (e.target === d) cerrar(); });
  d.showModal();
  return { el: d, cerrar };
}

export function confirmar({ titulo, mensaje, textoOk = 'Confirmar', peligro = false, conNota = false, etiquetaNota = 'Nota (opcional)' }) {
  return new Promise((resolve) => {
    let resuelto = false;
    const { el, cerrar } = dialogo({
      titulo,
      clase: 'dlg-sm',
      contenido: `<p class="dlg-msg">${esc(mensaje)}</p>
        ${conNota ? `<div class="campo"><label for="dlg-nota">${esc(etiquetaNota)}</label><textarea id="dlg-nota" rows="3" maxlength="400"></textarea></div>` : ''}
        <div class="dlg-acciones">
          <button type="button" class="btn btn-borde" data-x>Cancelar</button>
          <button type="button" class="btn ${peligro ? 'btn-cta' : 'btn-primario'}" data-ok>${esc(textoOk)}</button>
        </div>`,
      alCerrar: () => { if (!resuelto) resolve(null); },
    });
    el.querySelector('[data-x]').addEventListener('click', () => cerrar());
    el.querySelector('[data-ok]').addEventListener('click', () => {
      resuelto = true;
      resolve({ ok: true, nota: conNota ? el.querySelector('#dlg-nota').value.trim() : '' });
      cerrar();
    });
    el.querySelector(conNota ? '#dlg-nota' : '[data-ok]').focus();
  });
}

/* ---------- Fechas ---------- */
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export function aFecha(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  const s = String(v);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(s);
  return isNaN(d) ? null : d;
}
export function fmtFecha(v, conAnio = true) {
  const d = aFecha(v);
  if (!d) return '—';
  return `${d.getDate()} ${MESES[d.getMonth()]}${conAnio ? ' ' + d.getFullYear() : ''}`;
}
export function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function diasHasta(v) {
  const d = aFecha(v);
  if (!d) return null;
  const h = new Date(); h.setHours(0, 0, 0, 0);
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  return Math.round((x - h) / 86400000);
}
export function textoDias(dias) {
  if (dias == null) return '';
  if (dias < 0) return `venció hace ${-dias} ${-dias === 1 ? 'día' : 'días'}`;
  if (dias === 0) return 'vence hoy';
  return `vence en ${dias} ${dias === 1 ? 'día' : 'días'}`;
}
export function nivelVencimiento(dias) {
  if (dias == null) return 'nd';
  if (dias < 0) return 'vencido';
  if (dias <= 30) return 'pronto';
  return 'ok';
}
export function fmtNum(n) { return Number(n || 0).toLocaleString('es-CO'); }

/* ---------- Miembros / estados ---------- */
export const ESTADOS = {
  aspirante_pendiente: { txt: 'Aspirante pendiente', cls: 'pend' },
  aspirante: { txt: 'Aspirante', cls: 'asp' },
  oficial: { txt: 'Miembro oficial', cls: 'ofi' },
  inactivo: { txt: 'Inactivo', cls: 'ina' },
  rechazado: { txt: 'No aprobado', cls: 'rec' },
};
export const DOCUMENTOS = { soat: 'SOAT', tecno: 'Tecnomecánica', licencia: 'Licencia' };

export function esLider(m) { return !!m && (m.rol === 'lider' || m.rol === 'admin'); }

export function badgeEstado(estado, rol) {
  const e = ESTADOS[estado] || { txt: estado || 'Sin estado', cls: 'ina' };
  let html = `<span class="badge badge-${e.cls}"><span class="badge-punto" aria-hidden="true"></span>${esc(e.txt)}</span>`;
  if (rol === 'lider' || rol === 'admin') html += ` <span class="badge badge-lider">${icono('shield')}${rol === 'admin' ? 'Admin' : 'Líder'}</span>`;
  return html;
}
export function nombreCompleto(m) {
  const p = (m && m.personal) || {};
  return [p.nombres, p.apellidos].filter(Boolean).join(' ') || 'Miembro';
}
export function primerNombre(m) {
  return ((m && m.personal && m.personal.nombres) || 'motero').split(' ')[0];
}
export function iniciales(nombre) {
  return String(nombre || '?').trim().split(/\s+/).slice(0, 2).map(s => s[0] || '').join('').toUpperCase() || '?';
}

/* ---------- Almacenamiento de sesión seguro ---------- */
export function leerSS(k) { try { const v = sessionStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } }
export function escribirSS(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } }
export function borrarSS(k) { try { sessionStorage.removeItem(k); } catch { /* nada */ } }

/* ---------- Confeti sutil ---------- */
export function confeti(destino = document.body, cantidad = 46) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const capa = document.createElement('div');
  capa.className = 'confeti';
  capa.setAttribute('aria-hidden', 'true');
  const colores = ['#5634A7', '#7B50DD', '#E33A3A', '#F2B33D', '#EBE7EE', '#2FBF71'];
  for (let i = 0; i < cantidad; i++) {
    const s = document.createElement('i');
    s.style.setProperty('--x', (Math.random() * 100).toFixed(1) + '%');
    s.style.setProperty('--dx', ((Math.random() - .5) * 160).toFixed(0) + 'px');
    s.style.setProperty('--r', (Math.random() * 720 - 360).toFixed(0) + 'deg');
    s.style.setProperty('--d', (Math.random() * .5).toFixed(2) + 's');
    s.style.setProperty('--t', (1.6 + Math.random() * 1.2).toFixed(2) + 's');
    s.style.background = colores[i % colores.length];
    capa.appendChild(s);
  }
  destino.appendChild(capa);
  setTimeout(() => capa.remove(), 3600);
}

/* ---------- Mostrar/ocultar contraseña ---------- */
export function activarVerPassword(raiz = document) {
  raiz.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ver-pass]');
    if (!b) return;
    const inp = document.getElementById(b.dataset.verPass);
    if (!inp) return;
    const ver = inp.type === 'password';
    inp.type = ver ? 'text' : 'password';
    b.setAttribute('aria-pressed', String(ver));
    b.setAttribute('aria-label', ver ? 'Ocultar contraseña' : 'Mostrar contraseña');
    b.innerHTML = icono(ver ? 'eyeoff' : 'eye');
  });
}

/* ---------- Error fatal de carga (p. ej. módulo de datos ausente) ---------- */
export function errorCarga(contenedor, mensaje) {
  if (!contenedor) return;
  contenedor.innerHTML = `<div class="vacio">${icono('alert')}<h3>No pudimos cargar el portal</h3><p>${esc(mensaje)}</p>
    <button type="button" class="btn btn-primario" onclick="location.reload()">Reintentar</button></div>`;
}
