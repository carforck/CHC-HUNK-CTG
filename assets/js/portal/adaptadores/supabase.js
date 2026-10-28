// Adaptador SUPABASE · Club Hunk Cartagena
// ------------------------------------------------------------------
// Mismo contrato que adaptadores/demo.js, pero contra Supabase (Postgres + Auth).
// Se carga SOLO cuando config.js tiene SUPABASE_URL y SUPABASE_ANON_KEY.
// Los permisos los hace cumplir la base (RLS, triggers y funciones de sql/schema.sql);
// aquí solo se traducen formas (camelCase <-> snake_case) y mensajes de error.

import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_CDN, RUTA_RESTABLECER, ErrorPortal, MENSAJES } from '../config.js';
import { reglas, normalizarPlaca, normalizarCelular, normalizarDocumento, aISO, parsearFecha } from '../validacion.js';
import { calcularResumen } from './demo.js'; // función pura, compartida para que ambos modos calculen igual

const RAIZ_SITIO = new URL('../../../../', import.meta.url); // este archivo está en assets/js/portal/adaptadores/
const CLAVE_FICHA_PENDIENTE = 'chc_ficha_pendiente_v1';

// ---------- Cliente (import dinámico del CDN) ----------
let promesaCliente = null;
function cliente() {
  promesaCliente ??= import(/* @vite-ignore */ SUPABASE_CDN).then(({ createClient }) =>
    createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    }),
  );
  return promesaCliente;
}

// ---------- Utilidades de forma ----------
const esObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const aSnake = (s) => s.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());
const aCamel = (s) => s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
function mapearClaves(valor, fn) {
  if (Array.isArray(valor)) return valor.map((v) => mapearClaves(v, fn));
  if (!esObjeto(valor)) return valor;
  return Object.fromEntries(Object.entries(valor).map(([k, v]) => [fn(k), mapearClaves(v, fn)]));
}
export const camelASnake = (o) => mapearClaves(o, aSnake);
export const snakeACamel = (o) => mapearClaves(o, aCamel);
const uno = (rel) => (Array.isArray(rel) ? rel[0] ?? null : rel ?? null); // PostgREST: objeto o arreglo según la FK
const t = (v) => v ?? '';
const clonar = (o) => JSON.parse(JSON.stringify(o ?? null));

function mergeProfundo(base, cambios) {
  const r = esObjeto(base) ? { ...base } : {};
  for (const [k, v] of Object.entries(cambios ?? {})) {
    if (v === undefined) continue;
    r[k] = esObjeto(v) && esObjeto(r[k]) ? mergeProfundo(r[k], v) : clonar(v);
  }
  return r;
}

const almacen = {
  leer(k) { try { return JSON.parse(globalThis.localStorage?.getItem(k) ?? 'null'); } catch { return null; } },
  escribir(k, v) { try { globalThis.localStorage?.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } },
  borrar(k) { try { globalThis.localStorage?.removeItem(k); } catch { /* nada */ } },
};

