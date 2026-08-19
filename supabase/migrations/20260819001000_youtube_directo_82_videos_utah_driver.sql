begin;

with video_map(module_position, lesson_position, video_id) as (
  values
    (1, 1, 'aiIsKF3sCo8'),
    (2, 1, 'VIalfvelkz0'),
    (2, 2, 'C8qB7kRyrjI'),
    (2, 3, 'HqT7C8ANIFo'),
    (2, 4, 'ZDDB1NPIlvk'),
    (2, 5, '1paWtTqq8ME'),
    (2, 6, 'u45L6abhwRM'),
    (2, 7, 'bMhuAUEXnOI'),
    (2, 8, 'UrpFzpqpD2Q'),
    (2, 9, 'TYzYyJmP0uk'),
    (2, 10, 'yf8b1NgbV2E'),
    (2, 11, 'r5y8LW53xb0'),
    (2, 12, 'RBQ4DA1muRo'),
    (2, 13, 'DIQlbpmYXVc'),
    (2, 14, '7SHmMiYQrPo'),
    (3, 1, 'sNwpqvfoD1k'),
    (3, 2, 'ngVfTLFkLYo'),
    (3, 3, 'J-yjdjIZ30c'),
    (3, 4, 'cuTUbD1vR_8'),
    (3, 5, 'mJKyYdkydzs'),
    (3, 6, 'yPx3-u2G_b8'),
    (3, 7, 'bnYQLhCj1yI'),
    (3, 8, 'OuonW4UKmMQ'),
    (3, 9, 'Xf4MmlKU7tY'),
    (3, 10, 'zs0fE-nu3-s'),
    (3, 11, 'tBEk3l6vgr4'),
    (3, 12, 'QSfm-4t8wv0'),
    (3, 13, 'SSkApQIPQYg'),
    (3, 14, '6uUtnzxoCT4'),
    (3, 15, 'LYwuRxqEitU'),
    (3, 16, 'yhPB7uTEdW8'),
    (3, 17, '8et7JlkuB4I'),
    (3, 18, '0NGx990n5pE'),
    (3, 19, '2lhShzmvCjs'),
    (4, 1, '2yC9cstFLj0'),
    (4, 2, '3y4ngxg1iyI'),
    (4, 3, '4VDMXz6QHvM'),
    (4, 4, '4XpGeuUS0-w'),
    (4, 5, '6r_HHeiNjTI'),
    (4, 6, '76z48EjctVU'),
    (4, 7, 'CXtKUFjROK0'),
    (4, 8, 'DwEyewnWmno'),
    (4, 9, 'E49MctjoJ-U'),
    (4, 10, 'G0Li8_0LyAQ'),
    (4, 11, 'GI_ogJxmcqE'),
    (4, 12, 'Ge5P4bfkP8s'),
    (4, 13, 'H78q02HO6bs'),
    (4, 14, 'HPb4PL05E1g'),
    (4, 15, 'HzvK4wH1l0Y'),
    (4, 16, 'I4k7kl2ulN8'),
    (4, 17, 'Jh1NpHZmHZk'),
    (4, 18, 'N9Wi5ukuYwo'),
    (4, 19, 'Prm9pHNE86Q'),
    (4, 20, 'RchGISb7B-A'),
    (4, 21, 'VfPk94HytMQ'),
    (5, 1, 'W6faLNRyRB4'),
    (5, 2, 'Y2qpb129v7w'),
    (5, 3, 'YCWSpp73UrY'),
    (5, 4, 'YNBSPW9GPJo'),
    (5, 5, 'bMipCL89PJE'),
    (5, 6, 'clawNm0tOmM'),
    (5, 7, 'eDmpV79laFU'),
    (5, 8, 'gx-_Zd3yjqI'),
    (5, 9, 'h784KYG6ZP0'),
    (5, 10, 'hH5c_4aqA98'),
    (5, 11, 'j4ue_dRGVQA'),
    (5, 12, 'jP5SyJHtc30'),
    (5, 13, 'jQ2TYggAyJ4'),
    (5, 14, 'kML6qSS0LrI'),
    (5, 15, 'kavWS6eyqS0'),
    (5, 16, 'lSR3Y1XIyR0'),
    (5, 17, 'mbG_yekrPLY'),
    (5, 18, 'pb3fWyY0qyU'),
    (5, 19, 'phTH5-eUez8'),
    (5, 20, 'rIi8J_z1KFE'),
    (5, 21, 'vQUq9rXEN4M'),
    (5, 22, 'xVRMj-2_XO4'),
    (6, 1, 'y4YnCRnxqxg'),
    (6, 2, 'yKMGwCLKSfs'),
    (6, 3, 'zE72fyWco9M'),
    (6, 4, 'zPTSXyFxXek'),
    (6, 5, 'zd2tIlpeXQA')
)
update public.lessons as l
set video_url = 'https://www.youtube-nocookie.com/embed/' || v.video_id || '?rel=0&playsinline=1&enablejsapi=1&modestbranding=1',
    updated_at = now()
from public.modules as m,
     video_map as v
where l.module_id = m.id
  and m.course_id = '11111111-1111-4111-8111-111111111111'::uuid
  and m.position = v.module_position
  and l.position = v.lesson_position;

commit;

select count(*) as videos_youtube_asignados
from public.lessons l
join public.modules m on m.id = l.module_id
where m.course_id = '11111111-1111-4111-8111-111111111111'::uuid
  and l.video_url like 'https://www.youtube-nocookie.com/embed/%';
