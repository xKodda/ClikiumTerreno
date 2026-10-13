# Supabase · Puesta en marcha (v03)

## 1. Aplicar el esquema

En tu proyecto de Supabase → **SQL Editor** → *New query*, ejecuta en este orden:

1. [`supabase/migrations/20261007000001_init.sql`](../supabase/migrations/20261007000001_init.sql): tablas, reglas y seguridad.
2. [`supabase/seed.sql`](../supabase/seed.sql): proyecto, capataces, sectores, trabajadores y maquinaria.

> Alternativa con CLI: `npx supabase login`, `npx supabase link --project-ref TU_REF`, `npx supabase db push`.

## 2. Activar el inicio de sesión por código

**Authentication → Sign In / Providers → Email**: habilitado, *Confirm email* activo.
En **Authentication → Emails → Magic Link**, incluye `{{ .Token }}` en la plantilla para que llegue el código de 6 dígitos.

## 3. Dar acceso a cada persona

1. **Authentication → Users → Invite user** con su correo.
2. Edita y ejecuta [`supabase/admin/otorgar_acceso.sql`](../supabase/admin/otorgar_acceso.sql) (correo, capataz, rol).

| Rol | Puede |
| --- | --- |
| `capataz` | Crear y editar **sus** jornadas; agregar controles a ellas |
| `supervisor` | Ver todas las jornadas del proyecto; agregar controles |
| `admin` | Todo lo anterior en cualquier jornada del proyecto |

## 4. Variables locales

Crea `.env.local` en la raíz (no se sube a git):

```env
VITE_SUPABASE_URL=https://TU_REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

La **service_role key** solo se usará para la migración de datos, como variable de entorno temporal. Nunca en el frontend ni en el repositorio.

## Reglas que ahora garantiza la base de datos

| Regla (antes en `server.py`) | Dónde vive ahora |
| --- | --- |
| Formato PK, PK final ≥ inicial, ejes sin guion | `CHECK` en `activities` |
| Volumen = viajes × capacidad, % ≤ 100, horas ≤ 24 | `CHECK` |
| Una jornada por fecha, proyecto y capataz | índice único `days_one_per_foreman` |
| Capataz debe existir en el catálogo | trigger `days_foreman` |
| Datos de origen de la jornada inmutables | trigger `days_guard` |
| No borrar jornadas ni actividades (salvo ejemplo) | triggers + sin política DELETE |
| Controles solo se agregan | trigger `controls_append_only` |
| Jornada cerrada: solo nuevos controles y En curso → Terminado | triggers `*_guard` / `*_frozen` |
| Adjuntos inmutables | trigger `media_immutable` + Storage sin UPDATE/DELETE |
| Acceso por proyecto y rol | RLS |
