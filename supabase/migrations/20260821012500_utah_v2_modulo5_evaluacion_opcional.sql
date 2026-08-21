-- ============================================================
-- ACADEMIA AG · UTAH DRIVER SUCCESS PROGRAM V2
-- EVALUACIÓN OPCIONAL · MÓDULO 5
-- Alcohol, drogas y retos al manejar
-- Restaura el cuestionario definitivo previo: 10 preguntas.
-- Intentos ilimitados · 80% recomendado · no bloquea el avance.
-- ============================================================

begin;

with q(lesson_code, question, options, correct_key, explanation) as (
  values
  (
    'C5-01',
    '¿Qué habilidades pueden verse reducidas por el alcohol y otras drogas que afectan la conducción?',
    '[{"key":"a","text":"Solo la audición."},{"key":"b","text":"Juicio, visión, distinción de colores y tiempo de reacción."},{"key":"c","text":"Únicamente la fuerza física."},{"key":"d","text":"Ninguna mientras la persona se sienta bien."}]'::jsonb,
    'b',
    'El handbook señala que el alcohol y otras drogas que alteran la capacidad de conducir reducen el juicio, la visión, la distinción de colores y el tiempo de reacción.'
  ),
  (
    'C5-02',
    '¿Cuándo puede comenzar el deterioro causado por el alcohol?',
    '[{"key":"a","text":"Solo después de tres bebidas."},{"key":"b","text":"Desde la primera bebida."},{"key":"c","text":"Únicamente cuando el BAC supera 0.08%."},{"key":"d","text":"Solo después de una hora de haber bebido."}]'::jsonb,
    'b',
    'El Utah Driver Handbook indica que el deterioro comienza con la primera bebida y que incluso una bebida puede afectar la capacidad para operar un vehículo.'
  ),
  (
    'C5-03',
    'Para un conductor regular en Utah, ¿qué afirmación sobre el BAC es correcta?',
    '[{"key":"a","text":"Solo es ilegal conducir con un BAC superior a 0.08%."},{"key":"b","text":"Un BAC superior a 0.05% viola la ley; además, una persona puede cometer una infracción si está demasiado afectada para conducir con seguridad aunque esté por debajo de ese nivel."},{"key":"c","text":"El BAC no se utiliza en Utah."},{"key":"d","text":"El límite general es 0.10%."}]'::jsonb,
    'b',
    'Utah establece 0.05% BAC como límite para conductores regulares. También puede existir una infracción por conducir de forma insegura debido al deterioro aunque el BAC esté por debajo del límite.'
  ),
  (
    'C5-04',
    '¿Qué establece el Not-a-Drop Act para una persona menor de 21 años?',
    '[{"key":"a","text":"Puede conducir con una pequeña cantidad de alcohol si está acompañada por un adulto."},{"key":"b","text":"Con cualquier cantidad medible de alcohol en el cuerpo al conducir puede perder sus privilegios de manejo; una primera infracción implica una denegación de seis meses."},{"key":"c","text":"Solo aplica a conductores comerciales."},{"key":"d","text":"Permite hasta 0.05% BAC."}]'::jsonb,
    'b',
    'El Not-a-Drop Act dispone que una persona menor de 21 años que conduce con cualquier cantidad medible de alcohol puede perder sus privilegios de manejo; para una primera infracción, el handbook señala seis meses.'
  ),
  (
    'C5-05',
    '¿Qué tipos de drogas pueden afectar la capacidad para conducir?',
    '[{"key":"a","text":"Solo las drogas ilegales."},{"key":"b","text":"Drogas ilegales, medicamentos de venta libre y medicamentos recetados."},{"key":"c","text":"Solo los medicamentos que requieren hospitalización."},{"key":"d","text":"Ninguna medicina legal afecta la conducción."}]'::jsonb,
    'b',
    'El handbook advierte que drogas ilegales, medicamentos de venta libre y medicamentos recetados pueden afectar reflejos, juicio, visión y estado de alerta.'
  ),
  (
    'C5-06',
    'Si estás demasiado enojado, preocupado, asustado o deprimido para concentrarte bien, ¿qué recomienda el handbook?',
    '[{"key":"a","text":"Conducir más rápido para terminar antes."},{"key":"b","text":"Dar tiempo para que pase la emoción, evitar conducir mientras persistan los síntomas o pedir que otra persona maneje."},{"key":"c","text":"Usar el teléfono para distraerte."},{"key":"d","text":"Ignorar la emoción porque no afecta la conducción."}]'::jsonb,
    'b',
    'Las emociones pueden interferir con el pensamiento y la atención. El handbook recomienda esperar a que pasen los síntomas, darse tiempo adicional o dejar que otra persona conduzca.'
  ),
  (
    'C5-07',
    'Mientras conduces un vehículo en movimiento en Utah, ¿qué uso manual de un dispositivo inalámbrico está prohibido?',
    '[{"key":"a","text":"Escribir, enviar o leer mensajes, marcar manualmente, usar internet, ver o grabar video, tomar fotografías o ingresar datos."},{"key":"b","text":"Únicamente escuchar indicaciones de navegación."},{"key":"c","text":"Usar controles de voz para conectar una llamada si eres mayor de 18 años."},{"key":"d","text":"Reportar una emergencia mediante tecnología de manos libres."}]'::jsonb,
    'a',
    'El handbook prohíbe usar manualmente un dispositivo inalámbrico mientras el vehículo está en movimiento para escribir o leer comunicaciones, marcar, usar internet, ver o grabar video, tomar fotos o ingresar datos.'
  ),
  (
    'C5-08',
    'Si comienzas a sentir fatiga durante un viaje, ¿cuál es una medida recomendada?',
    '[{"key":"a","text":"Abrir la ventana y continuar indefinidamente."},{"key":"b","text":"Detenerte en una salida o área de descanso y tomar una siesta corta de aproximadamente 20 minutos o buscar un lugar para dormir."},{"key":"c","text":"Aumentar la velocidad para llegar antes."},{"key":"d","text":"Tomar cualquier medicamento estimulante sin revisar su etiqueta."}]'::jsonb,
    'b',
    'El handbook recomienda no conducir cansado. Si aparece fatiga, debes detenerte en un lugar seguro, descansar y considerar una siesta corta de aproximadamente 20 minutos o dormir por la noche.'
  ),
  (
    'C5-09',
    '¿Cómo debes comportarte en una highway work zone?',
    '[{"key":"a","text":"Mantener la misma velocidad aunque existan conos o trabajadores."},{"key":"b","text":"Reducir la velocidad, aumentar la distancia de seguimiento, estar listo para detenerte y obedecer señales y flaggers."},{"key":"c","text":"Seguir muy cerca al vehículo de adelante para evitar que otros entren."},{"key":"d","text":"Ignorar las señales si no ves trabajadores."}]'::jsonb,
    'b',
    'En zonas de trabajo debes reducir la velocidad, aumentar la distancia, estar preparado para detenerte y obedecer señales y flaggers. Las multas por exceso de velocidad en estas zonas son al menos el doble de la multa regular.'
  ),
  (
    'C5-10',
    'Si tu vehículo comienza a derrapar, ¿qué acción coincide con las recomendaciones del handbook?',
    '[{"key":"a","text":"Pisar el freno con fuerza inmediatamente."},{"key":"b","text":"Retirar lentamente el pie del acelerador, orientar las ruedas delanteras hacia la misma dirección del derrape trasero y evitar frenar bruscamente."},{"key":"c","text":"Girar el volante en sentido contrario al derrape lo más rápido posible."},{"key":"d","text":"Acelerar para recuperar tracción."}]'::jsonb,
    'b',
    'El handbook recomienda soltar lentamente el acelerador, dirigir las ruedas delanteras en la misma dirección del derrape de las ruedas traseras, evitar sobrecorregir y no golpear los frenos.'
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
join q on q.lesson_code = l.lesson_code
where l.module_id = '7c4d9f60-1005-4b7b-9f2c-2d5e1a8c4001'::uuid
on conflict (lesson_id) do update set
  question = excluded.question,
  options = excluded.options,
  correct_key = excluded.correct_key,
  explanation = excluded.explanation,
  required = false,
  updated_at = now();

commit;

select
  count(*) as preguntas_modulo_5,
  count(*) filter (where q.required = false) as preguntas_opcionales
from public.lesson_quizzes q
join public.lessons l on l.id = q.lesson_id
where l.module_id = '7c4d9f60-1005-4b7b-9f2c-2d5e1a8c4001'::uuid
  and l.lesson_code between 'C5-01' and 'C5-10';
