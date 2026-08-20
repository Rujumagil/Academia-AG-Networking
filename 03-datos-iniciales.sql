-- ============================================================
-- ACADEMIA AG — DATOS INICIALES LIMPIOS
-- Ejecutar después de 02-parche-seguridad-y-permisos.sql.
-- Utah Driver Success Program™ se reconstruirá desde cero en una migración nueva.
-- ============================================================
begin;

insert into public.courses
(id,title,slug,subtitle,description,cover_url,category,status,featured,instructor_name,duration_label)
values
('22222222-2222-4222-8222-222222222222','Emprende en Utah','emprende-en-utah','Ordena tu idea y construye una base empresarial más profesional.','Ruta práctica para emprendedores y pequeños negocios que buscan estructura, proveedores y acompañamiento.','curso-emprende-utah.webp','Negocios','draft',false,'Equipo AG Business Networking','Ruta práctica'),
('33333333-3333-4333-8333-333333333333','Finanzas para Emprendedores','finanzas-para-emprendedores','Toma decisiones con números claros.','Curso introductorio de presupuesto, costos, control de gastos, flujo de efectivo y hábitos financieros empresariales.','curso-finanzas.webp','Finanzas','draft',false,'Equipo AG Business Networking','Curso práctico'),
('44444444-4444-4444-8444-444444444444','Marketing y Presencia Digital','marketing-y-presencia-digital','Comunica mejor el valor de tu negocio.','Bases de marca, mensaje, contenido y presencia digital para pequeños negocios y emprendedores.','curso-marketing.webp','Marketing','draft',false,'Equipo AG Business Networking','Curso práctico'),
('55555555-5555-4555-8555-555555555555','Inglés Práctico para la Vida y el Trabajo','ingles-practico-vida-trabajo','Comunícate con mayor seguridad en situaciones cotidianas.','Programa introductorio de vocabulario y comunicación útil para la vida diaria y el trabajo en Estados Unidos.','curso-ingles.webp','Vida en Utah','draft',false,'Equipo AG Business Networking','Próximamente')
on conflict (id) do update set title=excluded.title,subtitle=excluded.subtitle,description=excluded.description,cover_url=excluded.cover_url,category=excluded.category,status=excluded.status,featured=excluded.featured,instructor_name=excluded.instructor_name,duration_label=excluded.duration_label;

update public.courses
set created_by = (select id from public.profiles where role='admin' and account_status='active' order by created_at asc limit 1)
where created_by is null
  and id in (
    '22222222-2222-4222-8222-222222222222',
    '33333333-3333-4333-8333-333333333333',
    '44444444-4444-4444-8444-444444444444',
    '55555555-5555-4555-8555-555555555555'
  );

insert into public.modules(id,course_id,title,position) values
('22222222-aaaa-4222-8222-222222222222','22222222-2222-4222-8222-222222222222','De idea a propuesta',1),
('22222222-bbbb-4222-8222-222222222222','22222222-2222-4222-8222-222222222222','Operación y red de apoyo',2),
('33333333-aaaa-4333-8333-333333333333','33333333-3333-4333-8333-333333333333','Orden financiero',1),
('44444444-aaaa-4444-8444-444444444444','44444444-4444-4444-8444-444444444444','Presencia profesional',1)
on conflict (id) do update set course_id=excluded.course_id,title=excluded.title,position=excluded.position;

insert into public.lessons(id,module_id,title,lesson_type,duration_minutes,position,content_html) values
('22222222-0001-4222-8222-222222222222','22222222-aaaa-4222-8222-222222222222','Define el problema que quieres resolver','video',14,1,'<h2>Comienza con claridad</h2><p>Una propuesta fuerte parte de una necesidad concreta y un cliente bien definido.</p>'),
('22222222-0002-4222-8222-222222222222','22222222-bbbb-4222-8222-222222222222','Construye tu red de proveedores','video',16,1,'<h2>No tienes que hacerlo todo solo</h2><p>Identifica qué servicios puedes resolver con aliados confiables.</p>'),
('33333333-0001-4333-8333-333333333333','33333333-aaaa-4333-8333-333333333333','Presupuesto básico de negocio','video',15,1,'<h2>Control antes de crecer</h2><p>Ordena ingresos, gastos y decisiones con un presupuesto simple.</p>'),
('44444444-0001-4444-8444-444444444444','44444444-aaaa-4444-8444-444444444444','Tu mensaje de negocio','video',15,1,'<h2>Explica tu valor con claridad</h2><p>Define una forma sencilla de explicar a quién ayudas y cómo.</p>')
on conflict (id) do update set module_id=excluded.module_id,title=excluded.title,lesson_type=excluded.lesson_type,duration_minutes=excluded.duration_minutes,position=excluded.position,content_html=excluded.content_html;

insert into public.resources(id,course_id,title,resource_type,external_url,is_public,thumbnail_url) values
('aaaaaaaa-0002-4000-8000-aaaaaaaaaaaa',null,'Manual del Alumno · Academia AG','pdf',null,true,'recurso-manual-ag.webp')
on conflict (id) do update set course_id=excluded.course_id,title=excluded.title,resource_type=excluded.resource_type,external_url=excluded.external_url,is_public=excluded.is_public,thumbnail_url=excluded.thumbnail_url;

update public.resources
set created_by = (select id from public.profiles where role='admin' and account_status='active' order by created_at asc limit 1)
where created_by is null and id = 'aaaaaaaa-0002-4000-8000-aaaaaaaaaaaa';

commit;
