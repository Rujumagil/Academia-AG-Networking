-- ============================================================
-- ACADEMIA AG · PASO 19
-- PORTADA OFICIAL DEL PROGRAMA UTAH DRIVER DESDE WIX
-- ============================================================

begin;

update public.courses
set
  cover_url = 'https://static.wixstatic.com/media/11f124_5a9d6fd7f2054172943aab4260f3cfe7~mv2.png',
  cover_path = null,
  updated_at = now()
where id = '11111111-1111-4111-8111-111111111111';

commit;
