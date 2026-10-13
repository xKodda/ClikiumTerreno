-- ============================================================================
-- CLIKIUM TERRENO · v03 · Esquema inicial Supabase
-- Reemplaza el JSON único de SQLite por tablas normalizadas.
-- Las reglas de validate() de server.py se trasladan a CHECK, triggers y RLS.
-- ============================================================================

create extension if not exists unaccent with schema extensions;

-- Normaliza nombres para comparar sin tildes ni mayúsculas (equivale a name_key en Python).
create or replace function public.name_key(value text)
returns text language sql immutable parallel safe
set search_path = public, extensions
as $$ select trim(lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(value, '')))) $$;

-- PK "1+210.50" → 1210.50 metros.
create or replace function public.pk_meters(value text)
returns numeric language sql immutable parallel safe
as $$ select split_part(value, '+', 1)::int * 1000 + split_part(value, '+', 2)::numeric $$;

create or replace function public.is_no_pk_sector(sector text)
returns boolean language sql immutable parallel safe
as $$ select lower(coalesce(sector, '')) like '%botadero%' or lower(coalesce(sector, '')) like '%acopio%' $$;

-- ----------------------------------------------------------------------------
-- Catálogos
-- ----------------------------------------------------------------------------
create table public.projects (
  id          text primary key check (id ~ '^[a-z0-9_-]{1,80}$'),
  name        text not null unique check (length(trim(name)) between 1 and 150),
  created_at  timestamptz not null default now()
);

