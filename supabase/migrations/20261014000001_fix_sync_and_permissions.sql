-- ============================================================================
-- CLIKIUM TERRENO · Migración v04: Permisos RLS flexibles y Re-apertura de jornadas
-- Ejecuta este script en Supabase -> SQL Editor para actualizar políticas y triggers.
-- ============================================================================

-- 1. Permitir que cualquier miembro del proyecto (o creador) pueda escribir en la jornada
create or replace function public.can_write_day(p_day_id text)
returns boolean language sql stable security definer set search_path = public
as $$ 
  select exists (
    select 1 from public.days d
    where d.id = p_day_id
      and (
        public.member_role(d.project_id) in ('admin', 'capataz', 'supervisor')
        or d.created_by = auth.uid()
        or (d.is_demo and d.created_by = auth.uid())
      )
  ) 
$$;

-- 2. Actualizar políticas de Actividades (lectura, inserción y actualización limpias)
drop policy if exists activities_insert on public.activities;
create policy activities_insert on public.activities for insert to authenticated
  with check (public.can_write_day(day_id));

drop policy if exists activities_update on public.activities;
create policy activities_update on public.activities for update to authenticated
  using (public.can_write_day(day_id)) with check (public.can_write_day(day_id));

drop policy if exists activities_read on public.activities;
create policy activities_read on public.activities for select to authenticated
  using (public.can_read_day(day_id));

-- 3. Actualizar políticas de Jornadas
drop policy if exists days_insert on public.days;
create policy days_insert on public.days for insert to authenticated
  with check (
    public.member_role(project_id) in ('admin', 'capataz', 'supervisor') 
    or is_demo
  );

drop policy if exists days_update on public.days;
create policy days_update on public.days for update to authenticated
  using (public.can_write_day(id)) with check (public.can_write_day(id));

-- 4. Trigger de Jornadas: permitir reabrir la jornada (closed_at = null)
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
  -- Permite reabrir la jornada si closed_at se vuelve a dejar en null
  if old.closed_at is not null and new.closed_at is not null and old.closed_at is distinct from new.closed_at then
    raise exception 'No se puede modificar una jornada cerrada salvo para reabrirla.' using errcode = 'P0001';
  end if;
  return new;
end $$;

-- 5. Trigger de Actividades: mensaje claro si la jornada está cerrada
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
      raise exception 'La jornada está cerrada. Reabre la jornada en la app para agregar más avances.' using errcode = 'P0001';
    end if;
    return new;
  end if;
  if (new.id, new.day_id, new.created_at, new.created_by) is distinct from (old.id, old.day_id, old.created_at, old.created_by) then
    raise exception 'No se pueden cambiar los datos de origen de una actividad.' using errcode = 'P0001';
  end if;
  return new;
end $$;
