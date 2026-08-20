-- ============================================================
-- ACADEMIA AG · UTAH DRIVER V2
-- 124 LECCIONES CON CÓDIGOS PERMANENTES
-- Cloudflare Stream only · sin URLs todavía
-- Fecha: 2026-08-20
-- ============================================================

begin;

-- Código permanente y tipo semántico de lección.
alter table public.lessons
  add column if not exists lesson_code text,
  add column if not exists lesson_kind text not null default 'lesson';

alter table public.lessons
  drop constraint if exists lessons_lesson_kind_check;

alter table public.lessons
  add constraint lessons_lesson_kind_check
  check (lesson_kind in ('lesson','promo','welcome','closing'));

create unique index if not exists lessons_module_code_uidx
  on public.lessons(module_id, lesson_code)
  where lesson_code is not null;

-- Semilla V2. Los códigos y la pertenencia al módulo son la identidad estable.
-- La posición y el título pueden corregirse después sin cambiar el vínculo del video.
-- Nota: el respaldo antiguo repetía erróneamente el título de C1-01 en C5-01;
-- V2 lo normaliza como introducción del módulo 5 sin alterar el número de slot.
with seed(module_id, lesson_code, title, lesson_kind, position) as (
values
  ('7c4d9f60-0000-4b7b-9f2c-2d5e1a8c4001'::uuid,'INTRO-01','Bienvenida y cómo usar el curso','welcome',1),
  ('7c4d9f60-1001-4b7b-9f2c-2d5e1a8c4001'::uuid,'C1-01','Tu primer paso hacia la licencia','lesson',1),
  ('7c4d9f60-1001-4b7b-9f2c-2d5e1a8c4001'::uuid,'C1-02','¿Quién necesita una licencia de Utah?','lesson',2),
  ('7c4d9f60-1001-4b7b-9f2c-2d5e1a8c4001'::uuid,'C1-03','¿Quién Puede Manejar sin Obtener una Licencia de Utah?','lesson',3),
  ('7c4d9f60-1001-4b7b-9f2c-2d5e1a8c4001'::uuid,'C1-04','¿Qué es el Learner Permit?','lesson',4),
  ('7c4d9f60-1001-4b7b-9f2c-2d5e1a8c4001'::uuid,'C1-05','¿Cuánto Tiempo Debes Mantener tu Learner Permit?','lesson',5),
  ('7c4d9f60-1001-4b7b-9f2c-2d5e1a8c4001'::uuid,'C1-06','Conductores Jóvenes: Restricciones Importantes','lesson',6),
  ('7c4d9f60-1001-4b7b-9f2c-2d5e1a8c4001'::uuid,'C1-07','Provisional Class D','lesson',7),
  ('7c4d9f60-1001-4b7b-9f2c-2d5e1a8c4001'::uuid,'C1-08','Limited-Term Driver License','lesson',8),
  ('7c4d9f60-1001-4b7b-9f2c-2d5e1a8c4001'::uuid,'C1-09','Driving Privilege Card — DPC','lesson',9),
  ('7c4d9f60-1001-4b7b-9f2c-2d5e1a8c4001'::uuid,'C1-10','Documentos que debes preparar','lesson',10),
  ('7c4d9f60-1001-4b7b-9f2c-2d5e1a8c4001'::uuid,'C1-11','Renovación, reemplazo y cambio de dirección','lesson',11),
  ('7c4d9f60-1001-4b7b-9f2c-2d5e1a8c4001'::uuid,'C1-12','Caso práctico: ¿qué trámite necesita cada persona?','lesson',12),
  ('7c4d9f60-1001-4b7b-9f2c-2d5e1a8c4001'::uuid,'C1-13','Resumen','lesson',13),
  ('7c4d9f60-1001-4b7b-9f2c-2d5e1a8c4001'::uuid,'C1-PROMO','Contenido especial del módulo','promo',14),
  ('7c4d9f60-1002-4b7b-9f2c-2d5e1a8c4001'::uuid,'C2-01','SALUD, EXÁMENES Y PREPARACIÓN DEL VEHÍCULO','lesson',1),
  ('7c4d9f60-1002-4b7b-9f2c-2d5e1a8c4001'::uuid,'C2-02','Examen de Visión','lesson',2),
  ('7c4d9f60-1002-4b7b-9f2c-2d5e1a8c4001'::uuid,'C2-03','Tu Salud También Forma Parte de la Seguridad Vial','lesson',3),
  ('7c4d9f60-1002-4b7b-9f2c-2d5e1a8c4001'::uuid,'C2-04','Examen Escrito de Conocimientos','lesson',4),
  ('7c4d9f60-1002-4b7b-9f2c-2d5e1a8c4001'::uuid,'C2-05','Traffic Safety and Trends Exam','lesson',5),
  ('7c4d9f60-1002-4b7b-9f2c-2d5e1a8c4001'::uuid,'C2-06','Driving Skills Test','lesson',6),
  ('7c4d9f60-1002-4b7b-9f2c-2d5e1a8c4001'::uuid,'C2-07','¿Qué Evalúan Durante el Examen Práctico?','lesson',7),
  ('7c4d9f60-1002-4b7b-9f2c-2d5e1a8c4001'::uuid,'C2-08','Qué Debes Llevar al Driving Skills Test','lesson',8),
  ('7c4d9f60-1002-4b7b-9f2c-2d5e1a8c4001'::uuid,'C2-09','Revisión del Vehículo — Parte 1','lesson',9),
  ('7c4d9f60-1002-4b7b-9f2c-2d5e1a8c4001'::uuid,'C2-10','Revisión del Vehículo — Parte 2','lesson',10),
  ('7c4d9f60-1002-4b7b-9f2c-2d5e1a8c4001'::uuid,'C2-11','Errores que Pueden Provocar una Falla Automática','lesson',11),
  ('7c4d9f60-1002-4b7b-9f2c-2d5e1a8c4001'::uuid,'C2-12','Ajusta tu Asiento y tus Espejos','lesson',12),
  ('7c4d9f60-1002-4b7b-9f2c-2d5e1a8c4001'::uuid,'C2-13','Cinturones de Seguridad','lesson',13),
  ('7c4d9f60-1002-4b7b-9f2c-2d5e1a8c4001'::uuid,'C2-14','Asientos Infantiles y Booster Seats','lesson',14),
  ('7c4d9f60-1002-4b7b-9f2c-2d5e1a8c4001'::uuid,'C2-15','Airbags: Complementan el Cinturón, No lo Sustituyen','lesson',15),
  ('7c4d9f60-1002-4b7b-9f2c-2d5e1a8c4001'::uuid,'C2-16','Actividad Práctica: Inspecciona un Vehículo','lesson',16),
  ('7c4d9f60-1002-4b7b-9f2c-2d5e1a8c4001'::uuid,'C2-17','Antes de Manejar, Haz una Pausa','lesson',17),
  ('7c4d9f60-1002-4b7b-9f2c-2d5e1a8c4001'::uuid,'C2-18','Resumen: Prepárate con Seguridad','lesson',18),
  ('7c4d9f60-1002-4b7b-9f2c-2d5e1a8c4001'::uuid,'C2-PROMO','Contenido especial del módulo','promo',19),
  ('7c4d9f60-1003-4b7b-9f2c-2d5e1a8c4001'::uuid,'C3-01','MANEJO BÁSICO','lesson',1),
  ('7c4d9f60-1003-4b7b-9f2c-2d5e1a8c4001'::uuid,'C3-02','Antes de Moverte: Arranca con Orden','lesson',2),
  ('7c4d9f60-1003-4b7b-9f2c-2d5e1a8c4001'::uuid,'C3-03','Reversa: Mira Atrás y Avanza Despacio','lesson',3),
  ('7c4d9f60-1003-4b7b-9f2c-2d5e1a8c4001'::uuid,'C3-04','Cambio de Carril: Espejo, Señal, Punto Ciego','lesson',4),
  ('7c4d9f60-1003-4b7b-9f2c-2d5e1a8c4001'::uuid,'C3-05','Incorporación: Evita el Gore Area','lesson',5),
  ('7c4d9f60-1003-4b7b-9f2c-2d5e1a8c4001'::uuid,'C3-06','Método Zipper en Zonas de Fusión','lesson',6),
  ('7c4d9f60-1003-4b7b-9f2c-2d5e1a8c4001'::uuid,'C3-07','Escanea Constantemente tu Entorno','lesson',7),
  ('7c4d9f60-1003-4b7b-9f2c-2d5e1a8c4001'::uuid,'C3-08','Dónde Debes Detenerte','lesson',8),
  ('7c4d9f60-1003-4b7b-9f2c-2d5e1a8c4001'::uuid,'C3-09','Usa Direccionales con Anticipación','lesson',9),
  ('7c4d9f60-1003-4b7b-9f2c-2d5e1a8c4001'::uuid,'C3-10','Estacionamiento Seguro','lesson',10),
  ('7c4d9f60-1003-4b7b-9f2c-2d5e1a8c4001'::uuid,'C3-11','Estacionamiento en Pendiente','lesson',11),
  ('7c4d9f60-1003-4b7b-9f2c-2d5e1a8c4001'::uuid,'C3-12','Parallel Parking','lesson',12),
  ('7c4d9f60-1003-4b7b-9f2c-2d5e1a8c4001'::uuid,'C3-13','Estacionamiento Perpendicular y en Ángulo','lesson',13),
  ('7c4d9f60-1003-4b7b-9f2c-2d5e1a8c4001'::uuid,'C3-14','Rebase Seguro','lesson',14),
  ('7c4d9f60-1003-4b7b-9f2c-2d5e1a8c4001'::uuid,'C3-15','Control del Volante','lesson',15),
  ('7c4d9f60-1003-4b7b-9f2c-2d5e1a8c4001'::uuid,'C3-16','Haz un Alto Completo','lesson',16),
  ('7c4d9f60-1003-4b7b-9f2c-2d5e1a8c4001'::uuid,'C3-17','Giros a la Derecha y a la Izquierda','lesson',17),
  ('7c4d9f60-1003-4b7b-9f2c-2d5e1a8c4001'::uuid,'C3-18','Three-Point Turn y U-Turn','lesson',18),
  ('7c4d9f60-1003-4b7b-9f2c-2d5e1a8c4001'::uuid,'C3-19','Práctica Real: Circuito Básico','lesson',19),
  ('7c4d9f60-1003-4b7b-9f2c-2d5e1a8c4001'::uuid,'C3-20','Resumen: Controla el Vehículo con Calma','lesson',20),
  ('7c4d9f60-1003-4b7b-9f2c-2d5e1a8c4001'::uuid,'C3-PROMO','Contenido especial del módulo','promo',21),
  ('7c4d9f60-1004-4b7b-9f2c-2d5e1a8c4001'::uuid,'C4-01','REGLAS DEL CAMINO Y SEÑALES','lesson',1),
  ('7c4d9f60-1004-4b7b-9f2c-2d5e1a8c4001'::uuid,'C4-02','Flex Lanes','lesson',2),
  ('7c4d9f60-1004-4b7b-9f2c-2d5e1a8c4001'::uuid,'C4-03','Freeway: Velocidad, Distancia y Disciplina','lesson',3),
  ('7c4d9f60-1004-4b7b-9f2c-2d5e1a8c4001'::uuid,'C4-04','Carpool y Express Lanes','lesson',4),
  ('7c4d9f60-1004-4b7b-9f2c-2d5e1a8c4001'::uuid,'C4-05','Cómo Entrar y Salir de una Vía Rápida','lesson',5),
  ('7c4d9f60-1004-4b7b-9f2c-2d5e1a8c4001'::uuid,'C4-06','Ramp Meters','lesson',6),
  ('7c4d9f60-1004-4b7b-9f2c-2d5e1a8c4001'::uuid,'C4-07','Intersecciones Especiales','lesson',7),
  ('7c4d9f60-1004-4b7b-9f2c-2d5e1a8c4001'::uuid,'C4-08','Marcas en el Pavimento','lesson',8),
  ('7c4d9f60-1004-4b7b-9f2c-2d5e1a8c4001'::uuid,'C4-09','Crosswalks y Stop Lines','lesson',9),
  ('7c4d9f60-1004-4b7b-9f2c-2d5e1a8c4001'::uuid,'C4-10','Shared Center Left Turn Lane','lesson',10),
  ('7c4d9f60-1004-4b7b-9f2c-2d5e1a8c4001'::uuid,'C4-11','Ley Básica de Velocidad','lesson',11),
  ('7c4d9f60-1004-4b7b-9f2c-2d5e1a8c4001'::uuid,'C4-12','Cuándo Debes Reducir la Velocidad','lesson',12),
  ('7c4d9f60-1004-4b7b-9f2c-2d5e1a8c4001'::uuid,'C4-13','Roundabouts','lesson',13),
  ('7c4d9f60-1004-4b7b-9f2c-2d5e1a8c4001'::uuid,'C4-14','Traffic Controls','lesson',14),
  ('7c4d9f60-1004-4b7b-9f2c-2d5e1a8c4001'::uuid,'C4-15','Semáforos: Verde y Amarillo','lesson',15),
  ('7c4d9f60-1004-4b7b-9f2c-2d5e1a8c4001'::uuid,'C4-16','Semáforos: Rojo, Rojo Intermitente y Flechas','lesson',16),
  ('7c4d9f60-1004-4b7b-9f2c-2d5e1a8c4001'::uuid,'C4-17','Familias de Señales','lesson',17),
  ('7c4d9f60-1004-4b7b-9f2c-2d5e1a8c4001'::uuid,'C4-18','Derecho de Paso','lesson',18),
  ('7c4d9f60-1004-4b7b-9f2c-2d5e1a8c4001'::uuid,'C4-19','Caso Práctico: Four-Way Stop','lesson',19),
  ('7c4d9f60-1004-4b7b-9f2c-2d5e1a8c4001'::uuid,'C4-20','Práctica Real: Ruta de Observación','lesson',20),
  ('7c4d9f60-1004-4b7b-9f2c-2d5e1a8c4001'::uuid,'C4-21','Resumen: Aprende a Leer el Camino','lesson',21),
  ('7c4d9f60-1004-4b7b-9f2c-2d5e1a8c4001'::uuid,'C4-PROMO','Contenido especial del módulo','promo',22),
  ('7c4d9f60-1005-4b7b-9f2c-2d5e1a8c4001'::uuid,'C5-01','Introducción: Alcohol, drogas y retos al manejar','lesson',1),
  ('7c4d9f60-1005-4b7b-9f2c-2d5e1a8c4001'::uuid,'C5-02','El Deterioro Comienza Desde la Primera Bebida','lesson',2),
  ('7c4d9f60-1005-4b7b-9f2c-2d5e1a8c4001'::uuid,'C5-03','No Todas las Drogas Son Ilegales','lesson',3),
  ('7c4d9f60-1005-4b7b-9f2c-2d5e1a8c4001'::uuid,'C5-04','Tus Emociones También Influyen','lesson',4),
  ('7c4d9f60-1005-4b7b-9f2c-2d5e1a8c4001'::uuid,'C5-05','Utah: BAC de 0.05%','lesson',5),
  ('7c4d9f60-1005-4b7b-9f2c-2d5e1a8c4001'::uuid,'C5-06','Not-A-Drop: Menores de 21 Años','lesson',6),
  ('7c4d9f60-1005-4b7b-9f2c-2d5e1a8c4001'::uuid,'C5-07','DUI: Las Consecuencias Pueden Durar Años','lesson',7),
  ('7c4d9f60-1005-4b7b-9f2c-2d5e1a8c4001'::uuid,'C5-08','Una Distracción Puede Cambiarlo Todo','lesson',8),
  ('7c4d9f60-1005-4b7b-9f2c-2d5e1a8c4001'::uuid,'C5-09','Celular y Manejo: Evita el Uso Manual','lesson',9),
  ('7c4d9f60-1005-4b7b-9f2c-2d5e1a8c4001'::uuid,'C5-10','Aggressive Driving y Road Rage','lesson',10),
  ('7c4d9f60-1005-4b7b-9f2c-2d5e1a8c4001'::uuid,'C5-11','Fatiga: No Confíes en tu Fuerza de Voluntad','lesson',11),
  ('7c4d9f60-1005-4b7b-9f2c-2d5e1a8c4001'::uuid,'C5-12','Antes de un Road Trip','lesson',12),
  ('7c4d9f60-1005-4b7b-9f2c-2d5e1a8c4001'::uuid,'C5-13','Zonas de Construcción','lesson',13),
  ('7c4d9f60-1005-4b7b-9f2c-2d5e1a8c4001'::uuid,'C5-14','Manejo Nocturno','lesson',14),
  ('7c4d9f60-1005-4b7b-9f2c-2d5e1a8c4001'::uuid,'C5-15','Caminos Rurales y Grava','lesson',15),
  ('7c4d9f60-1005-4b7b-9f2c-2d5e1a8c4001'::uuid,'C5-16','Derrapes e Hidroplaneo','lesson',16),
  ('7c4d9f60-1005-4b7b-9f2c-2d5e1a8c4001'::uuid,'C5-17','Actividad: Tu Plan Personal de Prevención','lesson',17),
  ('7c4d9f60-1005-4b7b-9f2c-2d5e1a8c4001'::uuid,'C5-18','Caso Práctico: ¿Manejar o Esperar?','lesson',18),
  ('7c4d9f60-1005-4b7b-9f2c-2d5e1a8c4001'::uuid,'C5-19','Resumen: La Seguridad Comienza Antes de Manejar','lesson',19),
  ('7c4d9f60-1005-4b7b-9f2c-2d5e1a8c4001'::uuid,'C5-20','Extra','lesson',20),
  ('7c4d9f60-1005-4b7b-9f2c-2d5e1a8c4001'::uuid,'C5-PROMO','Contenido especial del módulo','promo',21),
  ('7c4d9f60-1006-4b7b-9f2c-2d5e1a8c4001'::uuid,'C6-01','EMERGENCIAS, SEGURO, TU RÉCORD Y COMPARTIR EL CAMINO','lesson',1),
  ('7c4d9f60-1006-4b7b-9f2c-2d5e1a8c4001'::uuid,'C6-02','Después de un Accidente: Detente','lesson',2),
  ('7c4d9f60-1006-4b7b-9f2c-2d5e1a8c4001'::uuid,'C6-03','Cuándo Llamar al 911','lesson',3),
  ('7c4d9f60-1006-4b7b-9f2c-2d5e1a8c4001'::uuid,'C6-04','Intercambia Información','lesson',4),
  ('7c4d9f60-1006-4b7b-9f2c-2d5e1a8c4001'::uuid,'C6-05','Accidente con Daños Materiales: Muévete a un Lugar Seguro','lesson',5),
  ('7c4d9f60-1006-4b7b-9f2c-2d5e1a8c4001'::uuid,'C6-06','Defensive Driving','lesson',6),
  ('7c4d9f60-1006-4b7b-9f2c-2d5e1a8c4001'::uuid,'C6-07','Emergencia Mecánica: Mantén la Calma','lesson',7),
  ('7c4d9f60-1006-4b7b-9f2c-2d5e1a8c4001'::uuid,'C6-08','Si una Llanta Sale del Pavimento','lesson',8),
  ('7c4d9f60-1006-4b7b-9f2c-2d5e1a8c4001'::uuid,'C6-09','Seguro Obligatorio','lesson',9),
  ('7c4d9f60-1006-4b7b-9f2c-2d5e1a8c4001'::uuid,'C6-10','SR22 y Consecuencias de Manejar sin Seguro','lesson',10),
  ('7c4d9f60-1006-4b7b-9f2c-2d5e1a8c4001'::uuid,'C6-11','Sistema de Puntos','lesson',11),
  ('7c4d9f60-1006-4b7b-9f2c-2d5e1a8c4001'::uuid,'C6-12','¿Cuándo Puede Haber una Audiencia?','lesson',12),
  ('7c4d9f60-1006-4b7b-9f2c-2d5e1a8c4001'::uuid,'C6-13','Como reducir los puntos','lesson',13),
  ('7c4d9f60-1006-4b7b-9f2c-2d5e1a8c4001'::uuid,'C6-14','Comparte el Camino con Respeto','lesson',14),
  ('7c4d9f60-1006-4b7b-9f2c-2d5e1a8c4001'::uuid,'C6-15','Ciclistas y Peatones','lesson',15),
  ('7c4d9f60-1006-4b7b-9f2c-2d5e1a8c4001'::uuid,'C6-16','Vehículos de Emergencia y Move Over Law','lesson',16),
  ('7c4d9f60-1006-4b7b-9f2c-2d5e1a8c4001'::uuid,'C6-17','Camiones Grandes: Evita la No-Zone','lesson',17),
  ('7c4d9f60-1006-4b7b-9f2c-2d5e1a8c4001'::uuid,'C6-18','Motocicletas y Scooters','lesson',18),
  ('7c4d9f60-1006-4b7b-9f2c-2d5e1a8c4001'::uuid,'C6-19','Cruces de Tren','lesson',19),
  ('7c4d9f60-1006-4b7b-9f2c-2d5e1a8c4001'::uuid,'C6-20','Equipo del Vehículo y ADAS','lesson',20),
  ('7c4d9f60-1006-4b7b-9f2c-2d5e1a8c4001'::uuid,'C6-21','Remolcar un Vehículo','lesson',21),
  ('7c4d9f60-1006-4b7b-9f2c-2d5e1a8c4001'::uuid,'C6-22','Actividad: Construye tu Kit de Emergencia','lesson',22),
  ('7c4d9f60-1006-4b7b-9f2c-2d5e1a8c4001'::uuid,'C6-23','Caso Práctico: Choque Menor en un Estacionamiento','lesson',23),
  ('7c4d9f60-1006-4b7b-9f2c-2d5e1a8c4001'::uuid,'C6-24','Cierre del Programa','lesson',24),
  ('7c4d9f60-1006-4b7b-9f2c-2d5e1a8c4001'::uuid,'C6-25','Extra','lesson',25),
  ('7c4d9f60-9999-4b7b-9f2c-2d5e1a8c4001'::uuid,'CIERRE-01','Mensaje final de Angélica Gallardo','closing',1)
)
insert into public.lessons(
  id,module_id,title,lesson_type,video_url,duration_minutes,position,content_html,
  lesson_code,lesson_kind,stream_provider,stream_uid,stream_hls_url,stream_dash_url,
  stream_thumbnail_url,stream_duration_seconds
)
select
  gen_random_uuid(),s.module_id,s.title,'video',null,0,s.position,
  case
    when s.lesson_kind='promo' then '<p>Contenido especial de AG Business Networking para complementar este módulo.</p>'
    when s.lesson_kind='welcome' then '<p>Bienvenida e instrucciones para comenzar el Utah Driver Success Program™.</p>'
    when s.lesson_kind='closing' then '<p>Mensaje final para cerrar el Utah Driver Success Program™.</p>'
    else null
  end,
  s.lesson_code,s.lesson_kind,null,null,null,null,null,null
