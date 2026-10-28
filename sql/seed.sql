-- =====================================================================
-- Club Hunk Cartagena · Datos de ejemplo (DATOS FICTICIOS)
-- Equivalentes a la semilla del modo demo (assets/js/portal/adaptadores/demo.js).
-- Correr DESPUÉS de schema.sql, en el SQL Editor de Supabase.
-- Las fechas de SOAT, tecnomecánica, licencias y rodadas son relativas a hoy
-- para que el panel siempre muestre alertas de vencimiento.
-- No uses estos datos en producción: bórralos antes de abrir el registro real
--   delete from public.miembros where id::text like '11111111-1111-4111-8111-%';
--   delete from public.rodadas  where id::text like '22222222-2222-4222-8222-%';
-- =====================================================================

begin;

-- Catálogo de insignias de la Academia CHC
insert into public.insignias (id, nombre, descripcion, orden) values
  ('seguridad-vial',    'Seguridad vial básica', 'Normas de tránsito, equipo de protección y conducción preventiva.', 1),
  ('senas-grupo',       'Señas de grupo',        'Señas de mano y formación para rodar en grupo.', 2),
  ('primeros-auxilios', 'Primeros auxilios',     'Qué hacer (y qué no) ante un accidente en la vía.', 3),
  ('mecanica-basica',   'Mecánica básica',       'Revisión pre-rodada, cadena, llantas, frenos y luces.', 4)
on conflict (id) do nothing;

-- Miembros
insert into public.miembros (id, estado, rol, fecha_ingreso, nombres, apellidos, tipo_documento, documento, nacimiento, celular, correo, ciudad, barrio, licencia_categoria, licencia_vence, como_nos_conociste, recomendado_por, redes, talla_jersey, consentimiento_datos, consentimiento_salud, consentimiento_reglamento, consentimiento_fecha, creado) values
  ('11111111-1111-4111-8111-000000000001', 'oficial', 'lider', date '2025-02-09', 'Andrés Felipe', 'Herrera Julio', 'CC', '1047400101', date '1992-05-14', '3005550101', 'lider@clubhunk.co', 'Cartagena', 'Manga', 'A2', current_date + 2100, 'Otro', null, '@andres.hunk', 'L', true, true, true, now(), (current_date - 600)::timestamptz);
insert into public.miembros (id, estado, rol, fecha_ingreso, nombres, apellidos, tipo_documento, documento, nacimiento, celular, correo, ciudad, barrio, licencia_categoria, licencia_vence, como_nos_conociste, recomendado_por, redes, talla_jersey, consentimiento_datos, consentimiento_salud, consentimiento_reglamento, consentimiento_fecha, creado) values
  ('11111111-1111-4111-8111-000000000002', 'oficial', 'miembro', date '2025-06-22', 'Juan Pablo', 'Pérez Cabarcas', 'CC', '1143300202', date '1998-11-03', '3005550102', 'miembro@clubhunk.co', 'Cartagena', 'Crespo', 'A2', current_date + 1500, 'TikTok', 'Andrés Herrera', '@elflaco.hunk', 'M', true, true, true, now(), (current_date - 480)::timestamptz);
insert into public.miembros (id, estado, rol, fecha_ingreso, nombres, apellidos, tipo_documento, documento, nacimiento, celular, correo, ciudad, barrio, licencia_categoria, licencia_vence, como_nos_conociste, recomendado_por, redes, talla_jersey, consentimiento_datos, consentimiento_salud, consentimiento_reglamento, consentimiento_fecha, creado) values
  ('11111111-1111-4111-8111-000000000003', 'oficial', 'admin', date '2025-02-09', 'Valentina', 'Ríos Arrieta', 'CC', '1047400303', date '1995-02-20', '3005550103', 'admin@clubhunk.co', 'Cartagena', 'Bocagrande', 'A2', current_date + 1800, 'Instagram', null, null, 'S', true, true, true, now(), (current_date - 620)::timestamptz);
