// Club Hunk Cartagena · Portal · panel del miembro y panel de líderes
import { auth, miembros, rodadas, estadisticas, MODO } from './api.js';
import { qrSVG, urlEmergencia } from './qr.js';
import {
  $, $$, esc, icono, inyectarIconos, toast, conCarga, bannerDemo, mensajeError, dialogo, confirmar,
  fmtFecha, fmtNum, diasHasta, textoDias, nivelVencimiento, hoyISO, aFecha, ESTADOS, DOCUMENTOS,
  esLider, badgeEstado, nombreCompleto, primerNombre, iniciales, errorCarga,
} from './ui-comun.js';
import {
  PASOS, renderCampos, leerFormulario, validarPasoCompleto, pintarErrores, validacionEnVivo,
  actualizarCondicionales, avisoVencimiento, valorLegible, obtener, camposDe,
} from './ui-campos.js';

inyectarIconos();
bannerDemo(MODO);

const VISTAS = {
  inicio: { titulo: 'Inicio', icono: 'home', corto: 'Inicio' },
  ficha: { titulo: 'Mi ficha', icono: 'id', corto: 'Ficha' },
  qr: { titulo: 'Ficha de emergencia', icono: 'qr', corto: 'Mi QR' },
  rodadas: { titulo: 'Mis rodadas', icono: 'route', corto: 'Rodadas' },
  lideres: { titulo: 'Panel de líderes', icono: 'shield', corto: 'Líderes', soloLider: true },
};
const ACADEMIA = [
  { id: 'seguridad-vial', nombre: 'Seguridad vial básica', icono: 'shield' },
  { id: 'senas-grupo', nombre: 'Señas de grupo', icono: 'flag' },
  { id: 'primeros-auxilios', nombre: 'Primeros auxilios', icono: 'heart' },
  { id: 'mecanica-basica', nombre: 'Mecánica básica', icono: 'gauge' },
  { id: 'rodada-nocturna', nombre: 'Rodada nocturna', icono: 'star' },
  { id: 'primer-viaje', nombre: 'Primer viaje', icono: 'pin' },
];
const MENSAJE_ESTADO = {
  aspirante_pendiente: 'Tu solicitud está en revisión. Los líderes te avisarán apenas la aprueben.',
  aspirante: 'Ya eres aspirante: asiste a las rodadas para avanzar a miembro oficial.',
  oficial: 'Eres miembro oficial del club. ¡Rueda seguro y con el casco puesto!',
  inactivo: 'Tu cuenta está inactiva. Habla con un líder si quieres volver a rodar con el club.',
  rechazado: 'Tu solicitud no fue aprobada por ahora. Puedes hablar con los líderes para más información.',
};
const SECCIONES_FICHA = [
  { paso: 'personal', titulo: 'Datos personales', icono: 'user', excluirEdicion: ['personal.correo'] },
  { paso: 'moto', titulo: 'Moto y documentos', icono: 'bike' },
  { paso: 'salud', titulo: 'Salud y emergencia', icono: 'heart' },
  { paso: 'club', titulo: 'Club', icono: 'helmet' },
];

let yo = null;
let historial = null;   // { rodadas, kmTotal, cantidad }
let lider = false;
const renderizadas = new Set();
const estadoLideres = { lista: null, filtro: 'todos', busqueda: '', resumen: null };

