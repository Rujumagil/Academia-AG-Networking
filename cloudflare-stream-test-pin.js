(() => {
  'use strict';

  const RELEASE = '20260820.42';
  const COURSE_ID = '11111111-1111-4111-8111-111111111111';
  const MODULE_ID = '11111111-aaaa-4111-8111-111111111111';
  const POSITION = 1;
  const STREAM = {
    provider: 'cloudflare',
    uid: 'fb0e5bf6bb1895fd021d7555d07ba034',
    hls: 'https://customer-l4ebvl2tw1zhwagv.cloudflarestream.com/fb0e5bf6bb1895fd021d7555d07ba034/manifest/video.m3u8',
    dash: 'https://customer-l4ebvl2tw1zhwagv.cloudflarestream.com/fb0e5bf6bb1895fd021d7555d07ba034/manifest/video.mpd'
  };

  let timer = null;
  let attempts = 0;

  function targetLesson() {
    if (typeof state === 'undefined') return null;
    const course = state?.courses?.find(item => item.id === COURSE_ID);
    const module = course?.modules?.find(item => item.id === MODULE_ID);
    return module?.lessons?.find(item => Number(item.position) === POSITION) || null;
  }

  function onTargetRoute(lesson) {
    const parts = location.hash.replace(/^#/, '').split('/');
    return parts[0] === 'lesson' && parts[1] === COURSE_ID && parts[2] === lesson?.id;
  }

  function apply() {
    const lesson = targetLesson();
    if (!lesson) return false;

    lesson.stream_provider = STREAM.provider;
    lesson.stream_uid = STREAM.uid;
    lesson.stream_hls_url = STREAM.hls;
    lesson.stream_dash_url = STREAM.dash;

    document.documentElement.dataset.agStreamTestPin = RELEASE;
    document.documentElement.dataset.agStreamTestLesson = lesson.id;

    if (onTargetRoute(lesson)) {
      window.ACADEMIA_AG_STREAM_PLAYER?.mount?.();
    }
    return true;
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      attempts += 1;
      const ready = apply();
      if (!ready && attempts < 40) schedule();
    }, 150);
  }

  window.addEventListener('hashchange', schedule);
  window.addEventListener('pageshow', schedule);

  const observer = new MutationObserver(schedule);
  observer.observe(document.querySelector('#app') || document.body, { childList: true, subtree: true });

  schedule();

  window.ACADEMIA_AG_STREAM_TEST_PIN = { release: RELEASE, apply };
})();
