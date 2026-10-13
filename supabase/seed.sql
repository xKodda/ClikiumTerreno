-- ============================================================================
-- CLIKIUM TERRENO · Catálogo inicial (desde public/catalogos.json)
-- Idempotente: se puede ejecutar varias veces.
-- ============================================================================

insert into public.projects (id, name) values
  ('tunel_lo_ruiz', 'Túnel Lo Ruiz')
on conflict (id) do nothing;

insert into public.foremen (id, name) values
  ('christofer_godoy', 'Christofer Godoy'),
  ('julio_gutierrez',  'Julio Gutiérrez'),
  ('eric_teatino',     'Eric Teatino'),
  ('cristian_puebla',  'Cristian Puebla'),
  ('ricardo_avalos',   'Ricardo Ávalos')
on conflict (id) do nothing;

insert into public.sectors (project_id, group_name, name, sort_order) values
  (null, 'Sección H1',     'Cepa 1',           1),
  (null, 'Sección H1',     'Cepa 2',           2),
  (null, 'Sección H1',     'Cepa 3',           3),
  (null, 'Sección H1',     'Cepa 4',           4),
  (null, 'Sección H1',     'Cepa 5',           5),
  (null, 'Sección H1',     'Cepa 3 poniente',  6),
  (null, 'Sección H1',     'Cepa 4 poniente',  7),
  (null, 'Ejes (con PK)',  'Eje 39',          10),
  (null, 'Ejes (con PK)',  'Eje 44',          11),
  (null, 'Ejes (con PK)',  'Eje 45',          12),
  (null, 'Ejes (con PK)',  'Eje 48',          13),
  (null, 'Ejes (con PK)',  'Eje 128',         14),
  (null, 'Estructura',     'Estribo salida',  20),
  (null, 'Estructura',     'Estribo entrada', 21),
  (null, 'Estructura',     'E-124',           22),
  (null, 'Otros',          'OA6',             30),
  (null, 'Otros',          'Muros TEM 9-10',  31),
  (null, 'Otros',          'Acopio cepa 4-5', 32),
  (null, 'Otros',          'Botadero',        33),
  (null, 'Otros',          'Otro',            34)
on conflict do nothing;

insert into public.catalog_workers (name, role) values
  ('Juan Calfulaf',    'M1'),
  ('Darwin Morales',   'M1'),
  ('Ruperto Soto',     'M1'),
  ('Juan Layten',      'M1'),
  ('Bastián Delgado',  'M1'),
  ('Esteban Coloma',   'M1'),
  ('César Luncumilla', 'Operador')
on conflict (name) do nothing;

insert into public.catalog_machines (name, operator) values
  ('Excavadora CAT 323 · I-36', 'César Luncumilla'),
  ('Bulldozer CAT D8T · I-86',  'Óscar Quiroz'),
  ('Camión Tolva · I-154',      'Donosor Díaz'),
  ('Rodillo 14T · I-59',        'Daniel Contreras')
on conflict (name) do nothing;
