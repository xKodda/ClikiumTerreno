-- Permite que un trabajador y una máquina tengan múltiples asignaciones en la misma jornada
-- (ejemplo: 3h en excavación, 2h en tubos, 4h en hormigonado = 9h normales).
drop index if exists public.crew_unique_person;

-- En lugar de restringir a 1 registro por persona al día, la unicidad se controla por persona y asignación
create unique index if not exists crew_unique_person_assignment
  on public.crew_entries (day_id, public.name_key(name), assignment);
