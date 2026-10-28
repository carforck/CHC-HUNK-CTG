// Club Hunk Cartagena · Portal · esquema de la ficha y utilidades de formulario
// Lo usan el wizard de registro y la edición de ficha del panel.
import { reglas, validarPaso, OPCIONES } from './validacion.js';
import { esc, icono, fmtFecha } from './ui-comun.js';

const ANIO = new Date().getFullYear();
export const MODELOS_HUNK = ['Hunk 150', 'Hunk 160R', 'Hunk 160R 4V', 'Hunk 190R', 'Hunk Sports'];

/*
 Campo: { n: nombre con ruta (personal.nombres), l: etiqueta, t: tipo, r: reglas[], op: clave de OPCIONES,
          opc: opcional (muestra "opcional"), ph, ayuda, ac: autocomplete, ancho: 'medio'|'tercio'|'completo',
          mayus, lista (datalist), min, max, cuando(datos), igualA, grupo (requerido si el grupo tiene datos) }
*/
export const PASOS = [
  {
    id: 'personal', titulo: 'Datos personales', corto: 'Personal', icono: 'user',
    intro: 'Cuéntanos quién eres. Usamos estos datos solo para la gestión interna del club.',
    campos: [
      { n: 'personal.nombres', l: 'Nombres', t: 'text', r: ['requerido'], ac: 'given-name', ancho: 'medio' },
      { n: 'personal.apellidos', l: 'Apellidos', t: 'text', r: ['requerido'], ac: 'family-name', ancho: 'medio' },
      { n: 'personal.tipoDocumento', l: 'Tipo de documento', t: 'select', op: 'tiposDocumento', r: ['requerido'], ancho: 'medio' },
      { n: 'personal.documento', l: 'Número de documento', t: 'text', r: ['requerido', 'documento'], inputmode: 'numeric', ancho: 'medio', ayuda: 'Sin puntos ni espacios.' },
      { n: 'personal.nacimiento', l: 'Fecha de nacimiento', t: 'date', r: ['requerido', 'fechaPasada'], ac: 'bday', ancho: 'medio' },
      { n: 'personal.celular', l: 'Celular (WhatsApp)', t: 'tel', r: ['requerido', 'celularCO'], ac: 'tel-national', inputmode: 'tel', ph: '300 123 4567', ancho: 'medio' },
      { n: 'personal.correo', l: 'Correo electrónico', t: 'email', r: ['requerido', 'correo'], ac: 'email', ph: 'tucorreo@ejemplo.com', ancho: 'completo', ayuda: 'Con este correo entrarás al portal.' },
      { n: 'personal.ciudad', l: 'Ciudad', t: 'text', r: ['requerido'], ac: 'address-level2', ph: 'Cartagena', ancho: 'medio' },
      { n: 'personal.barrio', l: 'Barrio', t: 'text', opc: true, ph: 'Ej.: Manga', ancho: 'medio' },
    ],
  },
  {
    id: 'moto', titulo: 'Tu moto', corto: 'Moto', icono: 'bike',
    intro: 'Los datos de la moto y sus documentos nos permiten avisarte antes de que se venzan.',
    campos: [
      { n: 'moto.marca', l: 'Marca', t: 'text', r: ['requerido'], ph: 'Hero', ancho: 'medio' },
      { n: 'moto.modelo', l: 'Modelo / referencia', t: 'text', r: ['requerido'], lista: MODELOS_HUNK, ph: 'Hunk 160R 4V', ancho: 'medio' },
      { n: 'moto.anio', l: 'Año (modelo)', t: 'number', r: ['requerido'], min: 1980, max: ANIO + 1, inputmode: 'numeric', ancho: 'tercio' },
      { n: 'moto.placa', l: 'Placa', t: 'text', r: ['requerido', 'placaCO'], mayus: true, ph: 'ABC12D', ancho: 'tercio' },
      { n: 'moto.color', l: 'Color', t: 'text', r: ['requerido'], ph: 'Negro mate', ancho: 'tercio' },
      { sep: 'Documentos' },
      { n: 'moto.soatVence', l: 'Vencimiento del SOAT', t: 'date', r: ['requerido'], ancho: 'medio', avisoVence: true },
      { n: 'moto.tecnoVence', l: 'Vencimiento de la tecnomecánica', t: 'date', opc: true, ancho: 'medio', avisoVence: true, ayuda: 'Las motos nuevas no la requieren durante sus primeros 2 años.' },
      { n: 'moto.licenciaCategoria', l: 'Categoría de la licencia', t: 'select', op: 'categoriasLicencia', r: ['requerido'], ancho: 'medio' },
      { n: 'moto.licenciaVence', l: 'Vencimiento de la licencia', t: 'date', r: ['requerido'], ancho: 'medio', avisoVence: true },
    ],
  },
  {
    id: 'salud', titulo: 'Salud y emergencia', corto: 'Salud', icono: 'heart',
    intro: 'Si pasa algo en la vía, esta información puede salvarte. Los datos de salud son sensibles: solo los ven los líderes y tu ficha de emergencia.',
    campos: [
      { n: 'salud.tipoSangre', l: 'Tipo de sangre y RH', t: 'select', op: 'tiposSangre', opc: true, ancho: 'medio', ayuda: 'Muy recomendado: es lo primero que necesita un paramédico.' },
      { n: 'salud.eps', l: 'EPS o seguro médico', t: 'select', op: 'eps', opc: true, ancho: 'medio' },
      { n: 'salud.alergias', l: 'Alergias', t: 'textarea', opc: true, ph: 'Ej.: penicilina, picadura de abeja. Si no tienes, escribe "Ninguna".', ancho: 'completo' },
      { n: 'salud.condiciones', l: 'Condiciones médicas', t: 'textarea', opc: true, ph: 'Ej.: asma, diabetes, epilepsia, cirugías recientes.', ancho: 'completo' },
      { n: 'salud.medicamentos', l: 'Medicamentos que tomas', t: 'textarea', opc: true, ph: 'Nombre y dosis, si aplica.', ancho: 'completo' },
      { sep: 'Contacto de emergencia' },
      { n: 'emergencia.0.nombre', l: 'Nombre completo', t: 'text', r: ['requerido'], ancho: 'completo' },
      { n: 'emergencia.0.parentesco', l: 'Parentesco', t: 'select', op: 'parentescos', r: ['requerido'], ancho: 'medio' },
      { n: 'emergencia.0.celular', l: 'Celular', t: 'tel', r: ['requerido', 'celularCO'], inputmode: 'tel', ph: '300 123 4567', ancho: 'medio' },
      { sep: 'Segundo contacto', nota: 'opcional' },
      { n: 'emergencia.1.nombre', l: 'Nombre completo', t: 'text', opc: true, grupo: 'emergencia.1', ancho: 'completo' },
      { n: 'emergencia.1.parentesco', l: 'Parentesco', t: 'select', op: 'parentescos', opc: true, ancho: 'medio' },
      { n: 'emergencia.1.celular', l: 'Celular', t: 'tel', r: ['celularCO'], opc: true, grupo: 'emergencia.1', inputmode: 'tel', ph: '300 123 4567', ancho: 'medio' },
    ],
  },
  {
    id: 'club', titulo: 'Tú y el club', corto: 'Club', icono: 'helmet',
    intro: 'Ayúdanos a conocerte un poco más. Si tienes un negocio, puede aparecer en la vitrina de emprendimientos.',
    campos: [
      { n: 'club.comoNosConociste', l: '¿Cómo nos conociste?', t: 'select', op: 'comoNosConociste', r: ['requerido'], ancho: 'medio' },
      { n: 'club.recomendadoPor', l: '¿Quién te recomendó?', t: 'text', opc: true, ph: 'Nombre del miembro', ancho: 'medio' },
      { n: 'club.redes', l: 'Redes sociales', t: 'text', opc: true, ph: '@tuusuario', ancho: 'medio' },
      { n: 'club.tallaJersey', l: 'Talla de jersey', t: 'select', op: 'tallas', r: ['requerido'], ancho: 'medio' },
      { sep: 'Emprendimiento' },
      { n: 'club.emprendimiento.tiene', l: '¿Tienes un emprendimiento o negocio?', t: 'sino', ancho: 'completo' },
      { n: 'club.emprendimiento.nombre', l: 'Nombre del emprendimiento', t: 'text', r: ['requerido'], ancho: 'medio', cuando: d => d?.club?.emprendimiento?.tiene === true },
      { n: 'club.emprendimiento.whatsapp', l: 'WhatsApp del negocio', t: 'tel', r: ['requerido', 'celularCO'], inputmode: 'tel', ancho: 'medio', cuando: d => d?.club?.emprendimiento?.tiene === true },
      { n: 'club.emprendimiento.descripcion', l: '¿Qué ofreces?', t: 'textarea', r: ['requerido'], ph: 'Ej.: lujos y accesorios para moto, domicilios en Cartagena.', ancho: 'completo', cuando: d => d?.club?.emprendimiento?.tiene === true },
    ],
  },
  {
    id: 'cuenta', titulo: 'Cuenta y consentimiento', corto: 'Cuenta', icono: 'lock',
    intro: 'Crea tu contraseña para entrar al portal y revisa cómo cuidamos tus datos.',
    campos: [
      { n: 'cuenta.password', l: 'Contraseña', t: 'password', r: ['requerido', 'password'], ac: 'new-password', ancho: 'medio', ayuda: 'Mínimo 8 caracteres, con letras y números.', medidor: true },
      { n: 'cuenta.password2', l: 'Confirma la contraseña', t: 'password', r: ['requerido'], ac: 'new-password', igualA: 'cuenta.password', ancho: 'medio' },
      { legal: true },
      { n: 'cuenta.datos', l: 'Autorizo el tratamiento de mis datos personales por parte de Club Hunk Cartagena, conforme a la Ley 1581 de 2012 y la política de privacidad del club.', t: 'check', r: ['aceptar'] },
      { n: 'cuenta.salud', l: 'Autorizo que mis datos de salud y contactos de emergencia se compartan solo con los líderes del club y en mi ficha de emergencia (QR), únicamente para atenderme en una emergencia.', t: 'check', r: ['aceptar'] },
      { n: 'cuenta.reglamento', l: 'He leído y acepto el reglamento del club: respeto en la vía, uso de casco y equipo de protección, y seguir las indicaciones del líder de rodada.', t: 'check', r: ['aceptar'] },
    ],
  },
];

