-- ============================================================
-- ACADEMIA AG · CUESTIONARIO DEFINITIVO MÓDULO 6
-- UTAH DRIVER SUCCESS PROGRAM™
-- Emergencias, compartir el camino y tu récord
-- 10 preguntas · 80% mínimo para aprobar
--
-- Fuentes oficiales verificadas 2026-08-19:
-- Utah Driver Handbook 2025-2026 · Sections 12, 13 and 14
-- Utah Driver License Division · Points System / MVR / Financial Responsibility
-- ============================================================

begin;

create temporary table _module6_questions (
  position integer primary key,
  question text not null,
  options jsonb not null,
  correct_key text not null,
  explanation text not null
) on commit drop;

insert into _module6_questions(position,question,options,correct_key,explanation) values
(
  1,
  'Si participas en un choque, ¿cuál es tu primera obligación?',
  '[{"key":"a","text":"Continuar si tu vehículo todavía funciona."},{"key":"b","text":"Detenerte inmediatamente y permanecer en el lugar cumpliendo los requisitos legales."},{"key":"c","text":"Ir directamente a tu casa y llamar después."},{"key":"d","text":"Mover a todas las personas lesionadas antes de hacer cualquier otra cosa."}]'::jsonb,
  'b',
  'El handbook establece que debes detenerte inmediatamente si estás involucrado en un choque y permanecer en el lugar mientras cumples los requisitos legales aplicables.'
),
(
  2,
  '¿Cuándo debes notificar inmediatamente a law enforcement o al 911 después de un choque?',
  '[{"key":"a","text":"Solo cuando el otro conductor lo solicita."},{"key":"b","text":"Cuando hay lesiones, muerte o al menos $2,500 en daños totales a la propiedad."},{"key":"c","text":"Únicamente si el vehículo no puede moverse."},{"key":"d","text":"Solo si el choque ocurre en una freeway."}]'::jsonb,
  'b',
  'El handbook requiere notificar inmediatamente a law enforcement cuando el choque causa lesiones, muerte o al menos $2,500 en daños totales a la propiedad.'
),
(
  3,
  '¿Qué información deben intercambiar normalmente las personas involucradas en un choque?',
  '[{"key":"a","text":"Solo el nombre del conductor."},{"key":"b","text":"Nombre y dirección, número de registro del vehículo e información del seguro, incluido el agente o proveedor y su teléfono."},{"key":"c","text":"Únicamente la placa del vehículo."},{"key":"d","text":"Número de Seguro Social y contraseña del seguro."}]'::jsonb,
  'b',
  'El handbook indica intercambiar nombre y dirección, número de registro del vehículo e información del seguro, incluido el nombre y teléfono del agente o proveedor.'
),
(
  4,
  'Si un choque solo causa daños a la propiedad y no hay lesiones, ¿qué puedes hacer con el vehículo si está obstruyendo el tránsito?',
  '[{"key":"a","text":"Dejarlo exactamente donde quedó en todos los casos."},{"key":"b","text":"Moverlo tan pronto como sea posible a un hombro, calle cercana u otro lugar seguro que no obstruya el tránsito, y permanecer allí hasta cumplir los demás requisitos."},{"key":"c","text":"Abandonarlo y regresar más tarde."},{"key":"d","text":"Conducirlo hasta tu casa sin intercambiar información."}]'::jsonb,
  'b',
  'Cuando el choque solo produce daños materiales, la ley permite retirar el vehículo de los carriles hacia un lugar seguro que no obstruya el tránsito, pero debes permanecer en el lugar hasta cumplir los demás requisitos.'
),
(
  5,
  '¿Qué exige la Financial Responsibility Act de Utah?',
  '[{"key":"a","text":"Que únicamente los vehículos nuevos tengan seguro."},{"key":"b","text":"Que el vehículo o el conductor cuenten con la cobertura o seguridad financiera requerida mientras se opera el vehículo."},{"key":"c","text":"Que el seguro sea opcional si el conductor tiene más de 21 años."},{"key":"d","text":"Que solo los vehículos comerciales estén asegurados."}]'::jsonb,
  'b',
  'La Financial Responsibility Act busca proteger al público frente a pérdidas por choques y exige que el vehículo o el conductor estén asegurados o cuenten con la seguridad financiera requerida.'
),
(
  6,
  'En el sistema de puntos de Utah, ¿qué nivel puede llevar a una audiencia para una persona mayor de 21 años?',
  '[{"key":"a","text":"50 puntos en un año."},{"key":"b","text":"100 puntos en cinco años."},{"key":"c","text":"200 o más puntos dentro de un periodo de tres años."},{"key":"d","text":"300 puntos en diez años."}]'::jsonb,
  'c',
  'Para una persona mayor de 21 años, acumular 200 o más puntos dentro de tres años puede llevar a una audiencia de Driver Improvement.'
),
(
  7,
  'En el sistema de puntos de Utah, ¿qué nivel puede llevar a una audiencia para una persona menor de 21 años?',
  '[{"key":"a","text":"70 o más puntos dentro de tres años."},{"key":"b","text":"150 puntos dentro de cinco años."},{"key":"c","text":"200 puntos dentro de tres años."},{"key":"d","text":"Solo una condena por cualquier infracción."}]'::jsonb,
  'a',
  'Para conductores menores de 21 años, el handbook establece que 70 o más puntos dentro de tres años pueden dar lugar a una audiencia.'
),
(
  8,
  'Cuando rebasas a un ciclista o a otro usuario vulnerable de la vía, ¿qué distancia mínima exige Utah?',
  '[{"key":"a","text":"Un pie."},{"key":"b","text":"Dos pies."},{"key":"c","text":"Tres pies."},{"key":"d","text":"Cinco pies en todos los casos."}]'::jsonb,
  'c',
  'Utah exige mantener al menos tres pies de distancia al rebasar a un ciclista o a otro usuario vulnerable de la vía.'
),
(
  9,
  'Si se aproxima un vehículo de emergencia usando sirena, luces u otros dispositivos de advertencia, ¿qué debes hacer?',
  '[{"key":"a","text":"Acelerar para salir de su camino."},{"key":"b","text":"Ceder el paso, dirigirte de inmediato al lado derecho de la carretera y detenerte hasta que pase."},{"key":"c","text":"Detenerte en el carril izquierdo."},{"key":"d","text":"Continuar a la misma velocidad si estás dentro del límite."}]'::jsonb,
  'b',
  'El handbook indica que debes ceder el paso a los vehículos de emergencia, moverte de inmediato hacia el lado derecho de la carretera y detenerte hasta que el vehículo haya pasado.'
),
(
  10,
  'Al aproximarte a un vehículo detenido junto a la carretera con luces de emergencia o luces ámbar encendidas, ¿qué resume mejor la Move Over Law?',
  '[{"key":"a","text":"Mantener la velocidad y permanecer junto al vehículo detenido."},{"key":"b","text":"Reducir la velocidad, dar tanto espacio como sea práctico y, cuando sea seguro y posible, cambiar a un carril que no sea adyacente al vehículo detenido."},{"key":"c","text":"Detenerte siempre detrás del vehículo."},{"key":"d","text":"Usar el claxon y continuar sin cambiar de posición."}]'::jsonb,
  'b',
  'La Move Over Law requiere reducir la velocidad, proporcionar el mayor espacio práctico y, cuando sea seguro y posible, cambiar a un carril no adyacente al vehículo detenido.'
);

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
join _module6_questions q on q.position = l.position
where l.module_id = '11111111-ffff-4111-8111-111111111111'::uuid
  and l.position between 1 and 10
on conflict (lesson_id) do update set
  question = excluded.question,
  options = excluded.options,
  correct_key = excluded.correct_key,
  explanation = excluded.explanation,
  required = false,
  updated_at = now();

commit;