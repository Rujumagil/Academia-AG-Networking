-- ============================================================
-- ACADEMIA AG · PASO 21
-- ESTRUCTURA OFICIAL UTAH DRIVER SUCCESS PROGRAM™
-- Fuente: capturas de Wix Online Programs entregadas por el usuario.
-- Objetivo: replicar nombres y orden de secciones/pasos sin sustituir
-- los videos ya importados ni romper las microevaluaciones existentes.
-- ============================================================

begin;

-- El curso queda descrito por los 129 pasos observados en Wix:
-- 123 videos + 6 cuestionarios de repaso.
update public.courses
set duration_label = '6 clases · 129 pasos · evaluaciones · manual del alumno',
    updated_at = now()
where id = '11111111-1111-4111-8111-111111111111';

-- Secciones de apertura y cierre que existen en Wix además de las seis clases.
insert into public.modules(id,course_id,title,position)
values
  ('11111111-0000-4111-8111-000000000001','11111111-1111-4111-8111-111111111111','Bienvenida y cómo usar el curso',1),
  ('11111111-0000-4111-8111-000000000008','11111111-1111-4111-8111-111111111111','Cierre del curso',8)
on conflict (id) do update set
  course_id=excluded.course_id,
  title=excluded.title,
  position=excluded.position,
  updated_at=now();

-- Orden exacto de las seis secciones académicas.
update public.modules set title='Licencias, permisos y documentación', position=2, updated_at=now() where id='11111111-aaaa-4111-8111-111111111111'::uuid;
update public.modules set title='Salud, exámenes y preparación del vehículo', position=3, updated_at=now() where id='11111111-bbbb-4111-8111-111111111111'::uuid;
update public.modules set title='Manejo básico', position=4, updated_at=now() where id='11111111-cccc-4111-8111-111111111111'::uuid;
update public.modules set title='Reglas del camino y señales', position=5, updated_at=now() where id='11111111-dddd-4111-8111-111111111111'::uuid;
update public.modules set title='Alcohol, drogas y retos al manejar', position=6, updated_at=now() where id='11111111-eeee-4111-8111-111111111111'::uuid;
update public.modules set title='Emergencias, compartir el camino y tu récord', position=7, updated_at=now() where id='11111111-ffff-4111-8111-111111111111'::uuid;

-- Títulos exactos de los 117 videos ya importados desde Wix.
create temporary table _utah_official_titles(
  module_id uuid not null,
  position integer not null,
  title text not null,
  primary key(module_id,position)
) on commit drop;

