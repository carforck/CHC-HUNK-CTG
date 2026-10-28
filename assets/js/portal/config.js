// Configuración del portal de registros · Club Hunk Cartagena
// ------------------------------------------------------------------
// Hoy el portal funciona en MODO DEMO: todo se guarda en el navegador
// (localStorage) con datos ficticios. Para conectar la base real:
//   1. Crea el proyecto en Supabase y corre sql/schema.sql (ver sql/README.md).
//   2. Pega aquí la URL del proyecto y la "anon public key".
// La anon key es pública por diseño: la seguridad la ponen las políticas
// RLS de la base de datos, no este archivo. NUNCA pongas aquí la service_role key.

export const SUPABASE_URL = '';
export const SUPABASE_ANON_KEY = '';

/** 'demo' | 'supabase' — se decide solo según haya credenciales. */
export const MODO = SUPABASE_URL && SUPABASE_ANON_KEY ? 'supabase' : 'demo';

/** Cliente de Supabase (ES module) que se carga solo en modo 'supabase'. */
export const SUPABASE_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';

/** Página a la que Supabase redirige el enlace de "recuperar contraseña" (relativa a la raíz del sitio). */
export const RUTA_RESTABLECER = 'portal/index.html';

// ---------- Reglas de negocio ----------
export const ESTADOS = ['aspirante_pendiente', 'aspirante', 'oficial', 'inactivo', 'rechazado'];
export const ROLES = ['miembro', 'lider', 'admin'];
/** Estados que cuentan como "activos" (ruedan con el club). */
export const ESTADOS_ACTIVOS = ['aspirante', 'oficial'];
/** Estados cuya ficha de emergencia (QR) responde. */
export const ESTADOS_CON_QR = ['aspirante', 'oficial', 'inactivo'];
/** Días de anticipación para alertar vencimientos de SOAT, tecnomecánica y licencia. */
export const DIAS_ALERTA_VENCIMIENTO = 30;
export const EDAD_MINIMA = 16;

// ---------- Modo demo ----------
export const CLAVE_DATOS_DEMO = 'chc_portal_demo_v1';
export const CLAVE_SESION_DEMO = 'chc_portal_sesion_v1';
/** Latencia simulada (ms) para que la interfaz muestre estados de carga. */
export const LATENCIA_DEMO = { min: 150, max: 400 };

/**
 * Error "de usuario": su .message está en español y se puede mostrar tal cual.
 * Los adaptadores lanzan siempre ErrorPortal; api.js convierte cualquier otro
 * error inesperado (red, bug) en un mensaje genérico.
 */
export class ErrorPortal extends Error {
  constructor(mensaje, codigo = 'error') {
    super(mensaje);
    this.name = 'ErrorPortal';
    this.codigo = codigo;
  }
}

export const MENSAJES = {
  sinPermiso: 'No tienes permiso para ver esta información',
  sinPermisoEditar: 'No tienes permiso para hacer este cambio',
  sinSesion: 'Tu sesión terminó. Vuelve a ingresar.',
  credenciales: 'Correo o contraseña incorrectos',
  correoDuplicado: 'Ya existe una cuenta con ese correo',
  documentoDuplicado: 'Ya existe un miembro registrado con ese documento',
  noEncontrado: 'No encontramos ese miembro',
  conexion: 'No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.',
  inesperado: 'Ocurrió un error inesperado. Intenta de nuevo en un momento.',
};
