-- =====================================================================
-- Club Hunk Cartagena · Portal de registros
-- Esquema Postgres para Supabase (correr completo en el SQL Editor).
--
-- Principios:
--   · Cada miembro ve y edita SOLO su ficha; líderes y admins ven todo y aprueban.
--   · Los datos de salud (datos sensibles, Ley 1581 de 2012) viven en una
--     tabla aparte (salud_emergencia) que solo lee su dueño directamente;
--     los líderes la leen a través de funciones que dejan registro en
--     auditoria_accesos (quién vio qué y cuándo).
--   · Los anónimos solo pueden: ver rodadas públicas, la vitrina de
--     emprendimientos aprobados y la ficha de emergencia (QR) vía función.
--   · Los permisos se hacen cumplir aquí (RLS + triggers), no en la página.
--
-- Es idempotente solo en parte: pensado para correrse una vez en un
-- proyecto nuevo. Para reiniciar, borra el esquema public y vuelve a correrlo.
-- =====================================================================

create extension if not exists pgcrypto;  -- gen_random_uuid()

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type public.estado_miembro as enum ('aspirante_pendiente', 'aspirante', 'oficial', 'inactivo', 'rechazado');
create type public.rol_miembro    as enum ('miembro', 'lider', 'admin');
create type public.tipo_documento as enum ('CC', 'CE', 'TI', 'PA', 'PPT');

-- ---------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------

-- Ficha del miembro (datos personales y del club). Sin datos de salud.
create table public.miembros (
  id                         uuid primary key default gen_random_uuid(),
  -- Cuenta de Supabase Auth. Al eliminar la cuenta se elimina la ficha (derecho de supresión).
  usuario_id                 uuid unique references auth.users (id) on delete cascade,
  estado                     public.estado_miembro not null default 'aspirante_pendiente',
  rol                        public.rol_miembro    not null default 'miembro',
  fecha_ingreso              date,                         -- se fija al pasar a 'oficial'
  -- Personal
  nombres                    text not null check (length(trim(nombres)) > 0),
  apellidos                  text not null check (length(trim(apellidos)) > 0),
  tipo_documento             public.tipo_documento not null default 'CC',
  documento                  text not null unique check (documento ~ '^[A-Z0-9]{5,12}$'),
  nacimiento                 date,
  celular                    text check (celular ~ '^3[0-9]{9}$'),
  correo                     text not null check (correo = lower(correo) and position('@' in correo) > 1),
  ciudad                     text default 'Cartagena',
  barrio                     text,
  -- Licencia de conducción (es de la persona, no de la moto)
  licencia_categoria         text check (licencia_categoria in ('A1', 'A2')),
  licencia_vence             date,
  -- Club
  como_nos_conociste         text,
  recomendado_por            text,
  redes                      text,
  talla_jersey               text check (talla_jersey in ('XS', 'S', 'M', 'L', 'XL', 'XXL')),
  -- Autorizaciones (Ley 1581): se guarda la fecha en que se dieron
  consentimiento_datos       boolean not null default false,
  consentimiento_salud       boolean not null default false,
  consentimiento_reglamento  boolean not null default false,
  consentimiento_fecha       timestamptz,
  -- El miembro decide si su QR de emergencia responde
  qr_activo                  boolean not null default true,
  creado                     timestamptz not null default now(),
  actualizado                timestamptz not null default now()
);
comment on table public.miembros is 'Ficha de cada aspirante/miembro del club. Los datos de salud están en salud_emergencia.';
create unique index miembros_correo_unico on public.miembros (correo);
create index miembros_estado_idx on public.miembros (estado);

