// Club Hunk Cartagena · Portal · wizard de solicitud de ingreso
import { auth, MODO } from './api.js';
import {
  $, $$, esc, icono, inyectarIconos, toast, conCarga, bannerDemo, mensajeError, activarVerPassword,
  leerSS, escribirSS, borrarSS, confeti, diasHasta, hoyISO,
} from './ui-comun.js';
import {
  PASOS, renderCampos, leerFormulario, validarPasoCompleto, pintarErrores, actualizarCondicionales,
  validacionEnVivo, avisoVencimiento, fuerzaPassword, valorLegible, obtener, camposDe, idCampo,
} from './ui-campos.js';

inyectarIconos();
bannerDemo(MODO);
activarVerPassword();

const CLAVE = 'chc-registro-borrador';
const IDS = [...PASOS.map(p => p.id), 'resumen'];
const TIPS = {
  personal: ['¿Por qué pedimos tu documento?', 'Para identificarte dentro del club y ante las autoridades si hiciera falta. Nunca aparece en tu QR de emergencia.'],
  moto: ['Alertas de vencimiento', 'Te avisaremos antes de que se venzan el SOAT, la tecnomecánica y tu licencia. Rodar con papeles al día nos protege a todos.'],
  salud: ['Tu ficha de emergencia', 'Con estos datos generamos tu QR para el casco. Quien te atienda verá solo tipo de sangre, alergias, EPS y a quién llamar.'],
  club: ['Vitrina de emprendimientos', 'Si tienes un negocio, los líderes pueden publicarlo en la vitrina del club con botón directo a tu WhatsApp.'],
  cuenta: ['Tus derechos', 'Puedes consultar, corregir o pedir que se borren tus datos cuando quieras. Tu contraseña no la conoce nadie más.'],
  resumen: ['¿Qué sigue?', 'Los líderes revisan tu solicitud en su panel. Cuando la aprueben pasas a aspirante y empiezas a rodar con nosotros.'],
};
const BASE = {
  personal: { ciudad: 'Cartagena', tipoDocumento: '' },
  moto: { marca: 'Hero' },
  salud: {},
  emergencia: [{}, {}],
  club: { emprendimiento: {} },
  cuenta: {},
};

const form = $('#wizard');
const cuerpo = $('#wizard-cuerpo');
const nav = $('#wizard-nav');
const btnAtras = $('[data-atras]', nav);
const btnSig = $('[data-siguiente]', nav);

const borrador = leerSS(CLAVE);
let datos = borrador?.datos ? mezclar(structuredClone(BASE), borrador.datos) : structuredClone(BASE);
let actual = Math.min(borrador?.paso || 0, IDS.length - 1);
let maxAlcanzado = Math.max(actual, borrador?.max || 0);
let enTransicion = false;

function mezclar(a, b) {
  for (const k of Object.keys(b || {})) {
    if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k])) a[k] = mezclar(a[k] && typeof a[k] === 'object' ? a[k] : {}, b[k]);
    else if (Array.isArray(b[k])) a[k] = b[k].map((x, i) => ({ ...(a[k]?.[i] || {}), ...x }));
    else a[k] = b[k];
  }
  return a;
}

/* ---------- Render ---------- */
function renderPasos() {
  const html = PASOS.map((p, i) => `
    <section class="paso" data-paso="${p.id}" aria-labelledby="h-${p.id}">
      <div class="paso-cab">${icono(p.icono)}<div>
        <span class="eyebrow">Paso ${i + 1} de ${PASOS.length}</span>
        <h2 id="h-${p.id}" tabindex="-1">${esc(p.titulo)}</h2>
        <p>${esc(p.intro)}</p></div></div>
      <div class="alerta-form" role="alert" hidden></div>
      <div class="campos">${renderCampos(p.campos, datos)}</div>
    </section>`).join('') + `
    <section class="paso" data-paso="resumen" aria-labelledby="h-resumen">
      <div class="paso-cab">${icono('checkc')}<div>
        <span class="eyebrow">Último paso</span>
        <h2 id="h-resumen" tabindex="-1">Revisa y envía tu solicitud</h2>
        <p>Confirma que todo esté bien. Puedes editar cualquier sección antes de enviar.</p></div></div>
      <div class="alerta-form" role="alert" hidden></div>
      <div class="resumen" id="resumen"></div>
    </section>`;
  cuerpo.innerHTML = html;
  const nac = document.getElementById(idCampo('personal.nacimiento'));
  if (nac) nac.max = hoyISO();
  const pasoActual = cuerpo.querySelector(`[data-paso="${IDS[actual]}"]`);
  pasoActual.classList.add('activo');
  nav.hidden = false;
  actualizarCondicionales(form, PASOS.flatMap(p => p.campos.filter(c => c.n)), datos);
  ['moto.soatVence', 'moto.tecnoVence', 'moto.licenciaVence'].forEach(n => avisoVencimiento(form, n, obtener(datos, n), diasHasta));
}

