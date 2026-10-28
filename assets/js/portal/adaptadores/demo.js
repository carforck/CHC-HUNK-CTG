// Adaptador DEMO · Club Hunk Cartagena
// ------------------------------------------------------------------
// Guarda todo en el navegador (localStorage; si no está disponible, en memoria).
// Sirve para probar el portal sin base de datos. TODOS LOS DATOS SON FICTICIOS.
//
// Seguridad: esto es SOLO una demostración. Las contraseñas se guardan como
// SHA-256(sal + contraseña) con crypto.subtle, lo cual NO es adecuado para
// producción (allí Supabase Auth usa bcrypt en el servidor). Los permisos se
// verifican aquí en el navegador, así que cualquiera con la consola podría
// saltárselos; en modo 'supabase' los hace cumplir la base de datos (RLS).

import {
  CLAVE_DATOS_DEMO, CLAVE_SESION_DEMO, LATENCIA_DEMO, ESTADOS, ROLES, ESTADOS_ACTIVOS,
  ESTADOS_CON_QR, DIAS_ALERTA_VENCIMIENTO, ErrorPortal, MENSAJES,
} from '../config.js';
import {
  reglas, diasHasta, aISO, parsearFecha, normalizarPlaca, normalizarCelular, normalizarDocumento,
} from '../validacion.js';

const VERSION_DATOS = 1;

// ================================================================
// Almacenamiento con respaldo en memoria
// ================================================================
const memoria = new Map();
const almacen = {
  leer(clave) {
    try {
      const v = globalThis.localStorage?.getItem(clave);
      if (v !== undefined && v !== null) return JSON.parse(v);
    } catch { /* localStorage bloqueado o JSON dañado: usamos memoria */ }
    return memoria.has(clave) ? JSON.parse(memoria.get(clave)) : null;
  },
  escribir(clave, valor) {
    const texto = JSON.stringify(valor);
    memoria.set(clave, texto);
    try { globalThis.localStorage?.setItem(clave, texto); } catch { /* sin espacio o bloqueado */ }
  },
  borrar(clave) {
    memoria.delete(clave);
    try { globalThis.localStorage?.removeItem(clave); } catch { /* nada */ }
  },
};

// ================================================================
// Utilidades
// ================================================================
const esperar = () => {
  const { min, max } = LATENCIA_DEMO;
  return new Promise((r) => setTimeout(r, min + Math.random() * (max - min)));
};
const clonar = (o) => (o === undefined ? o : JSON.parse(JSON.stringify(o)));
const nuevoId = () =>
  globalThis.crypto?.randomUUID?.() ??
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
const normalizarCorreo = (c) => String(c ?? '').trim().toLowerCase();
const sinTildes = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const fechaRel = (dias) => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return aISO(d);
};
const esObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const SECCIONES_FICHA = ['personal', 'moto', 'salud', 'emergencia', 'club', 'consentimientos'];
/** Copia solo las claves permitidas (evita guardar campos extraños, p. ej. contraseñas). */
const elegir = (o, claves) => Object.fromEntries(claves.filter((k) => o && k in o).map((k) => [k, clonar(o[k])]));

/** Merge profundo: los objetos se combinan, los arreglos y valores simples se reemplazan. */
function mergeProfundo(base, cambios) {
  const r = esObjeto(base) ? { ...base } : {};
  for (const [k, v] of Object.entries(cambios ?? {})) {
    if (v === undefined) continue;
    r[k] = esObjeto(v) && esObjeto(r[k]) ? mergeProfundo(r[k], v) : clonar(v);
  }
  return r;
}

