-- Elimina la lista cerrada de unidades en activities.unit para evitar bloqueos en sincronización.
alter table public.activities drop constraint if exists activities_unit_check;

alter table public.activities
  add constraint activities_unit_check
  check (length(trim(unit)) > 0);