/* ================= Utilidades ================= */
const vista = (id) => $(`.vista[data-vista="${id}"]`);
function nombreCorto(m) {
  const p = m?.personal || {};
  const ap = (p.apellidos || '').trim();
  return `${(p.nombres || '').split(' ')[0]}${ap ? ' ' + ap[0] + '.' : ''}`.trim() || 'Miembro';
}
function documentosDe(m) {
  const mo = m?.moto || {};
  return [
    { clave: 'soat', nombre: 'SOAT', vence: mo.soatVence },
    { clave: 'tecno', nombre: 'Tecnomecánica', vence: mo.tecnoVence },
    { clave: 'licencia', nombre: `Licencia${mo.licenciaCategoria ? ' ' + mo.licenciaCategoria : ''}`, vence: mo.licenciaVence },
  ].map(d => ({ ...d, dias: diasHasta(d.vence), nivel: nivelVencimiento(diasHasta(d.vence)) }));
}
function alertaDoc(d) {
  const ic = { vencido: 'alert', pronto: 'clock', ok: 'checkc', nd: 'file' }[d.nivel];
  const sub = d.nivel === 'nd' ? 'Sin fecha registrada' : d.nivel === 'ok' ? 'Al día' : textoDias(d.dias);
  return `<div class="alerta ${d.nivel}">${icono(ic)}<div><b>${esc(d.nombre)}</b><small>${esc(sub.charAt(0).toUpperCase() + sub.slice(1))}</small></div>
    <span class="fecha">${d.vence ? esc(fmtFecha(d.vence)) : '—'}</span></div>`;
}
function rodadaItem(r) {
  const f = aFecha(r.fecha);
  const mes = f ? ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][f.getMonth()] : '';
  return `<li class="rodada"><div class="rodada-fecha"><b>${f ? f.getDate() : '—'}</b><small>${mes}</small></div>
    <div class="info"><b>${esc(r.titulo || r.ruta || 'Rodada')}</b>
      <small><span>${icono('pin')} ${esc(r.ruta || '—')}</span>${r.liderNombre ? `<span>${icono('shield')} ${esc(r.liderNombre)}</span>` : ''}${Array.isArray(r.asistentes) ? `<span>${icono('users')} ${r.asistentes.length}</span>` : ''}</small></div>
    <div class="km">${fmtNum(r.km)} <small>km</small></div></li>`;
}
function diasEnClub(m) {
  const d = aFecha(m?.fechaIngreso || m?.creado);
  return d ? Math.max(0, Math.round((Date.now() - d) / 86400000)) : 0;
}
function normal(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

function dlSeccion(pasoId, m) {
  const p = PASOS.find(x => x.id === pasoId);
  const filas = p.campos.filter(c => c.n && (!c.cuando || c.cuando(m))).map(c => {
    const v = valorLegible(c, obtener(m, c.n));
    if (c.n.startsWith('emergencia.1') && v == null) return '';
    const pref = c.n.startsWith('emergencia.1') ? '2º contacto · ' : c.n.startsWith('emergencia.0') ? 'Contacto · ' : '';
    return `<div><dt>${esc(pref + c.l)}</dt><dd class="${v == null ? 'vacio-dato' : ''}">${esc(v ?? 'Sin dato')}</dd></div>`;
  }).join('');
  return `<dl class="dl-ficha">${filas}</dl>`;
}

/* ================= Navegación ================= */
function construirNav() {
  const items = Object.entries(VISTAS).filter(([, v]) => !v.soloLider || lider);
  $('#nav-lista').innerHTML = items.map(([id, v]) => `<li><a href="#${id}" data-nav="${id}">${icono(v.icono)}<span class="lbl-largo">${esc(v.titulo)}</span>${id === 'lideres' ? '<span class="contador" id="contador-pend" hidden></span>' : ''}</a></li>`).join('');
  // En móvil usamos la etiqueta corta
  const ajustar = () => $$('#nav-lista a').forEach(a => {
    const v = VISTAS[a.dataset.nav];
    a.querySelector('.lbl-largo').textContent = matchMedia('(min-width:1024px)').matches ? v.titulo : v.corto;
  });
  ajustar();
  matchMedia('(min-width:1024px)').addEventListener('change', ajustar);
  pintarPie();
}
function pintarPie() {
  $('#sb-pie').innerHTML = `<span class="avatar">${esc(iniciales(nombreCompleto(yo)))}</span><div><b>${esc(nombreCompleto(yo))}</b><small>${esc(ESTADOS[yo.estado]?.txt || '')}${lider ? ' · Líder' : ''}</small></div>
    <button type="button" class="btn-icono" data-salir aria-label="Cerrar sesión" title="Cerrar sesión">${icono('logout')}</button>`;
}

function mostrarVista(id, { foco = false } = {}) {
  if (!VISTAS[id] || (VISTAS[id].soloLider && !lider)) id = 'inicio';
  $$('.vista').forEach(v => v.classList.toggle('activa', v.dataset.vista === id));
  $$('#nav-lista a').forEach(a => { if (a.dataset.nav === id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  $('#titulo-vista').textContent = VISTAS[id].titulo;
  document.title = `${VISTAS[id].titulo} · Club Hunk Cartagena`;
  if (!renderizadas.has(id)) { renderizadas.add(id); RENDER[id](); }
  if (foco) { window.scrollTo({ top: 0 }); $('#contenido').focus({ preventScroll: true }); }
}

/* ================= Vista: Inicio ================= */
function pasosEstado(estado) {
  const pasos = [['Solicitud', 'edit'], ['Revisión', 'search'], ['Aspirante', 'id'], ['Rodadas', 'route'], ['Oficial', 'flag']];
  const idx = { aspirante_pendiente: 1, aspirante: 3, oficial: 5 }[estado];
  if (idx == null) return '';
  return `<ol class="pasos-estado" aria-label="Tu recorrido en el club">${pasos.map(([t, ic], i) => {
    const cls = i < idx ? 'hecho' : i === idx ? 'actual' : '';
    return `<li class="${cls}"${i === idx ? ' aria-current="step"' : ''}><span class="bola">${icono(i < idx ? 'check' : ic)}</span>${esc(t)}</li>`;
  }).join('')}</ol>`;
}

function insigniasHTML(m) {
  const ganadas = m.insignias || [];
  const usadas = new Set();
  const items = ACADEMIA.map(a => {
    const g = ganadas.find(x => x.id === a.id || normal(x.nombre) === normal(a.nombre));
    if (g) usadas.add(g);
    return { ...a, ganada: g };
  });
  ganadas.filter(g => !usadas.has(g)).forEach(g => items.unshift({ id: g.id, nombre: g.nombre, icono: 'award', ganada: g }));
  items.sort((a, b) => (b.ganada ? 1 : 0) - (a.ganada ? 1 : 0));
  return `<div class="insignias">${items.map(i => `<div class="insignia ${i.ganada ? '' : 'bloqueada'}" title="${i.ganada ? 'Ganada el ' + esc(fmtFecha(i.ganada.fecha)) : 'Aún no la tienes'}">
    <span class="medalla">${icono(i.ganada ? i.icono : 'lock')}</span><b>${esc(i.nombre)}</b><small>${i.ganada ? esc(fmtFecha(i.ganada.fecha)) : 'Por ganar'}</small></div>`).join('')}</div>`;
}

function renderInicio() {
  const v = vista('inicio');
  const docs = documentosDe(yo);
  const urgentes = docs.filter(d => d.nivel === 'vencido' || d.nivel === 'pronto').length;
  const nIns = (yo.insignias || []).length;
  const km = historial ? historial.kmTotal : null;
  const cant = historial ? historial.cantidad : null;
  const ultimas = historial ? [...historial.rodadas].sort((a, b) => String(b.fecha).localeCompare(String(a.fecha))).slice(0, 3) : null;
  v.innerHTML = `
    <div class="saludo oscuro">
      <div>
        <div class="saludo-fila"><span class="avatar avatar-lg">${esc(iniciales(nombreCompleto(yo)))}</span>
          <div><h1>¡Hola, ${esc(primerNombre(yo))}!</h1><div class="saludo-badges">${badgeEstado(yo.estado, yo.rol)}</div></div></div>
        <p style="margin-top:12px">${esc(MENSAJE_ESTADO[yo.estado] || '')}${(yo.fechaIngreso || yo.creado) ? ` · En el club desde el ${esc(fmtFecha(yo.fechaIngreso || yo.creado))}.` : ''}</p>
      </div>
      ${pasosEstado(yo.estado)}
      <div class="franja" aria-hidden="true"></div>
    </div>
    <div class="stats">
      <div class="stat">${icono('gauge')}<b>${km == null ? '…' : fmtNum(km)}</b><small>km con el club</small></div>
      <div class="stat rojo">${icono('route')}<b>${cant == null ? '…' : fmtNum(cant)}</b><small>rodadas</small></div>
      <div class="stat ambar">${icono('award')}<b>${nIns}</b><small>insignias Academia</small></div>
      <div class="stat verde">${icono('calendar')}<b>${fmtNum(diasEnClub(yo))}</b><small>días en el club</small></div>
    </div>
    ${lider ? `<div class="alerta pronto" id="aviso-lider" style="margin-bottom:16px" hidden></div>` : ''}
    <div class="grid-panel">
      <section class="tarjeta" aria-labelledby="t-docs"><div class="tarjeta-h"><h2 id="t-docs">${icono('file')}Mis documentos</h2>
        ${urgentes ? `<span class="badge badge-rec">${urgentes} por atender</span>` : '<span class="badge badge-ofi">Todo al día</span>'}</div>
        <div class="alertas">${docs.map(alertaDoc).join('')}</div>
        <button type="button" class="btn btn-suave btn-sm" style="margin-top:14px" data-editar="moto">${icono('edit')}Actualizar fechas</button></section>
      <section class="tarjeta" aria-labelledby="t-ult"><div class="tarjeta-h"><h2 id="t-ult">${icono('route')}Últimas rodadas</h2><a class="btn-texto" href="#rodadas">Ver todas</a></div>
        ${ultimas == null ? '<div class="esqueleto esq-linea"></div><div class="esqueleto esq-linea"></div><div class="esqueleto esq-linea"></div>'
          : ultimas.length ? `<ul class="lista-rodadas">${ultimas.map(rodadaItem).join('')}</ul>`
          : `<div class="vacio">${icono('route')}<h3>Aún no tienes rodadas</h3><p>Cuando asistas a una rodada, el líder la registrará y aparecerá aquí con sus kilómetros.</p></div>`}</section>
      <section class="tarjeta" aria-labelledby="t-acad"><div class="tarjeta-h"><h2 id="t-acad">${icono('award')}Academia CHC</h2></div>
        ${insigniasHTML(yo)}
        <p class="campo-ayuda" style="margin-top:10px">Las insignias las otorgan los líderes al completar cada módulo de la Academia.</p></section>
      <section class="tarjeta" aria-labelledby="t-qr"><div class="tarjeta-h"><h2 id="t-qr">${icono('qr')}Ficha de emergencia</h2></div>
        <p style="margin:0 0 14px;color:var(--muted)">Imprime tu QR y pégalo en el casco. Si tienes un accidente, quien te atienda verá tu tipo de sangre, alergias y a quién llamar.</p>
        <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
          <div style="width:96px;height:96px;flex:none" aria-hidden="true">${qrSeguro(yo.id, 96)}</div>
          <div style="display:grid;gap:8px"><span style="font:400 2rem/1 var(--display);color:var(--rojo-br)">${esc(yo.salud?.tipoSangre || '—')}</span>
          <a class="btn btn-primario btn-sm" href="#qr">${icono('printer')}Ver e imprimir</a></div></div></section>
    </div>`;
  if (lider) actualizarAvisoLider();
}

function qrSeguro(id, tamano) {
  try { return qrSVG(urlEmergencia(id), { tamano, color: '#030203', fondo: '#fff' }); }
  catch (e) { console.warn('qr', e); return `<div class="vacio">${icono('qr')}</div>`; }
}

async function actualizarAvisoLider() {
  try {
    const r = estadoLideres.resumen || (estadoLideres.resumen = await estadisticas.resumen());
    const cont = $('#contador-pend');
    if (cont) { cont.hidden = !r.pendientes; cont.textContent = r.pendientes; }
    const av = $('#aviso-lider');
    if (av && r.pendientes) {
      av.innerHTML = `${icono('userplus')}<div><b>${r.pendientes} ${r.pendientes === 1 ? 'aspirante espera' : 'aspirantes esperan'} tu revisión</b><small>Revísalos en el panel de líderes.</small></div><a class="btn btn-primario btn-sm" href="#lideres">Revisar</a>`;
      av.hidden = false;
    }
  } catch (e) { console.warn(e); }
}

/* ================= Vista: Mi ficha ================= */
function renderFicha() {
  const v = vista('ficha');
  const c = yo.consentimientos || {};
  v.innerHTML = `
    <div class="tarjeta ficha-cab" style="margin-bottom:16px">
      <span class="avatar avatar-lg">${esc(iniciales(nombreCompleto(yo)))}</span>
      <div style="flex:1;min-width:200px"><h2>${esc(nombreCompleto(yo))}</h2><div class="saludo-badges">${badgeEstado(yo.estado, yo.rol)}</div>
        <p class="campo-ayuda" style="margin-top:6px">${icono('mail')} ${esc(yo.personal?.correo || '')}</p></div>
    </div>
    <div class="grid-panel">
      ${SECCIONES_FICHA.map(s => `<section class="tarjeta ficha-sec" aria-labelledby="fs-${s.paso}">
        <div class="tarjeta-h"><h2 id="fs-${s.paso}">${icono(s.icono)}${esc(s.titulo)}</h2>
          <button type="button" class="btn btn-suave btn-sm" data-editar="${s.paso}" aria-label="Editar ${esc(s.titulo)}">${icono('edit')}Editar</button></div>
        ${dlSeccion(s.paso, yo)}</section>`).join('')}
      <section class="tarjeta ancho-completo" aria-labelledby="fs-cons"><div class="tarjeta-h"><h2 id="fs-cons">${icono('shield')}Autorizaciones (Ley 1581 de 2012)</h2></div>
        <ul class="lista-check">
          <li class="${c.datos ? '' : 'no'}">${icono(c.datos ? 'checkc' : 'x')}Tratamiento de datos personales</li>
          <li class="${c.salud ? '' : 'no'}">${icono(c.salud ? 'checkc' : 'x')}Compartir datos de salud con líderes y en la ficha de emergencia</li>
          <li class="${c.reglamento ? '' : 'no'}">${icono(c.reglamento ? 'checkc' : 'x')}Reglamento del club</li>
        </ul>
        <p class="campo-ayuda" style="margin-top:10px">${c.fecha ? `Autorizado el ${esc(fmtFecha(c.fecha))}. ` : ''}Para revocar una autorización o pedir que se borren tus datos, escribe a los líderes del club.</p></section>
    </div>`;
}

function editarSeccion(pasoId, miembro = yo) {
  const sec = SECCIONES_FICHA.find(s => s.paso === pasoId);
  const excluir = sec?.excluirEdicion || [];
  const campos = PASOS.find(p => p.id === pasoId).campos.filter(c => !c.n || !excluir.includes(c.n));
  const base = structuredClone(miembro);
  base.emergencia = [...(base.emergencia || [])];
  while (base.emergencia.length < 2) base.emergencia.push({});
  const { el, cerrar } = dialogo({
    titulo: `Editar · ${sec ? sec.titulo : pasoId}`,
    contenido: `<form novalidate class="form-editar"><div class="alerta-form" role="alert" hidden></div>
      <div class="campos">${renderCampos(campos, base)}</div>
      ${excluir.length ? '<p class="campo-ayuda" style="margin-top:12px">Para cambiar tu correo de acceso habla con un líder del club.</p>' : ''}
      <div class="dlg-acciones"><button type="button" class="btn btn-borde" data-x>Cancelar</button>
      <button type="submit" class="btn btn-primario">${icono('check')}Guardar cambios</button></div></form>`,
  });
  const form = el.querySelector('form');
  const conNombre = campos.filter(c => c.n);
  let datos = base;
  validacionEnVivo(form, conNombre, () => (datos = leerFormulario(form, datos)), (inp) => {
    datos = leerFormulario(form, datos);
    actualizarCondicionales(form, conNombre, datos);
    if (/Vence$/.test(inp.name)) avisoVencimiento(form, inp.name, inp.value, diasHasta);
  });
  ['moto.soatVence', 'moto.tecnoVence', 'moto.licenciaVence'].forEach(n => avisoVencimiento(form, n, obtener(base, n), diasHasta));
  el.querySelector('[data-x]').addEventListener('click', () => cerrar());
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    datos = leerFormulario(form, datos);
    const r = validarPasoCompleto(pasoId, datos);
    const alerta = form.querySelector('.alerta-form');
    if (!r.valido) {
      alerta.innerHTML = `${icono('alert')}<span>Revisa los campos marcados.${r.generales.length ? ' ' + esc(r.generales.join(' ')) : ''}</span>`;
      alerta.hidden = false;
      pintarErrores(form, camposDe(pasoId), r.errores);
      return;
    }
    let cambios;
    if (pasoId === 'salud') cambios = { salud: datos.salud, emergencia: (datos.emergencia || []).filter(c => c && c.nombre) };
    else if (pasoId === 'club') {
      const emp = datos.club.emprendimiento || {};
      cambios = { club: { ...datos.club, emprendimiento: emp.tiene ? emp : { tiene: false, nombre: '', descripcion: '', whatsapp: '' } } };
    } else cambios = { [pasoId]: datos[pasoId] };
    await conCarga(form.querySelector('[type=submit]'), async () => {
      try {
        const act = await miembros.actualizar(miembro.id, cambios);
        if (miembro.id === yo.id) { yo = act || { ...yo, ...cambios }; refrescarPropias(); }
        toast('Cambios guardados.', 'ok');
        cerrar();
      } catch (err) {
        alerta.innerHTML = `${icono('alert')}<span>${esc(mensajeError(err))}</span>`;
        alerta.hidden = false;
      }
    }, 'Guardando…');
  });
}

function refrescarPropias() {
  ['inicio', 'ficha', 'qr'].forEach(id => { if (renderizadas.has(id)) RENDER[id](); });
  pintarPie();
  if (lider) actualizarAvisoLider();
}

/* ================= Vista: QR de emergencia ================= */
function renderQR() {
  const v = vista('qr');
  const url = urlEmergencia(yo.id);
  const s = yo.salud || {};
  const c1 = (yo.emergencia || [])[0];
  const sinConsent = yo.consentimientos && yo.consentimientos.salud === false;
  const sinQR = yo.estado === 'aspirante_pendiente' || yo.estado === 'rechazado';
  v.innerHTML = `
    ${sinQR ? `<div class="alerta pronto" style="margin-bottom:16px">${icono('clock')}<div><b>Tu QR aún no está activo</b><small>${yo.estado === 'rechazado' ? 'La ficha pública solo se activa para aspirantes y miembros del club.' : 'Se activa en cuanto los líderes aprueben tu solicitud. Puedes ir preparando tu sticker.'}</small></div></div>` : ''}
    ${sinConsent ? `<div class="alerta pronto" style="margin-bottom:16px">${icono('alert')}<div><b>No has autorizado compartir tus datos de salud</b><small>Tu ficha pública mostrará solo los contactos de emergencia. Puedes autorizarlo hablando con un líder.</small></div></div>` : ''}
    <div class="qr-layout">
      <div>
        <article class="sticker" aria-label="Sticker de emergencia para el casco">
          <div class="sticker-cab">${icono('heart')}EMERGENCIA · ESCANEA</div>
          <div class="sticker-cuerpo">
            <div class="sticker-qr">${qrSeguro(yo.id, 300)}</div>
            <div class="sticker-datos">
              <span class="nombre">${esc(nombreCorto(yo))}</span>
              <span class="sticker-sangre"><small>SANGRE</small><b>${esc(s.tipoSangre || '—')}</b></span>
              ${s.alergias && !/^ningun/i.test(s.alergias) ? `<p><b>Alergias:</b> ${esc(s.alergias)}</p>` : ''}
              ${c1 ? `<p><b>Llamar:</b> ${esc(c1.nombre.split(' ')[0])} · ${esc(c1.celular)}</p>` : ''}
            </div>
          </div>
          <div class="sticker-pie"><img src="../recursos/logo/club-hunk-logo-512.webp" alt="">Club Hunk Cartagena · Ficha médica de emergencia</div>
        </article>
        <div class="qr-acciones" style="justify-content:center">
          <button type="button" class="btn btn-primario" data-imprimir>${icono('printer')}Imprimir sticker</button>
          <a class="btn btn-borde" href="${esc(url)}" target="_blank" rel="noopener">${icono('eye')}Ver como paramédico</a>
          <button type="button" class="btn btn-suave" data-copiar="${esc(url)}">${icono('copy')}Copiar enlace</button>
        </div>
      </div>
      <div class="grid-panel" style="grid-template-columns:1fr">
        <section class="tarjeta"><div class="tarjeta-h"><h2>${icono('eye')}Lo que ve quien escanee</h2></div>
          <ul class="lista-check">
            <li>${icono('checkc')}Tu nombre corto y la inicial de tu apellido</li>
            <li>${icono('checkc')}Tipo de sangre y RH, alergias, condiciones y medicamentos</li>
            <li>${icono('checkc')}Tu EPS o seguro médico</li>
            <li>${icono('checkc')}Botones para llamar a tus contactos de emergencia</li>
            <li>${icono('checkc')}Placa, color y modelo de tu moto</li>
          </ul></section>
        <section class="tarjeta"><div class="tarjeta-h"><h2>${icono('lock')}Lo que nunca se muestra</h2></div>
          <ul class="lista-check">
            <li class="no">${icono('x')}Número de documento</li>
            <li class="no">${icono('x')}Dirección, barrio y correo</li>
            <li class="no">${icono('x')}Tu historial en el club</li>
          </ul>
          <p class="campo-ayuda" style="margin-top:12px">Consejo: imprime en papel adhesivo resistente al agua y pégalo en la parte trasera del casco. Si cambias tus datos de salud, el QR muestra siempre la información actualizada.</p>
          <button type="button" class="btn btn-suave btn-sm" style="margin-top:12px" data-editar="salud">${icono('edit')}Actualizar datos de salud</button></section>
      </div>
    </div>`;
}

/* ================= Vista: Rodadas ================= */
function renderRodadas() {
  const v = vista('rodadas');
  if (!historial) {
    v.innerHTML = `<div class="stats"><div class="esqueleto" style="height:110px"></div><div class="esqueleto" style="height:110px"></div><div class="esqueleto" style="height:110px"></div><div class="esqueleto" style="height:110px"></div></div><div class="esqueleto esq-bloque" style="height:300px"></div>`;
    return;
  }
  const lista = [...historial.rodadas].sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
  const prom = historial.cantidad ? Math.round(historial.kmTotal / historial.cantidad) : 0;
  const mayor = lista.reduce((m, r) => (Number(r.km) > Number(m?.km || 0) ? r : m), null);
  const anio = new Date().getFullYear();
  const esteAnio = lista.filter(r => aFecha(r.fecha)?.getFullYear() === anio).length;
  v.innerHTML = `
    <div class="stats">
      <div class="stat">${icono('gauge')}<b>${fmtNum(historial.kmTotal)}</b><small>km totales</small></div>
      <div class="stat rojo">${icono('route')}<b>${fmtNum(historial.cantidad)}</b><small>rodadas</small></div>
      <div class="stat ambar">${icono('bike')}<b>${fmtNum(prom)}</b><small>km promedio</small></div>
      <div class="stat verde">${icono('calendar')}<b>${fmtNum(esteAnio)}</b><small>rodadas en ${anio}</small></div>
    </div>
    <section class="tarjeta" aria-labelledby="t-hist"><div class="tarjeta-h"><h2 id="t-hist">${icono('route')}Historial</h2>
      ${mayor ? `<span class="badge badge-asp">${icono('star')}Más larga: ${fmtNum(mayor.km)} km</span>` : ''}</div>
      ${lista.length ? `<ul class="lista-rodadas">${lista.map(rodadaItem).join('')}</ul>`
        : `<div class="vacio">${icono('route')}<h3>Todavía no hay rodadas registradas</h3><p>Las rodadas las registra el líder al terminar cada salida. ¡Nos vemos en la próxima, los jueves y domingos!</p></div>`}
    </section>`;
}

/* ================= Vista: Líderes ================= */
async function renderLideres(recargar = false) {
  const v = vista('lideres');
  if (!estadoLideres.lista || recargar) {
    if (!estadoLideres.lista) v.innerHTML = `<div class="stats">${'<div class="esqueleto" style="height:110px"></div>'.repeat(4)}</div><div class="esqueleto esq-bloque" style="height:200px;margin-bottom:16px"></div><div class="esqueleto esq-bloque" style="height:320px"></div>`;
    try {
      const [lista, resumen] = await Promise.all([miembros.listar({}), estadisticas.resumen()]);
      estadoLideres.lista = lista || [];
      estadoLideres.resumen = resumen || {};
    } catch (e) {
      errorCarga(v, mensajeError(e));
      return;
    }
  }
  const r = estadoLideres.resumen;
  const pendientes = estadoLideres.lista.filter(m => m.estado === 'aspirante_pendiente');
  const venc = [...(r.vencimientos || [])].sort((a, b) => a.dias - b.dias);
  v.innerHTML = `
    <div class="stats">
      <div class="stat">${icono('users')}<b>${fmtNum(r.total)}</b><small>miembros en total</small></div>
      <div class="stat ambar">${icono('userplus')}<b>${fmtNum(r.pendientes)}</b><small>aspirantes pendientes</small></div>
      <div class="stat verde">${icono('checkc')}<b>${fmtNum(r.activos)}</b><small>activos${r.oficiales != null ? ` · ${fmtNum(r.oficiales)} oficiales` : ''}</small></div>
      <div class="stat rojo">${icono('gauge')}<b>${fmtNum(r.kmMes)}</b><small>km este mes</small></div>
    </div>
    <div class="grid-panel" style="margin-bottom:16px">
      <section class="tarjeta" aria-labelledby="t-pend"><div class="tarjeta-h"><h2 id="t-pend">${icono('userplus')}Solicitudes por revisar</h2>
        <span class="badge ${pendientes.length ? 'badge-pend' : 'badge-ofi'}">${pendientes.length || 'Ninguna'}</span></div>
        <div class="pendientes" id="lista-pend">${pendientes.length ? pendientes.map(pendienteHTML).join('')
          : `<div class="vacio">${icono('checkc')}<h3>Todo revisado</h3><p>No hay solicitudes nuevas. Cuando llegue una, aparecerá aquí.</p></div>`}</div></section>
      <section class="tarjeta" aria-labelledby="t-venc"><div class="tarjeta-h"><h2 id="t-venc">${icono('alert')}Documentos por vencer</h2>
        <span class="badge ${venc.length ? 'badge-rec' : 'badge-ofi'}">${venc.length || 'Al día'}</span></div>
        <div class="alertas">${venc.length ? venc.slice(0, 8).map(x => alertaDoc({ nombre: `${x.nombre} · ${DOCUMENTOS[x.documento] || x.documento}`, vence: x.vence, dias: x.dias, nivel: nivelVencimiento(x.dias) })).join('')
          : `<div class="vacio">${icono('checkc')}<h3>Sin alertas</h3><p>Nadie tiene el SOAT, la tecnomecánica o la licencia vencidos o por vencer en los próximos 30 días.</p></div>`}</div>
        ${venc.length > 8 ? `<p class="campo-ayuda" style="margin-top:10px">Y ${venc.length - 8} más. Usa los filtros de la lista para revisarlos.</p>` : ''}</section>
    </div>
    <section class="tarjeta" aria-labelledby="t-miem">
      <div class="tarjeta-h"><h2 id="t-miem">${icono('users')}Miembros</h2>
        <button type="button" class="btn btn-cta btn-sm" data-nueva-rodada>${icono('plus')}Registrar rodada</button></div>
      <div class="filtros">
        <label class="buscador"><span class="sr-only">Buscar miembro</span>${icono('search')}<input type="search" id="buscar-miembro" placeholder="Buscar por nombre, placa, documento o celular" value="${esc(estadoLideres.busqueda)}" autocomplete="off"></label>
        <div class="chips" role="group" aria-label="Filtrar por estado" id="chips-estado"></div>
      </div>
      <div id="tabla-miembros" aria-live="polite"></div>
    </section>`;
  renderChips();
  renderTabla();
  const cont = $('#contador-pend');
  if (cont) { cont.hidden = !pendientes.length; cont.textContent = pendientes.length; }
  let t;
  $('#buscar-miembro').addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => { estadoLideres.busqueda = e.target.value; renderTabla(); }, 180); });
}