insert into public.miembros (id, estado, rol, fecha_ingreso, nombres, apellidos, tipo_documento, documento, nacimiento, celular, correo, ciudad, barrio, licencia_categoria, licencia_vence, como_nos_conociste, recomendado_por, redes, talla_jersey, consentimiento_datos, consentimiento_salud, consentimiento_reglamento, consentimiento_fecha, creado) values
  ('11111111-1111-4111-8111-000000000004', 'oficial', 'miembro', date '2025-08-10', 'Luis Miguel', 'Castro Pájaro', 'CC', '73200404', date '1989-07-30', '3005550104', 'luis.castro@ejemplo.co', 'Cartagena', 'El Bosque', 'A2', current_date + 900, 'Un amigo del club', 'Juan Pablo Pérez', null, 'XL', true, true, true, now(), (current_date - 420)::timestamptz);
insert into public.miembros (id, estado, rol, fecha_ingreso, nombres, apellidos, tipo_documento, documento, nacimiento, celular, correo, ciudad, barrio, licencia_categoria, licencia_vence, como_nos_conociste, recomendado_por, redes, talla_jersey, consentimiento_datos, consentimiento_salud, consentimiento_reglamento, consentimiento_fecha, creado) values
  ('11111111-1111-4111-8111-000000000005', 'oficial', 'miembro', date '2025-11-02', 'Daniela', 'Orozco Marimón', 'CC', '1047400505', date '2000-09-12', '3005550105', 'daniela.orozco@ejemplo.co', 'Cartagena', 'Pie de la Popa', 'A2', current_date + 25, 'Instagram', null, null, 'S', true, true, true, now(), (current_date - 360)::timestamptz);
insert into public.miembros (id, estado, rol, fecha_ingreso, nombres, apellidos, tipo_documento, documento, nacimiento, celular, correo, ciudad, barrio, licencia_categoria, licencia_vence, como_nos_conociste, recomendado_por, redes, talla_jersey, consentimiento_datos, consentimiento_salud, consentimiento_reglamento, consentimiento_fecha, creado) values
  ('11111111-1111-4111-8111-000000000006', 'aspirante', 'miembro', null, 'Kevin Andrés', 'Barrios Zúñiga', 'CC', '1143300606', date '2003-03-25', '3005550106', 'kevin.barrios@ejemplo.co', 'Turbaco', 'Centro', 'A2', current_date + 1200, 'En una rodada', null, null, 'M', true, true, true, now(), (current_date - 75)::timestamptz);
insert into public.miembros (id, estado, rol, fecha_ingreso, nombres, apellidos, tipo_documento, documento, nacimiento, celular, correo, ciudad, barrio, licencia_categoria, licencia_vence, como_nos_conociste, recomendado_por, redes, talla_jersey, consentimiento_datos, consentimiento_salud, consentimiento_reglamento, consentimiento_fecha, creado) values
  ('11111111-1111-4111-8111-000000000007', 'aspirante', 'miembro', null, 'Sebastián', 'Marrugo Díaz', 'CC', '1047400707', date '1997-12-01', '3005550107', 'sebastian.marrugo@ejemplo.co', 'Cartagena', 'Los Alpes', 'A2', current_date + 2500, 'TikTok', null, null, 'L', true, true, true, now(), (current_date - 50)::timestamptz);
insert into public.miembros (id, estado, rol, fecha_ingreso, nombres, apellidos, tipo_documento, documento, nacimiento, celular, correo, ciudad, barrio, licencia_categoria, licencia_vence, como_nos_conociste, recomendado_por, redes, talla_jersey, consentimiento_datos, consentimiento_salud, consentimiento_reglamento, consentimiento_fecha, creado) values
  ('11111111-1111-4111-8111-000000000008', 'aspirante_pendiente', 'miembro', null, 'José Luis', 'Pájaro Teherán', 'CC', '1143300808', date '2001-06-18', '3005550108', 'jose.pajaro@ejemplo.co', 'Turbaco', 'Plan Parejo', 'A2', current_date + 3000, 'Instagram', null, null, 'M', true, true, true, now(), (current_date - 4)::timestamptz);
