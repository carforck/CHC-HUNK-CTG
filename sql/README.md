# Base de datos del portal · Club Hunk Cartagena

Hoy el portal funciona en **modo demo**: todo se guarda en el navegador (localStorage) con datos ficticios. Las cuentas de prueba son:

| Correo | Contraseña | Rol |
|---|---|---|
| `lider@clubhunk.co` | `Hunk2025!` | Líder (oficial) |
| `miembro@clubhunk.co` | `Hunk2025!` | Miembro oficial con rodadas e insignias |
| `admin@clubhunk.co` | `Hunk2025!` | Admin |

Para pasar a una base real, sigue estos pasos. No hay que tocar las páginas: solo `assets/js/portal/config.js`.

## 1. Crear el proyecto en Supabase

1. Entra a [supabase.com](https://supabase.com), crea una organización y un proyecto nuevo (plan gratuito). Región recomendada: `East US (North Virginia)` o `South America (São Paulo)`.
2. Guarda la contraseña de la base en un lugar seguro (no va en el código).

## 2. Crear las tablas

1. En el panel, abre **SQL Editor → New query**.
2. Pega todo el contenido de [`schema.sql`](schema.sql) y dale **Run**. Crea tablas, tipos, triggers, funciones y políticas RLS.
3. (Opcional, para probar) pega [`seed.sql`](seed.sql) y dale **Run**. Carga los mismos datos ficticios del modo demo. Las fechas de SOAT, tecnomecánica y rodadas se calculan respecto a hoy.

## 3. Configurar la autenticación

En **Authentication → Providers → Email**:

- Deja activado *Email*.
- **Confirm email**: si lo dejas activado (recomendado), al registrarse el aspirante recibe un correo. El portal guarda la ficha mientras tanto y la crea en su primer ingreso; mientras, la página muestra el mensaje *"Te enviamos un correo…"*. Si lo desactivas, la sesión queda iniciada al registrarse.
- En **Authentication → URL Configuration** pon como *Site URL* la dirección del sitio (p. ej. `https://usuario.github.io/club-hunk/`) y agrégala en *Redirect URLs* junto con `http://127.0.0.1:5500/**` para pruebas locales.
- Personaliza las plantillas de correo en español (**Authentication → Email Templates**).

## 4. Conectar el portal

En **Project Settings → API** copia la *Project URL* y la *anon public key*, y pégalas en `assets/js/portal/config.js`:

```js
export const SUPABASE_URL = 'https://xxxxxxxx.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOi...';
```

Con eso `MODO` pasa solo a `'supabase'`. La *anon key* es pública por diseño: la seguridad la ponen las políticas RLS. **Nunca** pongas la `service_role` key en el sitio.

## 5. Crear el primer administrador

1. Regístrate en el portal (`portal/registro.html`) con tu correo real. Quedarás como aspirante pendiente.
2. En el SQL Editor corre:

   ```sql
   update public.miembros
      set rol = 'admin', estado = 'oficial'
    where correo = 'tu-correo@ejemplo.com';
   ```

   El SQL Editor tiene permisos totales, así que este cambio sí se permite. Desde ahí el admin nombra líderes desde el panel. Un líder no puede nombrar admins; solo otro admin.

**Para probar con los datos de `seed.sql`:** crea en **Authentication → Users → Add user** las cuentas `lider@clubhunk.co`, `miembro@clubhunk.co` y `admin@clubhunk.co` (marca *Auto confirm*). Luego vuelve a correr el último bloque de `seed.sql` (el `update ... from auth.users`), que enlaza cada cuenta con su ficha por correo.

Antes de abrir el registro real, borra los datos de ejemplo:

```sql
delete from public.miembros where id::text like '11111111-1111-4111-8111-%';
delete from public.rodadas  where id::text like '22222222-2222-4222-8222-%';
```

## Qué protege la base (resumen)

| Información | Público | Miembro | Líder / admin | QR de emergencia |
|---|---|---|---|---|
| Rodadas (`v_rodadas`), insignias, vitrina aprobada | Sí | Sí | Sí | No |
| Su propia ficha | No | Ver y editar (no estado/rol) | Todas | No |
| Salud (`salud_emergencia`) | No | Solo la suya | Vía `fichas_salud()`, queda en auditoría | Lo esencial vía `ficha_emergencia()` |
| Documento, dirección, correo | No | Solo los suyos | Sí | No |
| `auditoria_accesos` | No | No | Solo admin | No |

- Las páginas del portal y la API usan las funciones `crear_mi_ficha`, `guardar_ficha`, `cambiar_estado`, `crear_rodada`, `fichas_salud` y `ficha_emergencia`.
- Triggers: un miembro no puede cambiar su estado, rol ni fecha de ingreso; al pasar a `oficial` se fija `fecha_ingreso`; cada cambio de estado queda en `cambios_estado` con su nota y quién lo hizo.
- `ficha_emergencia(id)` solo responde si el miembro está activo o inactivo (no si está pendiente o rechazado), si tiene el QR activo (`qr_activo`) y si autorizó sus datos de salud. Nunca expone documento, dirección ni correo.

## Ley 1581 de 2012 (Habeas Data)

Los datos de salud son **datos sensibles**. La plataforma está pensada para cumplir la ley, pero el club, como **responsable del tratamiento**, debe:

- **Finalidad**: publicar una política de tratamiento de datos que diga para qué se usan: administrar la membresía, organizar rodadas y atender emergencias. No se venden ni se ceden a terceros.
- **Autorización expresa**: el registro pide tres autorizaciones separadas (datos personales, datos de salud y reglamento) y guarda la fecha en `consentimiento_fecha`. Los campos de salud son opcionales; solo el contacto de emergencia es obligatorio.
- **Derechos ARCO** (acceso, rectificación, cancelación, oposición): cada miembro ve y corrige su ficha en el portal. Para solicitudes formales, publica un correo de contacto del club y responde en los plazos de ley (10 días hábiles para consultas, 15 para reclamos).
- **Acceso restringido y trazabilidad**: solo líderes y admins ven datos de salud, y cada consulta queda en `auditoria_accesos`. Si un miembro lo pide, se apaga su QR con `qr_activo = false` (por ahora desde el SQL Editor).
- **Retención**: se sugiere conservar la ficha mientras la persona sea miembro y hasta 1 año después de quedar `inactivo`. Luego se elimina o se anonimiza. Las solicitudes rechazadas se eliminan a los 6 meses.
- **Eliminación de cuenta**: al borrar el usuario en **Authentication → Users** (o con la API de admin) se borran en cascada su ficha, moto, salud, contactos, insignias, emprendimiento y asistencias. Las rodadas siguen existiendo sin esa persona. El registro de auditoría queda sin el vínculo (`miembro_id` en null).
- Registra la base de datos ante la SIC en el RNBD solo si el club llega a estar obligado a hacerlo.

## ¿Otra base de datos (MySQL, Firebase, API propia)?

Las páginas solo hablan con `assets/js/portal/api.js`, que delega en un **adaptador**. Hoy existen dos:

- `adaptadores/demo.js`: localStorage.
- `adaptadores/supabase.js`: Supabase.

Para usar otra base basta con escribir `adaptadores/otra.js` que exporte `auth`, `miembros`, `rodadas`, `estadisticas` y `reiniciarDemo` con **las mismas funciones, parámetros y formas de datos** (están documentadas al inicio de `api.js` y en `demo.js`), lanzando `ErrorPortal` (de `config.js`) con mensajes en español. Después se carga en `cargarAdaptador()` de `api.js`. Con MySQL o una API propia, los permisos de este esquema (RLS) deben replicarse en el servidor: nunca deben quedar solo en el navegador.
