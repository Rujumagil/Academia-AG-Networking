-- ============================================================
-- ACADEMIA AG · PASO 15
-- EVALUACIÓN INICIAL DE PRÁCTICA · UTAH DRIVER SUCCESS PROGRAM™
-- Ejecutar después de 14-evaluaciones-soporte-certificados-seguridad.sql.
-- Material de práctica interno; no sustituye exámenes ni licencias estatales.
-- ============================================================

begin;

do $$
declare
  course_uuid uuid;
  assessment_uuid uuid;
  q uuid;
begin
  select id into course_uuid from public.courses where slug='utah-driver-success-program' limit 1;
  if course_uuid is null then
    raise notice 'No se encontró el curso Utah Driver Success Program; no se creó la evaluación.';
    return;
  end if;

  select id into assessment_uuid from public.assessments
  where course_id=course_uuid and title='Evaluación de práctica · Fundamentos de manejo'
  limit 1;

  if assessment_uuid is null then
    insert into public.assessments(course_id,title,description,pass_score,max_attempts,status,created_by)
    values(
      course_uuid,
      'Evaluación de práctica · Fundamentos de manejo',
      'Repaso introductorio del curso. Esta evaluación es académica y no sustituye ninguna prueba oficial del estado de Utah.',
      80,3,'published',(select created_by from public.courses where id=course_uuid)
    ) returning id into assessment_uuid;

    insert into public.assessment_questions(assessment_id,question_text,position,points)
    values(assessment_uuid,'Antes de comenzar a conducir, ¿qué acción forma parte de una preparación segura?',1,1)
    returning id into q;
    insert into public.assessment_options(question_id,option_text,is_correct,position) values
      (q,'Ajustar asiento y espejos, colocarse el cinturón y revisar el entorno.',true,1),
      (q,'Comenzar a conducir y ajustar los espejos después.',false,2),
      (q,'Usar el teléfono para revisar la ruta mientras el vehículo avanza.',false,3),
      (q,'Ignorar el cinturón si el trayecto es corto.',false,4);

    insert into public.assessment_questions(assessment_id,question_text,position,points)
    values(assessment_uuid,'Si una persona ha consumido alcohol o una sustancia que afecta su capacidad para conducir, ¿cuál es la decisión responsable?',2,1)
    returning id into q;
    insert into public.assessment_options(question_id,option_text,is_correct,position) values
      (q,'No conducir y buscar una alternativa segura de transporte.',true,1),
      (q,'Conducir más rápido para llegar antes.',false,2),
      (q,'Conducir únicamente por calles pequeñas.',false,3),
      (q,'Tomar café y conducir de inmediato.',false,4);

    insert into public.assessment_questions(assessment_id,question_text,position,points)
    values(assessment_uuid,'¿Para qué sirven las señales, direccionales y otras formas de comunicación vial?',3,1)
    returning id into q;
    insert into public.assessment_options(question_id,option_text,is_correct,position) values
      (q,'Para comunicar intenciones y ayudar a que otros usuarios anticipen movimientos.',true,1),
      (q,'Solo para decorar el vehículo.',false,2),
      (q,'Únicamente para estacionarse.',false,3),
      (q,'Para sustituir la observación del camino.',false,4);

    insert into public.assessment_questions(assessment_id,question_text,position,points)
    values(assessment_uuid,'Ante una situación inesperada en el camino, ¿qué principio debe priorizarse?',4,1)
    returning id into q;
    insert into public.assessment_options(question_id,option_text,is_correct,position) values
      (q,'Mantener el control del vehículo y responder de forma segura al entorno.',true,1),
      (q,'Cerrar los ojos por un momento.',false,2),
      (q,'Acelerar sin observar.',false,3),
      (q,'Discutir con otros conductores.',false,4);

    insert into public.assessment_questions(assessment_id,question_text,position,points)
    values(assessment_uuid,'¿Completar un curso de Academia AG reemplaza automáticamente una licencia, permiso o certificación emitida por una autoridad gubernamental?',5,1)
    returning id into q;
    insert into public.assessment_options(question_id,option_text,is_correct,position) values
      (q,'No. La constancia académica no sustituye los requisitos de la autoridad correspondiente.',true,1),
      (q,'Sí, cualquier curso en línea reemplaza todos los trámites oficiales.',false,2),
      (q,'Sí, siempre que se imprima el certificado.',false,3),
      (q,'Sí, si el alumno termina todas las lecciones.',false,4);
  end if;
end $$;

insert into public.notifications(target_user,notification_type,title,message,href,created_by)
select null,'general','Bienvenido a Academia AG','Tu espacio de formación ya está listo. Revisa tus cursos, evaluaciones, biblioteca, calendario y centro de ayuda.','#home',p.id
from public.profiles p
where p.role='admin' and p.account_status='active'
  and not exists(select 1 from public.notifications n where n.title='Bienvenido a Academia AG' and n.target_user is null)
order by p.created_at asc
limit 1;

commit;