function pendienteHTML(m) {
  const p = m.personal || {}, mo = m.moto || {};
  return `<article class="pendiente" data-id="${esc(m.id)}">
    <header><span class="avatar">${esc(iniciales(nombreCompleto(m)))}</span><div><b>${esc(nombreCompleto(m))}</b><small>Solicitó el ${esc(fmtFecha(m.creado))}</small></div></header>
    <div class="datos"><span>${icono('bike')}${esc([mo.modelo, mo.placa].filter(Boolean).join(' · ') || 'Sin moto')}</span><span>${icono('phone')}${esc(p.celular || '—')}</span>${m.club?.recomendadoPor ? `<span>${icono('users')}Recomendado por ${esc(m.club.recomendadoPor)}</span>` : ''}</div>
    <div class="acc">
      <button type="button" class="btn btn-ok btn-sm" data-estado="aspirante" data-id="${esc(m.id)}">${icono('check')}Aprobar</button>
      <button type="button" class="btn btn-peligro btn-sm" data-estado="rechazado" data-id="${esc(m.id)}">${icono('x')}Rechazar</button>
      <button type="button" class="btn btn-suave btn-sm" data-ver="${esc(m.id)}">${icono('eye')}Ver ficha</button>
    </div></article>`;
}

const FILTROS = [['todos', 'Todos'], ['aspirante_pendiente', 'Pendientes'], ['aspirante', 'Aspirantes'], ['oficial', 'Oficiales'], ['inactivo', 'Inactivos'], ['rechazado', 'No aprobados'], ['vencidos', 'Docs. vencidos']];
function tieneVencidos(m) { return documentosDe(m).some(d => d.nivel === 'vencido'); }
function renderChips() {
  const l = estadoLideres.lista;
  $('#chips-estado').innerHTML = FILTROS.map(([id, t]) => {
    const n = id === 'todos' ? l.length : id === 'vencidos' ? l.filter(tieneVencidos).length : l.filter(m => m.estado === id).length;
    return `<button type="button" class="chip" data-filtro="${id}" aria-pressed="${estadoLideres.filtro === id}">${esc(t)} <span class="n">${n}</span></button>`;
  }).join('');
}
function filtrados() {
  const q = normal(estadoLideres.busqueda).trim();
  const f = estadoLideres.filtro;
  return estadoLideres.lista.filter(m => {
    if (f === 'vencidos' ? !tieneVencidos(m) : (f !== 'todos' && m.estado !== f)) return false;
    if (!q) return true;
    const p = m.personal || {};
    return normal([p.nombres, p.apellidos, p.documento, p.celular, p.correo, m.moto?.placa, m.moto?.modelo].join(' ')).includes(q);
  }).sort((a, b) => nombreCompleto(a).localeCompare(nombreCompleto(b), 'es'));
}
function accionesEstado(m) {
  const b = (estado, txt, cls, ic) => `<button type="button" class="btn ${cls} btn-sm" data-estado="${estado}" data-id="${esc(m.id)}">${icono(ic)}${txt}</button>`;
  switch (m.estado) {
    case 'aspirante_pendiente': return b('aspirante', 'Aprobar', 'btn-ok', 'check') + b('rechazado', 'Rechazar', 'btn-peligro', 'x');
    case 'aspirante': return b('oficial', 'Hacer oficial', 'btn-primario', 'flag');
    case 'oficial': return b('inactivo', 'Marcar inactivo', 'btn-suave', 'clock');
    case 'inactivo': return b('oficial', 'Reactivar', 'btn-ok', 'check');
    case 'rechazado': return b('aspirante', 'Reconsiderar', 'btn-suave', 'userplus');
    default: return '';
  }
}
function renderTabla() {
  const lista = filtrados();
  const cont = $('#tabla-miembros');
  if (!cont) return;
  if (!lista.length) {
    cont.innerHTML = `<div class="vacio">${icono('search')}<h3>Sin resultados</h3><p>No encontramos miembros con ese filtro o búsqueda.</p></div>`;
    return;
  }
  cont.innerHTML = `<table class="tabla-miembros"><caption class="sr-only">Lista de miembros (${lista.length})</caption>
    <thead><tr><th scope="col">Miembro</th><th scope="col">Estado</th><th scope="col" class="col-movil-oculta col-moto">Moto</th><th scope="col" class="col-movil-oculta">Documentos</th><th scope="col" class="col-movil-oculta col-ingreso">Ingreso</th><th scope="col"><span class="sr-only">Acciones</span></th></tr></thead>
    <tbody>${lista.map(m => {
      const docs = documentosDe(m);
      const peor = docs.find(d => d.nivel === 'vencido') || docs.find(d => d.nivel === 'pronto');
      return `<tr tabindex="0" data-ver="${esc(m.id)}" aria-label="Ver ficha de ${esc(nombreCompleto(m))}">
        <td><div class="celda-nombre"><span class="avatar">${esc(iniciales(nombreCompleto(m)))}</span><span><b>${esc(nombreCompleto(m))}</b><small>${esc(m.personal?.celular || '')}</small></span></div></td>
        <td class="col-estado">${badgeEstado(m.estado, m.rol)}</td>
        <td class="col-movil-oculta col-moto">${esc([m.moto?.modelo, m.moto?.placa].filter(Boolean).join(' · ') || '—')}</td>
        <td class="col-movil-oculta">${peor ? `<span class="badge ${peor.nivel === 'vencido' ? 'badge-rec' : 'badge-pend'}">${esc(DOCUMENTOS[peor.clave])} ${peor.nivel === 'vencido' ? 'vencido' : 'por vencer'}</span>` : '<span class="badge badge-ofi">Al día</span>'}</td>
        <td class="col-movil-oculta col-ingreso">${esc(fmtFecha(m.fechaIngreso || m.creado))}</td>
        <td><div class="acciones-fila">${accionesEstado(m)}</div></td></tr>`;
    }).join('')}</tbody></table>`;
}