insert into public.miembros (id, estado, rol, fecha_ingreso, nombres, apellidos, tipo_documento, documento, nacimiento, celular, correo, ciudad, barrio, licencia_categoria, licencia_vence, como_nos_conociste, recomendado_por, redes, talla_jersey, consentimiento_datos, consentimiento_salud, consentimiento_reglamento, consentimiento_fecha, creado) values
  ('11111111-1111-4111-8111-000000000009', 'aspirante_pendiente', 'miembro', null, 'Mariana', 'Cassiani Gómez', 'CC', '1047400909', date '1999-04-07', '3005550109', 'mariana.cassiani@ejemplo.co', 'Cartagena', 'Crespo', 'A2', current_date + 1400, 'Un amigo del club', 'Daniela Orozco', null, 'S', true, true, true, now(), (current_date - 1)::timestamptz);
insert into public.miembros (id, estado, rol, fecha_ingreso, nombres, apellidos, tipo_documento, documento, nacimiento, celular, correo, ciudad, barrio, licencia_categoria, licencia_vence, como_nos_conociste, recomendado_por, redes, talla_jersey, consentimiento_datos, consentimiento_salud, consentimiento_reglamento, consentimiento_fecha, creado) values
  ('11111111-1111-4111-8111-000000000010', 'inactivo', 'miembro', date '2025-04-13', 'Rafael', 'Teherán Blanco', 'CC', '73100110', date '1986-01-29', '3005550110', 'rafael.teheran@ejemplo.co', 'Cartagena', 'Manga', 'A2', current_date + 700, 'Otro', null, null, 'XL', true, true, true, now(), (current_date - 560)::timestamptz);

-- Motos
insert into public.motos (miembro_id, marca, modelo, anio, placa, color, soat_vence, tecno_vence) values
  ('11111111-1111-4111-8111-000000000001', 'Hero', 'Hunk 190R', 2024, 'KTR45G', 'Rojo', current_date + 160, current_date + 400),
  ('11111111-1111-4111-8111-000000000002', 'Hero', 'Hunk 160R 4V', 2024, 'GQW18F', 'Negro', current_date + 12, null),
  ('11111111-1111-4111-8111-000000000003', 'Hero', 'Hunk 160R', 2023, 'HDS72E', 'Blanco', current_date + 220, current_date + 300),
  ('11111111-1111-4111-8111-000000000004', 'Hero', 'Hunk 160R', 2022, 'FBN33C', 'Azul', current_date + 95, current_date - 20),
  ('11111111-1111-4111-8111-000000000005', 'Hero', 'Hunk 160R 4V', 2025, 'JMP09H', 'Gris', current_date + 200, null),
  ('11111111-1111-4111-8111-000000000006', 'Hero', 'Hunk 160R', 2021, 'DLK56B', 'Negro', current_date - 5, current_date + 45),
  ('11111111-1111-4111-8111-000000000007', 'Hero', 'Hunk 190R', 2025, 'LPZ71K', 'Rojo', current_date + 300, null),
  ('11111111-1111-4111-8111-000000000008', 'Hero', 'Hunk 160R 4V', 2025, 'MXB24J', 'Azul', current_date + 330, null),
  ('11111111-1111-4111-8111-000000000009', 'Hero', 'Hunk 160R', 2023, 'NCV80A', 'Blanco', current_date + 20, current_date + 180),
  ('11111111-1111-4111-8111-000000000010', 'Hero', 'Hunk 190R', 2020, 'BTE11D', 'Negro', current_date - 60, current_date - 30);