// ---------- Errores de Supabase -> mensajes en español ----------
function traducirError(error) {
  if (!error) return null;
  if (error instanceof ErrorPortal) return error;
  const msg = String(error.message || '');
  const codigo = String(error.code || '');
  const detalle = `${error.details || ''} ${msg}`;
  let texto = MENSAJES.inesperado;
  let cod = 'inesperado';
  if (/invalid login credentials/i.test(msg)) [texto, cod] = [MENSAJES.credenciales, 'credenciales'];
  else if (/already registered|already been registered|user_already_exists/i.test(msg + codigo)) [texto, cod] = [MENSAJES.correoDuplicado, 'correo_duplicado'];
  else if (/email not confirmed/i.test(msg)) [texto, cod] = ['Debes confirmar tu correo antes de ingresar. Revisa tu bandeja de entrada.', 'correo_sin_confirmar'];
  else if (/password should be|weak password/i.test(msg)) [texto, cod] = ['La contraseña es muy débil: usa mínimo 8 caracteres con letras y números', 'validacion'];
  else if (/rate limit|too many/i.test(msg)) [texto, cod] = ['Demasiados intentos. Espera unos minutos e intenta de nuevo.', 'limite'];
  else if (/jwt expired|invalid jwt|refresh token/i.test(msg)) [texto, cod] = [MENSAJES.sinSesion, 'sin_sesion'];
  else if (codigo === '42501' || /permission denied|row-level security/i.test(msg)) {
    // Los RAISE de nuestras funciones ya traen el mensaje en español
    [texto, cod] = [/[áéíóúñ]|No tienes|Solo un/i.test(msg) ? msg : MENSAJES.sinPermiso, 'sin_permiso'];
  } else if (codigo === 'P0001') [texto, cod] = [msg, 'validacion'];
  else if (codigo === '23505') {
    if (/documento/i.test(detalle)) [texto, cod] = [MENSAJES.documentoDuplicado, 'documento_duplicado'];
    else if (/correo/i.test(detalle)) [texto, cod] = [MENSAJES.correoDuplicado, 'correo_duplicado'];
    else if (/placa/i.test(detalle)) [texto, cod] = ['Ya hay una moto registrada con esa placa', 'placa_duplicada'];
    else [texto, cod] = ['Ese registro ya existe', 'duplicado'];
  } else if (codigo === '23514' || codigo === '22P02' || codigo === '22007' || codigo === '22008') {
    [texto, cod] = ['Revisa los datos: hay un campo con un formato no válido', 'validacion'];
  } else if (/failed to fetch|network|load failed/i.test(msg)) [texto, cod] = [MENSAJES.conexion, 'conexion'];
  const e = new ErrorPortal(texto, cod);
  e.cause = error;
  return e;
}
function revisar({ data, error }) {
  if (error) throw traducirError(error);
  return data;
}

// ---------- Filas de la base <-> Miembro del contrato ----------
const SELECT_MIEMBRO =
  '*, motos(*), contactos_emergencia(nombre, parentesco, celular, orden), emprendimientos(nombre, descripcion, whatsapp, aprobado), miembro_insignias(fecha, insignias(id, nombre))';

function filaAMiembro(f, salud) {
  const moto = uno(f.motos) || {};
  const emp = uno(f.emprendimientos);
  const s = salud || {};
  return {
    id: f.id,
    estado: f.estado,
    rol: f.rol,
    fechaIngreso: f.fecha_ingreso ?? null,
    creado: f.creado,
    personal: {
      nombres: t(f.nombres), apellidos: t(f.apellidos), tipoDocumento: t(f.tipo_documento), documento: t(f.documento),
      nacimiento: t(f.nacimiento), celular: t(f.celular), correo: t(f.correo), ciudad: t(f.ciudad), barrio: t(f.barrio),
    },
    moto: {
      marca: t(moto.marca), modelo: t(moto.modelo), anio: moto.anio ?? null, placa: t(moto.placa), color: t(moto.color),
      soatVence: t(moto.soat_vence), tecnoVence: t(moto.tecno_vence),
      licenciaCategoria: t(f.licencia_categoria), licenciaVence: t(f.licencia_vence),
    },
    salud: {
      tipoSangre: t(s.tipo_sangre), eps: t(s.eps), alergias: t(s.alergias), condiciones: t(s.condiciones), medicamentos: t(s.medicamentos),
    },
    emergencia: (f.contactos_emergencia || [])
      .slice()
      .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
      .map((c) => ({ nombre: t(c.nombre), parentesco: t(c.parentesco), celular: t(c.celular) })),
    club: {
      comoNosConociste: t(f.como_nos_conociste), recomendadoPor: t(f.recomendado_por), redes: t(f.redes), tallaJersey: t(f.talla_jersey),
      emprendimiento: emp
        ? { tiene: true, nombre: t(emp.nombre), descripcion: t(emp.descripcion), whatsapp: t(emp.whatsapp), aprobado: !!emp.aprobado }
        : { tiene: false, nombre: '', descripcion: '', whatsapp: '' },
    },
    consentimientos: {
      datos: !!f.consentimiento_datos, salud: !!f.consentimiento_salud, reglamento: !!f.consentimiento_reglamento,
      fecha: f.consentimiento_fecha ?? null,
    },
    insignias: (f.miembro_insignias || [])
      .map((mi) => ({ id: uno(mi.insignias)?.id ?? '', nombre: uno(mi.insignias)?.nombre ?? '', fecha: mi.fecha }))
      .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha))),
  };
}