async function cambiarEstado(id, estado, btn) {
  const m = estadoLideres.lista?.find(x => x.id === id);
  const nombre = m ? nombreCompleto(m) : 'este miembro';
  const textos = {
    aspirante: ['Aprobar como aspirante', `${nombre} pasará a aspirante y podrá empezar a rodar con el club.`, 'Aprobar'],
    oficial: ['Hacer miembro oficial', `${nombre} será miembro oficial y recibirá su QR de emergencia.`, 'Hacer oficial'],
    rechazado: ['Rechazar solicitud', `La solicitud de ${nombre} quedará como no aprobada. Puedes dejar una nota con el motivo.`, 'Rechazar'],
    inactivo: ['Marcar como inactivo', `${nombre} quedará inactivo. Podrás reactivarlo cuando quieras.`, 'Marcar inactivo'],
  };
  const [titulo, mensaje, ok] = textos[estado] || ['Cambiar estado', `¿Cambiar el estado de ${nombre}?`, 'Confirmar'];
  const r = await confirmar({ titulo, mensaje, textoOk: ok, peligro: estado === 'rechazado' || estado === 'inactivo', conNota: true, etiquetaNota: estado === 'rechazado' ? 'Motivo (opcional, solo lo ven los líderes)' : 'Nota (opcional)' });
  if (!r) return;
  await conCarga(btn, async () => {
    try {
      const act = await miembros.cambiarEstado(id, estado, r.nota || undefined);
      const tarjeta = $(`.pendiente[data-id="${CSS.escape(id)}"]`);
      if (tarjeta) { tarjeta.classList.add('saliendo'); await new Promise(res => setTimeout(res, 280)); }
      if (estadoLideres.lista) {
        const i = estadoLideres.lista.findIndex(x => x.id === id);
        if (i >= 0) estadoLideres.lista[i] = act || { ...estadoLideres.lista[i], estado };
      }
      if (id === yo.id && act) yo = act;
      toast(`${nombre}: ${ESTADOS[estado]?.txt.toLowerCase() || estado}.`, 'ok');
      await renderLideres(true);
    } catch (e) { toast(mensajeError(e), 'error'); }
  }, '…');
}

