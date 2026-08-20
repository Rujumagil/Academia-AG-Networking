-- ============================================================
-- ACADEMIA AG · CLOUDFLARE STREAM · PRUEBA C1-01
-- Conecta únicamente Módulo 1 / Lección posición 1.
-- Mantiene video_url intacto como respaldo.
-- ============================================================

begin;

alter table public.lessons
  add column if not exists stream_provider text,
  add column if not exists stream_uid text,
  add column if not exists stream_hls_url text,
  add column if not exists stream_dash_url text,
  add column if not exists stream_thumbnail_url text,
  add column if not exists stream_duration_seconds integer;

alter table public.lesson_progress
  add column if not exists last_position_seconds numeric(10,2) not null default 0,
  add column if not exists watch_percentage numeric(5,2) not null default 0,
  add column if not exists last_watched_at timestamptz;

update public.lessons
set
  stream_provider = 'cloudflare',
  stream_uid = 'fb0e5bf6bb1895fd021d7555d07ba034',
  stream_hls_url = 'https://customer-l4ebvl2tw1zhwagv.cloudflarestream.com/fb0e5bf6bb1895fd021d7555d07ba034/manifest/video.m3u8',
  stream_dash_url = 'https://customer-l4ebvl2tw1zhwagv.cloudflarestream.com/fb0e5bf6bb1895fd021d7555d07ba034/manifest/video.mpd',
  stream_thumbnail_url = null,
  stream_duration_seconds = null
where module_id = '11111111-aaaa-4111-8111-111111111111'::uuid
  and position = 1;

commit;

-- Verificación opcional:
-- select id, title, position, stream_provider, stream_uid, stream_hls_url
-- from public.lessons
-- where module_id = '11111111-aaaa-4111-8111-111111111111'::uuid
--   and position = 1;