function renderProgreso() {
  $('#progreso-pasos').innerHTML = IDS.map((id, i) => {
    const p = PASOS.find(x => x.id === id);
    const nombre = p ? p.corto : 'Enviar';
    const ic = i < actual ? 'check' : (p ? p.icono : 'flag');
    const cls = i < actual ? 'hecho' : i === actual ? 'actual' : '';
    const puede = i <= maxAlcanzado && i !== actual;
    return `<li class="${cls}"><button type="button" data-ir="${i}" ${puede ? '' : 'disabled'} ${i === actual ? 'aria-current="step"' : ''} aria-label="Paso ${i + 1}: ${esc(nombre)}${i < actual ? ' (completado)' : ''}">
      <span class="bola">${icono(ic)}</span><span class="nombre">${esc(nombre)}</span></button></li>`;
  }).join('');
  const pct = Math.round((actual / (IDS.length - 1)) * 100);
  const barra = $('#barra');
  barra.style.setProperty('--p', pct + '%');
  barra.querySelector('span').style.width = pct + '%';
  barra.setAttribute('aria-valuenow', String(pct));
  $('#progreso-pct').textContent = pct + '%';
  $('#progreso-paso').textContent = actual < PASOS.length ? `Paso ${actual + 1} de ${PASOS.length} · ${PASOS[actual].titulo}` : 'Revisión final';
}

function renderNav() {
  btnAtras.hidden = actual === 0;
  const ultimo = IDS[actual] === 'resumen';
  btnSig.className = `btn ${ultimo ? 'btn-cta' : 'btn-primario'}`;
  btnSig.innerHTML = ultimo
    ? `${icono('flag')}Enviar solicitud`
    : actual === PASOS.length - 1 ? `Revisar solicitud${icono('right')}` : `Siguiente${icono('right')}`;
}

function renderTip() {
  const [t, x] = TIPS[IDS[actual]];
  const caja = $('#lado-tip');
  $('#tip-titulo').textContent = t;
  $('#tip-texto').textContent = x;
  caja.classList.remove('cambia'); void caja.offsetWidth; caja.classList.add('cambia');
}

/* ---------- Resumen ---------- */
function renderResumen() {
  const secciones = PASOS.filter(p => p.id !== 'cuenta').map((p, i) => {
    const filas = p.campos.filter(c => c.n && (!c.cuando || c.cuando(datos))).map(c => {
      const v = valorLegible(c, obtener(datos, c.n));
      if (v == null) return '';
      const pref = c.n.startsWith('emergencia.1') ? '2º contacto · ' : c.n.startsWith('emergencia.0') ? 'Contacto · ' : '';
      return `<div><dt>${esc(pref + c.l)}</dt><dd>${esc(v)}</dd></div>`;
    }).join('');
    return `<article class="res-sec"><header><h3>${icono(p.icono)}${esc(p.titulo)}</h3>
      <button type="button" class="btn btn-suave btn-sm" data-ir="${i}" aria-label="Editar ${esc(p.titulo)}">${icono('edit')}Editar</button></header>
      <dl>${filas || '<div><dt>Sin datos</dt><dd>—</dd></div>'}</dl></article>`;
  }).join('');
  const c = datos.cuenta || {};
  const ok = (v) => v ? `${icono('check')} Aceptada` : 'Pendiente';
  $('#resumen').innerHTML = secciones + `<article class="res-sec"><header><h3>${icono('lock')}Cuenta y consentimiento</h3>
      <button type="button" class="btn btn-suave btn-sm" data-ir="${PASOS.length - 1}" aria-label="Editar cuenta y consentimiento">${icono('edit')}Editar</button></header>
      <dl><div><dt>Correo de acceso</dt><dd>${esc(datos.personal?.correo || '—')}</dd></div>
      <div><dt>Contraseña</dt><dd>${c.password ? '••••••••' : 'Pendiente'}</dd></div>
      <div><dt>Tratamiento de datos (Ley 1581)</dt><dd>${ok(c.datos)}</dd></div>
      <div><dt>Datos de salud en emergencias</dt><dd>${ok(c.salud)}</dd></div>
      <div><dt>Reglamento del club</dt><dd>${ok(c.reglamento)}</dd></div></dl></article>`;
}