-- Moto del miembro (una por miembro en esta versión)
create table public.motos (
  id           uuid primary key default gen_random_uuid(),
  miembro_id   uuid not null unique references public.miembros (id) on delete cascade,
  marca        text not null default 'Hero',
  modelo       text not null,
  anio         smallint check (anio between 1980 and 2100),
  placa        text not null unique check (placa ~ '^[A-Z]{3}[0-9]{2}[A-Z]$'),
  color        text,
  soat_vence   date,
  tecno_vence  date,                 -- null = aún no aplica (moto nueva)
  creado       timestamptz not null default now(),
  actualizado  timestamptz not null default now()
);
create index motos_soat_idx  on public.motos (soat_vence);
create index motos_tecno_idx on public.motos (tecno_vence);

-- Datos de salud: DATOS SENSIBLES. Acceso restringido (ver políticas y funciones).
create table public.salud_emergencia (
  miembro_id    uuid primary key references public.miembros (id) on delete cascade,
  tipo_sangre   text check (tipo_sangre in ('O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-')),
  eps           text,
  alergias      text,
  condiciones   text,
  medicamentos  text,
  creado        timestamptz not null default now(),
  actualizado   timestamptz not null default now()
);
comment on table public.salud_emergencia is 'Datos sensibles (Ley 1581). Solo el dueño los lee directo; líderes vía fichas_salud() con auditoría; público vía ficha_emergencia().';

create table public.contactos_emergencia (
  id          uuid primary key default gen_random_uuid(),
  miembro_id  uuid not null references public.miembros (id) on delete cascade,
  orden       smallint not null default 1,
  nombre      text not null,
  parentesco  text,
  celular     text not null check (celular ~ '^3[0-9]{9}$'),
  creado      timestamptz not null default now()
);
create index contactos_miembro_idx on public.contactos_emergencia (miembro_id, orden);

-- Rodadas y viajes
create table public.rodadas (
  id           uuid primary key default gen_random_uuid(),
  fecha        date not null,
  titulo       text not null check (length(trim(titulo)) > 0),
  ruta         text,
  km           numeric(7, 1) not null default 0 check (km >= 0 and km <= 5000),
  lider_id     uuid references public.miembros (id) on delete set null,
  creado_por   uuid default auth.uid(),
  creado       timestamptz not null default now(),
  actualizado  timestamptz not null default now()
);
create index rodadas_fecha_idx on public.rodadas (fecha desc);

create table public.rodada_asistentes (
  rodada_id   uuid not null references public.rodadas (id) on delete cascade,
  miembro_id  uuid not null references public.miembros (id) on delete cascade,
  primary key (rodada_id, miembro_id)
);
create index rodada_asistentes_miembro_idx on public.rodada_asistentes (miembro_id);

-- Academia CHC
create table public.insignias (
  id           text primary key,          -- slug, p. ej. 'seguridad-vial'
  nombre       text not null,
  descripcion  text,
  orden        smallint not null default 0
);

create table public.miembro_insignias (
  miembro_id    uuid not null references public.miembros (id) on delete cascade,
  insignia_id   text not null references public.insignias (id) on delete cascade,
  fecha         date not null default current_date,
  otorgada_por  uuid references public.miembros (id) on delete set null,
  primary key (miembro_id, insignia_id)
);

-- Vitrina de emprendimientos (la aprueban los líderes)
create table public.emprendimientos (
  id           uuid primary key default gen_random_uuid(),
  miembro_id   uuid not null unique references public.miembros (id) on delete cascade,
  nombre       text not null,
  descripcion  text,
  whatsapp     text check (whatsapp ~ '^3[0-9]{9}$'),
  categoria    text,
  aprobado     boolean not null default false,
  creado       timestamptz not null default now(),
  actualizado  timestamptz not null default now()
);
create index emprendimientos_aprobado_idx on public.emprendimientos (aprobado);

-- Historial de cambios de estado (aprobaciones, rechazos...)
create table public.cambios_estado (
  id          bigint generated always as identity primary key,
  miembro_id  uuid not null references public.miembros (id) on delete cascade,
  de          public.estado_miembro,
  a           public.estado_miembro not null,
  nota        text,
  por         uuid references public.miembros (id) on delete set null,
  creado      timestamptz not null default now()
);
create index cambios_estado_miembro_idx on public.cambios_estado (miembro_id, creado desc);

