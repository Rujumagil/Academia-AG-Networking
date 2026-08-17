-- ============================================================
-- ACADEMIA AG — DATOS INICIALES
-- Ejecutar después de 02-parche-seguridad-y-permisos.sql.
-- Puede ejecutarse de nuevo sin duplicar registros.
-- ============================================================
begin;

insert into public.courses
(id,title,slug,subtitle,description,cover_url,category,status,featured,instructor_name,duration_label)
values
('11111111-1111-4111-8111-111111111111','Utah Driver Success Program™','utah-driver-success-program','Conoce las reglas, prepárate y conduce con mayor seguridad.','Programa de formación para estudiar normas de tránsito, señales, seguridad vial, preparación del vehículo y responsabilidades del conductor en Utah.','curso-utah-driver.webp','Vida en Utah','published',true,'Equipo AG Business Networking','6 clases · evaluaciones · manuales'),
('22222222-2222-4222-8222-222222222222','Emprende en Utah','emprende-en-utah','Ordena tu idea y construye una base empresarial más profesional.','Ruta práctica para emprendedores y pequeños negocios que buscan estructura, proveedores y acompañamiento.','curso-emprende-utah.webp','Negocios','draft',false,'Equipo AG Business Networking','Ruta práctica'),
('33333333-3333-4333-8333-333333333333','Finanzas para Emprendedores','finanzas-para-emprendedores','Toma decisiones con números claros.','Curso introductorio de presupuesto, costos, control de gastos, flujo de efectivo y hábitos financieros empresariales.','curso-finanzas.webp','Finanzas','draft',false,'Equipo AG Business Networking','Curso práctico'),
('44444444-4444-4444-8444-444444444444','Marketing y Presencia Digital','marketing-y-presencia-digital','Comunica mejor el valor de tu negocio.','Bases de marca, mensaje, contenido y presencia digital para pequeños negocios y emprendedores.','curso-marketing.webp','Marketing','draft',false,'Equipo AG Business Networking','Curso práctico'),
('55555555-5555-4555-8555-555555555555','Inglés Práctico para la Vida y el Trabajo','ingles-practico-vida-trabajo','Comunícate con mayor seguridad en situaciones cotidianas.','Programa introductorio de vocabulario y comunicación útil para la vida diaria y el trabajo en Estados Unidos.','curso-ingles.webp','Vida en Utah','draft',false,'Equipo AG Business Networking','Próximamente')
on conflict (id) do update set title=excluded.title,subtitle=excluded.subtitle,description=excluded.description,cover_url=excluded.cover_url,category=excluded.category,status=excluded.status,featured=excluded.featured,instructor_name=excluded.instructor_name,duration_label=excluded.duration_label;

-- La cuenta administradora creada en el paso 02 queda como propietaria inicial
-- del contenido precargado. Después puede asignar instructores desde el panel.
update public.courses
set created_by = (select id from public.profiles where role='admin' and account_status='active' order by created_at asc limit 1)
where created_by is null
  and id in (
    '11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222',
    '33333333-3333-4333-8333-333333333333','44444444-4444-4444-8444-444444444444',
    '55555555-5555-4555-8555-555555555555'
  );

insert into public.modules(id,course_id,title,position) values
('11111111-aaaa-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','Licencias, permisos y documentación',1),
('11111111-bbbb-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','Salud, exámenes y preparación del vehículo',2),
('11111111-cccc-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','Manejo básico',3),
('11111111-dddd-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','Reglas del camino y señales',4),
('11111111-eeee-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','Alcohol, drogas y retos al manejar',5),
('11111111-ffff-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','Emergencias, compartir el camino y tu récord',6),
('22222222-aaaa-4222-8222-222222222222','22222222-2222-4222-8222-222222222222','De idea a propuesta',1),
('22222222-bbbb-4222-8222-222222222222','22222222-2222-4222-8222-222222222222','Operación y red de apoyo',2),
('33333333-aaaa-4333-8333-333333333333','33333333-3333-4333-8333-333333333333','Orden financiero',1),
('44444444-aaaa-4444-8444-444444444444','44444444-4444-4444-8444-444444444444','Presencia profesional',1)
on conflict (id) do update set course_id=excluded.course_id,title=excluded.title,position=excluded.position;

