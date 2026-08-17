-- ============================================================
-- ACADEMIA AG · PASO 18
-- IMPORTACIÓN UTAH DRIVER SUCCESS PROGRAM™ DESDE WIX
-- Fuente: Wix Online Programs + Wix Media Manager de AG Business Networking
-- Conserva los archivos en Wix y guarda únicamente enlaces públicos de reproducción.
-- ============================================================

begin;

-- Metadatos del programa publicado en Wix.
update public.courses
set
  title = 'UTAH DRIVER SUCCESS PROGRAM™',
  subtitle = 'Aprende • Aprueba • Conduce con Confianza.',
  description = 'UTAH DRIVER SUCCESS PROGRAM™ es un curso práctico y profesional para ayudarte a prepararte paso a paso para obtener tu licencia de conducir en Utah. Aprenderás con explicaciones claras, ejemplos visuales, actividades, evaluaciones y materiales descargables. El objetivo no es solo memorizar respuestas, sino comprender las reglas de tránsito y tomar decisiones seguras al volante. Conocerás los tipos de licencias y permisos, los documentos necesarios, los requisitos para menores de edad y los trámites más frecuentes. También te prepararás para el examen de visión, el Written Knowledge Test, el Traffic Safety and Trends Exam y el Driving Skills Test. Además, aprenderás a ajustar tu asiento y espejos, usar correctamente el cinturón y revisar tu vehículo antes de conducir. Incluye workbook, checklists, resúmenes y prácticas para avanzar con confianza. Aprende • Aprueba • Conduce con Confianza.',
  cover_url = 'https://static.wixstatic.com/media/11f124_cf6ddf0df5044739a4032c389bf96883~mv2.jpg',
  category = 'Vida en Utah',
  status = 'published',
  featured = true,
  instructor_name = 'Equipo AG Business Networking',
  duration_label = '6 clases · 117 videos · evaluaciones · manual del alumno',
  price = 49,
  sale_price = null,
  updated_at = now()
where id = '11111111-1111-4111-8111-111111111111';

-- Elimina únicamente las siete lecciones de ejemplo que se precargaron antes de
-- disponer del contenido real de Wix. No toca contenido que un administrador haya creado después.
delete from public.lessons
where id in (
  '11111111-0001-4111-8111-111111111111',
  '11111111-0002-4111-8111-111111111111',
  '11111111-0003-4111-8111-111111111111',
  '11111111-0004-4111-8111-111111111111',
  '11111111-0005-4111-8111-111111111111',
  '11111111-0006-4111-8111-111111111111',
  '11111111-0007-4111-8111-111111111111'
);

-- Manual del alumno. Se enlaza desde Wix para evitar duplicar un PDF de ~1 GB.
insert into public.resources
(id,course_id,title,description,resource_type,external_url,is_public,thumbnail_url,created_by)
values(
  'aaaaaaaa-0001-4000-8000-aaaaaaaaaaaa',
  '11111111-1111-4111-8111-111111111111',
  'Manual de Actividades del Alumno',
  'Manual oficial del alumno del UTAH DRIVER SUCCESS PROGRAM™, servido desde la biblioteca multimedia de AG en Wix.',
  'pdf',
  'https://87475bb5-1c1c-41db-8e76-04d919e82cd1.usrfiles.com/ugd/11f124_5ba8e34555d643789d8dca92b8d61097.pdf',
  false,
  'recurso-utah-driver.webp',
  (select created_by from public.courses where id='11111111-1111-4111-8111-111111111111')
)
on conflict (id) do update set
  course_id=excluded.course_id,
  title=excluded.title,
  description=excluded.description,
  resource_type=excluded.resource_type,
  external_url=excluded.external_url,
  is_public=excluded.is_public,
  thumbnail_url=excluded.thumbnail_url;

create temporary table _wix_driver_media (
  module_id uuid not null,
  module_title text not null,
  media_ids text[] not null
) on commit drop;