/** Miembro (camelCase) -> JSON snake_case que esperan crear_mi_ficha / guardar_ficha. */
function miembroAPayload(m) {
  const limpio = clonar({
    personal: m.personal || {},
    moto: m.moto || {},
    salud: m.salud || {},
    emergencia: m.emergencia || [],
    club: m.club || {},
    consentimientos: m.consentimientos || {},
  });
  const p = limpio.personal;
  if (p.correo) p.correo = String(p.correo).trim().toLowerCase();
  if (p.celular) p.celular = normalizarCelular(p.celular);
  if (p.documento) p.documento = normalizarDocumento(p.documento);
  if (limpio.moto.placa) limpio.moto.placa = normalizarPlaca(limpio.moto.placa);
  limpio.emergencia = limpio.emergencia
    .filter((c) => c && (c.nombre || c.celular))
    .map((c) => ({ ...c, celular: normalizarCelular(c.celular) }));
  const emp = limpio.club.emprendimiento;
  if (emp?.whatsapp) emp.whatsapp = normalizarCelular(emp.whatsapp);
  if (emp) delete emp.aprobado;
  return camelASnake(limpio);
}

async function saludDe(sb, ids) {
  if (!ids.length) return new Map();
  const filas = revisar(await sb.rpc('fichas_salud', { p_ids: ids })) || [];
  return new Map(filas.map((s) => [s.miembro_id, s]));
}

async function obtenerMiembro(sb, filtro, valor) {
  const fila = revisar(await sb.from('miembros').select(SELECT_MIEMBRO).eq(filtro, valor).maybeSingle());
  if (!fila) return null;
  const salud = await saludDe(sb, [fila.id]);
  return filaAMiembro(fila, salud.get(fila.id));
}

async function usuarioActual(sb) {
  const { data } = await sb.auth.getSession();
  return data?.session?.user ?? null;
}

/** Si el registro quedó esperando confirmación de correo, crea la ficha al primer ingreso. */
async function completarFichaPendiente(sb, user) {
  const pendiente = almacen.leer(CLAVE_FICHA_PENDIENTE);
  if (!pendiente || pendiente.correo !== String(user.email).toLowerCase()) return null;
  revisar(await sb.rpc('crear_mi_ficha', { p: pendiente.payload }));
  almacen.borrar(CLAVE_FICHA_PENDIENTE);
  return obtenerMiembro(sb, 'usuario_id', user.id);
}

async function contexto(sb) {
  const user = await usuarioActual(sb);
  if (!user) return null;
  let miembro = await obtenerMiembro(sb, 'usuario_id', user.id);
  if (!miembro) miembro = await completarFichaPendiente(sb, user);
  return { usuario: { id: user.id, correo: user.email }, miembro };
}

async function exigirLider(sb) {
  const ctx = await contexto(sb);
  if (!ctx) throw new ErrorPortal(MENSAJES.sinSesion, 'sin_sesion');
  if (!['lider', 'admin'].includes(ctx.miembro?.rol)) throw new ErrorPortal(MENSAJES.sinPermiso, 'sin_permiso');
  return ctx;
}

const filaARodada = (r) => ({
  id: r.id, fecha: r.fecha, titulo: t(r.titulo), ruta: t(r.ruta), km: Number(r.km || 0),
  liderId: r.lider_id, liderNombre: t(r.lider_nombre), asistentes: r.asistentes || [],
});