-- Auditoría: quién vio o editó datos sensibles de quién (Ley 1581, principio de seguridad)
create table public.auditoria_accesos (
  id          bigint generated always as identity primary key,
  miembro_id  uuid references public.miembros (id) on delete set null,  -- de quién son los datos
  visto_por   uuid,                                                      -- auth.uid() (null = anónimo, p. ej. QR)
  accion      text not null,                                             -- 'ver_salud', 'ver_ficha_emergencia', 'editar_ficha'...
  detalle     jsonb,
  creado      timestamptz not null default now()
);
create index auditoria_miembro_idx on public.auditoria_accesos (miembro_id, creado desc);

-- ---------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------
create or replace function public.tocar_actualizado() returns trigger
language plpgsql as $$
begin
  new.actualizado := now();
  return new;
end $$;

create trigger miembros_actualizado        before update on public.miembros         for each row execute function public.tocar_actualizado();
create trigger motos_actualizado           before update on public.motos            for each row execute function public.tocar_actualizado();
create trigger salud_actualizado           before update on public.salud_emergencia for each row execute function public.tocar_actualizado();
create trigger rodadas_actualizado         before update on public.rodadas          for each row execute function public.tocar_actualizado();
create trigger emprendimientos_actualizado before update on public.emprendimientos  for each row execute function public.tocar_actualizado();

-- ---------------------------------------------------------------------
-- Funciones auxiliares de permisos (SECURITY DEFINER para no recursar en RLS)
-- ---------------------------------------------------------------------
create or replace function public.mi_miembro_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.miembros where usuario_id = auth.uid()
$$;

create or replace function public.es_lider() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.miembros
    where usuario_id = auth.uid() and rol in ('lider', 'admin') and estado not in ('inactivo', 'rechazado')
  )
$$;

create or replace function public.es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.miembros
    where usuario_id = auth.uid() and rol = 'admin' and estado not in ('inactivo', 'rechazado')
  )
$$;

-- Texto vacío -> null
create or replace function public._txt(j jsonb, k text) returns text
language sql immutable as $$
  select nullif(trim(j ->> k), '')
$$;

-- ---------------------------------------------------------------------
-- Reglas de negocio en triggers
-- ---------------------------------------------------------------------

-- Al crear: quien no es líder solo puede crear SU ficha como aspirante pendiente.
create or replace function public.miembros_antes_insertar() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.es_lider() then
    new.usuario_id    := auth.uid();
    new.estado        := 'aspirante_pendiente';
    new.rol           := 'miembro';
    new.fecha_ingreso := null;
  end if;
  if new.estado = 'oficial' and new.fecha_ingreso is null then
    new.fecha_ingreso := current_date;
  end if;
  return new;
end $$;
create trigger miembros_antes_insertar before insert on public.miembros
  for each row execute function public.miembros_antes_insertar();

-- Al editar: un miembro no cambia su estado/rol/fecha de ingreso; solo un admin
-- nombra o quita admins. Registra los cambios de estado en cambios_estado.
-- (auth.uid() null = SQL Editor o service_role: se permite todo.)
create or replace function public.miembros_antes_actualizar() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    if not public.es_lider() then
      if new.estado is distinct from old.estado or new.rol is distinct from old.rol
         or new.fecha_ingreso is distinct from old.fecha_ingreso or new.usuario_id is distinct from old.usuario_id then
        raise exception 'No tienes permiso para hacer este cambio' using errcode = '42501';
      end if;
    elsif new.rol is distinct from old.rol and (new.rol = 'admin' or old.rol = 'admin') and not public.es_admin() then
      raise exception 'Solo un administrador puede cambiar ese rol' using errcode = '42501';
    end if;
    -- Las autorizaciones no se retiran editando la ficha: se pide la eliminación de la cuenta.
    new.consentimiento_datos      := old.consentimiento_datos or new.consentimiento_datos;
    new.consentimiento_salud      := old.consentimiento_salud or new.consentimiento_salud;
    new.consentimiento_reglamento := old.consentimiento_reglamento or new.consentimiento_reglamento;
  end if;
  if new.estado = 'oficial' and new.fecha_ingreso is null then
    new.fecha_ingreso := current_date;
  end if;
  if new.estado is distinct from old.estado then
    insert into public.cambios_estado (miembro_id, de, a, nota, por)
    values (old.id, old.estado, new.estado, nullif(current_setting('chc.nota', true), ''), public.mi_miembro_id());
  end if;
  return new;
