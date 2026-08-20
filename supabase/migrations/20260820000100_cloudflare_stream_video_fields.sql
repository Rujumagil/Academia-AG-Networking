-- ============================================================
-- ACADEMIA AG · CLOUDFLARE STREAM
-- Agrega soporte paralelo sin eliminar ni modificar video_url.
-- ============================================================

begin;

alter table public.lessons
  add column if not exists stream_provider text,
  add column if not exists stream_uid text,
  add column if not exists stream_hls_url text,
  add column if not exists stream_dash_url text,
  add column if not exists stream_thumbnail_url text,
  add column if not exists stream_duration_seconds integer;

alter table public.lessons drop constraint if exists lessons_stream_provider_check;
alter table public.lessons
  add constraint lessons_stream_provider_check
  check (stream_provider is null or stream_provider in ('cloudflare'));

create unique index if not exists lessons_stream_uid_unique_idx
  on public.lessons(stream_uid)
  where stream_uid is not null;

alter table public.lesson_progress
  add column if not exists last_position_seconds numeric(10,2) not null default 0,
  add column if not exists watch_percentage numeric(5,2) not null default 0,
  add column if not exists last_watched_at timestamptz;

commit;