insert into _utah_official_titles(module_id,position,title) values
  ('11111111-aaaa-4111-8111-111111111111'::uuid,1,'Tu primer paso hacia la licencia'),
  ('11111111-aaaa-4111-8111-111111111111'::uuid,2,'¿Quién necesita una licencia de Utah?'),
  ('11111111-aaaa-4111-8111-111111111111'::uuid,3,'¿Quién Puede Manejar sin Obtener una Licencia de Utah?'),
  ('11111111-aaaa-4111-8111-111111111111'::uuid,4,'¿Qué es el Learner Permit?'),
  ('11111111-aaaa-4111-8111-111111111111'::uuid,5,'¿Cuánto Tiempo Debes Mantener tu Learner Permit?'),
  ('11111111-aaaa-4111-8111-111111111111'::uuid,6,'Conductores Jóvenes: Restricciones Importantes'),
  ('11111111-aaaa-4111-8111-111111111111'::uuid,7,'Provisional Class D'),
  ('11111111-aaaa-4111-8111-111111111111'::uuid,8,'Limited-Term Driver License'),
  ('11111111-aaaa-4111-8111-111111111111'::uuid,9,'Driving Privilege Card — DPC'),
  ('11111111-aaaa-4111-8111-111111111111'::uuid,10,'Documentos que debes preparar'),
  ('11111111-aaaa-4111-8111-111111111111'::uuid,11,'Renovación, reemplazo y cambio de dirección'),
  ('11111111-aaaa-4111-8111-111111111111'::uuid,12,'Caso práctico: ¿qué trámite necesita cada persona?'),
  ('11111111-aaaa-4111-8111-111111111111'::uuid,13,'Resumen'),

  ('11111111-bbbb-4111-8111-111111111111'::uuid,1,'SALUD, EXÁMENES Y PREPARACIÓN DEL VEHÍCULO'),
  ('11111111-bbbb-4111-8111-111111111111'::uuid,2,'Examen de Visión'),
  ('11111111-bbbb-4111-8111-111111111111'::uuid,3,'Tu Salud También Forma Parte de la Seguridad Vial'),
  ('11111111-bbbb-4111-8111-111111111111'::uuid,4,'Examen Escrito de Conocimientos'),
  ('11111111-bbbb-4111-8111-111111111111'::uuid,5,'Traffic Safety and Trends Exam'),
  ('11111111-bbbb-4111-8111-111111111111'::uuid,6,'Driving Skills Test'),
  ('11111111-bbbb-4111-8111-111111111111'::uuid,7,'¿Qué Evalúan Durante el Examen Práctico?'),
  ('11111111-bbbb-4111-8111-111111111111'::uuid,8,'Qué Debes Llevar al Driving Skills Test'),
  ('11111111-bbbb-4111-8111-111111111111'::uuid,9,'Revisión del Vehículo — Parte 1'),
  ('11111111-bbbb-4111-8111-111111111111'::uuid,10,'Revisión del Vehículo — Parte 2'),
  ('11111111-bbbb-4111-8111-111111111111'::uuid,11,'Errores que Pueden Provocar una Falla Automática'),
  ('11111111-bbbb-4111-8111-111111111111'::uuid,12,'Ajusta tu Asiento y tus Espejos'),
  ('11111111-bbbb-4111-8111-111111111111'::uuid,13,'Cinturones de Seguridad'),
  ('11111111-bbbb-4111-8111-111111111111'::uuid,14,'Asientos Infantiles y Booster Seats'),
  ('11111111-bbbb-4111-8111-111111111111'::uuid,15,'Airbags: Complementan el Cinturón, No lo Sustituyen'),
  ('11111111-bbbb-4111-8111-111111111111'::uuid,16,'Actividad Práctica: Inspecciona un Vehículo'),
  ('11111111-bbbb-4111-8111-111111111111'::uuid,17,'Antes de Manejar, Haz una Pausa'),
  ('11111111-bbbb-4111-8111-111111111111'::uuid,18,'Resumen: Prepárate con Seguridad'),

  ('11111111-cccc-4111-8111-111111111111'::uuid,1,'MANEJO BÁSICO'),
  ('11111111-cccc-4111-8111-111111111111'::uuid,2,'Antes de Moverte: Arranca con Orden'),
  ('11111111-cccc-4111-8111-111111111111'::uuid,3,'Reversa: Mira Atrás y Avanza Despacio'),
  ('11111111-cccc-4111-8111-111111111111'::uuid,4,'Cambio de Carril: Espejo, Señal, Punto Ciego'),
  ('11111111-cccc-4111-8111-111111111111'::uuid,5,'Incorporación: Evita el Gore Area'),
  ('11111111-cccc-4111-8111-111111111111'::uuid,6,'Método Zipper en Zonas de Fusión'),
  ('11111111-cccc-4111-8111-111111111111'::uuid,7,'Escanea Constantemente tu Entorno'),
  ('11111111-cccc-4111-8111-111111111111'::uuid,8,'Dónde Debes Detenerte'),
  ('11111111-cccc-4111-8111-111111111111'::uuid,9,'Usa Direccionales con Anticipación'),
  ('11111111-cccc-4111-8111-111111111111'::uuid,10,'Estacionamiento Seguro'),
  ('11111111-cccc-4111-8111-111111111111'::uuid,11,'Estacionamiento en Pendiente'),
  ('11111111-cccc-4111-8111-111111111111'::uuid,12,'Parallel Parking'),
  ('11111111-cccc-4111-8111-111111111111'::uuid,13,'Estacionamiento Perpendicular y en Ángulo'),
  ('11111111-cccc-4111-8111-111111111111'::uuid,14,'Rebase Seguro'),
  ('11111111-cccc-4111-8111-111111111111'::uuid,15,'Control del Volante'),
  ('11111111-cccc-4111-8111-111111111111'::uuid,16,'Haz un Alto Completo'),
  ('11111111-cccc-4111-8111-111111111111'::uuid,17,'Giros a la Derecha y a la Izquierda'),
  ('11111111-cccc-4111-8111-111111111111'::uuid,18,'Three-Point Turn y U-Turn'),
  ('11111111-cccc-4111-8111-111111111111'::uuid,19,'Práctica Real: Circuito Básico'),
  ('11111111-cccc-4111-8111-111111111111'::uuid,20,'Resumen: Controla el Vehículo con Calma'),

  ('11111111-dddd-4111-8111-111111111111'::uuid,1,'REGLAS DEL CAMINO Y SEÑALES'),
  ('11111111-dddd-4111-8111-111111111111'::uuid,2,'Flex Lanes'),
  ('11111111-dddd-4111-8111-111111111111'::uuid,3,'Freeway: Velocidad, Distancia y Disciplina'),
  ('11111111-dddd-4111-8111-111111111111'::uuid,4,'Carpool y Express Lanes'),
  ('11111111-dddd-4111-8111-111111111111'::uuid,5,'Cómo Entrar y Salir de una Vía Rápida'),
  ('11111111-dddd-4111-8111-111111111111'::uuid,6,'Ramp Meters'),
  ('11111111-dddd-4111-8111-111111111111'::uuid,7,'Intersecciones Especiales'),
  ('11111111-dddd-4111-8111-111111111111'::uuid,8,'Marcas en el Pavimento'),
  ('11111111-dddd-4111-8111-111111111111'::uuid,9,'Crosswalks y Stop Lines'),
  ('11111111-dddd-4111-8111-111111111111'::uuid,10,'Shared Center Left Turn Lane'),
  ('11111111-dddd-4111-8111-111111111111'::uuid,11,'Ley Básica de Velocidad'),
  ('11111111-dddd-4111-8111-111111111111'::uuid,12,'Cuándo Debes Reducir la Velocidad'),
  ('11111111-dddd-4111-8111-111111111111'::uuid,13,'Roundabouts'),
  ('11111111-dddd-4111-8111-111111111111'::uuid,14,'Traffic Controls'),
  ('11111111-dddd-4111-8111-111111111111'::uuid,15,'Semáforos: Verde y Amarillo'),
  ('11111111-dddd-4111-8111-111111111111'::uuid,16,'Semáforos: Rojo, Rojo Intermitente y Flechas'),
  ('11111111-dddd-4111-8111-111111111111'::uuid,17,'Familias de Señales'),
  ('11111111-dddd-4111-8111-111111111111'::uuid,18,'Derecho de Paso'),
  ('11111111-dddd-4111-8111-111111111111'::uuid,19,'Caso Práctico: Four-Way Stop'),
  ('11111111-dddd-4111-8111-111111111111'::uuid,20,'Práctica Real: Ruta de Observación'),
  ('11111111-dddd-4111-8111-111111111111'::uuid,21,'Resumen: Aprende a Leer el Camino'),

  ('11111111-eeee-4111-8111-111111111111'::uuid,1,'Tu primer paso hacia la licencia'),
  ('11111111-eeee-4111-8111-111111111111'::uuid,2,'El Deterioro Comienza Desde la Primera Bebida'),
  ('11111111-eeee-4111-8111-111111111111'::uuid,3,'No Todas las Drogas Son Ilegales'),
  ('11111111-eeee-4111-8111-111111111111'::uuid,4,'Tus Emociones También Influyen'),
  ('11111111-eeee-4111-8111-111111111111'::uuid,5,'Utah: BAC de 0.05%'),
  ('11111111-eeee-4111-8111-111111111111'::uuid,6,'Not-A-Drop: Menores de 21 Años'),
  ('11111111-eeee-4111-8111-111111111111'::uuid,7,'DUI: Las Consecuencias Pueden Durar Años'),
  ('11111111-eeee-4111-8111-111111111111'::uuid,8,'Una Distracción Puede Cambiarlo Todo'),
  ('11111111-eeee-4111-8111-111111111111'::uuid,9,'Celular y Manejo: Evita el Uso Manual'),
  ('11111111-eeee-4111-8111-111111111111'::uuid,10,'Aggressive Driving y Road Rage'),
  ('11111111-eeee-4111-8111-111111111111'::uuid,11,'Fatiga: No Confíes en tu Fuerza de Voluntad'),
  ('11111111-eeee-4111-8111-111111111111'::uuid,12,'Antes de un Road Trip'),
  ('11111111-eeee-4111-8111-111111111111'::uuid,13,'Zonas de Construcción'),
  ('11111111-eeee-4111-8111-111111111111'::uuid,14,'Manejo Nocturno'),
  ('11111111-eeee-4111-8111-111111111111'::uuid,15,'Caminos Rurales y Grava'),
  ('11111111-eeee-4111-8111-111111111111'::uuid,16,'Derrapes e Hidroplaneo'),
  ('11111111-eeee-4111-8111-111111111111'::uuid,17,'Actividad: Tu Plan Personal de Prevención'),
  ('11111111-eeee-4111-8111-111111111111'::uuid,18,'Caso Práctico: ¿Manejar o Esperar?'),
  ('11111111-eeee-4111-8111-111111111111'::uuid,19,'Resumen: La Seguridad Comienza Antes de Manejar'),
  ('11111111-eeee-4111-8111-111111111111'::uuid,20,'Extra'),

  ('11111111-ffff-4111-8111-111111111111'::uuid,1,'EMERGENCIAS, SEGURO, TU RÉCORD Y COMPARTIR EL CAMINO'),
  ('11111111-ffff-4111-8111-111111111111'::uuid,2,'Después de un Accidente: Detente'),
  ('11111111-ffff-4111-8111-111111111111'::uuid,3,'Cuándo Llamar al 911'),
  ('11111111-ffff-4111-8111-111111111111'::uuid,4,'Intercambia Información'),
  ('11111111-ffff-4111-8111-111111111111'::uuid,5,'Accidente con Daños Materiales: Muévete a un Lugar Seguro'),
  ('11111111-ffff-4111-8111-111111111111'::uuid,6,'Defensive Driving'),
  ('11111111-ffff-4111-8111-111111111111'::uuid,7,'Emergencia Mecánica: Mantén la Calma'),
  ('11111111-ffff-4111-8111-111111111111'::uuid,8,'Si una Llanta Sale del Pavimento'),
  ('11111111-ffff-4111-8111-111111111111'::uuid,9,'Seguro Obligatorio'),
  ('11111111-ffff-4111-8111-111111111111'::uuid,10,'SR22 y Consecuencias de Manejar sin Seguro'),
  ('11111111-ffff-4111-8111-111111111111'::uuid,11,'Sistema de Puntos'),
  ('11111111-ffff-4111-8111-111111111111'::uuid,12,'¿Cuándo Puede Haber una Audiencia?'),
  ('11111111-ffff-4111-8111-111111111111'::uuid,13,'Como reducir los puntos'),
  ('11111111-ffff-4111-8111-111111111111'::uuid,14,'Comparte el Camino con Respeto'),
  ('11111111-ffff-4111-8111-111111111111'::uuid,15,'Ciclistas y Peatones'),
  ('11111111-ffff-4111-8111-111111111111'::uuid,16,'Vehículos de Emergencia y Move Over Law'),
  ('11111111-ffff-4111-8111-111111111111'::uuid,17,'Camiones Grandes: Evita la No-Zone'),
  ('11111111-ffff-4111-8111-111111111111'::uuid,18,'Motocicletas y Scooters'),
  ('11111111-ffff-4111-8111-111111111111'::uuid,19,'Cruces de Tren'),
  ('11111111-ffff-4111-8111-111111111111'::uuid,20,'Equipo del Vehículo y ADAS'),
  ('11111111-ffff-4111-8111-111111111111'::uuid,21,'Remolcar un Vehículo'),
  ('11111111-ffff-4111-8111-111111111111'::uuid,22,'Actividad: Construye tu Kit de Emergencia'),
  ('11111111-ffff-4111-8111-111111111111'::uuid,23,'Caso Práctico: Choque Menor en un Estacionamiento'),
  ('11111111-ffff-4111-8111-111111111111'::uuid,24,'Cierre del Programa'),
  ('11111111-ffff-4111-8111-111111111111'::uuid,25,'Extra');