insert into _wix_driver_media(module_id,module_title,media_ids) values
(
  '11111111-aaaa-4111-8111-111111111111',
  'Licencias, permisos y documentación',
  array[
    '901a17f55eb647c8ad5b7214ca03b10f','8fae233c7c184ad9b7ed1e4f7aed8897','f0c786eac0d4444b87efa28100906b98','66505b1a87b34d28b30e6c681497330d','30747b689864408d9fc4e4491f7ca1a7','59d49aabbc244451a13309afd9db4660','c2acdb71d46a4cb0b3fcfb38022a9b01','72942e7c6d134f15b55bbb8619055664','95fe9fba0e7248808749897ca5a00162','3b5bfe4fe33c412c8c2beebb3a0c7455','f969136419834af1a67ba36ce6ade6c5','00156e60ad9e40c5844285969c0a9a08','ed3c2b1bbf1d4ccc84e168d583c337bd'
  ]
),
(
  '11111111-bbbb-4111-8111-111111111111',
  'Salud, exámenes y preparación del vehículo',
  array[
    'ceca8c85b7224f91b79d76705b8a7f3f','b6ab72835c2a4a4585c9ba51a35b6f3e','2a69943560ee4b098b7970596c20c23f','e7586830b58d4b8f94807d0a5cb65496','ecdefdb055c74b1e869a37da9020ce9e','1910619c9c8f469fb159cf6fdc128cec','abb997bac5544bdfb6614e039cd7be68','7fe32bb6fd2e4335abbb09f427ba3923','a51e0c1ed96d41539f24459fd393cba0','4c203bd8df2141c08978ef47dd9f1df4','168d750d17674cbcb449afd952e33158','e154dc5f2cf04888aea8cd59a4d5f943','b558d0629fb8467385b55bbcd3614dee','b8a98cc0518c45f2b6bc151604619193','aed49f614b9548d5ab45765edf1064ea','24212c001a344e8a978869aed9d100ed','3b887bb3eecf4cf9be111778da5723aa','1103351d62f040cbafdaebaf80413766'
  ]
),
(
  '11111111-cccc-4111-8111-111111111111',
  'Manejo básico',
  array[
    '40c7c56fa19f49f9903d4486e691a842','bebf823127bb44849f4ebe6b1d322aa8','8b2a22dee2424f81acc8987affd857ce','6885c1b8aed241abbd127b380a2315b4','81f2bd4cb4fd4d4e9e2eaae3d5698630','f8e37223e40443ce8c0ff98546098bdc','a458a2d6eef346608426eb21140e2e16','1f4f9cd030fd4a3d82b0c4a31539c00b','d46a67140f564ce2b6e13d564272753b','754056b8ce60402d87489ea64be53d59','ace8bec503f144c9a759d64fd6303b9a','9a68f15c0d3840f7b74eeb225c1ee8c3','42565b84db174ba282e2c095c51ff094','1b25a4b022014329af7d76e7ec2b5ff8','a4a5c4ee505c49eba6aac2b87210657c','6271754d15f34b1a999f41d1ab20ab5f','1b97d803fff348b2b45a36533e00d959','7676435f44774cac969b68e78c210a1e','f075c1fdc1224df1b7ff621ba3daeddc','baad1c7cb42943c2b99414864403d4f7'
  ]
),
(
  '11111111-dddd-4111-8111-111111111111',
  'Reglas del camino y señales',
  array[
    'cbb3e5f99cde4f66a90b8fd831c66b94','0ad71959723a4e8fb3e004552eb8c70d','92af135bea0f445cb9182b9cce09a396','94e848c5e079437580b52783e1e317b4','489e7ea3c4484c199b386ad05c68700b','f4ce9e8166354b78808dcd6461929140','c827ae028ca2487e8f09a15de7bded8c','9fd70115d1aa40d79a6e47c13c652404','da45e568547b49b2a7529856f44d978d','ee64acfdbdee43c6840fe5a0ca5a9661','7e1818d1ded84ad78b86d3153028c0ac','a388edd45218441b90badff63678a570','c415a9505b924d1687bec37097b3d375','d3aba0a8708d471eb75efe0d7e230026','31cc3d6945794b26a6edc4dd4ecee970','96606e9375ba45de8736c3341568c87f','98ecc2f76b6d4f7eac0e0967e41815c7','04874acf87b645bdadd0947a543f8432','697adfb326db4becbce0901713d147b6','1965454a91c947c8a02ea906b399280d','f5117a599c2d4a3590f03582be419aa3'
  ]
),
(
  '11111111-eeee-4111-8111-111111111111',
  'Alcohol, drogas y retos al manejar',
  array[
    '3246277d72e940aebaaed727d734896e','16a73cb341bc4d3590f0bf5b588825d8','40d8120e8e13415486cbe75d4cbbe00a','e1cb9d048032478297cec703ce8e4a37','5c63cfb8200d4a55859abd2a7e8d9a92','02737cf308ce4f9587a63ce649e563e9','f1d5e381c16f465e91aba9983a52872e','6160d54ef78643efa100292c9349238a','70be34324f25484a992d309ccdc99bfb','7005a4af4a63479eac3f28edfcc15b68','dc190678241746d683937d0aadb071d2','bb5d652f692e47838d25cf0aa5dbc8e9','3a301ab5a1044c958ddad4acb542e895','2da61f734a5041b4882580742c880f5d','5a91bad55b8e4670942e14e918a04260','51a9d4fd2c7b403ca9222b03d3c8ee05','46a5882e0acd4401a41abfa49f85e3b5','8d97ec2e69344884b43fc86fc7ebb8d6','e79afaaa03b34171ba7480e1f8504f13','72b84651e860431f99124c9a49626471'
  ]
),
(
  '11111111-ffff-4111-8111-111111111111',
  'Emergencias, compartir el camino y tu récord',
  array[
    '47ba655036cf4a0a88bb1682110298f9','7a57cc39d3d8487a8875e1926ff9b636','55845310160a4ec4afd18c46742288ed','53b3d302676749de95e8cfe3ffa59f4b','623d1d2f921c4e1c9702634caed3196d','3bed9b9234d443508fdb0a70f75253b7','8a1ce5ebe7ed40339fb22c50062c62e1','36a913a765c048919c20609d519cf72b','3f47414dc27b4b388ae34438c8aebcc5','910796aaf6a74121b90bdbf1f1ebe9e5','7fd10ac7726848abacbb6f5cf0a302a4','a2de73f2bf094ffc86e6307b4630366b','d45adfe9540d4d02ba080a13e19f50a7','6905a198b8304c3b9467b00585443f0d','ab33558828db4dac88d8db0917d97e03','2e6fc9242fc2437bad48a7c57749063f','ab7b7a2a0db84976b9bccfc7fb7ac0be','f21a568942604ce0ad807df775851e50','e21656e0299543a89631f8079a83686a','cdd58866131549b2a7700529d92fcb61','ea24c7c9af504097a1e99093df8b7d7f','84ee9e7734534510a642576b9dd74c3d','85d68dc4df534a81a92f7e1c15a7a718','a3550019f28a42f490e25b0a41b25d0f','feb9a7a2f3d24a6c8c6d9f5041266e27'
  ]
);