function verMiembro(id) {
  const m = estadoLideres.lista?.find(x => x.id === id);
  if (!m) return;
  const { el, cerrar } = dialogo({
    titulo: nombreCompleto(m),
    contenido: `<div class="ficha-cab"><span class="avatar avatar-lg">${esc(iniciales(nombreCompleto(m)))}</span>
        <div><div class="saludo-badges">${badgeEstado(m.estado, m.rol)}</div><p class="campo-ayuda" style="margin-top:6px">Ingreso: ${esc(fmtFecha(m.fechaIngreso || m.creado))}</p></div></div>
      <div class="alertas" style="margin-bottom:14px">${documentosDe(m).map(alertaDoc).join('')}</div>
      ${SECCIONES_FICHA.map(s => `<h3 class="sep-campos">${esc(s.titulo)}</h3>${dlSeccion(s.paso, m)}`).join('')}
      <div class="dlg-acciones">
        <a class="btn btn-borde btn-sm" href="${esc(urlEmergencia(m.id))}" target="_blank" rel="noopener">${icono('qr')}Ficha de emergencia</a>
        ${m.personal?.celular ? `<a class="btn btn-suave btn-sm" href="https://wa.me/57${esc(String(m.personal.celular).replace(/\D/g, '').slice(-10))}" target="_blank" rel="noopener">${icono('wa')}WhatsApp</a>` : ''}
        ${accionesEstado(m)}
      </div>`,
  });
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-estado]');
    if (!b) return;
    e.stopPropagation();
    cerrar();
    setTimeout(() => cambiarEstado(b.dataset.id, b.dataset.estado), 200);
  });
}