const sinTildes = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// ================================================================
// API del adaptador
// ================================================================
export const auth = {
  async registrar(datosFicha, password) {
    const sb = await cliente();
    const correo = String(datosFicha?.personal?.correo ?? '').trim().toLowerCase();
    const error = reglas.requerido(correo) || reglas.correo(correo) || reglas.password(password);
    if (error) throw new ErrorPortal(error, 'validacion');
    const payload = miembroAPayload({ ...datosFicha, personal: { ...datosFicha.personal, correo } });

    const data = revisar(await sb.auth.signUp({
      email: correo,
      password,
      options: { emailRedirectTo: new URL('portal/', RAIZ_SITIO).href },
    }));
    // Con confirmación de correo activa, Supabase no da error para correos ya usados: devuelve identities vacío.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      throw new ErrorPortal(MENSAJES.correoDuplicado, 'correo_duplicado');
    }
    if (!data.session) {
      // Falta confirmar el correo: guardamos la ficha y se crea en el primer ingreso.
      almacen.escribir(CLAVE_FICHA_PENDIENTE, { correo, payload });
      throw new ErrorPortal(
        `Te enviamos un correo a ${correo} para confirmar tu cuenta. Ábrelo y luego ingresa para terminar tu registro.`,
        'confirmar_correo',
      );
    }
    revisar(await sb.rpc('crear_mi_ficha', { p: payload }));
    const miembro = await obtenerMiembro(sb, 'usuario_id', data.user.id);
    return { usuario: { id: data.user.id, correo: data.user.email }, miembro };
  },

  async ingresar(correo, password) {
    const sb = await cliente();
    revisar(await sb.auth.signInWithPassword({ email: String(correo ?? '').trim().toLowerCase(), password: String(password ?? '') }));
    const ctx = await contexto(sb);
    if (!ctx) throw new ErrorPortal(MENSAJES.credenciales, 'credenciales');
    return ctx;
  },

  async salir() {
    const sb = await cliente();
    revisar(await sb.auth.signOut());
  },

  async sesion() {
    const sb = await cliente();
    return contexto(sb);
  },

  async recuperar(correo) {
    const sb = await cliente();
    const c = String(correo ?? '').trim().toLowerCase();
    const error = reglas.requerido(c) || reglas.correo(c);
    if (error) throw new ErrorPortal(error, 'validacion');
    revisar(await sb.auth.resetPasswordForEmail(c, { redirectTo: new URL(RUTA_RESTABLECER, RAIZ_SITIO).href }));
  },
};

export const miembros = {
  async actual() {
    const sb = await cliente();
    return (await contexto(sb))?.miembro ?? null;
  },

  async actualizar(id, cambios) {
    const sb = await cliente();
    const ctx = await contexto(sb);
    if (!ctx) throw new ErrorPortal(MENSAJES.sinSesion, 'sin_sesion');
    const lider = ['lider', 'admin'].includes(ctx.miembro?.rol);
    const propio = ctx.miembro?.id === id;
    if (!propio && !lider) throw new ErrorPortal(MENSAJES.sinPermisoEditar, 'sin_permiso');
    const c = clonar(cambios || {});
    if (!lider && ('estado' in c || 'rol' in c)) throw new ErrorPortal(MENSAJES.sinPermisoEditar, 'sin_permiso');

    const actual = propio ? ctx.miembro : await obtenerMiembro(sb, 'id', id);
    if (!actual) throw new ErrorPortal(MENSAJES.noEncontrado, 'no_encontrado');
    const nuevo = mergeProfundo(actual, c);

    revisar(await sb.rpc('guardar_ficha', { p_id: id, p: miembroAPayload(nuevo) }));

    // Estado, rol y fecha de ingreso: columnas de miembros (el trigger valida permisos).
    const columnas = {};
    if ('rol' in c && c.rol !== actual.rol) columnas.rol = c.rol;
    if ('fechaIngreso' in c && lider) columnas.fecha_ingreso = c.fechaIngreso || null;
    if (Object.keys(columnas).length) revisar(await sb.from('miembros').update(columnas).eq('id', id));
    if ('estado' in c && c.estado !== actual.estado) revisar(await sb.rpc('cambiar_estado', { p_id: id, p_estado: c.estado, p_nota: null }));

    // Si cambia el correo propio, también se cambia el de la cuenta (Supabase envía confirmación).
    if (propio && nuevo.personal?.correo && nuevo.personal.correo.toLowerCase() !== String(ctx.usuario.correo).toLowerCase()) {
      revisar(await sb.auth.updateUser({ email: nuevo.personal.correo.toLowerCase() }));
    }
    return obtenerMiembro(sb, 'id', id);
  },

  async listar({ estado, busqueda } = {}) {
    const sb = await cliente();
    await exigirLider(sb);
    let q = sb.from('miembros').select(SELECT_MIEMBRO);
    if (estado) q = Array.isArray(estado) ? q.in('estado', estado) : q.eq('estado', estado);
    const filas = revisar(await q.order('nombres').order('apellidos')) || [];
    let lista = filas.map((f) => filaAMiembro(f, null));
    const texto = sinTildes(busqueda).trim();
    if (texto) {
      const qPlaca = normalizarPlaca(texto);
      lista = lista.filter((m) => {
        const pajar = sinTildes([
          m.personal.nombres, m.personal.apellidos, m.personal.documento, m.personal.correo,
          m.personal.celular, m.personal.barrio, m.moto.placa, m.moto.modelo,
        ].join(' '));
        return texto.split(/\s+/).every((p) => pajar.includes(p)) || (qPlaca && m.moto.placa.includes(qPlaca));
      });
    }
    // Salud vía función con auditoría (solo de los miembros que se van a mostrar).
    const salud = await saludDe(sb, lista.map((m) => m.id));
    for (const m of lista) {
      const s = salud.get(m.id) || {};
      m.salud = { tipoSangre: t(s.tipo_sangre), eps: t(s.eps), alergias: t(s.alergias), condiciones: t(s.condiciones), medicamentos: t(s.medicamentos) };
    }
    return lista;
  },

  async cambiarEstado(id, estado, nota = '') {
    const sb = await cliente();
    await exigirLider(sb);
    revisar(await sb.rpc('cambiar_estado', { p_id: id, p_estado: estado, p_nota: nota || null }));
    return obtenerMiembro(sb, 'id', id);
  },

  async fichaEmergencia(id) {
    const sb = await cliente();
    const data = revisar(await sb.rpc('ficha_emergencia', { p_id: id }));
    return data ? snakeACamel(data) : null;
  },
};