-- Salud (datos sensibles, ficticios)
insert into public.salud_emergencia (miembro_id, tipo_sangre, eps, alergias, condiciones, medicamentos) values
  ('11111111-1111-4111-8111-000000000001', 'O+', 'Sura', 'Ninguna conocida', null, null),
  ('11111111-1111-4111-8111-000000000002', 'O+', 'Nueva EPS', 'Penicilina', 'Asma leve', 'Salbutamol (inhalador)'),
  ('11111111-1111-4111-8111-000000000003', 'A+', 'Sanitas', null, null, null),
  ('11111111-1111-4111-8111-000000000004', 'B+', 'Mutual Ser', 'Mariscos', null, null),
  ('11111111-1111-4111-8111-000000000005', 'O-', 'Salud Total', null, null, null),
  ('11111111-1111-4111-8111-000000000006', 'A-', 'Coosalud', null, null, null),
  ('11111111-1111-4111-8111-000000000007', 'O+', 'Famisanar', null, null, null),
  ('11111111-1111-4111-8111-000000000008', 'B-', 'Cajacopi', null, null, null),
  ('11111111-1111-4111-8111-000000000009', 'AB+', 'Compensar', 'Ibuprofeno', null, null),
  ('11111111-1111-4111-8111-000000000010', 'O+', 'Nueva EPS', null, null, null);

-- Contactos de emergencia
insert into public.contactos_emergencia (miembro_id, orden, nombre, parentesco, celular) values
  ('11111111-1111-4111-8111-000000000001', 1, 'Laura Julio', 'Esposo(a)', '3005550201'),
  ('11111111-1111-4111-8111-000000000002', 1, 'María Cabarcas', 'Mamá', '3005550202'),
  ('11111111-1111-4111-8111-000000000002', 2, 'Carlos Pérez', 'Hermano(a)', '3005550203'),
  ('11111111-1111-4111-8111-000000000003', 1, 'Rosa Arrieta', 'Mamá', '3005550204'),
  ('11111111-1111-4111-8111-000000000004', 1, 'Ana Pájaro', 'Esposo(a)', '3005550205'),
  ('11111111-1111-4111-8111-000000000005', 1, 'Jorge Orozco', 'Papá', '3005550206'),
  ('11111111-1111-4111-8111-000000000006', 1, 'Luz Zúñiga', 'Mamá', '3005550207'),
  ('11111111-1111-4111-8111-000000000007', 1, 'Paola Díaz', 'Pareja', '3005550208'),
  ('11111111-1111-4111-8111-000000000008', 1, 'Elena Teherán', 'Mamá', '3005550209'),
  ('11111111-1111-4111-8111-000000000009', 1, 'Pedro Cassiani', 'Papá', '3005550210'),
  ('11111111-1111-4111-8111-000000000010', 1, 'Carmen Blanco', 'Esposo(a)', '3005550211');

-- Insignias obtenidas
insert into public.miembro_insignias (miembro_id, insignia_id, fecha, otorgada_por) values
  ('11111111-1111-4111-8111-000000000001', 'seguridad-vial', current_date - 300, '11111111-1111-4111-8111-000000000001'),
  ('11111111-1111-4111-8111-000000000001', 'senas-grupo', current_date - 280, '11111111-1111-4111-8111-000000000001'),
  ('11111111-1111-4111-8111-000000000001', 'primeros-auxilios', current_date - 200, '11111111-1111-4111-8111-000000000001'),
  ('11111111-1111-4111-8111-000000000001', 'mecanica-basica', current_date - 120, '11111111-1111-4111-8111-000000000001'),
  ('11111111-1111-4111-8111-000000000002', 'seguridad-vial', current_date - 250, '11111111-1111-4111-8111-000000000001'),
  ('11111111-1111-4111-8111-000000000002', 'senas-grupo', current_date - 180, '11111111-1111-4111-8111-000000000001'),
  ('11111111-1111-4111-8111-000000000002', 'primeros-auxilios', current_date - 60, '11111111-1111-4111-8111-000000000001'),
  ('11111111-1111-4111-8111-000000000003', 'seguridad-vial', current_date - 300, '11111111-1111-4111-8111-000000000001'),
  ('11111111-1111-4111-8111-000000000003', 'primeros-auxilios', current_date - 200, '11111111-1111-4111-8111-000000000001'),
  ('11111111-1111-4111-8111-000000000004', 'seguridad-vial', current_date - 200, '11111111-1111-4111-8111-000000000001'),
  ('11111111-1111-4111-8111-000000000004', 'mecanica-basica', current_date - 90, '11111111-1111-4111-8111-000000000001'),
  ('11111111-1111-4111-8111-000000000005', 'senas-grupo', current_date - 100, '11111111-1111-4111-8111-000000000001'),
  ('11111111-1111-4111-8111-000000000010', 'seguridad-vial', current_date - 400, '11111111-1111-4111-8111-000000000001');