create table public.foremen (
  id          text primary key check (id ~ '^[a-zA-Z0-9_-]{1,80}$'),
  name        text not null check (length(trim(name)) between 1 and 150),
  user_id     uuid unique references auth.users(id) on delete set null,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create unique index foremen_name_key on public.foremen (public.name_key(name));

create table public.project_members (
  project_id  text not null references public.projects(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null check (role in ('capataz', 'supervisor', 'admin')),
  created_at  timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table public.sectors (
  id          bigint generated always as identity primary key,
  project_id  text references public.projects(id) on delete cascade, -- null = todos los proyectos
  group_name  text not null,
  name        text not null check (name !~* '\meje\s+\d+(\s*[-–]\s*\d+)+'),
  sort_order  int not null default 0
);
create unique index sectors_unique on public.sectors (coalesce(project_id, ''), group_name, name);

create table public.catalog_workers (
  id          bigint generated always as identity primary key,
  name        text not null unique,
  role        text not null default ''
);

create table public.catalog_machines (
  id          bigint generated always as identity primary key,
  name        text not null unique,
  operator    text not null default ''
);

-- ----------------------------------------------------------------------------
-- Adjuntos (el archivo vive en Storage: bucket "media", ruta {project_id}/{id})
-- ----------------------------------------------------------------------------
create table public.media (
  id            text primary key default replace(gen_random_uuid()::text, '-', '') check (id ~ '^[a-zA-Z0-9_-]{1,80}$'),
  project_id    text not null references public.projects(id),
  name          text not null check (length(trim(name)) between 1 and 250),
  mime          text not null check (mime in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  size_bytes    int  not null check (size_bytes between 1 and 12582912),
  storage_path  text not null unique,
  created_at    timestamptz not null default now(),
  created_by    uuid default auth.uid() references auth.users(id),
  check (storage_path = project_id || '/' || id)
);

-- ----------------------------------------------------------------------------
-- Jornadas
-- ----------------------------------------------------------------------------
create table public.days (
  id            text primary key check (id ~ '^[a-zA-Z0-9_-]{1,80}$'),
  project_id    text not null references public.projects(id),
  foreman_id    text references public.foremen(id),          -- null solo en jornadas heredadas
  foreman_name  text not null check (length(trim(foreman_name)) between 1 and 150),
  date          date not null,
  started_at    timestamptz not null,
  closed_at     timestamptz,
  notes         text not null default '' check (length(notes) <= 5000),
  is_demo       boolean not null default false,
  created_by    uuid default auth.uid() references auth.users(id),
  check (closed_at is null or closed_at >= started_at - interval '1 day')
);
create unique index days_one_per_foreman
  on public.days (date, project_id, coalesce(foreman_id, public.name_key(foreman_name)));
create index days_project_date on public.days (project_id, date desc);

create table public.activities (
  id                 text primary key check (id ~ '^[a-zA-Z0-9_-]{1,80}$'),
  day_id             text not null references public.days(id) on delete cascade,
  activity           text not null check (length(trim(activity)) between 1 and 200),
  process            text not null check (length(trim(process)) between 1 and 200),
  sector             text not null check (length(trim(sector)) between 1 and 200
                                          and sector !~* '\meje\s+\d+(\s*[-–]\s*\d+)+'),
  stage              text not null check (stage in ('En curso', 'Terminado')),
  unit               text not null check (unit in ('m³', 'm lineales', 'tubos', 'capas', '%')),
  required_controls  text not null default 'both' check (required_controls in ('both', 'lab', 'top', 'none')),
  pk_start           text check (pk_start ~ '^\d{1,3}\+\d{3}(\.\d{1,2})?$'),
  pk_end             text check (pk_end   ~ '^\d{1,3}\+\d{3}(\.\d{1,2})?$'),
  layer              int not null default 0 check (layer between 0 and 500),
  layer_type         text check (length(layer_type) <= 100),
  quantity           numeric not null check (quantity >= 0 and quantity <= 1e9),
  mode               text not null check (mode in ('manual', 'trips')),
  trips              int not null default 0 check (trips between 0 and 100000),
  capacity           numeric not null default 22 check (capacity between 0.1 and 1000),
  description        text not null default '' check (length(description) <= 5000),
  notes              text not null default '' check (length(notes) <= 5000),
  is_annulled        boolean not null default false,
  annul_reason       text not null default '' check (length(annul_reason) <= 5000),
  annulled_at        timestamptz,
  created_at         timestamptz not null default now(),
  created_by         uuid default auth.uid() references auth.users(id),
  -- PK: ambos vacíos, ambos presentes, o sector sin PK (botadero/acopio).
  constraint activities_pk_presence check (
    public.is_no_pk_sector(sector) or (pk_start is null) = (pk_end is null)),
  constraint activities_pk_order check (
    pk_start is null or pk_end is null or public.pk_meters(pk_end) >= public.pk_meters(pk_start)),
  constraint activities_percent check (unit <> '%' or quantity <= 100),
  constraint activities_trips check (
    mode <> 'trips' or (unit = 'm³' and abs(quantity - trips * capacity) <= 0.001)),
  constraint activities_annul check (not is_annulled or length(trim(annul_reason)) > 0)
);
create index activities_day on public.activities (day_id);
create index activities_sector on public.activities (sector, layer);

create table public.controls (
  id             text primary key check (id ~ '^[a-zA-Z0-9_-]{1,80}$'),
  activity_id    text not null references public.activities(id) on delete cascade,
  type           text not null check (type in ('Laboratorio', 'Topografía', 'General')),
  status         text not null check (status in ('Control pendiente', 'Rechazado', 'Aprobado', 'Anulado', 'Registro completo')),
  author         text not null check (length(trim(author)) between 1 and 150),
  note           text not null default '' check (length(note) <= 5000),
  at             timestamptz not null default now(),
  attachment_id  text references public.media(id),
  created_by     uuid default auth.uid() references auth.users(id)
);
create index controls_activity on public.controls (activity_id, at);

create table public.activity_photos (
  activity_id  text not null references public.activities(id) on delete cascade,
  media_id     text not null references public.media(id),
  position     int not null default 0,
  primary key (activity_id, media_id)
);

create table public.crew_entries (
  id          text primary key check (id ~ '^[a-zA-Z0-9_-]{1,80}$'),
  day_id      text not null references public.days(id) on delete cascade,
  name        text not null check (length(trim(name)) between 1 and 150),
  role        text not null check (length(trim(role)) between 1 and 100),
  assignment  text not null default '' check (length(assignment) <= 300),
  hours       numeric not null check (hours between 0 and 24),
  extra       numeric not null default 0 check (extra between 0 and 24),
  check (hours + extra <= 24)
);
create unique index crew_unique_person on public.crew_entries (day_id, public.name_key(name));

create table public.machine_entries (
  id          text primary key check (id ~ '^[a-zA-Z0-9_-]{1,80}$'),
  day_id      text not null references public.days(id) on delete cascade,
  name        text not null check (length(trim(name)) between 1 and 150),
  operator    text not null default '' check (length(operator) <= 150),
  assignment  text not null default '' check (length(assignment) <= 300),
  hours       numeric not null check (hours between 0 and 24),
  standby     numeric not null default 0 check (standby between 0 and 24),
  check (hours + standby <= 24)
);

-- ============================================================================
-- Reglas de integridad (antes en validate())
-- ============================================================================

-- Una jornada solo se borra si es de ejemplo. En cascada, el padre ya no existe.
create or replace function public.day_is_deletable(p_day_id text)
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce((select is_demo from public.days where id = p_day_id), true) $$;

create or replace function public.day_is_closed(p_day_id text)
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce((select closed_at is not null from public.days where id = p_day_id), false) $$;

-- Jornadas: origen inmutable, cerrada = congelada, sin borrado salvo demo.
create or replace function public.trg_days_guard()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if not old.is_demo then
      raise exception 'No se permite eliminar jornadas registradas.' using errcode = 'P0001';
    end if;
    return old;
  end if;
  if (new.date, new.project_id, new.foreman_id, new.foreman_name, new.started_at, new.is_demo, new.created_by)
     is distinct from
     (old.date, old.project_id, old.foreman_id, old.foreman_name, old.started_at, old.is_demo, old.created_by) then
    raise exception 'No se pueden cambiar los datos de origen de una jornada.' using errcode = 'P0001';
  end if;
  if old.closed_at is not null then
    raise exception 'Una jornada cerrada solo admite nuevos controles.' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger days_guard before update or delete on public.days
  for each row execute function public.trg_days_guard();

-- Al crear una jornada: el capataz debe estar en el catálogo con su nombre exacto.
create or replace function public.trg_days_foreman()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_demo then return new; end if;
  if new.foreman_id is null or not exists (
       select 1 from public.foremen f where f.id = new.foreman_id and f.name = new.foreman_name) then
    raise exception 'La jornada debe pertenecer a un capataz registrado.' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger days_foreman before insert on public.days
  for each row execute function public.trg_days_foreman();

-- Actividades: no se borran; en jornada cerrada solo se permite En curso → Terminado.
create or replace function public.trg_activities_guard()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if not public.day_is_deletable(old.day_id) then
      raise exception 'No se permite eliminar actividades registradas.' using errcode = 'P0001';
    end if;
    return old;
  end if;
  if tg_op = 'INSERT' then
    if public.day_is_closed(new.day_id) then
      raise exception 'Una jornada cerrada solo admite nuevos controles.' using errcode = 'P0001';
    end if;
    return new;
  end if;
  if (new.id, new.day_id, new.created_at, new.created_by) is distinct from (old.id, old.day_id, old.created_at, old.created_by) then
    raise exception 'No se pueden cambiar los datos de origen de una actividad.' using errcode = 'P0001';
  end if;
  if public.day_is_closed(old.day_id) then
    if not (old.stage = 'En curso' and new.stage = 'Terminado'
            and (to_jsonb(new) - 'stage') = (to_jsonb(old) - 'stage')) then
      raise exception 'Una jornada cerrada solo admite nuevos controles.' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;
create trigger activities_guard before insert or update or delete on public.activities
  for each row execute function public.trg_activities_guard();

-- Controles: historial de eventos, solo se agregan.
create or replace function public.trg_controls_append_only()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if public.day_is_deletable((select day_id from public.activities where id = old.activity_id)) then
      return old;
    end if;
    raise exception 'El historial de controles no se puede eliminar.' using errcode = 'P0001';
  end if;
  raise exception 'El historial de controles no se puede sobrescribir.' using errcode = 'P0001';
end $$;
create trigger controls_append_only before update or delete on public.controls
  for each row execute function public.trg_controls_append_only();

-- Recursos y fotos: congelados cuando la jornada está cerrada.
create or replace function public.trg_day_child_frozen()
returns trigger language plpgsql as $$
declare
  v_day text;
begin
  if tg_table_name = 'activity_photos' then
    v_day := (select day_id from public.activities
              where id = case when tg_op = 'DELETE' then old.activity_id else new.activity_id end);
  else
    v_day := case when tg_op = 'DELETE' then old.day_id else new.day_id end;
  end if;
  if public.day_is_closed(v_day) then
    raise exception 'Una jornada cerrada solo admite nuevos controles.' using errcode = 'P0001';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
create trigger crew_frozen before insert or update or delete on public.crew_entries
  for each row execute function public.trg_day_child_frozen();
create trigger machines_frozen before insert or update or delete on public.machine_entries
  for each row execute function public.trg_day_child_frozen();
create trigger photos_frozen before insert or update or delete on public.activity_photos
  for each row execute function public.trg_day_child_frozen();

-- Adjuntos: inmutables.
create or replace function public.trg_media_immutable()
returns trigger language plpgsql as $$
begin
  raise exception 'Los adjuntos no se pueden modificar ni eliminar.' using errcode = 'P0001';
end $$;
create trigger media_immutable before update or delete on public.media
  for each row execute function public.trg_media_immutable();

-- ============================================================================
-- Seguridad: Row Level Security
-- ============================================================================

create or replace function public.member_role(p_project_id text)
returns text language sql stable security definer set search_path = public
as $$ select role from public.project_members where project_id = p_project_id and user_id = auth.uid() $$;

create or replace function public.current_foreman_id()
returns text language sql stable security definer set search_path = public
as $$ select id from public.foremen where user_id = auth.uid() $$;

-- Puede leer la jornada: cualquier miembro del proyecto.
create or replace function public.can_read_day(p_day_id text)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.days d
                     where d.id = p_day_id and public.member_role(d.project_id) is not null) $$;

-- Puede editar la jornada: su capataz o un admin del proyecto.
create or replace function public.can_write_day(p_day_id text)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.days d
                     where d.id = p_day_id
                       and (public.member_role(d.project_id) = 'admin'
                            or (public.member_role(d.project_id) = 'capataz'
                                and d.foreman_id = public.current_foreman_id())
                            or (d.is_demo and d.created_by = auth.uid()))) $$;

-- Puede agregar controles: quien edita la jornada o un supervisor del proyecto.
create or replace function public.can_add_control(p_activity_id text)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.activities a join public.days d on d.id = a.day_id
                     where a.id = p_activity_id
                       and (public.can_write_day(d.id) or public.member_role(d.project_id) = 'supervisor')) $$;

alter table public.projects         enable row level security;
alter table public.foremen          enable row level security;
alter table public.project_members  enable row level security;
alter table public.sectors          enable row level security;
alter table public.catalog_workers  enable row level security;
alter table public.catalog_machines enable row level security;
alter table public.media            enable row level security;
alter table public.days             enable row level security;
alter table public.activities       enable row level security;
alter table public.controls         enable row level security;
alter table public.activity_photos  enable row level security;
alter table public.crew_entries     enable row level security;
alter table public.machine_entries  enable row level security;

-- Catálogos: lectura para usuarios autenticados; escritura desde el panel (service role).
create policy projects_read on public.projects for select to authenticated
  using (public.member_role(id) is not null);
create policy foremen_read on public.foremen for select to authenticated using (true);
create policy members_read on public.project_members for select to authenticated
  using (user_id = auth.uid() or public.member_role(project_id) = 'admin');
create policy sectors_read on public.sectors for select to authenticated using (true);
create policy workers_read on public.catalog_workers for select to authenticated using (true);
create policy machines_cat_read on public.catalog_machines for select to authenticated using (true);

-- Adjuntos
create policy media_read on public.media for select to authenticated
  using (public.member_role(project_id) is not null);
create policy media_insert on public.media for insert to authenticated
  with check (public.member_role(project_id) is not null and created_by = auth.uid());

-- Jornadas
create policy days_read on public.days for select to authenticated
  using (public.member_role(project_id) is not null);
create policy days_insert on public.days for insert to authenticated
  with check (created_by = auth.uid() and (
    public.member_role(project_id) = 'admin'
    or (public.member_role(project_id) = 'capataz' and foreman_id = public.current_foreman_id())
    or (is_demo and public.member_role(project_id) is not null)));
create policy days_update on public.days for update to authenticated
  using (public.can_write_day(id) or (is_demo and created_by = auth.uid()))
  with check (public.can_write_day(id) or (is_demo and created_by = auth.uid()));
create policy days_delete_demo on public.days for delete to authenticated
  using (is_demo and (created_by = auth.uid() or public.member_role(project_id) = 'admin'));

-- Actividades
create policy activities_read on public.activities for select to authenticated
  using (public.can_read_day(day_id));
create policy activities_insert on public.activities for insert to authenticated
  with check (public.can_write_day(day_id) and created_by = auth.uid());
create policy activities_update on public.activities for update to authenticated
  using (public.can_write_day(day_id)) with check (public.can_write_day(day_id));

-- Controles (solo lectura e inserción)
create policy controls_read on public.controls for select to authenticated
  using (public.can_read_day((select day_id from public.activities where id = activity_id)));
create policy controls_insert on public.controls for insert to authenticated
  with check (public.can_add_control(activity_id) and created_by = auth.uid());

-- Fotos de actividad
create policy photos_read on public.activity_photos for select to authenticated
  using (public.can_read_day((select day_id from public.activities where id = activity_id)));
create policy photos_write on public.activity_photos for all to authenticated
  using (public.can_write_day((select day_id from public.activities where id = activity_id)))
  with check (public.can_write_day((select day_id from public.activities where id = activity_id)));

-- Personal y maquinaria
create policy crew_read on public.crew_entries for select to authenticated using (public.can_read_day(day_id));
create policy crew_write on public.crew_entries for all to authenticated
  using (public.can_write_day(day_id)) with check (public.can_write_day(day_id));
create policy machine_read on public.machine_entries for select to authenticated using (public.can_read_day(day_id));
create policy machine_write on public.machine_entries for all to authenticated
  using (public.can_write_day(day_id)) with check (public.can_write_day(day_id));

-- Sin acceso anónimo a ninguna tabla.
revoke all on all tables in schema public from anon;

-- ============================================================================
-- Storage: bucket privado "media", ruta {project_id}/{media_id}
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', false, 12582912,
        array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create policy media_objects_read on storage.objects for select to authenticated
  using (bucket_id = 'media' and public.member_role((storage.foldername(name))[1]) is not null);
create policy media_objects_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.member_role((storage.foldername(name))[1]) is not null);
-- Sin políticas de UPDATE/DELETE: los archivos subidos son inmutables para los usuarios.
