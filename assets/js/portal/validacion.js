// Validación de la ficha del miembro · Club Hunk Cartagena
// Todo es síncrono y sin dependencias. Los mensajes están listos para mostrar.
//
// Convención: las reglas de formato (correo, celularCO, documento, placaCO,
// fechaPasada, fechaFutura) devuelven '' si el valor está vacío; para exigir
// el campo se combina con `requerido` (así lo hace validarPaso).
// `password` sí exige valor siempre.

import { EDAD_MINIMA } from './config.js';

// ---------- Opciones para los formularios ----------
export const OPCIONES = {
  tiposDocumento: [
    { valor: 'CC', etiqueta: 'Cédula de ciudadanía' },
    { valor: 'CE', etiqueta: 'Cédula de extranjería' },
    { valor: 'TI', etiqueta: 'Tarjeta de identidad' },
    { valor: 'PA', etiqueta: 'Pasaporte' },
    { valor: 'PPT', etiqueta: 'Permiso por protección temporal' },
  ],
  tiposSangre: ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'],
  eps: [
    'Nueva EPS', 'Sura', 'Sanitas', 'Salud Total', 'Coosalud', 'Mutual Ser',
    'Famisanar', 'Compensar', 'Cajacopi', 'Aliansalud', 'Asmet Salud',
    'Régimen especial (Fuerzas Militares, Policía, Magisterio)',
    'Medicina prepagada / seguro privado', 'Otra',
  ],
  tallas: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  parentescos: [
    'Mamá', 'Papá', 'Esposo(a)', 'Pareja', 'Hermano(a)', 'Hijo(a)',
    'Tío(a)', 'Primo(a)', 'Abuelo(a)', 'Amigo(a)', 'Otro',
  ],
  comoNosConociste: ['TikTok', 'Instagram', 'Un amigo del club', 'En una rodada', 'Otro'],
  categoriasLicencia: ['A1', 'A2'],
};

// ---------- Utilidades ----------
const vacio = (v) =>
  v === undefined || v === null || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0);