end $$;
create trigger miembros_antes_actualizar before update on public.miembros
  for each row execute function public.miembros_antes_actualizar();

-- Solo líderes aprueban emprendimientos para la vitrina pública.
create or replace function public.emprendimientos_aprobacion() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.es_lider() then
    if tg_op = 'INSERT' then
      new.aprobado := false;
    elsif new.nombre is distinct from old.nombre or new.descripcion is distinct from old.descripcion
          or new.whatsapp is distinct from old.whatsapp then
      new.aprobado := false;      -- si el dueño cambia el contenido, vuelve a revisión
    else
      new.aprobado := old.aprobado;
    end if;
  end if;
  return new;
end $$;
create trigger emprendimientos_aprobacion before insert or update on public.emprendimientos
  for each row execute function public.emprendimientos_aprobacion();

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.miembros             enable row level security;
alter table public.motos                enable row level security;
alter table public.salud_emergencia     enable row level security;
alter table public.contactos_emergencia enable row level security;
alter table public.rodadas              enable row level security;
alter table public.rodada_asistentes    enable row level security;
alter table public.insignias            enable row level security;
alter table public.miembro_insignias    enable row level security;
alter table public.emprendimientos      enable row level security;
alter table public.cambios_estado       enable row level security;
alter table public.auditoria_accesos    enable row level security;

-- miembros: cada uno lo suyo; líderes todo. Borrar: el dueño (supresión) o un admin.
create policy miembros_ver      on public.miembros for select to authenticated using (usuario_id = auth.uid() or public.es_lider());
create policy miembros_crear    on public.miembros for insert to authenticated with check (usuario_id = auth.uid() or public.es_lider());
create policy miembros_editar   on public.miembros for update to authenticated using (usuario_id = auth.uid() or public.es_lider())
                                                                               with check (usuario_id = auth.uid() or public.es_lider());
create policy miembros_eliminar on public.miembros for delete to authenticated using (usuario_id = auth.uid() or public.es_admin());

-- motos, contactos de emergencia: dueño o líder.
create policy motos_todo on public.motos for all to authenticated
  using (miembro_id = public.mi_miembro_id() or public.es_lider())
  with check (miembro_id = public.mi_miembro_id() or public.es_lider());
create policy contactos_todo on public.contactos_emergencia for all to authenticated
  using (miembro_id = public.mi_miembro_id() or public.es_lider())
  with check (miembro_id = public.mi_miembro_id() or public.es_lider());

-- salud: SOLO el dueño directamente. Líderes: fichas_salud() / guardar_ficha() (con auditoría).
create policy salud_dueno on public.salud_emergencia for all to authenticated
  using (miembro_id = public.mi_miembro_id())
  with check (miembro_id = public.mi_miembro_id());

-- rodadas: públicas para leer; las crean/editan líderes.
create policy rodadas_ver      on public.rodadas for select to anon, authenticated using (true);
create policy rodadas_escribir on public.rodadas for all to authenticated using (public.es_lider()) with check (public.es_lider());
create policy asistentes_ver      on public.rodada_asistentes for select to anon, authenticated using (true);
create policy asistentes_escribir on public.rodada_asistentes for all to authenticated using (public.es_lider()) with check (public.es_lider());