export const TEXTO_LEGAL = `
  <div class="legal" tabindex="0" role="region" aria-label="Resumen de la autorización de tratamiento de datos">
    <h4>${icono('shield')} Tus datos, protegidos (Habeas Data)</h4>
    <ul>
      <li><b>Responsable:</b> Club Hunk Cartagena, a través de sus líderes.</li>
      <li><b>Finalidad:</b> gestionar tu membresía, organizar rodadas, enviarte avisos del club y atenderte en caso de emergencia.</li>
      <li><b>Datos sensibles:</b> tu información de salud es opcional y solo la ven los líderes y quien escanee tu QR en una emergencia (lo esencial, sin documento ni dirección).</li>
      <li><b>Tus derechos:</b> conocer, actualizar, rectificar y pedir que se borren tus datos cuando quieras, escribiendo a los líderes del club.</li>
      <li>No vendemos ni compartimos tu información con terceros con fines comerciales.</li>
    </ul>
  </div>`;

/* ---------- Rutas en objetos ---------- */
export function obtener(obj, ruta) {
  return ruta.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
export function asignar(obj, ruta, valor) {
  const ks = ruta.split('.');
  let o = obj;
  ks.forEach((k, i) => {
    const ultimo = i === ks.length - 1;
    const sigNum = !ultimo && /^\d+$/.test(ks[i + 1]);
    if (ultimo) o[k] = valor;
    else { if (o[k] == null || typeof o[k] !== 'object') o[k] = sigNum ? [] : {}; o = o[k]; }
  });
  return obj;
}
export function idCampo(n) { return 'f-' + n.replace(/\./g, '-'); }
export function camposDe(pasoId) { return (PASOS.find(p => p.id === pasoId)?.campos || []).filter(c => c.n); }

/* ---------- Opciones de selects (tolerante a strings u objetos) ---------- */
function opcionesDe(clave) {
  const arr = (OPCIONES && OPCIONES[clave]) || [];
  return arr.map(o => (typeof o === 'object' && o !== null)
    ? { v: o.valor ?? o.value ?? o.id ?? o.codigo ?? o.nombre, t: o.etiqueta ?? o.label ?? o.nombre ?? o.texto ?? o.valor ?? o.value }
    : { v: o, t: o });
}
export function etiquetaOpcion(clave, valor) {
  const o = opcionesDe(clave).find(x => String(x.v) === String(valor));
  return o ? o.t : valor;
}

/* Valor legible para resúmenes y fichas (null si está vacío) */
export function valorLegible(c, v) {
  if (v === true) return 'Sí';
  if (v === false) return c.t === 'sino' ? 'No' : null;
  if (v == null || v === '') return null;
  if (c.t === 'select') return etiquetaOpcion(c.op, v);
  if (c.t === 'date') return fmtFecha(v);
  return String(v);
}

/* ---------- Render ---------- */
export function renderCampos(campos, datos = {}) {
  return campos.map(c => renderCampo(c, datos)).join('');
}

export function renderCampo(c, datos = {}) {
  if (c.sep) return `<h3 class="sep-campos">${esc(c.sep)}${c.nota ? ` <small>(${esc(c.nota)})</small>` : ''}</h3>`;
  if (c.legal) return TEXTO_LEGAL;
  const id = idCampo(c.n);
  const val = obtener(datos, c.n);
  const req = (c.r || []).includes('requerido') || (c.r || []).includes('aceptar');
  const ayudaId = c.ayuda ? `${id}-ayuda` : '';
  const errId = `${id}-err`;
  const desc = [ayudaId, errId].filter(Boolean).join(' ');
  const oculto = c.cuando && !c.cuando(datos) ? ' hidden' : '';
  const etiqueta = `${esc(c.l)}${c.opc ? ' <span class="opc">(opcional)</span>' : ''}${req ? ' <span class="req" aria-hidden="true">*</span>' : ''}`;
  const comunes = `id="${id}" name="${c.n}" aria-describedby="${desc}"${req ? ' aria-required="true"' : ''}${c.ac ? ` autocomplete="${c.ac}"` : ''}${c.inputmode ? ` inputmode="${c.inputmode}"` : ''}${c.ph ? ` placeholder="${esc(c.ph)}"` : ''}`;
  const pie = `${c.ayuda ? `<p class="campo-ayuda" id="${ayudaId}">${esc(c.ayuda)}</p>` : ''}<p class="campo-error" id="${errId}" aria-live="polite"></p>`;
  const ancho = `ancho-${c.ancho || 'completo'}`;

  if (c.t === 'check') {
    return `<div class="campo campo-check ${ancho}" data-campo="${c.n}"${oculto}>
      <label class="check"><input type="checkbox" ${comunes}${val ? ' checked' : ''}><span class="check-caja" aria-hidden="true">${icono('check')}</span><span>${esc(c.l)}</span></label>${pie}</div>`;
  }
  if (c.t === 'sino') {
    const si = val === true, no = val === false;
    return `<fieldset class="campo campo-sino ${ancho}" data-campo="${c.n}"${oculto} aria-describedby="${errId}">
      <legend>${etiqueta}</legend>
      <div class="segmentado">
        <label><input type="radio" name="${c.n}" value="si"${si ? ' checked' : ''}><span>Sí, tengo</span></label>
        <label><input type="radio" name="${c.n}" value="no"${no ? ' checked' : ''}><span>No por ahora</span></label>
      </div>${pie}</fieldset>`;
  }
  let control;
  if (c.t === 'select') {
    const ops = opcionesDe(c.op);
    control = `<div class="select"><select ${comunes}><option value="">Selecciona…</option>${ops.map(o => `<option value="${esc(o.v)}"${String(o.v) === String(val ?? '') ? ' selected' : ''}>${esc(o.t)}</option>`).join('')}</select></div>`;
  } else if (c.t === 'textarea') {
    control = `<textarea ${comunes} rows="2" maxlength="500">${esc(val ?? '')}</textarea>`;
  } else if (c.t === 'password') {
    control = `<div class="con-boton"><input type="password" ${comunes} minlength="8">
      <button type="button" class="btn-icono" data-ver-pass="${id}" aria-label="Mostrar contraseña" aria-pressed="false">${icono('eye')}</button></div>
      ${c.medidor ? `<div class="medidor" aria-hidden="true"><span></span></div>` : ''}`;
  } else {
    const lista = c.lista ? ` list="${id}-lista"` : '';
    const minmax = `${c.min != null ? ` min="${c.min}"` : ''}${c.max != null ? ` max="${c.max}"` : ''}`;
    control = `<input type="${c.t}" ${comunes}${lista}${minmax}${c.mayus ? ' data-mayus autocapitalize="characters"' : ''} value="${esc(val ?? '')}">`
      + (c.lista ? `<datalist id="${id}-lista">${c.lista.map(x => `<option value="${esc(x)}">`).join('')}</datalist>` : '');
  }
  return `<div class="campo ${ancho}" data-campo="${c.n}"${oculto}>
    <label for="${id}">${etiqueta}</label>${control}${c.avisoVence ? `<p class="campo-aviso" id="${id}-aviso" aria-live="polite"></p>` : ''}${pie}</div>`;
}

/* ---------- Leer / llenar ---------- */
export function leerFormulario(form, base = {}) {
  const datos = structuredClone(base);
  const vistos = new Set();
  for (const el of form.elements) {
    const n = el.name;
    if (!n || n.startsWith('_')) continue;
    if (el.type === 'radio') {
      if (vistos.has(n)) continue;
      vistos.add(n);
      const sel = form.querySelector(`input[name="${CSS.escape(n)}"]:checked`);
      asignar(datos, n, sel ? sel.value === 'si' : undefined);
    } else if (el.type === 'checkbox') {
      asignar(datos, n, el.checked);
    } else if (el.type === 'number') {
      asignar(datos, n, el.value === '' ? '' : Number(el.value));
    } else {
      asignar(datos, n, el.dataset.mayus !== undefined ? el.value.toUpperCase().replace(/\s+/g, '') : el.value.trim());
    }
  }
  return datos;
}

/* ---------- Validación ---------- */
function vacio(v) { return v == null || v === '' || v === false; }

export function validarCampo(c, datos) {
  const v = obtener(datos, c.n);
  if (c.cuando && !c.cuando(datos)) return '';
  const rs = c.r || [];
  if (rs.includes('aceptar')) return v === true ? '' : 'Debes aceptar para continuar.';
  if (c.grupo) {
    const g = obtener(datos, c.grupo) || {};
    const algo = Object.values(g).some(x => !vacio(x));
    if (algo && vacio(v)) return 'Completa este dato o deja vacío todo el segundo contacto.';
  }
  if (vacio(v)) {
    if (rs.includes('requerido')) return (reglas.requerido && reglas.requerido('')) || 'Este campo es obligatorio.';
    return '';
  }
  for (const r of rs) {
    const fn = reglas && reglas[r];
    if (typeof fn === 'function') {
      const m = r === 'documento' ? fn(v, obtener(datos, 'personal.tipoDocumento')) : fn(typeof v === 'number' ? String(v) : v);
      if (m) return m;
    }
  }
  if (c.t === 'number' && ((c.min != null && v < c.min) || (c.max != null && v > c.max))) return `Ingresa un valor entre ${c.min} y ${c.max}.`;
  if (c.igualA && v !== obtener(datos, c.igualA)) return 'Las contraseñas no coinciden.';
  return '';
}

/* Objeto que se pasa a validarPaso: sección plana + datos completos (compatible con ambas lecturas) */
export function datosParaPaso(pasoId, datos) {
  let seccion;
  if (pasoId === 'salud') seccion = { ...(datos.salud || {}), emergencia: datos.emergencia || [] };
  else if (pasoId === 'cuenta') {
    const c = datos.cuenta || {};
    seccion = { ...c, confirmacion: c.password2, consentimientos: { datos: !!c.datos, salud: !!c.salud, reglamento: !!c.reglamento } };
  } else seccion = { ...(datos[pasoId] || {}) };
  return { ...datos, ...seccion };
}

function mapearClave(pasoId, k, nombres) {
  const norm = String(k).replace(/\[(\d+)\]/g, '.$1');
  const cands = [norm, `${pasoId}.${norm}`, `emergencia.${norm}`, `club.emprendimiento.${norm}`];
  if (pasoId === 'cuenta' && /confirm/i.test(norm)) cands.push('cuenta.password2');
  if (pasoId === 'cuenta' && /^consentimientos\./.test(norm)) cands.push('cuenta.' + norm.split('.')[1]);
  if (/^emergencia$/.test(norm)) cands.push('emergencia.0.nombre');
  return cands.find(x => nombres.includes(x));
}

/* Valida un paso: reglas propias por campo + validarPaso del contrato. Devuelve { valido, errores:{nombreCampo:msg}, generales:[] } */
export function validarPasoCompleto(pasoId, datos) {
  const campos = camposDe(pasoId);
  const nombres = campos.map(c => c.n);
  const errores = {};
  const generales = [];
  campos.forEach(c => { const m = validarCampo(c, datos); if (m) errores[c.n] = m; });
  try {
    const r = validarPaso(pasoId, datosParaPaso(pasoId, datos)) || {};
    const hayEmerg = Object.keys(errores).some(k => k.startsWith('emergencia.'));
    Object.entries(r.errores || {}).forEach(([k, m]) => {
      if (!m) return;
      if (k === 'emergencia' && (hayEmerg || Object.keys(r.errores).some(x => x.startsWith('emergencia.')))) return;
      const n = mapearClave(pasoId, k, nombres);
      if (n) {
        const c = campos.find(x => x.n === n);
        if (c && c.cuando && !c.cuando(datos)) return;
        if (!errores[n]) errores[n] = m;
      } else if (!generales.includes(m)) generales.push(m);
    });
  } catch (e) { console.warn('validarPaso', e); }
  return { valido: !Object.keys(errores).length && !generales.length, errores, generales };
}

export function pintarError(form, n, msg) {
  const id = idCampo(n);
  const cont = form.querySelector(`[data-campo="${CSS.escape(n)}"]`);
  const err = form.querySelector(`#${CSS.escape(id)}-err`);
  const ctrls = cont ? cont.querySelectorAll('input,select,textarea') : [];
  ctrls.forEach(el => { if (msg) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid'); });
  if (cont) { cont.classList.toggle('con-error', !!msg); cont.classList.toggle('valido', !msg && ctrls.length && ctrls[0].value !== '' && ctrls[0].type !== 'checkbox' && ctrls[0].type !== 'radio'); }
  if (err) err.innerHTML = msg ? `${icono('alert')}<span>${esc(msg)}</span>` : '';
}

export function pintarErrores(form, campos, errores) {
  campos.forEach(c => pintarError(form, c.n, errores[c.n] || ''));
  const primero = campos.find(c => errores[c.n]);
  if (primero) {
    const el = form.querySelector(`[data-campo="${CSS.escape(primero.n)}"] input, [data-campo="${CSS.escape(primero.n)}"] select, [data-campo="${CSS.escape(primero.n)}"] textarea`);
    if (el) { el.focus({ preventScroll: true }); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  }
}

/* Muestra/oculta campos condicionales */
export function actualizarCondicionales(form, campos, datos) {
  campos.forEach(c => {
    if (!c.cuando) return;
    const cont = form.querySelector(`[data-campo="${CSS.escape(c.n)}"]`);
    if (!cont) return;
    const ver = !!c.cuando(datos);
    if (cont.hidden === ver) { cont.hidden = !ver; if (ver) cont.classList.add('aparece'); }
  });
}

/* Avisos suaves de vencimiento en campos de fecha */
export function avisoVencimiento(form, n, valor, diasHasta) {
  const el = form.querySelector(`#${CSS.escape(idCampo(n))}-aviso`);
  if (!el) return;
  const d = valor ? diasHasta(valor) : null;
  if (d == null) { el.textContent = ''; el.className = 'campo-aviso'; return; }
  if (d < 0) { el.textContent = 'Este documento ya está vencido. Te lo recordaremos para que lo renueves.'; el.className = 'campo-aviso mal'; }
  else if (d <= 30) { el.textContent = `Vence en ${d} ${d === 1 ? 'día' : 'días'}. Ten presente renovarlo.`; el.className = 'campo-aviso medio'; }
  else { el.textContent = ''; el.className = 'campo-aviso'; }
}

/* Fuerza de contraseña (solo visual) */
export function fuerzaPassword(p) {
  let s = 0;
  if (!p) return 0;
  if (p.length >= 8) s++;
  if (p.length >= 12) s++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return Math.min(4, s);
}

/* Validación en vivo de un formulario (blur + input tras primer error) */
export function validacionEnVivo(form, campos, obtenerDatos, extra) {
  const porNombre = Object.fromEntries(campos.map(c => [c.n, c]));
  const tocados = new Set();
  const revisar = (n) => {
    const c = porNombre[n];
    if (!c) return;
    const datos = obtenerDatos();
    pintarError(form, n, validarCampo(c, datos));
    if (c.igualA === undefined) {
      const dep = campos.find(x => x.igualA === n);
      if (dep && tocados.has(dep.n)) pintarError(form, dep.n, validarCampo(dep, datos));
    }
  };
  form.addEventListener('focusout', (e) => {
    const n = e.target.name;
    if (!porNombre[n] || e.target.type === 'radio') return;
    tocados.add(n);
    revisar(n);
  });
  form.addEventListener('input', (e) => {
    const el = e.target;
    if (el.dataset && el.dataset.mayus !== undefined) {
      const pos = el.selectionStart;
      el.value = el.value.toUpperCase();
      try { el.setSelectionRange(pos, pos); } catch { /* tipos sin selección */ }
    }
    const cont = el.closest('.campo');
    if (tocados.has(el.name) || (cont && cont.classList.contains('con-error'))) revisar(el.name);
    extra && extra(el);
  });
  form.addEventListener('change', (e) => {
    const el = e.target;
    if (el.type === 'checkbox' || el.type === 'radio' || el.tagName === 'SELECT' || el.type === 'date') { tocados.add(el.name); revisar(el.name); }
    extra && extra(el);
  });
  return { revisar, tocados };
}
