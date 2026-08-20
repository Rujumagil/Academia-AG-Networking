-- ============================================================
-- ACADEMIA AG · UTAH DRIVER SUCCESS PROGRAM V2
-- EVALUACIÓN OPCIONAL · MÓDULO 2
-- Salud, exámenes y preparación del vehículo
-- 10 preguntas · intentos ilimitados · no bloquea el avance
-- ============================================================

begin;

with questions(lesson_code, question, options, correct_key, explanation) as (
values
(
  'C2-01',
  '¿Cuál es el objetivo principal de revisar la visión antes de conducir?',
  '[{"key":"a","text":"Comprobar que puedes leer documentos pequeños."},{"key":"b","text":"Confirmar que puedes percibir adecuadamente el entorno necesario para conducir con seguridad."},{"key":"c","text":"Determinar qué tipo de vehículo puedes comprar."},{"key":"d","text":"Evitar realizar el examen escrito."}]'::jsonb,
  'b',
  'La visión es esencial para detectar señales, vehículos, peatones y cambios en el entorno. Por eso forma parte de la evaluación de aptitud para conducir.'
),
(
  'C2-02',
  'Si una condición de salud o un medicamento puede afectar tu capacidad para conducir, ¿qué debes hacer?',
  '[{"key":"a","text":"Ignorarlo si el trayecto es corto."},{"key":"b","text":"Conducir únicamente de día sin informar a nadie."},{"key":"c","text":"Tomarlo en cuenta y evitar conducir cuando pueda comprometer tu seguridad."},{"key":"d","text":"Aumentar la velocidad para terminar antes el recorrido."}]'::jsonb,
  'c',
  'La salud física y mental, así como ciertos medicamentos, pueden afectar atención, coordinación o tiempo de reacción. La prioridad es no conducir cuando esas capacidades estén comprometidas.'
),
(
  'C2-03',
  '¿Cuál es la fuente principal de estudio para el examen de conocimientos de manejo en Utah?',
  '[{"key":"a","text":"Videos de redes sociales."},{"key":"b","text":"El Utah Driver Handbook y los materiales oficiales correspondientes."},{"key":"c","text":"Únicamente la experiencia de otros conductores."},{"key":"d","text":"El manual del vehículo que vas a manejar."}]'::jsonb,
  'b',
  'El Utah Driver Handbook reúne las reglas, señales, responsabilidades y principios de seguridad que debes estudiar para el examen de conocimientos.'
),
(
  'C2-04',
  '¿Qué busca comprobar principalmente un examen escrito de conocimientos?',
  '[{"key":"a","text":"Que sabes reparar un automóvil."},{"key":"b","text":"Que conoces reglas de tránsito, señales y principios de conducción segura."},{"key":"c","text":"Que puedes estacionar sin ayuda."},{"key":"d","text":"Que conoces todas las carreteras de Utah de memoria."}]'::jsonb,
  'b',
  'El examen escrito verifica que comprendas las normas, señales y decisiones de seguridad necesarias antes de conducir.'
),
(
  'C2-05',
  '¿Para qué sirve reforzar temas de seguridad vial y tendencias de tránsito?',
  '[{"key":"a","text":"Para memorizar únicamente estadísticas."},{"key":"b","text":"Para reconocer riesgos actuales y tomar decisiones de conducción más seguras."},{"key":"c","text":"Para sustituir la práctica de manejo."},{"key":"d","text":"Para evitar usar cinturón de seguridad."}]'::jsonb,
  'b',
  'Comprender riesgos y tendencias ayuda a identificar conductas peligrosas y a tomar mejores decisiones al conducir.'
),
(
  'C2-06',
  '¿Qué evalúa principalmente el Driving Skills Test?',
  '[{"key":"a","text":"Tu capacidad para memorizar el manual."},{"key":"b","text":"Tu habilidad práctica para controlar el vehículo y conducir de manera segura."},{"key":"c","text":"Tu conocimiento de mecánica avanzada."},{"key":"d","text":"La velocidad máxima que puede alcanzar tu vehículo."}]'::jsonb,
  'b',
  'La prueba práctica observa cómo aplicas en la conducción real el control del vehículo, la observación, las señales y las reglas de seguridad.'
),
(
  'C2-07',
  'Durante una prueba práctica, ¿qué conducta demuestra una buena observación antes de cambiar de dirección o carril?',
  '[{"key":"a","text":"Mirar únicamente hacia adelante."},{"key":"b","text":"Usar espejos, señalizar y revisar el entorno antes de realizar la maniobra."},{"key":"c","text":"Acelerar primero y revisar después."},{"key":"d","text":"Esperar a que otro conductor toque el claxon."}]'::jsonb,
  'b',
  'Una maniobra segura requiere observar el entorno, usar los espejos, señalizar y comprobar que el movimiento puede hacerse sin riesgo.'
),
(
  'C2-08',
  'Antes de presentar una prueba práctica, ¿qué es lo más importante respecto al vehículo?',
  '[{"key":"a","text":"Que tenga accesorios nuevos."},{"key":"b","text":"Que esté en condiciones seguras y cuente con lo necesario para circular legalmente."},{"key":"c","text":"Que sea un vehículo grande."},{"key":"d","text":"Que tenga el tanque completamente lleno."}]'::jsonb,
  'b',
  'El vehículo utilizado debe estar en condiciones seguras de operación y cumplir con los requisitos aplicables para circular.'
),
(
  'C2-09',
  '¿Cuál de estas revisiones debe hacerse antes de manejar?',
  '[{"key":"a","text":"Comprobar que luces, llantas y elementos básicos de seguridad estén en condiciones adecuadas."},{"key":"b","text":"Cambiar la estación de radio."},{"key":"c","text":"Revisar únicamente la pintura exterior."},{"key":"d","text":"Abrir todas las ventanas sin importar el clima."}]'::jsonb,
  'a',
  'Una inspección básica ayuda a detectar problemas visibles en llantas, luces y otros elementos que pueden afectar la seguridad.'
),
(
  'C2-10',
  'Antes de poner el vehículo en movimiento, ¿qué debes ajustar?',
  '[{"key":"a","text":"Solo el volumen del audio."},{"key":"b","text":"Asiento, espejos y posición de conducción para tener control y visibilidad adecuados."},{"key":"c","text":"Únicamente el espejo interior."},{"key":"d","text":"Nada; los ajustes pueden hacerse mientras conduces."}]'::jsonb,
  'b',
  'El asiento y los espejos deben ajustarse antes de comenzar a conducir para mantener control, visibilidad y una postura segura.'
)
)
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
join questions q on q.lesson_code = l.lesson_code
where l.module_id = '7c4d9f60-1002-4b7b-9f2c-2d5e1a8c4001'::uuid
on conflict (lesson_id) do update set
  question = excluded.question,
  options = excluded.options,
  correct_key = excluded.correct_key,
  explanation = excluded.explanation,
  required = false,
  updated_at = now();

commit;

-- VERIFICACIÓN: debe regresar 10 / 10.
select
  count(*) as preguntas_modulo_2,
  count(*) filter (where q.required = false) as preguntas_opcionales
from public.lesson_quizzes q
join public.lessons l on l.id = q.lesson_id
where l.module_id = '7c4d9f60-1002-4b7b-9f2c-2d5e1a8c4001'::uuid
  and l.lesson_code between 'C2-01' and 'C2-10';
