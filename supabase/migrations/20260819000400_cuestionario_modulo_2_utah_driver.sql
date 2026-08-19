-- ============================================================
-- ACADEMIA AG · CUESTIONARIO DEFINITIVO MÓDULO 2
-- UTAH DRIVER SUCCESS PROGRAM™
-- Salud, exámenes y preparación del vehículo
-- 10 preguntas · 80% mínimo para aprobar
--
-- Fuentes oficiales verificadas 2026-08-19:
-- Utah DLD · Vision Requirements for Drivers
-- Utah DLD · Written Knowledge Test
-- Utah DLD · Traffic Safety and Trends Exam
-- Utah DLD · Driving Skills Test / Driving Test Videos
-- Utah DLD · Unsafe Driver Reporting
-- ============================================================

begin;

create temporary table _module2_questions (
  position integer primary key,
  question text not null,
  options jsonb not null,
  correct_key text not null,
  explanation text not null
) on commit drop;

insert into _module2_questions(position,question,options,correct_key,explanation) values
(
  1,
  '¿En cuáles de estos trámites exige Utah una prueba de visión?',
  '[{"key":"a","text":"Solo al obtener la primera licencia."},{"key":"b","text":"Solo al renovar después de los 65 años."},{"key":"c","text":"En licencias originales, renovaciones, licencias vencidas y reemplazos."},{"key":"d","text":"Únicamente cuando el conductor usa lentes."}]'::jsonb,
  'c',
  'Utah exige una prueba de visión para licencias originales, renovaciones, licencias vencidas y reemplazos.'
),
(
  2,
  'Para una licencia regular, Limited-Term o DPC, ¿qué estándar general de visión exige la División para aprobar la prueba?',
  '[{"key":"a","text":"20/20 en ambos ojos y 120 grados de visión periférica."},{"key":"b","text":"20/40 y 90 grados de campo periférico en al menos un ojo."},{"key":"c","text":"20/60 y 70 grados de visión periférica."},{"key":"d","text":"No existe un estándar mínimo."}]'::jsonb,
  'b',
  'Para licencias regulares, Limited-Term y DPC, la División indica 20/40 de visión y 90 grados de campo periférico en al menos un ojo.'
),
(
  3,
  '¿Qué ocurre si una persona no cumple el estándar de visión requerido, con o sin lentes?',
  '[{"key":"a","text":"Recibe automáticamente una licencia restringida."},{"key":"b","text":"Debe obtener un Certificate of Visual Examination de su especialista de la vista."},{"key":"c","text":"Puede omitir la prueba si firma una declaración."},{"key":"d","text":"Debe esperar un año antes de volver a solicitar."}]'::jsonb,
  'b',
  'Si no se cumple el estándar visual, la División requiere un Certificate of Visual Examination completado por el profesional de la vista.'
),
(
  4,
  'Una persona que nunca ha tenido licencia presenta el examen escrito inicial en Utah. ¿Cómo es ese examen?',
  '[{"key":"a","text":"25 preguntas a libro abierto."},{"key":"b","text":"30 preguntas a libro abierto."},{"key":"c","text":"50 preguntas a libro cerrado."},{"key":"d","text":"40 preguntas y se puede usar el teléfono."}]'::jsonb,
  'c',
  'Para una persona que nunca ha tenido licencia, el examen escrito de conocimientos es de 50 preguntas y se realiza a libro cerrado.'
),
(
  5,
  '¿En qué se basa el contenido del examen escrito de conocimientos de Utah?',
  '[{"key":"a","text":"En preguntas elegidas por cada oficina local."},{"key":"b","text":"En la información del Utah Driver Handbook."},{"key":"c","text":"Únicamente en señales de tránsito."},{"key":"d","text":"En el manual del fabricante del vehículo."}]'::jsonb,
  'b',
  'La División indica que todas las preguntas del examen escrito se basan en la información del Utah Driver Handbook.'
),
(
  6,
  '¿Quién debe completar el Traffic Safety and Trends Exam?',
  '[{"key":"a","text":"Solamente conductores mayores de 65 años."},{"key":"b","text":"Todo visitante que conduzca en Utah."},{"key":"c","text":"Las personas que solicitan por primera vez una licencia Class D original o provisional y nunca han tenido licencia en otro estado o país."},{"key":"d","text":"Únicamente quienes reprobaron el examen de manejo."}]'::jsonb,
  'c',
  'Este entrenamiento y examen se exige a solicitantes por primera vez de una licencia Class D original o provisional que nunca han tenido licencia en ningún estado o país.'
),
(
  7,
  '¿Qué debes recordar sobre el Traffic Safety and Trends Exam?',
  '[{"key":"a","text":"Tiene 20 preguntas y se aprueba con 80%."},{"key":"b","text":"Tiene cuatro videos, 40 preguntas y requiere 100% para aprobar."},{"key":"c","text":"Solo puede presentarse una vez."},{"key":"d","text":"Se realiza antes de solicitar el Learner Permit."}]'::jsonb,
  'b',
  'El entrenamiento incluye cuatro videos educativos y 40 preguntas. Se requiere 100% para aprobar y puede repetirse las veces necesarias.'
),
(
  8,
  'Antes de tomar el Traffic Safety and Trends Exam, ¿qué requisito debes cumplir?',
  '[{"key":"a","text":"Haber comprado un vehículo."},{"key":"b","text":"Tener ya una licencia permanente."},{"key":"c","text":"Haber solicitado el Learner Permit y contar con el número de permiso para registrarte."},{"key":"d","text":"Haber cumplido 21 años."}]'::jsonb,
  'c',
  'La División señala que no puedes tomar este entrenamiento/examen hasta haber solicitado el Learner Permit, porque necesitas el número de permiso para registrarte.'
),
(
  9,
  'Si vas a presentar el Driving Skills Test en la Driver License Division, ¿qué debe cumplir el vehículo que lleves?',
  '[{"key":"a","text":"Debe ser rentado directamente por la División."},{"key":"b","text":"Debe ser tu propio vehículo registrado, estar listo para circular y tener cinturones de seguridad funcionando."},{"key":"c","text":"Solo necesita tener combustible suficiente."},{"key":"d","text":"Puede no estar registrado si el examen dura menos de una hora."}]'::jsonb,
  'b',
  'Para el examen práctico en la DLD debes llevar tu propio vehículo registrado y apto para circular; la División también exige cinturones de seguridad funcionales.'
),
(
  10,
  'Si una condición física, mental o emocional pudiera afectar la seguridad al conducir, ¿qué puede requerir la Driver License Division durante una revisión?',
  '[{"key":"a","text":"Únicamente una entrevista telefónica."},{"key":"b","text":"Un examen escrito, una prueba de visión y una prueba de manejo, y en algunos casos formularios médicos o visuales."},{"key":"c","text":"Solo una fotografía nueva."},{"key":"d","text":"Ninguna evaluación adicional."}]'::jsonb,
  'b',
  'La División puede requerir una revisión del conductor que incluya examen escrito, prueba de visión y Driving Skills Test, además de documentación médica o visual cuando corresponda.'
);

-- Sustituye las preguntas genéricas de las primeras diez lecciones del módulo 2
-- por el banco definitivo. Las respuestas correctas continúan protegidas en servidor.
insert into public.lesson_quizzes(
  lesson_id, question, options, correct_key, explanation, required, updated_at
)
select
  l.id,
  q.question,
  q.options,
  q.correct_key,
  q.explanation,
  false,
  now()
from public.lessons l
join _module2_questions q on q.position = l.position
where l.module_id = '11111111-bbbb-4111-8111-111111111111'::uuid
  and l.position between 1 and 10
on conflict (lesson_id) do update set
  question = excluded.question,
  options = excluded.options,
  correct_key = excluded.correct_key,
  explanation = excluded.explanation,
  required = false,
  updated_at = now();

commit;