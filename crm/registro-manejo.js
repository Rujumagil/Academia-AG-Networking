(() => {
  'use strict';

  const root = document.getElementById('driver-app');
  const toastNode = document.getElementById('crm-toast');
  const cfg = window.SUPABASE_CONFIG || {};
  const db = window.supabase?.createClient && cfg.url && cfg.publishableKey
    ? window.supabase.createClient(cfg.url, cfg.publishableKey, {
        auth: { persistSession:true, autoRefreshToken:true, detectSessionInUrl:true }
      })
    : null;

  const state = { user:null, profile:null, role:null, candidates:[], selectedId:null, search:'', filter:'all' };
  const stages = {
    new:'Nuevo', contacted:'Contactado', qualified:'Calificado', appointment:'Cita',
    follow_up:'Seguimiento', proposal:'Propuesta', enrolled:'Inscrito',
    won:'Ganado', lost:'Perdido', unreachable:'No localizado'
  };

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, char => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;'
    }[char]));
  }
  function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('es-MX', {
      year:'numeric', month:'short', day:'2-digit', hour:'2-digit', minute:'2-digit'
    });
  }
  function notify(message, error = false) {
    if (!toastNode) return;
    toastNode.textContent = message;
    toastNode.className = 'crm-toast show' + (error ? ' error' : '');
    clearTimeout(notify.timeout);
    notify.timeout = setTimeout(() => { toastNode.className = 'crm-toast'; }, 3500);
  }
  function loading() {
    root.innerHTML = '<main class="crm-loading"><div><div class="crm-spinner"></div><p>Consultando registros de manejo…</p></div></main>';
  }
  function login(message = '') {
    root.innerHTML = '<main class="crm-login"><section class="crm-login-card">' +
      '<img src="../logo-completo-oficial.png" alt="AG Business Networking">' +
      '<h1>Chats de registro</h1><p>Ingresa con tu cuenta autorizada del CRM AG.</p>' +
      '<form id="driver-login"><label class="crm-field"><span>Correo</span><input name="email" type="email" autocomplete="username" required></label>' +
      '<label class="crm-field"><span>Contraseña</span><input name="password" type="password" autocomplete="current-password" required></label>' +
      '<button class="crm-button primary">Entrar</button><p id="driver-login-error" role="alert">' +
      escapeHtml(message) + '</p></form><a href="./">Volver al CRM general</a></section></main>';
    document.getElementById('driver-login').addEventListener('submit', async event => {
      event.preventDefault();
      const fields = new FormData(event.currentTarget);
      const answer = await db.auth.signInWithPassword({
        email:String(fields.get('email') || '').trim(),
        password:String(fields.get('password') || '')
      });
      if (answer.error) document.getElementById('driver-login-error').textContent = 'No se pudo iniciar sesión. Verifica tus datos.';
      else await boot();
    });
  }
  function deny() {
    root.innerHTML = '<main class="driver-alert"><img src="../logo-completo-oficial.png" alt="AG Business Networking">' +
      '<h1>Acceso restringido</h1><p>Esta sección contiene conversaciones privadas. Solo el equipo autorizado del CRM AG puede consultarlas.</p>' +
      '<a class="driver-link" href="./">Volver al CRM</a></main>';
  }
  function conversationFor(candidate) {
    const meta = candidate.metadata || {};
    const campaign = meta.campaign || {};
    const history = campaign.registration_chat || candidate.utm?.registration_chat;
    if (!Array.isArray(history)) return [];
    return history.filter(item => item && typeof item.text === 'string')
      .slice(0, 100)
      .map(item => ({
        kind:['agent','user','system','summary'].includes(item.kind) ? item.kind : 'system',
        text:item.text.slice(0, 2200)
      }));
  }
  function filteredCandidates() {
    const q = state.search.toLocaleLowerCase('es');
    return state.candidates.filter(candidate => {
      if (state.filter === 'new' && candidate.stage !== 'new') return false;
      if (state.filter === 'follow_up' && candidate.stage !== 'follow_up') return false;
      if (state.filter === 'enrolled' && !['enrolled','won'].includes(candidate.stage)) return false;
      const text = [candidate.full_name, candidate.email, candidate.phone, candidate.interest, candidate.stage]
        .filter(Boolean).join(' ').toLocaleLowerCase('es');
      return text.includes(q);
    });
  }
  function personButton(candidate) {
    const chat = conversationFor(candidate);
    return '<button type="button" class="driver-person ' +
      (candidate.id === state.selectedId ? 'active' : '') + '" data-candidate="' +
      escapeHtml(candidate.id) + '" aria-pressed="' + (candidate.id === state.selectedId) + '">' +
      '<strong>' + escapeHtml(candidate.full_name || 'Sin nombre') + '</strong>' +
      '<small>' + escapeHtml(candidate.email || candidate.phone || 'Sin contacto') + '</small>' +
      '<div class="driver-person-bottom"><span class="driver-pill ' + (chat.length ? 'done' : '') + '">' +
      (chat.length ? chat.length + ' mensajes' : 'Registro anterior') +
      '</span><small>' + escapeHtml(formatDate(candidate.updated_at || candidate.created_at)) + '</small></div></button>';
  }
  function legacySummary(candidate) {
    const data = candidate.metadata || {};
    const fields = [
      ['Ocupación',data.occupation], ['Dirección',data.address],
      ['Ciudad',data.city], ['Estado',data.state], ['ZIP',data.zip],
      ['Cómo nos conoció',data.heard_from], ['Referido por',data.referrer]
    ].filter(item => item[1]);
    return '<div class="driver-no-transcript"><strong>Registro anterior · sin historial de chat</strong>' +
      'Este registro llegó antes de habilitar el guardado de conversaciones. Se muestran los datos disponibles, sin inventar mensajes que no quedaron almacenados.' +
      (fields.length ? '<div class="driver-legacy">' + fields.map(item =>
        '<div><small>' + escapeHtml(item[0]) + '</small><strong>' + escapeHtml(item[1]) + '</strong></div>'
      ).join('') + '</div>' : '') + '</div>';
  }
  function detail(candidate) {
    if (!candidate) return '<div class="driver-empty">Selecciona un registro para ver la conversación.</div>';
    const messages = conversationFor(candidate);
    const badges = { agent:'Asesor AG', user:'Interesado', system:'Sistema', summary:'Resumen del registro' };
    return '<div class="driver-detail-head"><h3>' + escapeHtml(candidate.full_name) + '</h3>' +
      '<p>Utah Driver Success Program™ · ' + escapeHtml(stages[candidate.stage] || candidate.stage) + '</p></div>' +
      '<div class="driver-data">' +
      '<div><small>Correo</small><strong>' + escapeHtml(candidate.email || '—') + '</strong></div>' +
      '<div><small>Teléfono</small><strong>' + escapeHtml(candidate.phone || '—') + '</strong></div>' +
      '<div><small>Registro recibido</small><strong>' + escapeHtml(formatDate(candidate.created_at)) + '</strong></div>' +
      '<div><small>Próximo seguimiento</small><strong>' + escapeHtml(formatDate(candidate.next_follow_up_at)) + '</strong></div></div>' +
      '<div class="driver-chat-label">Historial de conversación ' +
      (messages.length ? '<span>Guardado al enviar el registro</span>' : '<span>Datos disponibles</span>') + '</div>' +
      '<div class="driver-chat" role="log" aria-label="Conversación de registro">' +
      (messages.length ? messages.map(message =>
        '<article class="driver-chat-bubble ' + message.kind + '"><small>' +
        escapeHtml(badges[message.kind]) + '</small>' + escapeHtml(message.text) + '</article>'
      ).join('') : legacySummary(candidate)) + '</div>';
  }
  function render() {
    const candidates = filteredCandidates();
    if (state.selectedId && !candidates.some(candidate => candidate.id === state.selectedId)) {
      state.selectedId = candidates[0]?.id || null;
    }
    const selected = candidates.find(candidate => candidate.id === state.selectedId) || null;
    const items = document.getElementById('driver-items');
    const view = document.getElementById('driver-detail');
    const stat = document.getElementById('driver-count');
    if (items) {
      items.innerHTML = candidates.length
        ? candidates.map(personButton).join('')
        : '<div class="driver-empty">No se encontraron registros con este filtro.</div>';
      items.querySelectorAll('[data-candidate]').forEach(button => {
        button.addEventListener('click', () => {
          state.selectedId = button.dataset.candidate;
          render();
        });
      });
    }
    if (view) view.innerHTML = detail(selected);
    if (stat) stat.textContent = candidates.length + ' registros';
  }
  function shell() {
    root.innerHTML = '<div class="driver-shell">' +
      '<header class="driver-header"><div class="driver-brand">' +
      '<img src="../logo-completo-oficial.png" alt="AG Business Networking"><div>' +
      '<span>CRM AG · Registro de interesados</span><h1>Chats de registro · Manejo</h1></div></div>' +
      '<div class="driver-actions"><a class="driver-link" href="./">CRM general</a>' +
      '<a class="driver-link" href="../registrocurso/" target="_blank" rel="noopener">Ver landing</a>' +
      '<button class="driver-button" id="driver-refresh">Actualizar</button></div></header>' +
      '<main class="driver-content"><div class="driver-intro"><div><h2>Conversaciones del curso de manejo</h2>' +
      '<p>Historial del registro guiado y datos del interesado. Las conversaciones se almacenan al terminar el registro y aceptar el aviso de privacidad; no es un chat en vivo.</p></div>' +
      '<span class="driver-stats" id="driver-count"></span></div>' +
      '<div class="driver-layout"><section class="driver-list" aria-label="Registros del curso">' +
      '<div class="driver-list-tools"><input id="driver-search" type="search" placeholder="Buscar nombre, correo o teléfono…" aria-label="Buscar registros">' +
      '<select id="driver-filter" aria-label="Filtrar por etapa">' +
      '<option value="all">Todas las etapas</option><option value="new">Nuevos</option>' +
      '<option value="follow_up">En seguimiento</option><option value="enrolled">Inscritos</option></select></div>' +
      '<div class="driver-items" id="driver-items"></div></section>' +
      '<section class="driver-detail" id="driver-detail" aria-label="Detalle de conversación"></section></div></main></div>';
    document.getElementById('driver-search').value = state.search;
    document.getElementById('driver-filter').value = state.filter;
    document.getElementById('driver-search').addEventListener('input', event => {
      state.search = event.target.value.trim();
      render();
    });
    document.getElementById('driver-filter').addEventListener('change', event => {
      state.filter = event.target.value;
      render();
    });
    document.getElementById('driver-refresh').addEventListener('click', loadRegistrations);
    render();
  }
  async function loadRegistrations() {
    const response = await db.from('ag_crm_candidates').select('*')
      .eq('source_detail', 'registrocurso')
      .order('updated_at', { ascending:false })
      .limit(1000);
    if (response.error) {
      notify('No fue posible consultar los registros del curso.', true);
      console.error('[CRM AG · Registro]', response.error);
      return;
    }
    state.candidates = response.data || [];
    if (!state.candidates.some(candidate => candidate.id === state.selectedId)) {
      state.selectedId = state.candidates[0]?.id || null;
    }
    shell();
  }
  async function boot() {
    if (!db) {
      root.innerHTML = '<main class="driver-alert"><h1>CRM no disponible</h1><p>No se pudo iniciar la conexión.</p></main>';
      return;
    }
    loading();
    try {
      const session = await db.auth.getSession();
      state.user = session.data.session?.user || null;
      if (!state.user) return login();
      const [profile, team] = await Promise.all([
        db.from('profiles').select('id,full_name,display_name,platform_role,status')
          .eq('id', state.user.id).maybeSingle(),
        db.from('ag_crm_team_members').select('crm_role,active')
          .eq('user_id', state.user.id).maybeSingle()
      ]);
      if (profile.error || team.error) throw profile.error || team.error;
      state.profile = profile.data;
      state.role = team.data?.active ? team.data.crm_role : null;
      if (state.profile?.platform_role === 'super_admin' && !state.role) state.role = 'manager';
      if (!state.role || (state.profile?.status && state.profile.status !== 'active')) return deny();
      await loadRegistrations();
    } catch (error) {
      console.error('[CRM AG · Chats de registro]', error);
      root.innerHTML = '<main class="driver-alert"><h1>No se pudo cargar</h1>' +
        '<p>Revisa la conexión y los permisos de tu cuenta del CRM AG.</p>' +
        '<a class="driver-link" href="./">Volver al CRM</a></main>';
    }
  }

  if (db) db.auth.onAuthStateChange(event => {
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') setTimeout(boot, 0);
  });
  boot();
})();