-- Academia: catálogo público; las insignias de cada miembro las ve él y los líderes.
create policy insignias_ver      on public.insignias for select to anon, authenticated using (true);
create policy insignias_escribir on public.insignias for all to authenticated using (public.es_lider()) with check (public.es_lider());
create policy mi_ver      on public.miembro_insignias for select to authenticated using (miembro_id = public.mi_miembro_id() or public.es_lider());
create policy mi_escribir on public.miembro_insignias for all to authenticated using (public.es_lider()) with check (public.es_lider());

-- emprendimientos: vitrina pública solo con aprobados; el dueño y líderes gestionan.
create policy emp_publico on public.emprendimientos for select to anon, authenticated using (aprobado);
create policy emp_dueno on public.emprendimientos for all to authenticated
  using (miembro_id = public.mi_miembro_id() or public.es_lider())
  with check (miembro_id = public.mi_miembro_id() or public.es_lider());

-- historial de estados: el miembro ve el suyo; líderes todo. Lo escribe el trigger.
create policy cambios_ver on public.cambios_estado for select to authenticated using (miembro_id = public.mi_miembro_id() or public.es_lider());

-- auditoría: solo admins leen. Nadie escribe directo (solo funciones SECURITY DEFINER).
create policy auditoria_ver on public.auditoria_accesos for select to authenticated using (public.es_admin());

-- ---------------------------------------------------------------------
-- Vista pública de rodadas (con nombre corto del líder y asistentes)
-- Corre con permisos del dueño para poder mostrar el nombre del líder
-- sin abrir la tabla miembros. Solo expone nombre + inicial.
-- ---------------------------------------------------------------------
create or replace view public.v_rodadas as
select r.id, r.fecha, r.titulo, r.ruta, r.km, r.lider_id,
       coalesce(split_part(m.nombres, ' ', 1) || ' ' || left(m.apellidos, 1) || '.', '') as lider_nombre,
       coalesce((select array_agg(a.miembro_id order by a.miembro_id) from public.rodada_asistentes a where a.rodada_id = r.id), '{}') as asistentes
from public.rodadas r
left join public.miembros m on m.id = r.lider_id;
grant select on public.v_rodadas to anon, authenticated;

-- ---------------------------------------------------------------------
-- Funciones (RPC) que usa el portal
-- ---------------------------------------------------------------------