/* ---------- Borrador ---------- */
let tGuardar;
function guardarBorrador() {
  clearTimeout(tGuardar);
  tGuardar = setTimeout(() => {
    const copia = structuredClone(datos);
    if (copia.cuenta) { delete copia.cuenta.password; delete copia.cuenta.password2; }
    escribirSS(CLAVE, { paso: actual, max: maxAlcanzado, datos: copia });
    const g = $('#guardado');
    g.classList.remove('visible'); void g.offsetWidth; g.classList.add('visible');
  }, 450);
}

/* ---------- Navegación ---------- */
function mostrarErrores(pasoId, r) {
  const sec = cuerpo.querySelector(`[data-paso="${pasoId}"]`);
  const alerta = sec.querySelector('.alerta-form');
  const n = Object.keys(r.errores).length + r.generales.length;
  if (n) {
    const extra = r.generales.length ? ' ' + r.generales.join(' ') : '';
    alerta.innerHTML = `${icono('alert')}<span>Revisa ${n === 1 ? 'el campo marcado' : `los ${n} campos marcados`} para continuar.${esc(extra)}</span>`;
    alerta.hidden = false;
  } else alerta.hidden = true;
  pintarErrores(form, camposDe(pasoId), r.errores);
}

function ir(destino, { validar = true } = {}) {
  if (enTransicion || destino === actual || destino < 0 || destino >= IDS.length) return;
  datos = leerFormulario(form, datos);
  if (validar && destino > actual) {
    for (let i = actual; i < destino; i++) {
      const id = IDS[i];
      if (id === 'resumen') continue;
      const r = validarPasoCompleto(id, datos);
      if (!r.valido) {
        if (i !== actual) { cambiar(i, () => mostrarErrores(id, r)); return; }
        mostrarErrores(id, r);
        return;
      }
      cuerpo.querySelector(`[data-paso="${id}"] .alerta-form`).hidden = true;
    }
  }
  cambiar(destino);
}

function cambiar(destino, despues) {
  const desde = cuerpo.querySelector(`[data-paso="${IDS[actual]}"]`);
  const hacia = cuerpo.querySelector(`[data-paso="${IDS[destino]}"]`);
  const adelante = destino > actual;
  enTransicion = true;
  actual = destino;
  maxAlcanzado = Math.max(maxAlcanzado, destino);
  if (IDS[destino] === 'resumen') renderResumen();
  renderProgreso(); renderNav(); renderTip(); guardarBorrador();
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  desde.classList.add(adelante ? 'sale-izq' : 'sale-der');
  setTimeout(() => {
    desde.classList.remove('activo', 'sale-izq', 'sale-der', 'entra-der', 'entra-izq');
    hacia.classList.add('activo', adelante ? 'entra-der' : 'entra-izq');
    window.scrollTo({ top: 0, behavior: reducido ? 'auto' : 'smooth' });
    hacia.querySelector('h2').focus({ preventScroll: true });
    setTimeout(() => { hacia.classList.remove('entra-der', 'entra-izq'); enTransicion = false; despues && despues(); }, reducido ? 0 : 420);
  }, reducido ? 0 : 200);
}

/* ---------- Envío ---------- */
function construirFicha(d) {
  const emergencia = (d.emergencia || []).filter(c => c && c.nombre).map(c => ({ nombre: c.nombre, parentesco: c.parentesco || '', celular: c.celular || '' }));
  const emp = d.club?.emprendimiento || {};
  return {
    personal: { ...d.personal, correo: (d.personal?.correo || '').toLowerCase() },
    moto: { ...d.moto, anio: d.moto?.anio === '' ? null : Number(d.moto?.anio) },
    salud: { ...d.salud },
    emergencia,
    club: {
      comoNosConociste: d.club?.comoNosConociste || '',
      recomendadoPor: d.club?.recomendadoPor || '',
      redes: d.club?.redes || '',
      tallaJersey: d.club?.tallaJersey || '',
      emprendimiento: emp.tiene ? { tiene: true, nombre: emp.nombre || '', descripcion: emp.descripcion || '', whatsapp: emp.whatsapp || '' } : { tiene: false, nombre: '', descripcion: '', whatsapp: '' },
    },
    consentimientos: { datos: !!d.cuenta?.datos, salud: !!d.cuenta?.salud, reglamento: !!d.cuenta?.reglamento, fecha: new Date().toISOString() },
  };
}