/** Fecha local de hoy a medianoche. */
function hoy() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** 'YYYY-MM-DD' -> Date local (medianoche) o null si no es una fecha real. */
export function parsearFecha(fechaISO) {
  if (typeof fechaISO !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(fechaISO.trim());
  if (!m) return null;
  const [a, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(a, mes - 1, dia);
  if (d.getFullYear() !== a || d.getMonth() !== mes - 1 || d.getDate() !== dia) return null;
  return d;
}

/** Date -> 'YYYY-MM-DD' en hora local. */
export function aISO(fecha) {
  const p = (n) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${p(fecha.getMonth() + 1)}-${p(fecha.getDate())}`;
}

/** Días desde hoy hasta la fecha (negativo si ya pasó, 0 si es hoy, null si no es válida). */
export function diasHasta(fechaISO) {
  const d = parsearFecha(fechaISO);
  if (!d) return null;
  return Math.round((d - hoy()) / 86400000);
}

/** Edad cumplida en años a hoy, o null. */
export function edad(fechaISO) {
  const d = parsearFecha(fechaISO);
  if (!d) return null;
  const h = hoy();
  let e = h.getFullYear() - d.getFullYear();
  if (h.getMonth() < d.getMonth() || (h.getMonth() === d.getMonth() && h.getDate() < d.getDate())) e--;
  return e;
}

/** 'abc-12d ' -> 'ABC12D' */
export function normalizarPlaca(p) {
  return String(p ?? '').toUpperCase().replace(/[\s-]/g, '');
}

/** '+57 300 123 4567' -> '3001234567' (si no se puede, devuelve los dígitos tal cual). */
export function normalizarCelular(c) {
  let d = String(c ?? '').replace(/[^\d+]/g, '');
  if (d.startsWith('+57')) d = d.slice(3);
  else if (d.startsWith('0057')) d = d.slice(4);
  else if (d.startsWith('57') && d.length === 12) d = d.slice(2);
  return d.replace(/\D/g, '');
}

/** Documento sin puntos, espacios ni guiones, en mayúsculas. */
export function normalizarDocumento(doc) {
  return String(doc ?? '').toUpperCase().replace(/[\s.\-]/g, '');
}

// ---------- Reglas (valor) -> '' | mensaje ----------
export const reglas = {
  requerido(valor) {
    return vacio(valor) ? 'Este campo es obligatorio' : '';
  },

  correo(valor) {
    if (vacio(valor)) return '';
    const v = String(valor).trim();
    return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v) && v.length <= 254
      ? ''
      : 'Escribe un correo válido, por ejemplo nombre@correo.com';
  },

  celularCO(valor) {
    if (vacio(valor)) return '';
    return /^3\d{9}$/.test(normalizarCelular(valor))
      ? ''
      : 'Escribe un celular colombiano de 10 dígitos que empiece por 3';
  },

  /** tipo opcional: con 'PA' (pasaporte) acepta letras y números. */
  documento(valor, tipo) {
    if (vacio(valor)) return '';
    const v = normalizarDocumento(valor);
    if (tipo === 'PA') {
      return /^[A-Z0-9]{5,12}$/.test(v) ? '' : 'El pasaporte debe tener entre 5 y 12 letras o números';
    }
    return /^\d{5,12}$/.test(v) ? '' : 'El documento debe tener entre 5 y 12 dígitos, sin puntos';
  },

  placaCO(valor) {
    if (vacio(valor)) return '';
    return /^[A-Z]{3}\d{2}[A-Z]$/.test(normalizarPlaca(valor))
      ? ''
      : 'Escribe una placa de moto válida, por ejemplo ABC12D';
  },

  password(valor) {
    const v = String(valor ?? '');
    if (v.length < 8) return 'La contraseña debe tener mínimo 8 caracteres';
    if (!/\d/.test(v)) return 'La contraseña debe tener al menos un número';
    if (!/\p{L}/u.test(v)) return 'La contraseña debe tener al menos una letra';
    return '';
  },

  fechaPasada(valor) {
    if (vacio(valor)) return '';
    const d = diasHasta(valor);
    if (d === null) return 'Escribe una fecha válida';
    return d < 0 ? '' : 'La fecha debe ser anterior a hoy';
  },

  fechaFutura(valor) {
    if (vacio(valor)) return '';
    const d = diasHasta(valor);
    if (d === null) return 'Escribe una fecha válida';
    return d >= 0 ? '' : 'La fecha debe ser hoy o posterior';
  },
};

// Regla auxiliar: fecha válida (pasada o futura).
const fechaValida = (v) => (vacio(v) || parsearFecha(v) ? '' : 'Escribe una fecha válida');
const enLista = (lista, msg) => (v) => (vacio(v) || lista.includes(v) ? '' : msg);

/** Aplica reglas en orden y devuelve el primer mensaje de error. */
function primero(valor, ...fns) {
  for (const fn of fns) {
    const m = fn(valor);
    if (m) return m;
  }
  return '';
}

// ---------- Validación por paso ----------
const PASOS = {
  personal(d = {}) {
    const e = {};
    const anoActual = new Date().getFullYear();
    e.nombres = primero(d.nombres, reglas.requerido);
    e.apellidos = primero(d.apellidos, reglas.requerido);
    e.tipoDocumento = primero(
      d.tipoDocumento,
      reglas.requerido,
      enLista(OPCIONES.tiposDocumento.map((t) => t.valor), 'Elige un tipo de documento'),
    );
    e.documento = primero(d.documento, reglas.requerido, (v) => reglas.documento(v, d.tipoDocumento));
    e.nacimiento = primero(d.nacimiento, reglas.requerido, reglas.fechaPasada, (v) => {
      const a = edad(v);
      if (a < EDAD_MINIMA) return `Debes tener al menos ${EDAD_MINIMA} años para registrarte`;
      if (parsearFecha(v).getFullYear() < anoActual - 100) return 'Revisa la fecha de nacimiento';
      return '';
    });
    e.celular = primero(d.celular, reglas.requerido, reglas.celularCO);
    e.correo = primero(d.correo, reglas.requerido, reglas.correo);
    e.ciudad = primero(d.ciudad, reglas.requerido);
    return e;
  },

  moto(d = {}) {
    const e = {};
    const anoMax = new Date().getFullYear() + 1;
    e.marca = primero(d.marca, reglas.requerido);
    e.modelo = primero(d.modelo, reglas.requerido);
    e.anio = primero(d.anio, reglas.requerido, (v) => {
      const n = Number(v);
      return Number.isInteger(n) && n >= 1980 && n <= anoMax ? '' : `Escribe un año entre 1980 y ${anoMax}`;
    });
    e.placa = primero(d.placa, reglas.requerido, reglas.placaCO);
    e.color = primero(d.color, reglas.requerido);
    // El SOAT puede estar vencido al registrarse: el panel de líderes lo alerta.
    e.soatVence = primero(d.soatVence, reglas.requerido, fechaValida);
    // La tecnomecánica es opcional: las motos nuevas no la necesitan los primeros 2 años.
    e.tecnoVence = primero(d.tecnoVence, fechaValida);
    e.licenciaCategoria = primero(
      d.licenciaCategoria,
      reglas.requerido,
      enLista(OPCIONES.categoriasLicencia, 'Elige la categoría de tu licencia (A1 o A2)'),
    );
    e.licenciaVence = primero(d.licenciaVence, reglas.requerido, fechaValida);
    return e;
  },

  // Recibe { salud, emergencia }. Los datos de salud son opcionales (Ley 1581:
  // son datos sensibles); al menos un contacto de emergencia es obligatorio.
  salud({ salud = {}, emergencia = [] } = {}) {
    const e = {};
    e.tipoSangre = enLista(OPCIONES.tiposSangre, 'Elige un tipo de sangre de la lista')(salud.tipoSangre);
    const contactos = Array.isArray(emergencia) ? emergencia : [];
    const campos = ['nombre', 'parentesco', 'celular'];
    let completos = 0;
    contactos.forEach((c = {}, i) => {
      const lleno = campos.some((k) => !vacio(c[k]));
      // El primer contacto siempre se valida; los demás solo si empezaron a llenarse.
      if (!lleno && i > 0) return;
      e[`emergencia.${i}.nombre`] = reglas.requerido(c.nombre);
      e[`emergencia.${i}.parentesco`] = reglas.requerido(c.parentesco);
      e[`emergencia.${i}.celular`] = primero(c.celular, reglas.requerido, reglas.celularCO);
      if (campos.every((k) => !e[`emergencia.${i}.${k}`])) completos++;
    });
    if (contactos.length === 0) {
      for (const k of campos) e[`emergencia.0.${k}`] = 'Este campo es obligatorio';
    }
    if (completos === 0) e.emergencia = 'Agrega al menos un contacto de emergencia completo';
    return e;
  },

  club(d = {}) {
    const e = {};
    e.comoNosConociste = enLista(OPCIONES.comoNosConociste, 'Elige una opción de la lista')(d.comoNosConociste);
    e.tallaJersey = enLista(OPCIONES.tallas, 'Elige una talla de la lista')(d.tallaJersey);
    const emp = d.emprendimiento || {};
    if (emp.tiene) {
      e['emprendimiento.nombre'] = reglas.requerido(emp.nombre);
      e['emprendimiento.whatsapp'] = primero(emp.whatsapp, reglas.requerido, reglas.celularCO);
    }
    return e;
  },

  // Recibe { password, confirmar, consentimientos } (acepta también confirmacion/password2 como alias)
  cuenta({ password, confirmar, confirmacion, password2, consentimientos = {} } = {}) {
    const e = {};
    confirmar = confirmar ?? confirmacion ?? password2;
    e.password = reglas.password(password);
    e.confirmar = vacio(confirmar)
      ? 'Confirma tu contraseña'
      : confirmar !== password
        ? 'Las contraseñas no coinciden'
        : '';
    e['consentimientos.datos'] = consentimientos.datos === true
      ? '' : 'Debes autorizar el tratamiento de tus datos personales (Ley 1581 de 2012)';
    e['consentimientos.salud'] = consentimientos.salud === true
      ? '' : 'Debes autorizar el tratamiento de tus datos de salud para la ficha de emergencia';
    e['consentimientos.reglamento'] = consentimientos.reglamento === true
      ? '' : 'Debes aceptar el reglamento del club';
    return e;
  },
};

/**
 * Valida un paso del formulario de registro/edición.
 * @param {'personal'|'moto'|'salud'|'club'|'cuenta'} nombrePaso
 * @returns {{ valido: boolean, errores: Record<string,string> }}
 */
export function validarPaso(nombrePaso, datos) {
  const fn = PASOS[nombrePaso];
  if (!fn) throw new Error(`Paso de validación desconocido: ${nombrePaso}`);
  const crudos = fn(datos || {});
  const errores = {};
  for (const [k, v] of Object.entries(crudos)) if (v) errores[k] = v;
  return { valido: Object.keys(errores).length === 0, errores };
}