from seed s
on conflict (module_id, lesson_code)
where lesson_code is not null
do update set
  title=excluded.title,
  lesson_type='video',
  video_url=null,
  duration_minutes=excluded.duration_minutes,
  position=excluded.position,
  content_html=excluded.content_html,
  lesson_kind=excluded.lesson_kind,
  stream_provider=null,
  stream_uid=null,
  stream_hls_url=null,
  stream_dash_url=null,
  stream_thumbnail_url=null,
  stream_duration_seconds=null,
  updated_at=now();

commit;

-- VERIFICACIÓN: 124 total = 1 bienvenida + 117 académicas + 5 promos + 1 cierre.
select
  count(*) as total_lecciones,
  count(*) filter (where l.lesson_kind='welcome') as bienvenida,
  count(*) filter (where l.lesson_kind='lesson') as academicas,
  count(*) filter (where l.lesson_kind='promo') as promos,
  count(*) filter (where l.lesson_kind='closing') as cierre,
  count(*) filter (where l.stream_uid is not null) as con_stream,
  count(*) filter (where l.video_url is not null) as con_video_legacy
from public.lessons l
join public.modules m on m.id=l.module_id
where m.course_id='7c4d9f60-8b0a-4b7b-9f2c-2d5e1a8c4f01'::uuid;
