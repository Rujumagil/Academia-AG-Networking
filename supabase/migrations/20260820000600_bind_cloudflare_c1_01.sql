-- ============================================================
-- ACADEMIA AG · UTAH DRIVER V2
-- CONEXIÓN CLOUDFLARE STREAM · C1-01
-- Fecha: 2026-08-20
-- ============================================================

begin;

update public.lessons l
set
  video_url = null,
  stream_provider = 'cloudflare',
  stream_uid = 'fb0e5bf6bb1895fd021d7555d07ba034',
  stream_hls_url = 'https://customer-l4ebvl2tw1zhwagv.cloudflarestream.com/fb0e5bf6bb1895fd021d7555d07ba034/manifest/video.m3u8',
  stream_dash_url = 'https://customer-l4ebvl2tw1zhwagv.cloudflarestream.com/fb0e5bf6bb1895fd021d7555d07ba034/manifest/video.mpd',
  stream_thumbnail_url = null,
  stream_duration_seconds = null,
  updated_at = now()
where l.module_id = '7c4d9f60-1001-4b7b-9f2c-2d5e1a8c4001'::uuid
  and l.lesson_code = 'C1-01';

commit;

select
  l.lesson_code,
  l.title,
  l.lesson_kind,
  l.stream_provider,
  l.stream_uid,
  l.stream_hls_url,
  l.stream_dash_url,
  l.video_url
from public.lessons l
where l.module_id = '7c4d9f60-1001-4b7b-9f2c-2d5e1a8c4001'::uuid
  and l.lesson_code = 'C1-01';