async function hashPassword(password, sal) {
  const datos = new TextEncoder().encode(`${sal}:${password}`);
  const buf = await globalThis.crypto.subtle.digest('SHA-256', datos);
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

function nombreCorto(m) {
  const nombre = (m.personal?.nombres || '').trim().split(/\s+/)[0] || '';
  const inicial = (m.personal?.apellidos || '').trim().charAt(0);
  return inicial ? `${nombre} ${inicial.toUpperCase()}.` : nombre;
}
const nombreCompleto = (m) => `${m.personal?.nombres ?? ''} ${m.personal?.apellidos ?? ''}`.trim();

/** Limpia formatos (placa, celulares, documento) antes de guardar. */
function normalizarFicha(m) {
  if (m.personal) {
    if (m.personal.correo !== undefined) m.personal.correo = normalizarCorreo(m.personal.correo);
    if (m.personal.celular) m.personal.celular = normalizarCelular(m.personal.celular);
    if (m.personal.documento) m.personal.documento = normalizarDocumento(m.personal.documento);
  }
  if (m.moto) {
    if (m.moto.placa) m.moto.placa = normalizarPlaca(m.moto.placa);
    if (m.moto.anio !== undefined && m.moto.anio !== '' && m.moto.anio !== null) m.moto.anio = Number(m.moto.anio);
  }
  if (Array.isArray(m.emergencia)) {
    m.emergencia = m.emergencia
      .filter((c) => c && (c.nombre || c.celular))
      .map((c) => ({ nombre: c.nombre ?? '', parentesco: c.parentesco ?? '', celular: normalizarCelular(c.celular) }));
  }
  const emp = m.club?.emprendimiento;
  if (emp?.whatsapp) emp.whatsapp = normalizarCelular(emp.whatsapp);
  return m;
}

/** Ficha vacía con todas las secciones (forma del contrato). */
function fichaVacia() {
  return {
    personal: { nombres: '', apellidos: '', tipoDocumento: 'CC', documento: '', nacimiento: '', celular: '', correo: '', ciudad: 'Cartagena', barrio: '' },
    moto: { marca: '', modelo: '', anio: null, placa: '', color: '', soatVence: '', tecnoVence: '', licenciaCategoria: '', licenciaVence: '' },
    salud: { tipoSangre: '', eps: '', alergias: '', condiciones: '', medicamentos: '' },
    emergencia: [],
    club: { comoNosConociste: '', recomendadoPor: '', redes: '', tallaJersey: '', emprendimiento: { tiene: false, nombre: '', descripcion: '', whatsapp: '' } },
    consentimientos: { datos: false, salud: false, reglamento: false, fecha: null },
    insignias: [],
  };
}

// ================================================================
// Datos semilla (FICTICIOS) — fechas relativas a hoy para que siempre haya alertas
// ================================================================
const INSIGNIAS = {
  'seguridad-vial': 'Seguridad vial básica',
  'senas-grupo': 'Señas de grupo',
  'primeros-auxilios': 'Primeros auxilios',
  'mecanica-basica': 'Mecánica básica',
};
const insignia = (id, dias) => ({ id, nombre: INSIGNIAS[id], fecha: fechaRel(dias) });

export const PASSWORD_DEMO = 'Hunk2025!';

/** IDs fijos de la semilla (los mismos de sql/seed.sql). */
export const IDS_DEMO = {
  lider: '11111111-1111-4111-8111-000000000001',
  miembro: '11111111-1111-4111-8111-000000000002',
  admin: '11111111-1111-4111-8111-000000000003',
  luis: '11111111-1111-4111-8111-000000000004',
  daniela: '11111111-1111-4111-8111-000000000005',
  kevin: '11111111-1111-4111-8111-000000000006',
  sebastian: '11111111-1111-4111-8111-000000000007',
  jose: '11111111-1111-4111-8111-000000000008',
  mariana: '11111111-1111-4111-8111-000000000009',
  rafael: '11111111-1111-4111-8111-000000000010',
};

function crearMiembroSemilla({ id, estado, rol = 'miembro', fechaIngreso = null, creadoDias, personal, moto, salud, emergencia, club = {}, insignias = [] }) {
  const base = fichaVacia();
  return {
    id, estado, rol, fechaIngreso,
    creado: new Date(Date.now() + creadoDias * 86400000).toISOString(),
    personal: { ...base.personal, ciudad: 'Cartagena', ...personal },
    moto: { ...base.moto, marca: 'Hero', ...moto },
    salud: { ...base.salud, ...salud },
    emergencia,
    club: { ...base.club, ...club, emprendimiento: { ...base.club.emprendimiento, ...(club.emprendimiento || {}) } },
    consentimientos: { datos: true, salud: true, reglamento: true, fecha: new Date(Date.now() + creadoDias * 86400000).toISOString() },
    insignias,
    historialEstados: [],
    datosFicticios: true,
  };
}

function miembrosSemilla() {
  const I = IDS_DEMO;
  return [
    crearMiembroSemilla({
      id: I.lider, estado: 'oficial', rol: 'lider', fechaIngreso: '2025-02-09', creadoDias: -600,
      personal: { nombres: 'Andrés Felipe', apellidos: 'Herrera Julio', documento: '1047400101', nacimiento: '1992-05-14', celular: '3005550101', correo: 'lider@clubhunk.co', barrio: 'Manga' },
      moto: { modelo: 'Hunk 190R', anio: 2024, placa: 'KTR45G', color: 'Rojo', soatVence: fechaRel(160), tecnoVence: fechaRel(400), licenciaCategoria: 'A2', licenciaVence: fechaRel(2100) },
      salud: { tipoSangre: 'O+', eps: 'Sura', alergias: 'Ninguna conocida', condiciones: '', medicamentos: '' },
      emergencia: [{ nombre: 'Laura Julio', parentesco: 'Esposo(a)', celular: '3005550201' }],
      club: { comoNosConociste: 'Otro', tallaJersey: 'L', redes: '@andres.hunk' },
      insignias: [insignia('seguridad-vial', -300), insignia('senas-grupo', -280), insignia('primeros-auxilios', -200), insignia('mecanica-basica', -120)],
    }),
    crearMiembroSemilla({
      id: I.miembro, estado: 'oficial', fechaIngreso: '2025-06-22', creadoDias: -480,
      personal: { nombres: 'Juan Pablo', apellidos: 'Pérez Cabarcas', documento: '1143300202', nacimiento: '1998-11-03', celular: '3005550102', correo: 'miembro@clubhunk.co', barrio: 'Crespo' },
      moto: { modelo: 'Hunk 160R 4V', anio: 2024, placa: 'GQW18F', color: 'Negro', soatVence: fechaRel(12), tecnoVence: '', licenciaCategoria: 'A2', licenciaVence: fechaRel(1500) },
      salud: { tipoSangre: 'O+', eps: 'Nueva EPS', alergias: 'Penicilina', condiciones: 'Asma leve', medicamentos: 'Salbutamol (inhalador)' },
      emergencia: [
        { nombre: 'María Cabarcas', parentesco: 'Mamá', celular: '3005550202' },
        { nombre: 'Carlos Pérez', parentesco: 'Hermano(a)', celular: '3005550203' },
      ],
      club: { comoNosConociste: 'TikTok', recomendadoPor: 'Andrés Herrera', tallaJersey: 'M', redes: '@elflaco.hunk' },
      insignias: [insignia('seguridad-vial', -250), insignia('senas-grupo', -180), insignia('primeros-auxilios', -60)],
    }),
    crearMiembroSemilla({
      id: I.admin, estado: 'oficial', rol: 'admin', fechaIngreso: '2025-02-09', creadoDias: -620,
      personal: { nombres: 'Valentina', apellidos: 'Ríos Arrieta', documento: '1047400303', nacimiento: '1995-02-20', celular: '3005550103', correo: 'admin@clubhunk.co', barrio: 'Bocagrande' },
      moto: { modelo: 'Hunk 160R', anio: 2023, placa: 'HDS72E', color: 'Blanco', soatVence: fechaRel(220), tecnoVence: fechaRel(300), licenciaCategoria: 'A2', licenciaVence: fechaRel(1800) },
      salud: { tipoSangre: 'A+', eps: 'Sanitas', alergias: '', condiciones: '', medicamentos: '' },
      emergencia: [{ nombre: 'Rosa Arrieta', parentesco: 'Mamá', celular: '3005550204' }],
      club: { comoNosConociste: 'Instagram', tallaJersey: 'S' },
      insignias: [insignia('seguridad-vial', -300), insignia('primeros-auxilios', -200)],
    }),
    crearMiembroSemilla({
      id: I.luis, estado: 'oficial', fechaIngreso: '2025-08-10', creadoDias: -420,
      personal: { nombres: 'Luis Miguel', apellidos: 'Castro Pájaro', documento: '73200404', nacimiento: '1989-07-30', celular: '3005550104', correo: 'luis.castro@ejemplo.co', barrio: 'El Bosque' },
      moto: { modelo: 'Hunk 160R', anio: 2022, placa: 'FBN33C', color: 'Azul', soatVence: fechaRel(95), tecnoVence: fechaRel(-20), licenciaCategoria: 'A2', licenciaVence: fechaRel(900) },
      salud: { tipoSangre: 'B+', eps: 'Mutual Ser', alergias: 'Mariscos', condiciones: '', medicamentos: '' },
      emergencia: [{ nombre: 'Ana Pájaro', parentesco: 'Esposo(a)', celular: '3005550205' }],
      club: {
        comoNosConociste: 'Un amigo del club', recomendadoPor: 'Juan Pablo Pérez', tallaJersey: 'XL',
        emprendimiento: { tiene: true, nombre: 'Natural Fresh Ctg', descripcion: 'Jugos naturales, bowls de frutas y batidos. Domicilios en Cartagena.', whatsapp: '3005550304' },
      },
      insignias: [insignia('seguridad-vial', -200), insignia('mecanica-basica', -90)],
    }),
    crearMiembroSemilla({
      id: I.daniela, estado: 'oficial', fechaIngreso: '2025-11-02', creadoDias: -360,
      personal: { nombres: 'Daniela', apellidos: 'Orozco Marimón', documento: '1047400505', nacimiento: '2000-09-12', celular: '3005550105', correo: 'daniela.orozco@ejemplo.co', barrio: 'Pie de la Popa' },
      moto: { modelo: 'Hunk 160R 4V', anio: 2025, placa: 'JMP09H', color: 'Gris', soatVence: fechaRel(200), tecnoVence: '', licenciaCategoria: 'A2', licenciaVence: fechaRel(25) },
      salud: { tipoSangre: 'O-', eps: 'Salud Total', alergias: '', condiciones: '', medicamentos: '' },
      emergencia: [{ nombre: 'Jorge Orozco', parentesco: 'Papá', celular: '3005550206' }],
      club: { comoNosConociste: 'Instagram', tallaJersey: 'S' },
      insignias: [insignia('senas-grupo', -100)],
    }),
    crearMiembroSemilla({
      id: I.kevin, estado: 'aspirante', creadoDias: -75,
      personal: { nombres: 'Kevin Andrés', apellidos: 'Barrios Zúñiga', documento: '1143300606', nacimiento: '2003-03-25', celular: '3005550106', correo: 'kevin.barrios@ejemplo.co', ciudad: 'Turbaco', barrio: 'Centro' },
      moto: { modelo: 'Hunk 160R', anio: 2021, placa: 'DLK56B', color: 'Negro', soatVence: fechaRel(-5), tecnoVence: fechaRel(45), licenciaCategoria: 'A2', licenciaVence: fechaRel(1200) },
      salud: { tipoSangre: 'A-', eps: 'Coosalud' },
      emergencia: [{ nombre: 'Luz Zúñiga', parentesco: 'Mamá', celular: '3005550207' }],
      club: { comoNosConociste: 'En una rodada', tallaJersey: 'M' },
    }),
    crearMiembroSemilla({
      id: I.sebastian, estado: 'aspirante', creadoDias: -50,
      personal: { nombres: 'Sebastián', apellidos: 'Marrugo Díaz', documento: '1047400707', nacimiento: '1997-12-01', celular: '3005550107', correo: 'sebastian.marrugo@ejemplo.co', barrio: 'Los Alpes' },
      moto: { modelo: 'Hunk 190R', anio: 2025, placa: 'LPZ71K', color: 'Rojo', soatVence: fechaRel(300), tecnoVence: '', licenciaCategoria: 'A2', licenciaVence: fechaRel(2500) },
      salud: { tipoSangre: 'O+', eps: 'Famisanar' },
      emergencia: [{ nombre: 'Paola Díaz', parentesco: 'Pareja', celular: '3005550208' }],
      club: { comoNosConociste: 'TikTok', tallaJersey: 'L' },
    }),
    crearMiembroSemilla({
      id: I.jose, estado: 'aspirante_pendiente', creadoDias: -4,
      personal: { nombres: 'José Luis', apellidos: 'Pájaro Teherán', documento: '1143300808', nacimiento: '2001-06-18', celular: '3005550108', correo: 'jose.pajaro@ejemplo.co', ciudad: 'Turbaco', barrio: 'Plan Parejo' },
      moto: { modelo: 'Hunk 160R 4V', anio: 2025, placa: 'MXB24J', color: 'Azul', soatVence: fechaRel(330), tecnoVence: '', licenciaCategoria: 'A2', licenciaVence: fechaRel(3000) },
      salud: { tipoSangre: 'B-', eps: 'Cajacopi' },
      emergencia: [{ nombre: 'Elena Teherán', parentesco: 'Mamá', celular: '3005550209' }],
      club: { comoNosConociste: 'Instagram', tallaJersey: 'M' },
    }),
    crearMiembroSemilla({
      id: I.mariana, estado: 'aspirante_pendiente', creadoDias: -1,
      personal: { nombres: 'Mariana', apellidos: 'Cassiani Gómez', documento: '1047400909', nacimiento: '1999-04-07', celular: '3005550109', correo: 'mariana.cassiani@ejemplo.co', barrio: 'Crespo' },
      moto: { modelo: 'Hunk 160R', anio: 2023, placa: 'NCV80A', color: 'Blanco', soatVence: fechaRel(20), tecnoVence: fechaRel(180), licenciaCategoria: 'A2', licenciaVence: fechaRel(1400) },
      salud: { tipoSangre: 'AB+', eps: 'Compensar', alergias: 'Ibuprofeno' },
      emergencia: [{ nombre: 'Pedro Cassiani', parentesco: 'Papá', celular: '3005550210' }],
      club: { comoNosConociste: 'Un amigo del club', recomendadoPor: 'Daniela Orozco', tallaJersey: 'S' },
    }),
    crearMiembroSemilla({
      id: I.rafael, estado: 'inactivo', fechaIngreso: '2025-04-13', creadoDias: -560,
      personal: { nombres: 'Rafael', apellidos: 'Teherán Blanco', documento: '73100110', nacimiento: '1986-01-29', celular: '3005550110', correo: 'rafael.teheran@ejemplo.co', barrio: 'Manga' },
      moto: { modelo: 'Hunk 190R', anio: 2020, placa: 'BTE11D', color: 'Negro', soatVence: fechaRel(-60), tecnoVence: fechaRel(-30), licenciaCategoria: 'A2', licenciaVence: fechaRel(700) },
      salud: { tipoSangre: 'O+', eps: 'Nueva EPS' },
      emergencia: [{ nombre: 'Carmen Blanco', parentesco: 'Esposo(a)', celular: '3005550211' }],
      club: { comoNosConociste: 'Otro', tallaJersey: 'XL' },
      insignias: [insignia('seguridad-vial', -400)],
    }),
  ];
}

function rodadasSemilla() {
  const I = IDS_DEMO;
  const r = (n, dias, titulo, ruta, km, liderId, asistentes) => ({
    id: `22222222-2222-4222-8222-00000000000${n}`, fecha: fechaRel(dias), titulo, ruta, km, liderId, asistentes,
  });
  return [
    r(1, 5, 'Rodada nocturna urbana', 'Castillo San Felipe · Bocagrande · Centro histórico', 25, I.lider, []),
    r(2, -3, 'Rodada nocturna urbana', 'Castillo San Felipe · Bocagrande · Centro histórico', 25, I.lider, [I.lider, I.miembro, I.admin, I.daniela, I.kevin, I.sebastian]),
    r(3, -10, 'Mirador de Las Marías', 'Cartagena · Turbaco · Mirador de Las Marías', 62, I.lider, [I.lider, I.miembro, I.luis, I.kevin]),
    r(4, -17, 'Desayuno en Turbaco', 'Av. Pedro de Heredia · Turbaco (ida y vuelta)', 48, I.admin, [I.admin, I.miembro, I.daniela, I.sebastian, I.luis]),
    r(5, -31, 'Playas de Barú', 'Cartagena · Pasacaballos · Playa Blanca, Barú', 110, I.lider, [I.lider, I.miembro, I.admin, I.luis, I.kevin]),
    r(6, -45, 'Viaje a Santa Marta', 'Cartagena · Barranquilla · Ciénaga · Santa Marta (ida y vuelta)', 470, I.lider, [I.lider, I.miembro, I.admin, I.luis]),
    r(7, -62, 'Rodada nocturna urbana', 'Manga · Crespo · Anillo vial', 30, I.admin, [I.admin, I.daniela, I.lider]),
    r(8, -80, 'Turbaco – Arjona', 'Cartagena · Turbaco · Arjona (ida y vuelta)', 80, I.lider, [I.lider, I.miembro, I.luis, I.rafael]),
    r(9, -120, 'Rodada de bienvenida', 'Muelle de La Bodeguita · Bocagrande · Castillogrande', 20, I.lider, [I.lider, I.admin, I.luis, I.rafael, I.daniela]),
  ];
}

async function construirSemilla() {
  const miembros = miembrosSemilla();
  const usuarios = [];
  for (const m of miembros) {
    // Solo las tres cuentas demo pueden iniciar sesión; los demás no tienen contraseña conocida.
    if (!['lider@clubhunk.co', 'miembro@clubhunk.co', 'admin@clubhunk.co'].includes(m.personal.correo)) continue;
    const sal = nuevoId();
    usuarios.push({ id: `u-${m.id}`, correo: m.personal.correo, sal, hash: await hashPassword(PASSWORD_DEMO, sal), miembroId: m.id });
  }
  return {
    version: VERSION_DATOS,
    aviso: 'Datos ficticios de demostración · Club Hunk Cartagena',
    usuarios,
    miembros,
    rodadas: rodadasSemilla(),
    auditoria: [],
  };
}

// ================================================================
// Estado y sesión
// ================================================================
let cargando = null;
async function db() {
  const datos = almacen.leer(CLAVE_DATOS_DEMO);
  if (datos && datos.version === VERSION_DATOS) return datos;
  cargando ??= construirSemilla().then((s) => {
    almacen.escribir(CLAVE_DATOS_DEMO, s);
    cargando = null;
    return s;
  });
  return cargando;
}
const guardar = (datos) => almacen.escribir(CLAVE_DATOS_DEMO, datos);

function contexto(datos) {
  const s = almacen.leer(CLAVE_SESION_DEMO);
  if (!s) return null;
  const usuario = datos.usuarios.find((u) => u.id === s.usuarioId);
  if (!usuario) return null;
  const miembro = datos.miembros.find((m) => m.id === usuario.miembroId) || null;
  return { usuario, miembro };
}
const esLider = (ctx) => !!ctx?.miembro && ['lider', 'admin'].includes(ctx.miembro.rol);

function exigirSesion(datos) {
  const ctx = contexto(datos);
  if (!ctx) throw new ErrorPortal(MENSAJES.sinSesion, 'sin_sesion');
  return ctx;
}
function exigirLider(datos) {
  const ctx = exigirSesion(datos);
  if (!esLider(ctx)) throw new ErrorPortal(MENSAJES.sinPermiso, 'sin_permiso');
  return ctx;
}

function auditar(datos, miembroId, vistoPor, accion) {
  datos.auditoria.push({ fecha: new Date().toISOString(), miembroId, vistoPor, accion });
  if (datos.auditoria.length > 500) datos.auditoria.splice(0, datos.auditoria.length - 500);
}

const salidaUsuario = (u) => ({ id: u.id, correo: u.correo });
const salidaMiembro = (m) => (m ? clonar(m) : null);

function salidaRodada(datos, r) {
  const lider = datos.miembros.find((m) => m.id === r.liderId);
  return { ...clonar(r), liderNombre: lider ? nombreCorto(lider) : '' };
}

// ================================================================
// API pública del adaptador (mismo contrato que adaptadores/supabase.js)
// ================================================================
export const auth = {
  async registrar(datosFicha, password) {
    await esperar();
    const datos = await db();
    const ficha = normalizarFicha(mergeProfundo(fichaVacia(), elegir(datosFicha, SECCIONES_FICHA)));
    const correo = ficha.personal.correo;

    const error =
      reglas.requerido(correo) || reglas.correo(correo) || reglas.password(password) ||
      reglas.requerido(ficha.personal.nombres) || reglas.requerido(ficha.personal.documento);
    if (error) throw new ErrorPortal(error, 'validacion');
    const c = ficha.consentimientos || {};
    if (!c.datos || !c.reglamento || !c.salud) {
      throw new ErrorPortal('Debes aceptar el tratamiento de datos, de datos de salud y el reglamento del club', 'validacion');
    }
    if (datos.usuarios.some((u) => u.correo === correo) || datos.miembros.some((m) => m.personal.correo === correo)) {
      throw new ErrorPortal(MENSAJES.correoDuplicado, 'correo_duplicado');
    }
    if (datos.miembros.some((m) => m.personal.documento === ficha.personal.documento)) {
      throw new ErrorPortal(MENSAJES.documentoDuplicado, 'documento_duplicado');
    }

    const ahora = new Date().toISOString();
    const miembro = {
      ...ficha,
      id: nuevoId(),
      estado: 'aspirante_pendiente',
      rol: 'miembro',
      fechaIngreso: null,
      creado: ahora,
      consentimientos: { datos: true, salud: true, reglamento: true, fecha: ahora },
      insignias: [],
      historialEstados: [],
    };
    const sal = nuevoId();
    const usuario = { id: nuevoId(), correo, sal, hash: await hashPassword(password, sal), miembroId: miembro.id };
    datos.miembros.push(miembro);
    datos.usuarios.push(usuario);
    guardar(datos);
    almacen.escribir(CLAVE_SESION_DEMO, { usuarioId: usuario.id });
    return { usuario: salidaUsuario(usuario), miembro: salidaMiembro(miembro) };
  },

  async ingresar(correo, password) {
    await esperar();
    const datos = await db();
    const usuario = datos.usuarios.find((u) => u.correo === normalizarCorreo(correo));
    if (!usuario || (await hashPassword(String(password ?? ''), usuario.sal)) !== usuario.hash) {
      throw new ErrorPortal(MENSAJES.credenciales, 'credenciales');
    }
    almacen.escribir(CLAVE_SESION_DEMO, { usuarioId: usuario.id });
    const miembro = datos.miembros.find((m) => m.id === usuario.miembroId) || null;
    return { usuario: salidaUsuario(usuario), miembro: salidaMiembro(miembro) };
  },

  async salir() {
    await esperar();
    almacen.borrar(CLAVE_SESION_DEMO);
  },

  async sesion() {
    const datos = await db();
    const ctx = contexto(datos);
    return ctx ? { usuario: salidaUsuario(ctx.usuario), miembro: salidaMiembro(ctx.miembro) } : null;
  },

  async recuperar(correo) {
    await esperar();
    const error = reglas.requerido(correo) || reglas.correo(correo);
    if (error) throw new ErrorPortal(error, 'validacion');
    // En demo no se envían correos. Por seguridad no revelamos si la cuenta existe.
  },
};

export const miembros = {
  async actual() {
    const datos = await db();
    return salidaMiembro(contexto(datos)?.miembro ?? null);
  },

  async actualizar(id, cambios) {
    await esperar();
    const datos = await db();
    const ctx = exigirSesion(datos);
    const m = datos.miembros.find((x) => x.id === id);
    if (!m) throw new ErrorPortal(MENSAJES.noEncontrado, 'no_encontrado');
    const propio = ctx.miembro?.id === id;
    const lider = esLider(ctx);
    if (!propio && !lider) throw new ErrorPortal(MENSAJES.sinPermisoEditar, 'sin_permiso');

    // Solo secciones de la ficha y campos de club; id, creado, historial, etc. nunca se editan por aquí.
    const c = elegir(cambios || {}, [...SECCIONES_FICHA, 'estado', 'rol', 'fechaIngreso', 'insignias']);
    if (!lider) {
      // Un miembro no puede cambiar su estado, rol, fecha de ingreso ni sus insignias.
      if ('estado' in c || 'rol' in c) throw new ErrorPortal(MENSAJES.sinPermisoEditar, 'sin_permiso');
      delete c.fechaIngreso; delete c.insignias;
    }
    if ('estado' in c && !ESTADOS.includes(c.estado)) throw new ErrorPortal('Estado no válido', 'validacion');
    if ('rol' in c) {
      if (!ROLES.includes(c.rol)) throw new ErrorPortal('Rol no válido', 'validacion');
      // Solo un admin puede nombrar o quitar administradores.
      if ((c.rol === 'admin' || m.rol === 'admin') && c.rol !== m.rol && ctx.miembro.rol !== 'admin') {
        throw new ErrorPortal('Solo un administrador puede cambiar ese rol', 'sin_permiso');
      }
    }
    if (c.consentimientos) {
      // Retirar el consentimiento de datos/salud se hace pidiendo la eliminación de la cuenta.
      c.consentimientos = { ...m.consentimientos };
    }

    const nuevo = normalizarFicha(mergeProfundo(m, c));
    const nuevoCorreo = nuevo.personal.correo;
    if (nuevoCorreo !== m.personal.correo) {
      const e = reglas.requerido(nuevoCorreo) || reglas.correo(nuevoCorreo);
      if (e) throw new ErrorPortal(e, 'validacion');
      if (datos.usuarios.some((u) => u.correo === nuevoCorreo && u.miembroId !== id) ||
          datos.miembros.some((x) => x.id !== id && x.personal.correo === nuevoCorreo)) {
        throw new ErrorPortal(MENSAJES.correoDuplicado, 'correo_duplicado');
      }
      const u = datos.usuarios.find((x) => x.miembroId === id);
      if (u) u.correo = nuevoCorreo;
    }
    if (nuevo.personal.documento !== m.personal.documento &&
        datos.miembros.some((x) => x.id !== id && x.personal.documento === nuevo.personal.documento)) {
      throw new ErrorPortal(MENSAJES.documentoDuplicado, 'documento_duplicado');
    }
    if (nuevo.estado === 'oficial' && !nuevo.fechaIngreso) nuevo.fechaIngreso = aISO(new Date());
    if (nuevo.estado !== m.estado) {
      nuevo.historialEstados = [...(m.historialEstados || []), { de: m.estado, a: nuevo.estado, nota: '', fecha: new Date().toISOString(), por: ctx.miembro.id }];
    }
    if (!propio) auditar(datos, id, ctx.miembro?.id, 'editar_ficha');
    Object.assign(m, nuevo);
    guardar(datos);
    return salidaMiembro(m);
  },

  async listar({ estado, busqueda } = {}) {
    await esperar();
    const datos = await db();
    const ctx = exigirLider(datos);
    let lista = datos.miembros;
    if (estado) {
      const estados = Array.isArray(estado) ? estado : [estado];
      lista = lista.filter((m) => estados.includes(m.estado));
    }
    const q = sinTildes(busqueda).trim();
    if (q) {
      const qPlaca = normalizarPlaca(q);
      lista = lista.filter((m) => {
        const texto = sinTildes([
          m.personal.nombres, m.personal.apellidos, m.personal.documento, m.personal.correo,
          m.personal.celular, m.personal.barrio, m.moto.placa, m.moto.modelo,
        ].join(' '));
        return q.split(/\s+/).every((t) => texto.includes(t)) || (qPlaca && m.moto.placa?.includes(qPlaca));
      });
    }
    lista = [...lista].sort((a, b) => nombreCompleto(a).localeCompare(nombreCompleto(b), 'es'));
    // Registro de acceso a datos sensibles (Ley 1581): el listado incluye salud.
    auditar(datos, null, ctx.miembro.id, `listar_miembros(${lista.length})`);
    guardar(datos);
    return lista.map(salidaMiembro);
  },

  async cambiarEstado(id, estado, nota = '') {
    await esperar();
    const datos = await db();
    const ctx = exigirLider(datos);
    if (!ESTADOS.includes(estado)) throw new ErrorPortal('Estado no válido', 'validacion');
    const m = datos.miembros.find((x) => x.id === id);
    if (!m) throw new ErrorPortal(MENSAJES.noEncontrado, 'no_encontrado');
    if (estado !== m.estado) {
      m.historialEstados = [...(m.historialEstados || []), { de: m.estado, a: estado, nota: String(nota || ''), fecha: new Date().toISOString(), por: ctx.miembro.id }];
    }
    m.estado = estado;
    if (estado === 'oficial' && !m.fechaIngreso) m.fechaIngreso = aISO(new Date());
    guardar(datos);
    return salidaMiembro(m);
  },

  async fichaEmergencia(id) {
    await esperar();
    const datos = await db();
    const m = datos.miembros.find((x) => x.id === id);
    if (!m || !ESTADOS_CON_QR.includes(m.estado)) return null;
    auditar(datos, id, contexto(datos)?.miembro?.id ?? null, 'ver_ficha_emergencia');
    guardar(datos);
    return {
      id: m.id,
      nombreCorto: nombreCorto(m),
      estado: m.estado,
      tipoSangre: m.salud.tipoSangre || '',
      alergias: m.salud.alergias || '',
      condiciones: m.salud.condiciones || '',
      medicamentos: m.salud.medicamentos || '',
      eps: m.salud.eps || '',
      emergencia: clonar(m.emergencia || []),
      moto: { placa: m.moto.placa || '', color: m.moto.color || '', modelo: m.moto.modelo || '' },
    };
  },
};

export const rodadas = {
  async listar({ desde, hasta } = {}) {
    await esperar();
    const datos = await db();
    return datos.rodadas
      .filter((r) => (!desde || r.fecha >= desde) && (!hasta || r.fecha <= hasta))
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
      .map((r) => salidaRodada(datos, r));
  },

  async crear({ fecha, titulo, ruta = '', km = 0, liderId, asistentes = [] } = {}) {
    await esperar();
    const datos = await db();
    const ctx = exigirLider(datos);
    if (!parsearFecha(fecha)) throw new ErrorPortal('Escribe una fecha válida para la rodada', 'validacion');
    if (!String(titulo ?? '').trim()) throw new ErrorPortal('La rodada necesita un título', 'validacion');
    const kmNum = Number(km);
    if (!Number.isFinite(kmNum) || kmNum < 0 || kmNum > 5000) throw new ErrorPortal('Los kilómetros deben ser un número entre 0 y 5000', 'validacion');
    const lider = liderId || ctx.miembro.id;
    if (!datos.miembros.some((m) => m.id === lider)) throw new ErrorPortal('El líder de la rodada no existe', 'validacion');
    const ids = [...new Set([lider, ...(asistentes || [])])];
    const desconocido = ids.find((a) => !datos.miembros.some((m) => m.id === a));
    if (desconocido) throw new ErrorPortal('Uno de los asistentes no está registrado', 'validacion');
    const rodada = {
      id: nuevoId(), fecha: aISO(parsearFecha(fecha)), titulo: String(titulo).trim(), ruta: String(ruta ?? '').trim(),
      km: Math.round(kmNum * 10) / 10, liderId: lider, asistentes: ids,
    };
    datos.rodadas.push(rodada);
    guardar(datos);
    return salidaRodada(datos, rodada);
  },

  async historialDe(miembroId) {
    await esperar();
    const datos = await db();
    const lista = datos.rodadas
      .filter((r) => r.asistentes.includes(miembroId))
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
      .map((r) => salidaRodada(datos, r));
    const kmTotal = Math.round(lista.reduce((s, r) => s + Number(r.km || 0), 0) * 10) / 10;
    return { rodadas: lista, kmTotal, cantidad: lista.length };
  },
};

/** Cálculo del resumen del panel de líderes (también lo usa el adaptador de Supabase). */
export function calcularResumen(listaMiembros, listaRodadas) {
  const hoy = aISO(new Date());
  const mes = hoy.slice(0, 7);
  const cuenta = (e) => listaMiembros.filter((m) => m.estado === e).length;
  const vencimientos = [];
  for (const m of listaMiembros) {
    if (!ESTADOS_ACTIVOS.includes(m.estado)) continue;
    for (const [documento, fecha] of [['soat', m.moto?.soatVence], ['tecno', m.moto?.tecnoVence], ['licencia', m.moto?.licenciaVence]]) {
      const dias = diasHasta(fecha);
      if (dias !== null && dias <= DIAS_ALERTA_VENCIMIENTO) {
        vencimientos.push({ miembroId: m.id, nombre: nombreCompleto(m), documento, vence: fecha, dias });
      }
    }
  }
  vencimientos.sort((a, b) => a.dias - b.dias);
  return {
    total: listaMiembros.filter((m) => m.estado !== 'rechazado').length,
    pendientes: cuenta('aspirante_pendiente'),
    activos: listaMiembros.filter((m) => ESTADOS_ACTIVOS.includes(m.estado)).length,
    oficiales: cuenta('oficial'),
    kmMes: Math.round(listaRodadas.filter((r) => r.fecha.startsWith(mes) && r.fecha <= hoy).reduce((s, r) => s + Number(r.km || 0), 0) * 10) / 10,
    vencimientos,
  };
}

export const estadisticas = {
  async resumen() {
    await esperar();
    const datos = await db();
    exigirLider(datos);
    return calcularResumen(datos.miembros, datos.rodadas);
  },
};

/** Restablece los datos ficticios y cierra la sesión. */
export async function reiniciarDemo() {
  almacen.borrar(CLAVE_SESION_DEMO);
  const s = await construirSemilla();
  almacen.escribir(CLAVE_DATOS_DEMO, s);
}