update public.lessons l
set title=t.title,
    updated_at=now()
from _utah_official_titles t
where l.module_id=t.module_id
  and l.position=t.position;

-- Bienvenida: el archivo sí está identificado en Wix Media Manager.
insert into public.lessons(
  id,module_id,title,lesson_type,video_url,duration_minutes,position,content_html
)
values(
  '22222222-0001-4222-8222-222222222222',
  '11111111-0000-4111-8111-000000000001',
  'Bienvenida',
  'video',
  'https://video.wixstatic.com/video/11f124_342da37fcf404a768814e2652000e7a2/720p/mp4/file.mp4',
  1,
  1,
  '<p>Bienvenida y orientación inicial del UTAH DRIVER SUCCESS PROGRAM™.</p>'
)
on conflict (id) do update set
  module_id=excluded.module_id,
  title=excluded.title,
  lesson_type=excluded.lesson_type,
  video_url=excluded.video_url,
  position=excluded.position,
  content_html=excluded.content_html,
  updated_at=now();

-- En las capturas Wix aparecen cuatro pasos “Extra” adicionales (clases 1–4).
-- Las capturas no exponen la URL de esos medios, por lo que se conserva la
-- estructura sin inventar una fuente de video.
insert into public.lessons(
  id,module_id,title,lesson_type,video_url,duration_minutes,position,content_html
)
values
  ('22222222-0101-4222-8222-222222222222','11111111-aaaa-4111-8111-111111111111','Extra','video',null,0,14,'<p>Video extra de esta sección. El medio original debe asociarse desde la fuente autorizada de Wix.</p>'),
  ('22222222-0201-4222-8222-222222222222','11111111-bbbb-4111-8111-111111111111','Extra','video',null,0,19,'<p>Video extra de esta sección. El medio original debe asociarse desde la fuente autorizada de Wix.</p>'),
  ('22222222-0301-4222-8222-222222222222','11111111-cccc-4111-8111-111111111111','Extra','video',null,0,21,'<p>Video extra de esta sección. El medio original debe asociarse desde la fuente autorizada de Wix.</p>'),
  ('22222222-0401-4222-8222-222222222222','11111111-dddd-4111-8111-111111111111','Extra','video',null,0,22,'<p>Video extra de esta sección. El medio original debe asociarse desde la fuente autorizada de Wix.</p>')
