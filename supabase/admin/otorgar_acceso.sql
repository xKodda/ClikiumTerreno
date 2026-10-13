-- ============================================================================
-- CLIKIUM TERRENO · Dar acceso a un usuario
-- 1. El usuario debe haber iniciado sesión al menos una vez (o créalo en
--    Authentication → Users → "Add user" / "Send invitation").
-- 2. Cambia el correo, el capataz y el rol abajo y ejecútalo en el SQL Editor.
-- ============================================================================

do $$
declare
  v_email      text := 'tu-correo@ejemplo.cl';   -- correo del usuario
  v_foreman_id text := 'christofer_godoy';       -- id en public.foremen, o null si no es capataz
  v_project_id text := 'tunel_lo_ruiz';
  v_role       text := 'admin';                  -- 'capataz' | 'supervisor' | 'admin'
  v_user_id    uuid;
begin
  select id into v_user_id from auth.users where lower(email) = lower(v_email);
  if v_user_id is null then
    raise exception 'No existe un usuario con el correo %. Invítalo primero en Authentication.', v_email;
  end if;

  if v_foreman_id is not null then
    update public.foremen set user_id = v_user_id where id = v_foreman_id;
    if not found then raise exception 'No existe el capataz %', v_foreman_id; end if;
  end if;

  insert into public.project_members (project_id, user_id, role)
  values (v_project_id, v_user_id, v_role)
  on conflict (project_id, user_id) do update set role = excluded.role;

  raise notice 'Acceso otorgado: % → % (%)', v_email, v_project_id, v_role;
end $$;
