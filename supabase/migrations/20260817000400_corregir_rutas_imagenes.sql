-- ACADEMIA AG — CORRECCIÓN DE RUTAS DE IMÁGENES
-- Ejecuta este archivo una sola vez en Supabase > SQL Editor.

begin;

update public.courses
set cover_url = regexp_replace(cover_url, '^/?assets/', '')
where cover_url like 'assets/%'
   or cover_url like '/assets/%';

update public.profiles
set avatar_url = regexp_replace(avatar_url, '^/?assets/', '')
where avatar_url like 'assets/%'
   or avatar_url like '/assets/%';

commit;