function nuevaRodada() {
  const lista = estadoLideres.lista || [];
  const lideres = lista.filter(esLider);
  if (!lideres.find(x => x.id === yo.id)) lideres.unshift(yo);
  const elegibles = lista.filter(m => m.estado === 'aspirante' || m.estado === 'oficial').sort((a, b) => nombreCompleto(a).localeCompare(nombreCompleto(b), 'es'));
  const { el, cerrar } = dialogo({
    titulo: 'Registrar rodada',
    contenido: `<form novalidate id="form-rodada"><div class="alerta-form" role="alert" hidden></div>
      <div class="campos">
        <div class="campo ancho-medio" data-campo="fecha"><label for="r-fecha">Fecha <span class="req" aria-hidden="true">*</span></label><input type="date" id="r-fecha" name="fecha" value="${hoyISO()}" max="${hoyISO()}" aria-required="true" aria-describedby="r-fecha-err"><p class="campo-error" id="r-fecha-err" aria-live="polite"></p></div>
        <div class="campo ancho-medio" data-campo="km"><label for="r-km">Kilómetros <span class="req" aria-hidden="true">*</span></label><input type="number" id="r-km" name="km" min="1" max="5000" inputmode="numeric" placeholder="Ej.: 120" aria-required="true" aria-describedby="r-km-err"><p class="campo-error" id="r-km-err" aria-live="polite"></p></div>
        <div class="campo" data-campo="titulo"><label for="r-titulo">Nombre de la rodada <span class="req" aria-hidden="true">*</span></label><input type="text" id="r-titulo" name="titulo" placeholder="Ej.: Rodada dominical a Turbaco" maxlength="80" aria-required="true" aria-describedby="r-titulo-err"><p class="campo-error" id="r-titulo-err" aria-live="polite"></p></div>
        <div class="campo" data-campo="ruta"><label for="r-ruta">Ruta <span class="req" aria-hidden="true">*</span></label><input type="text" id="r-ruta" name="ruta" placeholder="Ej.: Cartagena – Turbaco – Arjona – Cartagena" maxlength="160" aria-required="true" aria-describedby="r-ruta-err"><p class="campo-error" id="r-ruta-err" aria-live="polite"></p></div>
        <div class="campo" data-campo="liderId"><label for="r-lider">Líder de la rodada</label><div class="select"><select id="r-lider" name="liderId">${lideres.map(l => `<option value="${esc(l.id)}"${l.id === yo.id ? ' selected' : ''}>${esc(nombreCompleto(l))}</option>`).join('')}</select></div></div>
        <fieldset class="campo" data-campo="asistentes" aria-describedby="r-asis-err"><legend>Asistentes <span class="req" aria-hidden="true">*</span></legend>
          <div class="filtros" style="margin:4px 0 8px"><label class="buscador"><span class="sr-only">Filtrar asistentes</span>${icono('search')}<input type="search" id="r-buscar" placeholder="Filtrar por nombre"></label>
            <button type="button" class="btn btn-suave btn-sm" id="r-todos">Seleccionar todos</button></div>
          <div class="lista-asistentes">${elegibles.length ? elegibles.map(m => `<label data-nombre="${esc(normal(nombreCompleto(m)))}"><input type="checkbox" name="asistentes" value="${esc(m.id)}"${m.id === yo.id ? ' checked' : ''}><span>${esc(nombreCompleto(m))}</span>${badgeEstado(m.estado)}</label>`).join('') : '<p class="campo-ayuda" style="padding:8px">No hay aspirantes ni miembros oficiales todavía.</p>'}</div>
          <p class="seleccionados" id="r-sel" aria-live="polite"></p>
          <p class="campo-error" id="r-asis-err" aria-live="polite"></p></fieldset>
      </div>
      <div class="dlg-acciones"><button type="button" class="btn btn-borde" data-x>Cancelar</button><button type="submit" class="btn btn-primario">${icono('check')}Guardar rodada</button></div></form>`,
  });
  const form = el.querySelector('form');
  const contar = () => { const n = form.querySelectorAll('[name=asistentes]:checked').length; $('#r-sel', el).textContent = `${n} ${n === 1 ? 'asistente seleccionado' : 'asistentes seleccionados'}`; };
  contar();
  form.addEventListener('change', contar);
  $('#r-buscar', el).addEventListener('input', (e) => { const q = normal(e.target.value); $$('.lista-asistentes label', el).forEach(l => { l.hidden = !l.dataset.nombre.includes(q); }); });
  $('#r-todos', el).addEventListener('click', () => { const vis = $$('.lista-asistentes label:not([hidden]) input', el); const todos = vis.every(i => i.checked); vis.forEach(i => { i.checked = !todos; }); contar(); });
  el.querySelector('[data-x]').addEventListener('click', () => cerrar());
  const marcar = (campo, idErr, msg) => {
    const c = form.querySelector(`[data-campo="${campo}"]`);
    c.classList.toggle('con-error', !!msg);
    c.querySelectorAll('input:not([type=checkbox]):not([type=search])').forEach(i => msg ? i.setAttribute('aria-invalid', 'true') : i.removeAttribute('aria-invalid'));
    $(`#${idErr}`, el).innerHTML = msg ? `${icono('alert')}<span>${esc(msg)}</span>` : '';
  };
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(form);
    const d = { fecha: f.get('fecha'), titulo: String(f.get('titulo') || '').trim(), ruta: String(f.get('ruta') || '').trim(), km: Number(f.get('km')), liderId: f.get('liderId'), asistentes: f.getAll('asistentes') };
    const errs = {
      fecha: !d.fecha ? 'Indica la fecha.' : (diasHasta(d.fecha) > 0 ? 'La fecha no puede ser futura.' : ''),
      km: !(d.km > 0) ? 'Ingresa los kilómetros recorridos.' : '',
      titulo: !d.titulo ? 'Dale un nombre a la rodada.' : '',
      ruta: !d.ruta ? 'Describe la ruta.' : '',
      asistentes: !d.asistentes.length ? 'Selecciona al menos un asistente.' : '',
    };
    marcar('fecha', 'r-fecha-err', errs.fecha); marcar('km', 'r-km-err', errs.km); marcar('titulo', 'r-titulo-err', errs.titulo); marcar('ruta', 'r-ruta-err', errs.ruta); marcar('asistentes', 'r-asis-err', errs.asistentes);
    const primero = Object.entries(errs).find(([, m]) => m);
    if (primero) { const i = form.querySelector(`[data-campo="${primero[0]}"] input`); i && i.focus(); return; }
    await conCarga(form.querySelector('[type=submit]'), async () => {
      try {
        await rodadas.crear(d);
        toast(`Rodada registrada: ${d.titulo} (${fmtNum(d.km)} km, ${d.asistentes.length} asistentes).`, 'ok');
        cerrar();
        if (d.asistentes.includes(yo.id)) await cargarHistorial();
        await renderLideres(true);
      } catch (err) {
        const a = form.querySelector('.alerta-form');
        a.innerHTML = `${icono('alert')}<span>${esc(mensajeError(err))}</span>`; a.hidden = false;
      }
    }, 'Guardando…');
  });
  $('#r-titulo', el).focus();
}