-- Ficha pública de emergencia (lo que muestra el QR del casco). Solo campos de
-- emergencia: sin documento, dirección ni correo. Deja registro del acceso.
create or replace function public.ficha_emergencia(p_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  m public.miembros;
  s public.salud_emergencia;
  mo public.motos;
begin
  select * into m from public.miembros
   where id = p_id and estado in ('aspirante', 'oficial', 'inactivo') and qr_activo and consentimiento_salud;
  if not found then
    return null;
  end if;
  select * into s  from public.salud_emergencia where miembro_id = m.id;
  select * into mo from public.motos where miembro_id = m.id;
  insert into public.auditoria_accesos (miembro_id, visto_por, accion) values (m.id, auth.uid(), 'ver_ficha_emergencia');
  return jsonb_build_object(
    'id', m.id,
    'nombre_corto', split_part(m.nombres, ' ', 1) || ' ' || left(m.apellidos, 1) || '.',
    'estado', m.estado,
    'tipo_sangre', coalesce(s.tipo_sangre, ''),
    'alergias', coalesce(s.alergias, ''),
    'condiciones', coalesce(s.condiciones, ''),
    'medicamentos', coalesce(s.medicamentos, ''),
    'eps', coalesce(s.eps, ''),
    'emergencia', coalesce((
        select jsonb_agg(jsonb_build_object('nombre', c.nombre, 'parentesco', coalesce(c.parentesco, ''), 'celular', c.celular) order by c.orden)
        from public.contactos_emergencia c where c.miembro_id = m.id), '[]'::jsonb),
    'moto', jsonb_build_object('placa', coalesce(mo.placa, ''), 'color', coalesce(mo.color, ''), 'modelo', coalesce(mo.modelo, ''))
  );
end $$;
revoke all on function public.ficha_emergencia(uuid) from public;
grant execute on function public.ficha_emergencia(uuid) to anon, authenticated;

-- Datos de salud de varios miembros. Un miembro solo recibe los suyos; un líder
-- recibe los pedidos y queda registro por cada ficha ajena consultada.
create or replace function public.fichas_salud(p_ids uuid[]) returns setof public.salud_emergencia
language plpgsql volatile security definer set search_path = public as $$
declare
  yo uuid := public.mi_miembro_id();
begin
  if auth.uid() is null then
    raise exception 'No tienes permiso para ver esta información' using errcode = '42501';
  end if;
  if public.es_lider() then
    insert into public.auditoria_accesos (miembro_id, visto_por, accion)
    select s.miembro_id, auth.uid(), 'ver_salud' from public.salud_emergencia s
     where s.miembro_id = any (p_ids) and s.miembro_id is distinct from yo;
    return query select * from public.salud_emergencia where miembro_id = any (p_ids);
  else
    return query select * from public.salud_emergencia where miembro_id = yo and yo = any (p_ids);
  end if;
end $$;
revoke all on function public.fichas_salud(uuid[]) from public;
grant execute on function public.fichas_salud(uuid[]) to authenticated;

-- Guarda moto, salud, contactos y emprendimiento desde el JSON de la ficha (snake_case).
-- Uso interno: no se expone a la API.
create or replace function public._guardar_partes(p_id uuid, p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  mo jsonb := coalesce(p -> 'moto', '{}');
  sa jsonb := coalesce(p -> 'salud', '{}');
  em jsonb := coalesce(p -> 'club' -> 'emprendimiento', '{}');
begin
  if p ? 'moto' and public._txt(mo, 'placa') is not null then
    insert into public.motos (miembro_id, marca, modelo, anio, placa, color, soat_vence, tecno_vence)
    values (p_id, coalesce(public._txt(mo, 'marca'), 'Hero'), coalesce(public._txt(mo, 'modelo'), ''),
            public._txt(mo, 'anio')::smallint, upper(public._txt(mo, 'placa')), public._txt(mo, 'color'),
            public._txt(mo, 'soat_vence')::date, public._txt(mo, 'tecno_vence')::date)
    on conflict (miembro_id) do update set
      marca = excluded.marca, modelo = excluded.modelo, anio = excluded.anio, placa = excluded.placa,
      color = excluded.color, soat_vence = excluded.soat_vence, tecno_vence = excluded.tecno_vence;
  end if;

  if p ? 'salud' then
    insert into public.salud_emergencia (miembro_id, tipo_sangre, eps, alergias, condiciones, medicamentos)
    values (p_id, public._txt(sa, 'tipo_sangre'), public._txt(sa, 'eps'), public._txt(sa, 'alergias'),
            public._txt(sa, 'condiciones'), public._txt(sa, 'medicamentos'))
    on conflict (miembro_id) do update set
      tipo_sangre = excluded.tipo_sangre, eps = excluded.eps, alergias = excluded.alergias,
      condiciones = excluded.condiciones, medicamentos = excluded.medicamentos;
  end if;

  if p ? 'emergencia' then
    delete from public.contactos_emergencia where miembro_id = p_id;
    insert into public.contactos_emergencia (miembro_id, orden, nombre, parentesco, celular)
    select p_id, e.ord, public._txt(e.c, 'nombre'), public._txt(e.c, 'parentesco'), public._txt(e.c, 'celular')
      from jsonb_array_elements(p -> 'emergencia') with ordinality as e(c, ord)
     where public._txt(e.c, 'nombre') is not null and public._txt(e.c, 'celular') is not null;
  end if;

  if p -> 'club' ? 'emprendimiento' then
    if coalesce((em ->> 'tiene')::boolean, false) and public._txt(em, 'nombre') is not null then
      insert into public.emprendimientos (miembro_id, nombre, descripcion, whatsapp)
      values (p_id, public._txt(em, 'nombre'), public._txt(em, 'descripcion'), public._txt(em, 'whatsapp'))
      on conflict (miembro_id) do update set
        nombre = excluded.nombre, descripcion = excluded.descripcion, whatsapp = excluded.whatsapp;
    else
      delete from public.emprendimientos where miembro_id = p_id;
    end if;
  end if;
end $$;
revoke all on function public._guardar_partes(uuid, jsonb) from public, anon, authenticated;

-- Crea la ficha del usuario que acaba de registrarse (estado y rol forzados).
create or replace function public.crear_mi_ficha(p jsonb) returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare
  pe jsonb := coalesce(p -> 'personal', '{}');
  cl jsonb := coalesce(p -> 'club', '{}');
  mo jsonb := coalesce(p -> 'moto', '{}');
  co jsonb := coalesce(p -> 'consentimientos', '{}');
  nuevo uuid;
begin
  if auth.uid() is null then
    raise exception 'Tu sesión terminó. Vuelve a ingresar.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.miembros where usuario_id = auth.uid()) then
    raise exception 'Tu cuenta ya tiene una ficha registrada' using errcode = 'P0001';
  end if;
  if not (coalesce((co ->> 'datos')::boolean, false) and coalesce((co ->> 'salud')::boolean, false)
          and coalesce((co ->> 'reglamento')::boolean, false)) then
    raise exception 'Debes aceptar el tratamiento de datos, de datos de salud y el reglamento del club' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.miembros where documento = upper(public._txt(pe, 'documento'))) then
    raise exception 'Ya existe un miembro registrado con ese documento' using errcode = 'P0001';
  end if;

  insert into public.miembros (
    usuario_id, estado, rol, nombres, apellidos, tipo_documento, documento, nacimiento, celular, correo, ciudad, barrio,
    licencia_categoria, licencia_vence, como_nos_conociste, recomendado_por, redes, talla_jersey,
    consentimiento_datos, consentimiento_salud, consentimiento_reglamento, consentimiento_fecha)
  values (
    auth.uid(), 'aspirante_pendiente', 'miembro',
    public._txt(pe, 'nombres'), public._txt(pe, 'apellidos'),
    coalesce(public._txt(pe, 'tipo_documento'), 'CC')::public.tipo_documento, upper(public._txt(pe, 'documento')),
    public._txt(pe, 'nacimiento')::date, public._txt(pe, 'celular'),
    lower(coalesce(auth.jwt() ->> 'email', public._txt(pe, 'correo'))),   -- el correo de la cuenta manda
    coalesce(public._txt(pe, 'ciudad'), 'Cartagena'), public._txt(pe, 'barrio'),
    public._txt(mo, 'licencia_categoria'), public._txt(mo, 'licencia_vence')::date,
    public._txt(cl, 'como_nos_conociste'), public._txt(cl, 'recomendado_por'), public._txt(cl, 'redes'), public._txt(cl, 'talla_jersey'),
    true, true, true, now())
  returning id into nuevo;

  perform public._guardar_partes(nuevo, p);
  return nuevo;
end $$;
revoke all on function public.crear_mi_ficha(jsonb) from public;
grant execute on function public.crear_mi_ficha(jsonb) to authenticated;

-- Guarda la ficha COMPLETA (el portal hace el merge y envía todo). Dueño o líder.
-- No toca estado ni rol (para eso: cambiar_estado / update directo de líderes).
create or replace function public.guardar_ficha(p_id uuid, p jsonb) returns void
language plpgsql volatile security definer set search_path = public as $$
declare
  pe jsonb := coalesce(p -> 'personal', '{}');
  cl jsonb := coalesce(p -> 'club', '{}');
  mo jsonb := coalesce(p -> 'moto', '{}');
  yo uuid := public.mi_miembro_id();
begin
  if auth.uid() is null or (p_id is distinct from yo and not public.es_lider()) then
    raise exception 'No tienes permiso para hacer este cambio' using errcode = '42501';
  end if;
  update public.miembros set
    nombres = coalesce(public._txt(pe, 'nombres'), nombres),
    apellidos = coalesce(public._txt(pe, 'apellidos'), apellidos),
    tipo_documento = coalesce(public._txt(pe, 'tipo_documento')::public.tipo_documento, tipo_documento),
    documento = coalesce(upper(public._txt(pe, 'documento')), documento),
    nacimiento = public._txt(pe, 'nacimiento')::date,
    celular = public._txt(pe, 'celular'),
    correo = coalesce(lower(public._txt(pe, 'correo')), correo),
    ciudad = public._txt(pe, 'ciudad'),
    barrio = public._txt(pe, 'barrio'),
    licencia_categoria = public._txt(mo, 'licencia_categoria'),
    licencia_vence = public._txt(mo, 'licencia_vence')::date,
    como_nos_conociste = public._txt(cl, 'como_nos_conociste'),
    recomendado_por = public._txt(cl, 'recomendado_por'),
    redes = public._txt(cl, 'redes'),
    talla_jersey = public._txt(cl, 'talla_jersey')
  where id = p_id;
  if not found then
    raise exception 'No encontramos ese miembro' using errcode = 'P0001';
  end if;
  perform public._guardar_partes(p_id, p);
  if p_id is distinct from yo then
    insert into public.auditoria_accesos (miembro_id, visto_por, accion) values (p_id, auth.uid(), 'editar_ficha');
  end if;
end $$;
revoke all on function public.guardar_ficha(uuid, jsonb) from public;
grant execute on function public.guardar_ficha(uuid, jsonb) to authenticated;

-- Cambia el estado de un miembro con una nota (queda en cambios_estado). Solo líderes.
create or replace function public.cambiar_estado(p_id uuid, p_estado public.estado_miembro, p_nota text default null) returns void
language plpgsql volatile security invoker set search_path = public as $$
begin
  if not public.es_lider() then
    raise exception 'No tienes permiso para hacer este cambio' using errcode = '42501';
  end if;
  perform set_config('chc.nota', coalesce(p_nota, ''), true);
  update public.miembros set estado = p_estado where id = p_id;
  if not found then
    raise exception 'No encontramos ese miembro' using errcode = 'P0001';
  end if;
end $$;
grant execute on function public.cambiar_estado(uuid, public.estado_miembro, text) to authenticated;

-- Crea una rodada con sus asistentes en una sola transacción. Solo líderes.
create or replace function public.crear_rodada(
  p_fecha date, p_titulo text, p_ruta text, p_km numeric, p_lider_id uuid, p_asistentes uuid[]
) returns uuid
language plpgsql volatile security invoker set search_path = public as $$
declare
  nueva uuid;
  lider uuid := coalesce(p_lider_id, public.mi_miembro_id());
begin
  if not public.es_lider() then
    raise exception 'No tienes permiso para hacer este cambio' using errcode = '42501';
  end if;
  insert into public.rodadas (fecha, titulo, ruta, km, lider_id)
  values (p_fecha, trim(p_titulo), nullif(trim(p_ruta), ''), coalesce(p_km, 0), lider)
  returning id into nueva;
  insert into public.rodada_asistentes (rodada_id, miembro_id)
  select distinct nueva, x from unnest(array_append(coalesce(p_asistentes, '{}'), lider)) as x where x is not null;
  return nueva;
end $$;
grant execute on function public.crear_rodada(date, text, text, numeric, uuid, uuid[]) to authenticated;