-- Emprendimientos (vitrina)
insert into public.emprendimientos (miembro_id, nombre, descripcion, whatsapp, categoria, aprobado) values ('11111111-1111-4111-8111-000000000004', 'Natural Fresh Ctg', 'Jugos naturales, bowls de frutas y batidos. Domicilios en Cartagena.', '3005550304', 'Comida y bebidas', true);

-- Rodadas
insert into public.rodadas (id, fecha, titulo, ruta, km, lider_id) values
  ('22222222-2222-4222-8222-000000000001', current_date + 5, 'Rodada nocturna urbana', 'Castillo San Felipe · Bocagrande · Centro histórico', 25, '11111111-1111-4111-8111-000000000001'),
  ('22222222-2222-4222-8222-000000000002', current_date - 3, 'Rodada nocturna urbana', 'Castillo San Felipe · Bocagrande · Centro histórico', 25, '11111111-1111-4111-8111-000000000001'),
  ('22222222-2222-4222-8222-000000000003', current_date - 10, 'Mirador de Las Marías', 'Cartagena · Turbaco · Mirador de Las Marías', 62, '11111111-1111-4111-8111-000000000001'),
  ('22222222-2222-4222-8222-000000000004', current_date - 17, 'Desayuno en Turbaco', 'Av. Pedro de Heredia · Turbaco (ida y vuelta)', 48, '11111111-1111-4111-8111-000000000003'),
  ('22222222-2222-4222-8222-000000000005', current_date - 31, 'Playas de Barú', 'Cartagena · Pasacaballos · Playa Blanca, Barú', 110, '11111111-1111-4111-8111-000000000001'),
  ('22222222-2222-4222-8222-000000000006', current_date - 45, 'Viaje a Santa Marta', 'Cartagena · Barranquilla · Ciénaga · Santa Marta (ida y vuelta)', 470, '11111111-1111-4111-8111-000000000001'),
  ('22222222-2222-4222-8222-000000000007', current_date - 62, 'Rodada nocturna urbana', 'Manga · Crespo · Anillo vial', 30, '11111111-1111-4111-8111-000000000003'),
  ('22222222-2222-4222-8222-000000000008', current_date - 80, 'Turbaco – Arjona', 'Cartagena · Turbaco · Arjona (ida y vuelta)', 80, '11111111-1111-4111-8111-000000000001'),
  ('22222222-2222-4222-8222-000000000009', current_date - 120, 'Rodada de bienvenida', 'Muelle de La Bodeguita · Bocagrande · Castillogrande', 20, '11111111-1111-4111-8111-000000000001');
