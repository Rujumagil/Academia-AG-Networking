-- ============================================================
-- ACADEMIA AG · UTAH DRIVER · YOUTUBE COMO FUENTE ÚNICA
-- Elimina URLs heredadas de Google Drive/Wix del curso y deja
-- la resolución de video exclusivamente al reproductor YouTube.
-- ============================================================

begin;

update public.lessons as l
set video_url = null,
    video_provider = 'youtube',
    updated_at = now()
from public.modules as m
where l.module_id = m.id
  and m.course_id = '11111111-1111-4111-8111-111111111111'::uuid;

commit;
