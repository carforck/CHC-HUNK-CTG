// Fachada pública de datos del portal · Club Hunk Cartagena
// ------------------------------------------------------------------
// Las páginas del portal SOLO importan este archivo. Aquí se elige el
// adaptador según config.js (MODO 'demo' o 'supabase') y se le delega todo.
// Para usar otra base de datos (MySQL, Firebase, API propia...) basta con
// escribir otro adaptador que exporte { auth, miembros, rodadas, estadisticas }
// con las mismas funciones y formas, y cargarlo en cargarAdaptador().
//
// Todas las funciones son async. Los errores son Error con .message en
// español, listo para mostrar al usuario.
//
// CONTRATO
//   auth.registrar(datosFicha, password) -> { usuario, miembro }  (estado 'aspirante_pendiente', rol 'miembro', deja sesión)
//   auth.ingresar(correo, password)      -> { usuario, miembro }
//   auth.salir()                         -> void
//   auth.sesion()                        -> { usuario, miembro } | null
//   auth.recuperar(correo)               -> void
//   miembros.actual()                    -> Miembro | null
//   miembros.actualizar(id, cambios)     -> Miembro   (merge profundo; arreglos se reemplazan)
//   miembros.listar({ estado?, busqueda? }) -> Miembro[]          (líder/admin)
//   miembros.cambiarEstado(id, estado, nota?) -> Miembro          (líder/admin)
//   miembros.fichaEmergencia(id)         -> FichaEmergencia | null (pública)
//   rodadas.listar({ desde?, hasta? })   -> Rodada[]  (más reciente primero)
//   rodadas.crear({ fecha, titulo, ruta, km, liderId, asistentes }) -> Rodada (líder/admin)
//   rodadas.historialDe(miembroId)       -> { rodadas, kmTotal, cantidad }
//   estadisticas.resumen()               -> { total, pendientes, activos, oficiales, kmMes, vencimientos[] } (líder/admin)
//
//   usuario: { id, correo }
//   Miembro: { id, estado, rol, fechaIngreso, creado, personal{...}, moto{...}, salud{...},
//              emergencia[{nombre, parentesco, celular}], club{..., emprendimiento{tiene, nombre, descripcion, whatsapp}},
//              consentimientos{datos, salud, reglamento, fecha}, insignias[{id, nombre, fecha}] }
//   FichaEmergencia: { id, nombreCorto, estado, tipoSangre, alergias, condiciones, medicamentos, eps, emergencia[], moto{placa, color, modelo} }
//   Rodada: { id, fecha 'YYYY-MM-DD', titulo, ruta, km, liderId, liderNombre, asistentes[id] }

import { MODO as MODO_CONFIG, ErrorPortal, MENSAJES } from './config.js';

/** 'demo' | 'supabase' */
export const MODO = MODO_CONFIG;

let promesaAdaptador = null;
function cargarAdaptador() {
  promesaAdaptador ??= (MODO === 'supabase'
    ? import('./adaptadores/supabase.js')
    : import('./adaptadores/demo.js'));
  return promesaAdaptador;
}

/** Convierte errores inesperados (red, bugs) en un mensaje entendible. */
function normalizarError(e) {
  if (e instanceof ErrorPortal) return e;
  const texto = String(e?.message || '');
  const deRed = e instanceof TypeError && /fetch|network|load failed|conex/i.test(texto);
  console.error('[CHC portal]', e);
  const err = new ErrorPortal(deRed ? MENSAJES.conexion : MENSAJES.inesperado, deRed ? 'conexion' : 'inesperado');
  err.cause = e;
  return err;
}

/** Crea un objeto con las mismas funciones que la sección del adaptador. */
function delegar(seccion, nombres) {
  const obj = {};
  for (const nombre of nombres) {
    obj[nombre] = async (...args) => {
      try {
        const ad = await cargarAdaptador();
        return await ad[seccion][nombre](...args);
      } catch (e) {
        throw normalizarError(e);
      }
    };
  }
  return Object.freeze(obj);
}

export const auth = delegar('auth', ['registrar', 'ingresar', 'salir', 'sesion', 'recuperar']);
export const miembros = delegar('miembros', ['actual', 'actualizar', 'listar', 'cambiarEstado', 'fichaEmergencia']);
export const rodadas = delegar('rodadas', ['listar', 'crear', 'historialDe']);
export const estadisticas = delegar('estadisticas', ['resumen']);

/** Restablece los datos ficticios del modo demo (y cierra la sesión). En modo 'supabase' no hace nada. */
export async function reiniciarDemo() {
  if (MODO !== 'demo') return;
  const ad = await cargarAdaptador();
  await ad.reiniciarDemo();
}
