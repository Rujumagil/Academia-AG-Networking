(() => {
  'use strict';

  const COURSE_ID = '7c4d9f60-8b0a-4b7b-9f2c-2d5e1a8c4f01';
  const status = document.querySelector('#status');
  const actions = document.querySelector('#actions');
  const emailNode = document.querySelector('#email');
  const resetButton = document.querySelector('#reset');

  function setStatus(message, mode = '') {
    status.className = `box ${mode}`.trim();
    status.textContent = message;
  }

  if (!window.supabase?.createClient || !window.SUPABASE_CONFIG?.url || !window.SUPABASE_CONFIG?.publishableKey) {
    setStatus('No fue posible iniciar la conexión con Academia AG.', 'err');
    return;
  }

  const db = window.supabase.createClient(
    window.SUPABASE_CONFIG.url,
    window.SUPABASE_CONFIG.publishableKey,
    { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
  );

  async function getUtahLessonIds() {
    const { data: modules, error: modulesError } = await db
      .from('modules')
      .select('id')
      .eq('course_id', COURSE_ID);
    if (modulesError) throw modulesError;

    const moduleIds = (modules || []).map(item => item.id);
    if (!moduleIds.length) return [];

    const { data: lessons, error: lessonsError } = await db
      .from('lessons')
      .select('id')
      .in('module_id', moduleIds);
    if (lessonsError) throw lessonsError;

    return (lessons || []).map(item => item.id);
  }

  async function boot() {
    const { data, error } = await db.auth.getSession();
    if (error) {
      setStatus(`No se pudo leer la sesión: ${error.message}`, 'err');
      return;
    }

    const session = data?.session;
    if (!session?.user) {
      setStatus('No hay una cuenta iniciada. Entra primero a la Academia AG con la cuenta de alumno que quieres reiniciar.', 'warn');
      const link = document.createElement('a');
      link.href = 'academia.html';
      link.textContent = 'Entrar a la academia';
      link.style.marginLeft = '0';
      status.insertAdjacentElement('afterend', link);
      return;
    }

    emailNode.textContent = session.user.email || session.user.id;
    actions.hidden = false;
    setStatus('Sesión verificada. El reinicio afectará únicamente esta cuenta.', 'ok');

    resetButton.addEventListener('click', async () => {
      if (!confirm('¿Reiniciar únicamente el progreso de videos de Utah Driver Success Program V2 para esta cuenta?')) return;

      resetButton.disabled = true;
      resetButton.textContent = 'Reiniciando…';
      setStatus('Localizando las lecciones del curso…');

      try {
        const lessonIds = await getUtahLessonIds();
        if (!lessonIds.length) throw new Error('No se encontraron lecciones del curso Utah V2.');

        const { data: beforeRows, error: beforeError } = await db
          .from('lesson_progress')
          .select('id,lesson_id,completed,watch_percentage,last_position_seconds')
          .eq('user_id', session.user.id)
          .in('lesson_id', lessonIds);
        if (beforeError) throw beforeError;

        const { error: deleteError } = await db
          .from('lesson_progress')
          .delete()
          .eq('user_id', session.user.id)
          .in('lesson_id', lessonIds);
        if (deleteError) throw deleteError;

        const { data: afterRows, error: afterError } = await db
          .from('lesson_progress')
          .select('id')
          .eq('user_id', session.user.id)
          .in('lesson_id', lessonIds);
        if (afterError) throw afterError;

        if ((afterRows || []).length) throw new Error('Todavía quedaron registros de progreso y no se completó el reinicio.');

        try {
          sessionStorage.removeItem('academia-ag:utah-v2:m1-exam-scroll');
          sessionStorage.removeItem('academia-ag:utah-v2:m2-exam-scroll');
          sessionStorage.removeItem('academia-ag:utah-v2:m3-exam-scroll');
          sessionStorage.removeItem('academia-ag:utah-v2:m4-exam-scroll');
          sessionStorage.removeItem('academia-ag:utah-v2:m5-exam-scroll');
          sessionStorage.removeItem('academia-ag:utah-v2:m6-exam-scroll');
        } catch (_) {}

        setStatus(`Progreso reiniciado correctamente. Se eliminaron ${(beforeRows || []).length} registros de video de esta cuenta.`, 'ok');
        resetButton.textContent = 'Progreso reiniciado ✓';
        setTimeout(() => {
          location.href = `academia.html?fresh=20260821.55#course/${COURSE_ID}`;
        }, 1000);
      } catch (error) {
        console.error(error);
        setStatus(`No se pudo reiniciar el progreso: ${error.message || error}`, 'err');
        resetButton.disabled = false;
        resetButton.textContent = 'Reintentar reinicio';
      }
    }, { once: true });
  }

  boot();
})();