insert into public.rodada_asistentes (rodada_id, miembro_id) values
  ('22222222-2222-4222-8222-000000000002', '11111111-1111-4111-8111-000000000001'),
  ('22222222-2222-4222-8222-000000000002', '11111111-1111-4111-8111-000000000002'),
  ('22222222-2222-4222-8222-000000000002', '11111111-1111-4111-8111-000000000003'),
  ('22222222-2222-4222-8222-000000000002', '11111111-1111-4111-8111-000000000005'),
  ('22222222-2222-4222-8222-000000000002', '11111111-1111-4111-8111-000000000006'),
  ('22222222-2222-4222-8222-000000000002', '11111111-1111-4111-8111-000000000007'),
  ('22222222-2222-4222-8222-000000000003', '11111111-1111-4111-8111-000000000001'),
  ('22222222-2222-4222-8222-000000000003', '11111111-1111-4111-8111-000000000002'),
  ('22222222-2222-4222-8222-000000000003', '11111111-1111-4111-8111-000000000004'),
  ('22222222-2222-4222-8222-000000000003', '11111111-1111-4111-8111-000000000006'),
  ('22222222-2222-4222-8222-000000000004', '11111111-1111-4111-8111-000000000003'),
  ('22222222-2222-4222-8222-000000000004', '11111111-1111-4111-8111-000000000002'),
  ('22222222-2222-4222-8222-000000000004', '11111111-1111-4111-8111-000000000005'),
  ('22222222-2222-4222-8222-000000000004', '11111111-1111-4111-8111-000000000007'),
  ('22222222-2222-4222-8222-000000000004', '11111111-1111-4111-8111-000000000004'),
  ('22222222-2222-4222-8222-000000000005', '11111111-1111-4111-8111-000000000001'),
  ('22222222-2222-4222-8222-000000000005', '11111111-1111-4111-8111-000000000002'),
  ('22222222-2222-4222-8222-000000000005', '11111111-1111-4111-8111-000000000003'),
  ('22222222-2222-4222-8222-000000000005', '11111111-1111-4111-8111-000000000004'),
  ('22222222-2222-4222-8222-000000000005', '11111111-1111-4111-8111-000000000006'),
  ('22222222-2222-4222-8222-000000000006', '11111111-1111-4111-8111-000000000001'),
  ('22222222-2222-4222-8222-000000000006', '11111111-1111-4111-8111-000000000002'),
  ('22222222-2222-4222-8222-000000000006', '11111111-1111-4111-8111-000000000003'),
  ('22222222-2222-4222-8222-000000000006', '11111111-1111-4111-8111-000000000004'),
  ('22222222-2222-4222-8222-000000000007', '11111111-1111-4111-8111-000000000003'),
  ('22222222-2222-4222-8222-000000000007', '11111111-1111-4111-8111-000000000005'),
  ('22222222-2222-4222-8222-000000000007', '11111111-1111-4111-8111-000000000001'),
  ('22222222-2222-4222-8222-000000000008', '11111111-1111-4111-8111-000000000001'),
  ('22222222-2222-4222-8222-000000000008', '11111111-1111-4111-8111-000000000002'),
  ('22222222-2222-4222-8222-000000000008', '11111111-1111-4111-8111-000000000004'),
  ('22222222-2222-4222-8222-000000000008', '11111111-1111-4111-8111-000000000010'),
  ('22222222-2222-4222-8222-000000000009', '11111111-1111-4111-8111-000000000001'),
  ('22222222-2222-4222-8222-000000000009', '11111111-1111-4111-8111-000000000003'),
  ('22222222-2222-4222-8222-000000000009', '11111111-1111-4111-8111-000000000004'),
  ('22222222-2222-4222-8222-000000000009', '11111111-1111-4111-8111-000000000010'),
  ('22222222-2222-4222-8222-000000000009', '11111111-1111-4111-8111-000000000005');

-- Enlaza las fichas con cuentas de Supabase Auth que tengan el mismo correo.
-- Crea primero (Authentication > Users > Add user) lider@clubhunk.co, miembro@clubhunk.co
-- y admin@clubhunk.co, y vuelve a correr SOLO este bloque si las creaste después.
update public.miembros m
   set usuario_id = u.id
  from auth.users u
 where lower(u.email) = m.correo
   and m.usuario_id is null;

commit;