async function enviar() {
  datos = leerFormulario(form, datos);
  for (let i = 0; i < PASOS.length; i++) {
    const r = validarPasoCompleto(PASOS[i].id, datos);
    if (!r.valido) {
      toast(`Falta completar: ${PASOS[i].titulo}.`, 'aviso');
      cambiar(i, () => mostrarErrores(PASOS[i].id, r));
      return;
    }
  }
  await conCarga(btnSig, async () => {
    try {
      const r = await auth.registrar(construirFicha(datos), datos.cuenta.password);
      borrarSS(CLAVE);
      exito(r);
    } catch (e) {
      const alerta = cuerpo.querySelector('[data-paso="resumen"] .alerta-form');
      alerta.innerHTML = `${icono('alert')}<span>${esc(mensajeError(e))}</span>`;
      alerta.hidden = false;
      toast(mensajeError(e), 'error', 6000);
    }
  }, 'Enviando solicitud…');
}

function exito(r) {
  form.hidden = true;
  const ex = $('#exito');
  const nombre = r?.miembro?.personal?.nombres?.split(' ')[0] || datos.personal?.nombres?.split(' ')[0];
  if (nombre) $('#exito-texto').textContent = `¡Gracias, ${nombre}! Los líderes revisarán tu ficha y te avisaremos por WhatsApp o correo. Mientras tanto, ya puedes entrar a tu panel.`;
  ex.hidden = false;
  actual = IDS.length - 1;
  const barra = $('#barra');
  barra.querySelector('span').style.width = '100%';
  barra.setAttribute('aria-valuenow', '100');
  $('#progreso-pct').textContent = '100%';
  $('#progreso-paso').textContent = 'Solicitud enviada';
  $$('#progreso-pasos li').forEach(li => { li.className = 'hecho'; const b = li.querySelector('.bola'); if (b) b.innerHTML = icono('check'); li.querySelector('button').disabled = true; });
  $('#tip-titulo').textContent = TIPS.resumen[0];
  $('#tip-texto').textContent = TIPS.resumen[1];
  window.scrollTo({ top: 0, behavior: 'smooth' });
  ex.focus({ preventScroll: true });
  setTimeout(() => confeti(), 450);
}

/* ---------- Eventos ---------- */
function iniciar() {
  renderPasos();
  renderProgreso();
  renderNav();
  renderTip();
  const todos = PASOS.flatMap(p => p.campos.filter(c => c.n));
  validacionEnVivo(form, todos, () => (datos = leerFormulario(form, datos)), (el) => {
    datos = leerFormulario(form, datos);
    if (el.name === 'club.emprendimiento.tiene') actualizarCondicionales(form, todos, datos);
    if (el.name === 'cuenta.password') {
      const f = fuerzaPassword(el.value);
      const m = el.closest('.campo').querySelector('.medidor');
      if (m) { m.style.setProperty('--f', f); m.style.setProperty('--c', ['#c62828', '#c62828', '#e08a00', '#7B50DD', '#2FBF71'][f]); }
    }
    if (/Vence$/.test(el.name)) avisoVencimiento(form, el.name, el.value, diasHasta);
    guardarBorrador();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (IDS[actual] === 'resumen') enviar();
    else ir(actual + 1);
  });
  btnAtras.addEventListener('click', () => ir(actual - 1, { validar: false }));
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ir]');
    if (!b || b.disabled) return;
    const n = Number(b.dataset.ir);
    ir(n, { validar: n > actual });
  });
  // Evita que Enter en un input de texto envíe el paso sin querer en textarea
  form.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.tagName === 'TEXTAREA') e.stopPropagation(); });

  if (borrador?.datos) toast('Recuperamos el borrador de tu solicitud.', 'info', 3500);
  if (IDS[actual] === 'resumen') renderResumen();
}

try {
  iniciar();
} catch (e) {
  console.error(e);
  cuerpo.innerHTML = `<div class="vacio">${icono('alert')}<h3>No pudimos cargar el formulario</h3><p>${esc(mensajeError(e))}</p><button type="button" class="btn btn-primario" onclick="location.reload()">Reintentar</button></div>`;
}