-- Convierte cada archivo de Wix en una lección reproducible. El ID de Media Manager
-- se conserva implícitamente dentro de la URL para auditoría y futuras sustituciones.
insert into public.lessons(module_id,title,lesson_type,video_url,duration_minutes,position,content_html)
select
  src.module_id,
  src.module_title || ' · Video ' || lpad(v.position::text,2,'0'),
  'video',
  'https://video.wixstatic.com/video/11f124_' || v.media_id || '/720p/mp4/file.mp4',
  1,
  v.position::integer,
  '<p>Segmento audiovisual original del UTAH DRIVER SUCCESS PROGRAM™ alojado en Wix Media.</p>'
from _wix_driver_media src
cross join lateral unnest(src.media_ids) with ordinality as v(media_id,position)
where not exists (
  select 1 from public.lessons existing
  where existing.video_url = 'https://video.wixstatic.com/video/11f124_' || v.media_id || '/720p/mp4/file.mp4'
);

-- Asegura el orden de los seis módulos del curso.
update public.modules set position=1, title='Licencias, permisos y documentación' where id='11111111-aaaa-4111-8111-111111111111';
update public.modules set position=2, title='Salud, exámenes y preparación del vehículo' where id='11111111-bbbb-4111-8111-111111111111';
update public.modules set position=3, title='Manejo básico' where id='11111111-cccc-4111-8111-111111111111';
update public.modules set position=4, title='Reglas del camino y señales' where id='11111111-dddd-4111-8111-111111111111';
update public.modules set position=5, title='Alcohol, drogas y retos al manejar' where id='11111111-eeee-4111-8111-111111111111';
update public.modules set position=6, title='Emergencias, compartir el camino y tu récord' where id='11111111-ffff-4111-8111-111111111111';

commit;