on conflict (id) do update set
  module_id=excluded.module_id,
  title=excluded.title,
  lesson_type=excluded.lesson_type,
  position=excluded.position,
  content_html=excluded.content_html,
  updated_at=now();

-- El último video de las clases 5 y 6 corresponde al paso “Extra”.
-- Ya conserva su URL real porque forma parte de los 117 medios importados.
update public.lessons
set title='Extra', updated_at=now()
where module_id='11111111-eeee-4111-8111-111111111111' and position=20;

update public.lessons
set title='Extra', updated_at=now()
where module_id='11111111-ffff-4111-8111-111111111111' and position=25;

-- Cierre del curso. La captura confirma el paso y su nombre, pero no la URL
-- del video “Gracias”; se crea el paso sin asignar un medio no verificado.
insert into public.lessons(
  id,module_id,title,lesson_type,video_url,duration_minutes,position,content_html
)
values(
  '22222222-0801-4222-8222-222222222222',
  '11111111-0000-4111-8111-000000000008',
  'Gracias',
  'video',
  null,
  0,
  1,
  '<p>Cierre del UTAH DRIVER SUCCESS PROGRAM™.</p>'
)
on conflict (id) do update set
  module_id=excluded.module_id,
  title=excluded.title,
  lesson_type=excluded.lesson_type,
  position=excluded.position,
  content_html=excluded.content_html,
  updated_at=now();

commit;