/* ================= Carga y eventos ================= */
const RENDER = { inicio: renderInicio, ficha: renderFicha, qr: renderQR, rodadas: renderRodadas, lideres: () => renderLideres() };

async function cargarHistorial() {
  try {
    historial = await rodadas.historialDe(yo.id) || { rodadas: [], kmTotal: 0, cantidad: 0 };
    historial.rodadas = historial.rodadas || [];
  } catch (e) {
    historial = { rodadas: [], kmTotal: 0, cantidad: 0 };
    toast(mensajeError(e), 'error');
  }
  ['inicio', 'rodadas'].forEach(id => { if (renderizadas.has(id)) RENDER[id](); });
}

async function salir(btn) {
  await conCarga(btn, async () => {
    try { await auth.salir(); } catch { /* igual salimos */ }
    location.replace('index.html');
  }, 'Saliendo…');
}

function eventos() {
  addEventListener('hashchange', () => mostrarVista(location.hash.slice(1) || 'inicio', { foco: true }));
  document.addEventListener('click', (e) => {
    const t = e.target;
    const salirB = t.closest('[data-salir]');
    if (salirB) return salir(salirB);
    const ed = t.closest('[data-editar]');
    if (ed) return editarSeccion(ed.dataset.editar);
    if (t.closest('[data-imprimir]')) {
      document.body.classList.add('imprimiendo-qr');
      setTimeout(() => { window.print(); document.body.classList.remove('imprimiendo-qr'); }, 50);
      return;
    }
    const cp = t.closest('[data-copiar]');
    if (cp) {
      const texto = cp.dataset.copiar;
      (navigator.clipboard ? navigator.clipboard.writeText(texto) : Promise.reject())
        .then(() => toast('Enlace copiado.', 'ok', 2500))
        .catch(() => { prompt('Copia este enlace:', texto); });
      return;
    }
    if (t.closest('.dlg')) return;
    const est = t.closest('[data-estado]');
    if (est) { e.stopPropagation(); return cambiarEstado(est.dataset.id, est.dataset.estado, est); }
    const fil = t.closest('[data-filtro]');
    if (fil) { estadoLideres.filtro = fil.dataset.filtro; renderChips(); renderTabla(); return; }
    if (t.closest('[data-nueva-rodada]')) return nuevaRodada();
    const ver = t.closest('[data-ver]');
    if (ver) return verMiembro(ver.dataset.ver);
  });
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('tr[data-ver]')) { e.preventDefault(); verMiembro(e.target.dataset.ver); }
  });
  addEventListener('beforeprint', () => { if (!document.body.classList.contains('imprimiendo-qr') && location.hash === '#qr') document.body.classList.add('imprimiendo-qr'); });
  addEventListener('afterprint', () => document.body.classList.remove('imprimiendo-qr'));
}

async function iniciar() {
  let sesion;
  try { sesion = await auth.sesion(); } catch { sesion = null; }
  if (!sesion || !sesion.usuario) { location.replace('index.html'); return; }
  yo = sesion.miembro || await miembros.actual();
  if (!yo) { location.replace('index.html'); return; }
  lider = esLider(yo);
  construirNav();
  eventos();
  mostrarVista(location.hash.slice(1) || 'inicio');
  cargarHistorial();
}

iniciar().catch((e) => {
  console.error(e);
  errorCarga(vista('inicio'), mensajeError(e));
});