insert into public.lessons(id,module_id,title,lesson_type,duration_minutes,position,content_html) values
('11111111-0001-4111-8111-111111111111','11111111-aaaa-4111-8111-111111111111','¿Quién necesita licencia en Utah?','video',12,1,'<h2>Licencias y responsabilidad</h2><p>Revisa el propósito de la licencia y la importancia de conducir con la documentación correspondiente.</p>'),
('11111111-0002-4111-8111-111111111111','11111111-aaaa-4111-8111-111111111111','Learner Permit y tipos de licencia','video',15,2,'<h2>Permisos y licencias</h2><p>Conoce las categorías y restricciones que se estudiarán dentro del programa.</p>'),
('11111111-0003-4111-8111-111111111111','11111111-bbbb-4111-8111-111111111111','Exámenes y preparación del vehículo','video',17,1,'<h2>Prepararte antes de conducir</h2><p>Repasa visión, conocimiento, prueba de manejo, asiento, espejos y cinturón.</p>'),
('11111111-0004-4111-8111-111111111111','11111111-cccc-4111-8111-111111111111','Arranque, reversa y cambios de carril','video',18,1,'<h2>Manejo básico</h2><p>Practica los principios fundamentales para moverte de forma predecible y segura.</p>'),
('11111111-0005-4111-8111-111111111111','11111111-dddd-4111-8111-111111111111','Reglas del camino y señales','video',20,1,'<h2>Leer el camino</h2><p>Reconoce señales, prioridades y reglas esenciales de circulación.</p>'),
('11111111-0006-4111-8111-111111111111','11111111-eeee-4111-8111-111111111111','Alcohol, drogas y conducción','video',18,1,'<h2>Decisiones responsables</h2><p>Analiza los riesgos asociados con sustancias y otras condiciones que afectan la conducción.</p>'),
('11111111-0007-4111-8111-111111111111','11111111-ffff-4111-8111-111111111111','Emergencias y compartir el camino','video',20,1,'<h2>Responder y convivir</h2><p>Prepárate para emergencias y para compartir la vía con distintos usuarios.</p>'),
('22222222-0001-4222-8222-222222222222','22222222-aaaa-4222-8222-222222222222','Define el problema que quieres resolver','video',14,1,'<h2>Comienza con claridad</h2><p>Una propuesta fuerte parte de una necesidad concreta y un cliente bien definido.</p>'),
('22222222-0002-4222-8222-222222222222','22222222-bbbb-4222-8222-222222222222','Construye tu red de proveedores','video',16,1,'<h2>No tienes que hacerlo todo solo</h2><p>Identifica qué servicios puedes resolver con aliados confiables.</p>'),
('33333333-0001-4333-8333-333333333333','33333333-aaaa-4333-8333-333333333333','Presupuesto básico de negocio','video',15,1,'<h2>Control antes de crecer</h2><p>Ordena ingresos, gastos y decisiones con un presupuesto simple.</p>'),
('44444444-0001-4444-8444-444444444444','44444444-aaaa-4444-8444-444444444444','Tu mensaje de negocio','video',15,1,'<h2>Explica tu valor con claridad</h2><p>Define una forma sencilla de explicar a quién ayudas y cómo.</p>')
on conflict (id) do update set module_id=excluded.module_id,title=excluded.title,lesson_type=excluded.lesson_type,duration_minutes=excluded.duration_minutes,position=excluded.position,content_html=excluded.content_html;

insert into public.resources(id,course_id,title,resource_type,external_url,is_public,thumbnail_url) values
('aaaaaaaa-0001-4000-8000-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','Manual de Utah Driver','pdf',null,false,'recurso-utah-driver.webp'),
('aaaaaaaa-0002-4000-8000-aaaaaaaaaaaa',null,'Manual del Alumno · Academia AG','pdf',null,true,'recurso-manual-ag.webp')
on conflict (id) do update set course_id=excluded.course_id,title=excluded.title,resource_type=excluded.resource_type,external_url=excluded.external_url,is_public=excluded.is_public,thumbnail_url=excluded.thumbnail_url;

update public.resources
set created_by = (select id from public.profiles where role='admin' and account_status='active' order by created_at asc limit 1)
where created_by is null and id in ('aaaaaaaa-0001-4000-8000-aaaaaaaaaaaa','aaaaaaaa-0002-4000-8000-aaaaaaaaaaaa');

commit;
