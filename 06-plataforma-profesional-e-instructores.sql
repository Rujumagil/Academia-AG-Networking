-- ============================================================
-- ACADEMIA AG — PLATAFORMA PROFESIONAL E INSTRUCTORES
-- Ejecuta después de 05-acceso-privado-libros-y-roles.sql.
-- ============================================================

begin;

-- Información comercial y académica para presentar mejor cada curso.
alter table public.courses add column if not exists instructor_name text;
alter table public.courses add column if not exists duration_label text;
alter table public.courses add column if not exists price numeric(10,2);
alter table public.courses add column if not exists sale_price numeric(10,2);
alter table public.courses add column if not exists payment_url text;

update public.courses
set
  instructor_name = coalesce(instructor_name, 'Equipo AG Business Networking'),
  duration_label = coalesce(duration_label, 'Curso en línea · Manuales · Evaluaciones'),
  price = price,
  sale_price = sale_price,
  payment_url = payment_url
where id = '11111111-1111-4111-8111-111111111111';

-- Los instructores ven y administran únicamente los cursos que crearon.
drop policy if exists instructor_courses_select on public.courses;
create policy instructor_courses_select
on public.courses
for select
to authenticated
using (
  created_by = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'instructor'
  )
);

drop policy if exists instructor_courses_insert on public.courses;
create policy instructor_courses_insert
on public.courses
for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'instructor'
  )
);

drop policy if exists instructor_courses_update on public.courses;
create policy instructor_courses_update
on public.courses
for update
to authenticated
using ((select private.can_manage_course(id)))
with check ((select private.can_manage_course(id)));

drop policy if exists instructor_courses_delete on public.courses;
create policy instructor_courses_delete
on public.courses
for delete
to authenticated
using ((select private.can_manage_course(id)));

-- Módulos de cursos propios.
drop policy if exists instructor_modules_select on public.modules;
create policy instructor_modules_select
on public.modules
for select
to authenticated
using ((select private.can_manage_course(course_id)));

drop policy if exists instructor_modules_insert on public.modules;
create policy instructor_modules_insert
on public.modules
for insert
to authenticated
with check ((select private.can_manage_course(course_id)));

drop policy if exists instructor_modules_update on public.modules;
create policy instructor_modules_update
on public.modules
for update
to authenticated
using ((select private.can_manage_course(course_id)))
with check ((select private.can_manage_course(course_id)));

drop policy if exists instructor_modules_delete on public.modules;
create policy instructor_modules_delete
on public.modules
for delete
to authenticated
using ((select private.can_manage_course(course_id)));

-- Lecciones pertenecientes a cursos administrados por el instructor.
drop policy if exists instructor_lessons_select on public.lessons;
create policy instructor_lessons_select
on public.lessons
for select
to authenticated
using (
  exists (
    select 1
    from public.modules m
    where m.id = module_id
      and (select private.can_manage_course(m.course_id))
  )
);

drop policy if exists instructor_lessons_insert on public.lessons;
create policy instructor_lessons_insert
on public.lessons
for insert
to authenticated
with check (
  exists (
    select 1
    from public.modules m
    where m.id = module_id
      and (select private.can_manage_course(m.course_id))
  )
);

drop policy if exists instructor_lessons_update on public.lessons;
create policy instructor_lessons_update
on public.lessons
for update
to authenticated
using (
  exists (
    select 1
    from public.modules m
    where m.id = module_id
      and (select private.can_manage_course(m.course_id))
  )
)
with check (
  exists (
    select 1
    from public.modules m
    where m.id = module_id
      and (select private.can_manage_course(m.course_id))
  )
);

drop policy if exists instructor_lessons_delete on public.lessons;
create policy instructor_lessons_delete
on public.lessons
for delete
to authenticated
using (
  exists (
    select 1
    from public.modules m
    where m.id = module_id
      and (select private.can_manage_course(m.course_id))
  )
);

commit;