export const rodadas = {
  async listar({ desde, hasta } = {}) {
    const sb = await cliente();
    let q = sb.from('v_rodadas').select('*');
    if (desde) q = q.gte('fecha', desde);
    if (hasta) q = q.lte('fecha', hasta);
    return (revisar(await q.order('fecha', { ascending: false })) || []).map(filaARodada);
  },

  async crear({ fecha, titulo, ruta = '', km = 0, liderId, asistentes = [] } = {}) {
    const sb = await cliente();
    const ctx = await exigirLider(sb);
    if (!parsearFecha(fecha)) throw new ErrorPortal('Escribe una fecha válida para la rodada', 'validacion');
    if (!String(titulo ?? '').trim()) throw new ErrorPortal('La rodada necesita un título', 'validacion');
    const kmNum = Number(km);
    if (!Number.isFinite(kmNum) || kmNum < 0 || kmNum > 5000) throw new ErrorPortal('Los kilómetros deben ser un número entre 0 y 5000', 'validacion');
    const id = revisar(await sb.rpc('crear_rodada', {
      p_fecha: aISO(parsearFecha(fecha)), p_titulo: String(titulo).trim(), p_ruta: String(ruta ?? ''),
      p_km: Math.round(kmNum * 10) / 10, p_lider_id: liderId || ctx.miembro.id, p_asistentes: [...new Set(asistentes || [])],
    }));
    const fila = revisar(await sb.from('v_rodadas').select('*').eq('id', id).single());
    return filaARodada(fila);
  },

  async historialDe(miembroId) {
    const sb = await cliente();
    const filas = revisar(await sb.from('v_rodadas').select('*').contains('asistentes', [miembroId]).order('fecha', { ascending: false })) || [];
    const lista = filas.map(filaARodada);
    const kmTotal = Math.round(lista.reduce((s, r) => s + r.km, 0) * 10) / 10;
    return { rodadas: lista, kmTotal, cantidad: lista.length };
  },
};

export const estadisticas = {
  async resumen() {
    const sb = await cliente();
    await exigirLider(sb);
    const hoy = new Date();
    const inicioMes = aISO(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
    const [filas, filasRodadas] = await Promise.all([
      sb.from('miembros').select('id, estado, nombres, apellidos, licencia_vence, motos(soat_vence, tecno_vence)').then(revisar),
      sb.from('v_rodadas').select('fecha, km').gte('fecha', inicioMes).then(revisar),
    ]);
    const lista = (filas || []).map((f) => {
      const moto = uno(f.motos) || {};
      return {
        id: f.id, estado: f.estado,
        personal: { nombres: t(f.nombres), apellidos: t(f.apellidos) },
        moto: { soatVence: moto.soat_vence, tecnoVence: moto.tecno_vence, licenciaVence: f.licencia_vence },
      };
    });
    return calcularResumen(lista, (filasRodadas || []).map((r) => ({ fecha: r.fecha, km: Number(r.km || 0) })));
  },
};

/** En Supabase no hay datos demo que reiniciar. */
export async function reiniciarDemo() {}
