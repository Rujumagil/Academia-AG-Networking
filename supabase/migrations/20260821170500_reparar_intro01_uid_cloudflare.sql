-- Academia AG · Utah Driver Success Program V2
-- Reparación INTRO-01 con UID confirmado manualmente en Cloudflare.
-- El reproductor v56 acepta Stream por UID aun cuando falten manifests guardados.

begin;

update public.lessons
set
  video_url = null,
  stream_provider = 'cloudflare',
  stream_uid = 'c48240b91b7be5b831af4da77193a672',
  stream_hls_url = null,
  stream_dash_url = null,
  updated_at = now()
where module_id = '7c4d9f60-0000-4b7b-9f2c-2d5e1a8c4001'::uuid
  and lesson_code = 'INTRO-01';

commit;

select
  lesson_code,
  title,
  stream_provider,
  stream_uid,
  stream_hls_url,
  stream_dash_url,
  stream_duration_seconds
from public.lessons
where module_id = '7c4d9f60-0000-4b7b-9f2c-2d5e1a8c4001'::uuid
  and lesson_code = 'INTRO-01';
