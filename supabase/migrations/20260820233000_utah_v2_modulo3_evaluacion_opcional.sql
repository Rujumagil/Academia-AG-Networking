-- ============================================================
-- ACADEMIA AG · UTAH DRIVER SUCCESS PROGRAM V2
-- EVALUACIÓN OPCIONAL · MÓDULO 3
-- Manejo básico
-- 10 preguntas · intentos ilimitados · no bloquea el avance
-- ============================================================

begin;

with questions(lesson_code, question, options, correct_key, explanation) as (
values
(
  'C3-02',
  'Antes de poner el vehículo en movimiento, ¿qué debes hacer primero?',
  '[{"key":"a","text":"Acelerar ligeramente para comprobar el motor."},{"key":"b","text":"Verificar el entorno, ajustar tu posición y confirmar que puedes iniciar la marcha con seguridad."},{"key":"c","text":"Encender las luces altas sin importar la hora."},{"key":"d","text":"Mover el vehículo antes de ajustar los espejos."}]'::jsonb,
  'b',
  'Un arranque seguro comienza con una preparación ordenada: posición de conducción, espejos, cinturón, entorno y control del vehículo antes de moverte.'
),
(
  'C3-03',
  'Al conducir en reversa, ¿cuál es la práctica más segura?',
  '[{"key":"a","text":"Confiar únicamente en la cámara trasera."},{"key":"b","text":"Mirar hacia atrás y alrededor del vehículo, avanzar despacio y mantener control constante."},{"key":"c","text":"Acelerar para pasar menos tiempo en reversa."},{"key":"d","text":"Usar solamente el espejo interior."}]'::jsonb,
  'b',
  'La reversa debe hacerse lentamente y con observación directa del entorno. Las cámaras y espejos ayudan, pero no sustituyen revisar alrededor del vehículo.'
),
(
  'C3-04',
  'Antes de cambiar de carril, ¿qué secuencia es la más adecuada?',
  '[{"key":"a","text":"Acelerar, cambiar y luego señalizar."},{"key":"b","text":"Espejo, direccional, revisión del punto ciego y cambio cuando sea seguro."},{"key":"c","text":"Tocar el claxon y cambiar inmediatamente."},{"key":"d","text":"Mirar únicamente el espejo lateral."}]'::jsonb,
  'b',
  'Un cambio de carril seguro requiere observar espejos, señalizar con anticipación y revisar el punto ciego antes de desplazarte.'
),
(
  'C3-05',
  'Al incorporarte a una vía rápida, ¿qué debes evitar?',
  '[{"key":"a","text":"Ajustar tu velocidad al flujo del tránsito."},{"key":"b","text":"Usar el carril de aceleración."},{"key":"c","text":"Cruzar o detenerte innecesariamente en el gore area."},{"key":"d","text":"Buscar un espacio seguro para incorporarte."}]'::jsonb,
  'c',
  'El gore area es una zona que debe mantenerse libre. La incorporación debe hacerse desde el carril correspondiente, ajustando velocidad y buscando un espacio seguro.'
),
(
  'C3-06',
  '¿Qué describe mejor el método zipper en una zona donde dos carriles se reducen a uno?',
  '[{"key":"a","text":"Todos los vehículos cambian de carril mucho antes del punto de unión."},{"key":"b","text":"Los vehículos usan ambos carriles hasta el punto de fusión y se alternan uno por uno."},{"key":"c","text":"El carril izquierdo siempre tiene prioridad absoluta."},{"key":"d","text":"Los vehículos deben detenerse antes de fusionarse."}]'::jsonb,
  'b',
  'El método zipper utiliza ambos carriles hasta el punto de fusión y permite alternar vehículos de cada carril de manera ordenada.'
),
(
  'C3-07',
  '¿Qué significa escanear constantemente el entorno mientras conduces?',
  '[{"key":"a","text":"Mirar únicamente el vehículo que está frente a ti."},{"key":"b","text":"Mover la vista entre la vía, espejos, laterales y posibles riesgos para anticiparte a cambios."},{"key":"c","text":"Leer todos los anuncios de la carretera."},{"key":"d","text":"Revisar los espejos solamente al estacionarte."}]'::jsonb,
  'b',
  'La observación continua permite anticipar riesgos. No debes fijar la vista en un solo punto; conviene revisar regularmente el frente, espejos y zonas laterales.'
),
(
  'C3-08',
  'Ante una señal de STOP, ¿dónde debes realizar la detención completa?',
  '[{"key":"a","text":"Después de entrar a la intersección."},{"key":"b","text":"En la línea de alto; si no existe, antes del cruce peatonal o de entrar a la intersección."},{"key":"c","text":"En cualquier punto donde puedas ver otros vehículos."},{"key":"d","text":"No es necesario detenerse si no viene tráfico."}]'::jsonb,
  'b',
  'Una señal de STOP exige una detención completa. Debes detenerte en la línea marcada o, si no existe, antes del cruce peatonal o de entrar a la intersección.'
),
(
  'C3-09',
  '¿Por qué debes usar las direccionales con anticipación?',
  '[{"key":"a","text":"Para que otros usuarios puedan anticipar tu maniobra y reaccionar con tiempo."},{"key":"b","text":"Para tener prioridad automática sobre otros vehículos."},{"key":"c","text":"Porque reemplazan la revisión del punto ciego."},{"key":"d","text":"Solo para aprobar el examen práctico."}]'::jsonb,
  'a',
  'Las direccionales comunican tus intenciones. Deben usarse con suficiente anticipación, pero nunca sustituyen observar y comprobar que la maniobra sea segura.'
),
(
  'C3-10',
  'Al estacionar un vehículo, ¿qué principio debe guiar tu maniobra?',
  '[{"key":"a","text":"Completarla lo más rápido posible."},{"key":"b","text":"Mantener baja velocidad, observar el entorno y colocar el vehículo dentro del espacio sin crear riesgo."},{"key":"c","text":"Usar únicamente los sensores del vehículo."},{"key":"d","text":"Dejar las ruedas giradas sin importar el lugar."}]'::jsonb,
  'b',
  'El estacionamiento seguro requiere control a baja velocidad, observación constante y una posición final que no obstruya ni genere peligro.'
),
(
  'C3-11',
  'Cuando estacionas en una pendiente, ¿qué debes considerar además del freno de estacionamiento?',
  '[{"key":"a","text":"La orientación adecuada de las ruedas según la pendiente y la presencia de bordillo."},{"key":"b","text":"Dejar la transmisión en neutral siempre."},{"key":"c","text":"Apagar las luces antes de detenerte."},{"key":"d","text":"Dejar el vehículo separado del bordillo lo más posible."}]'::jsonb,
  'a',
  'En una pendiente debes asegurar el vehículo con el freno de estacionamiento y orientar las ruedas correctamente para reducir el riesgo de que ruede hacia el tránsito.'
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
where l.module_id = '7c4d9f60-1003-4b7b-9f2c-2d5e1a8c4001'::uuid
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
  count(*) as preguntas_modulo_3,
  count(*) filter (where q.required = false) as preguntas_opcionales
from public.lesson_quizzes q
join public.lessons l on l.id = q.lesson_id
where l.module_id = '7c4d9f60-1003-4b7b-9f2c-2d5e1a8c4001'::uuid
  and l.lesson_code between 'C3-02' and 'C3-11';
