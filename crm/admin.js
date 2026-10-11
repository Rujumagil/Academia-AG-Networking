(function(){
'use strict';

var root=document.getElementById('crm-admin-app');
var cfg=window.SUPABASE_CONFIG||{};
var db=window.supabase&&window.supabase.createClient?window.supabase.createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
var masterCfg=window.AG_CRM_MASTER_CONFIG||{};
var crmDb=window.supabase&&window.supabase.createClient&&masterCfg.url&&masterCfg.publishableKey?window.supabase.createClient(masterCfg.url,masterCfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}):null;

var state={
  user:null,profile:null,section:'summary',crmReady:true,
  data:{profiles:[],courses:[],modules:[],lessons:[],lessonProgress:[],enrollments:[],orders:[],accesses:[],products:[],certificates:[],tickets:[],candidates:[],tasks:[]}
};

var NAV=[
  ['summary','Resumen','⌂'],
  ['candidates','Candidatos','◎'],
  ['followups','Seguimientos','◷'],
  ['student_pipeline','Pipeline alumnos','▦'],
  ['students','Alumnos','♙'],
  ['courses','Cursos','▤'],
  ['enrollments','Inscripciones','✓'],
  ['payments','Pagos','$'],
  ['access','Accesos','⌾'],
  ['certificates','Certificados','◇'],
  ['support','Soporte','?'],
  ['settings','Configuración','⚙']
];

function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c];});}
function fmt(v){if(!v)return '—';var d=new Date(v);if(isNaN(d.getTime()))return '—';return d.toLocaleString('es-MX',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});}
function money(v,c){var n=Number(v||0);try{return new Intl.NumberFormat('es-MX',{style:'currency',currency:c||'MXN',maximumFractionDigits:0}).format(n);}catch(_){return n.toLocaleString('es-MX')+' '+(c||'');}}
function toast(m,e){var t=document.getElementById('crm-toast');if(!t)return;t.textContent=m;t.className='crm-toast show'+(e?' error':'');clearTimeout(toast.timer);toast.timer=setTimeout(function(){t.className='crm-toast';},2800);}
function statusClass(v){v=String(v||'').toLowerCase();if(['active','approved','paid','completed','valid','resolved','published','won','enrolled'].indexOf(v)>=0)return 'ok';if(['pending','open','in_progress','draft','new','contacted','follow_up','proposal'].indexOf(v)>=0)return 'warn';if(['suspended','inactive','cancelled','expired','revoked','closed','lost'].indexOf(v)>=0)return 'bad';return 'neutral';}
function badge(v,label){return '<span class="back-badge '+statusClass(v)+'">'+esc(label||v||'—')+'</span>';}
function profileName(id){var p=state.data.profiles.find(function(x){return x.id===id;});return p?(p.full_name||p.email||'Usuario'):'—';}
function courseName(id){var c=state.data.courses.find(function(x){return x.id===id;});return c?c.title:'—';}
function productName(id){var p=state.data.products.find(function(x){return x.id===id;});return p?p.name:'—';}

function normalizeEmail(v){return String(v||'').trim().toLowerCase();}
function studentPhone(profile){
  if(profile&&profile.phone)return String(profile.phone);
  var email=normalizeEmail(profile&&profile.email);
  if(!email)return '';
  var c=state.data.candidates.find(function(x){return normalizeEmail(x.email)===email&&x.phone;});
  return c?String(c.phone):'';
}
function phoneHtml(phone){
  if(!phone)return '<span class="student-phone missing">Sin teléfono</span>';
  return '<a class="student-phone" href="tel:'+esc(phone.replace(/[^+0-9]/g,''))+'">'+esc(phone)+'</a>';
}
function pipelineStageLabel(stage){
  return {not_started:'No iniciado',in_progress:'En curso',completed:'Terminado',certified:'Certificado'}[stage]||stage;
}
function studentPipelineItems(){
  var d=state.data;
  return d.enrollments
    .filter(function(e){return e.status!=='cancelled'&&e.status!=='expired';})
    .map(function(e){
      var profile=d.profiles.find(function(p){return p.id===e.user_id;})||{id:e.user_id,full_name:'Alumno',email:''};
      var course=d.courses.find(function(x){return x.id===e.course_id;})||{id:e.course_id,title:'Curso'};
      var modules=d.modules.filter(function(m){return m.course_id===e.course_id;}).sort(function(a,b){return Number(a.position||0)-Number(b.position||0);});
      var moduleIds=new Set(modules.map(function(m){return m.id;}));
      var lessons=d.lessons.filter(function(l){return moduleIds.has(l.module_id);});
      var lessonIds=new Set(lessons.map(function(l){return l.id;}));
      var progress=d.lessonProgress.filter(function(p){return p.user_id===e.user_id&&lessonIds.has(p.lesson_id);});
      var progressByLesson={};
      progress.forEach(function(p){progressByLesson[p.lesson_id]=p;});
      var completedLessons=lessons.filter(function(l){var p=progressByLesson[l.id];return p&&p.completed===true;}).length;
      var started=progress.some(function(p){return p.completed===true||Number(p.progress_seconds||0)>0;});
      var total=lessons.length;
      var percent=total?Math.min(100,Math.round((completedLessons/total)*100)):(e.status==='completed'?100:0);
      var cert=d.certificates.find(function(x){return x.user_id===e.user_id&&x.course_id===e.course_id&&x.status!=='revoked';});
      var finished=e.status==='completed'||(total>0&&completedLessons>=total);
      var stage=cert?'certified':(finished?'completed':(started?'in_progress':'not_started'));
      var currentModule=null;
      if(stage==='not_started')currentModule=modules[0]||null;
      else if(stage==='in_progress'){
        currentModule=modules.find(function(m){
          var ls=lessons.filter(function(l){return l.module_id===m.id;});
          return ls.length&&ls.some(function(l){var p=progressByLesson[l.id];return !(p&&p.completed===true);});
        })||modules[modules.length-1]||null;
      }
      return {
        enrollment:e,profile:profile,course:course,stage:stage,percent:percent,
        completedLessons:completedLessons,totalLessons:total,
        currentModule:currentModule,modules:modules,certificate:cert,
        phone:studentPhone(profile)
      };
    });
}
function empty(msg){return '<div class="back-empty"><strong>Sin registros</strong><span>'+esc(msg)+'</span></div>';}
function sectionTitle(k){var x=NAV.find(function(i){return i[0]===k;});return x?x[1]:'Administración';}

async function safe(table,query){
  try{
    var r=await query;
    if(r.error){
      var m=String(r.error.message||'');
      if(/^crm_/.test(table)&&/does not exist|schema cache|PGRST205|42P01/i.test(m)){state.crmReady=false;return [];}
      console.warn('[Back Office]',table,r.error);
      return [];
    }
    return r.data||[];
  }catch(e){console.warn('[Back Office]',table,e);return [];}
}

async function safeMaster(table,query){
  try{
    var r=await query;
    if(r.error){console.warn('[Back Office · master]',table,r.error);return [];}
    return r.data||[];
  }catch(e){console.warn('[Back Office · master]',table,e);return [];}
}

async function loadAll(){
  var r=await Promise.all([
    safe('profiles',db.from('profiles').select('*').order('created_at',{ascending:false})),
    safe('courses',db.from('courses').select('*').order('created_at',{ascending:false})),
    safe('modules',db.from('modules').select('*').order('position',{ascending:true})),
    safe('lessons',db.from('lessons').select('*').order('position',{ascending:true})),
    safe('lesson_progress',db.from('lesson_progress').select('*').limit(10000)),
    safe('enrollments',db.from('enrollments').select('*').order('enrolled_at',{ascending:false})),
    safe('orders',db.from('orders').select('*').order('created_at',{ascending:false}).limit(1000)),
    safe('student_access',db.from('student_access').select('*').order('granted_at',{ascending:false}).limit(1000)),
    safe('products',db.from('products').select('*').order('created_at',{ascending:false})),
    safe('certificates',db.from('certificates').select('*').order('issued_at',{ascending:false}).limit(1000)),
    safe('support_tickets',db.from('support_tickets').select('*').order('created_at',{ascending:false}).limit(1000))
  ]);

  var candidates=[],tasks=[];
  state.crmReady=false;
  if(crmDb){
    try{
      var ms=await crmDb.auth.getSession();
      if(ms.data&&ms.data.session){
        var cr=await Promise.all([
          safeMaster('ag_crm_candidates',crmDb.from('ag_crm_candidates').select('*').order('created_at',{ascending:false}).limit(1500)),
          safeMaster('ag_crm_tasks',crmDb.from('ag_crm_tasks').select('*').order('due_at',{ascending:true}).limit(2000))
        ]);
        candidates=cr[0];tasks=cr[1];state.crmReady=true;
      }
    }catch(e){console.warn('[Back Office · master session]',e);}
  }

  state.data={
    profiles:r[0],courses:r[1],modules:r[2],lessons:r[3],lessonProgress:r[4],
    enrollments:r[5],orders:r[6],accesses:r[7],products:r[8],certificates:r[9],
    tickets:r[10],candidates:candidates,tasks:tasks
  };
}

function navCount(id){
  var d=state.data;
  if(id==='candidates')return d.candidates.filter(function(x){return x.status==='active';}).length;
  if(id==='followups')return d.tasks.filter(function(x){return x.status==='pending';}).length;
  if(id==='student_pipeline')return studentPipelineItems().length;
  if(id==='students')return d.profiles.filter(function(x){return x.role==='student';}).length;
  if(id==='courses')return d.courses.length;
  if(id==='enrollments')return d.enrollments.filter(function(x){return x.status==='active';}).length;
  if(id==='payments')return d.orders.filter(function(x){return ['approved','paid','completed','success'].indexOf(String(x.status).toLowerCase())>=0;}).length;
  if(id==='access')return d.accesses.filter(function(x){return x.status==='active';}).length;
  if(id==='certificates')return d.certificates.filter(function(x){return x.status==='valid';}).length;
  if(id==='support')return d.tickets.filter(function(x){return ['open','in_progress'].indexOf(x.status)>=0;}).length;
  return '';
}

function shell(){
  var name=state.profile.full_name||state.profile.email||'Administrador';
  root.innerHTML='<div class="back-shell">'+
    '<aside class="back-sidebar">'+
      '<div class="back-brand"><img src="../logo-completo-oficial.png" alt="AG Business Networking"><small>Back Office · CRM AG</small></div>'+
      '<nav class="back-nav">'+NAV.map(function(n){return '<button data-section="'+n[0]+'" class="'+(state.section===n[0]?'active':'')+'"><span class="back-nav-icon">'+n[2]+'</span><span class="back-nav-label">'+n[1]+'</span><b>'+esc(navCount(n[0]))+'</b></button>';}).join('')+'</nav>'+
      '<div class="back-user"><strong>'+esc(name)+'</strong><small>'+esc(state.profile.email||'')+'</small><a href="./">CRM candidatos</a><button id="back-signout">Cerrar sesión</button></div>'+
    '</aside>'+
    '<section class="back-main">'+
      '<header class="back-topbar"><button class="back-mobile" id="back-mobile">☰</button><div><span>AG BUSINESS NETWORKING</span><h1>'+esc(sectionTitle(state.section))+'</h1></div><div class="back-top-actions"><button id="back-refresh">Actualizar</button><a href="../" target="_blank" rel="noopener">Ver sitio</a></div></header>'+
      '<main class="back-content" id="back-content"></main>'+
    '</section>'+
  '</div>';

  document.querySelectorAll('[data-section]').forEach(function(b){b.onclick=function(){state.section=b.dataset.section;location.hash=state.section;render();};});
  document.getElementById('back-signout').onclick=function(){db.auth.signOut();};
  document.getElementById('back-refresh').onclick=async function(){toast('Actualizando datos…');await loadAll();render();toast('Información actualizada.');};
  document.getElementById('back-mobile').onclick=function(){document.querySelector('.back-sidebar').classList.toggle('open');};
  renderSection();
}

function render(){shell();}

function panel(title,subtitle,body,action){
  return '<section class="back-panel"><div class="back-panel-head"><div><span>'+esc(subtitle||'')+'</span><h2>'+esc(title)+'</h2></div>'+(action||'')+'</div>'+body+'</section>';
}
function metric(label,value,caption,tone){return '<article class="back-metric '+(tone||'')+'"><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong><small>'+esc(caption||'')+'</small></article>';}
function table(headers,rows){return '<div class="back-table" style="--cols:'+headers.length+'"><div class="back-table-head">'+headers.map(function(h){return '<span>'+esc(h)+'</span>';}).join('')+'</div>'+rows.join('')+'</div>';}
function row(cells,attrs){return '<div class="back-table-row" '+(attrs||'')+'>'+cells.map(function(c){return '<div>'+c+'</div>';}).join('')+'</div>';}

function renderSummary(){
  var d=state.data,students=d.profiles.filter(function(x){return x.role==='student';}),activeStudents=students.filter(function(x){return !x.account_status||x.account_status==='active';});
  var paid=d.orders.filter(function(x){return ['approved','paid','completed','success'].indexOf(String(x.status).toLowerCase())>=0;});
  var revenue=paid.reduce(function(a,x){return a+Number(x.amount||0);},0);
  var openTickets=d.tickets.filter(function(x){return ['open','in_progress'].indexOf(x.status)>=0;});
  var pendingTasks=d.tasks.filter(function(x){return x.status==='pending';});
  var overdue=pendingTasks.filter(function(x){return x.due_at&&new Date(x.due_at)<new Date();});
  var cards='<section class="back-metrics">'+
    metric('Alumnos',students.length,activeStudents.length+' activos','green')+
    metric('Cursos',d.courses.length,d.courses.filter(function(x){return x.status==='published';}).length+' publicados','navy')+
    metric('Inscripciones',d.enrollments.length,d.enrollments.filter(function(x){return x.status==='active';}).length+' activas','blue')+
    metric('Ingresos',money(revenue,'MXN'),paid.length+' pagos aprobados','gold')+
    metric('Soporte',openTickets.length,'tickets abiertos',openTickets.length?'red':'green')+
    metric('Seguimientos',state.crmReady?pendingTasks.length:'—',state.crmReady?(overdue.length+' vencidos'):'CRM pendiente','purple')+
  '</section>';

  var recentStudents=students.slice(0,6).map(function(s){return row(['<strong>'+esc(s.full_name||s.email||'Alumno')+'</strong><small>'+esc(s.email||'')+'</small>',badge(s.account_status||'active'),esc(fmt(s.created_at))]);});
  var recentCandidates=state.crmReady?d.candidates.slice(0,6).map(function(c){return row(['<strong>'+esc(c.full_name)+'</strong><small>'+esc(c.interest||c.company||'')+'</small>',badge(c.stage,c.stage),esc(fmt(c.next_follow_up_at||c.created_at))]);}):[];

  return cards+'<section class="back-grid two">'+
    panel('Alumnos recientes','Academia',recentStudents.length?table(['Alumno','Estado','Registro'],recentStudents):empty('Todavía no hay alumnos.'),'<button data-jump="students">Ver alumnos</button>')+
    panel('Candidatos recientes','CRM comercial',state.crmReady?(recentCandidates.length?table(['Candidato','Etapa','Fecha'],recentCandidates):empty('Todavía no hay candidatos.')):'<div class="back-warning"><strong>CRM comercial pendiente</strong><span>La estructura ya está preparada; falta aplicar la migración del CRM en Supabase.</span></div>','<a href="./">Abrir pipeline</a>')+
  '</section>';
}

function renderCandidates(){
  if(!state.crmReady)return '<div class="back-warning large"><strong>CRM comercial pendiente de activar</strong><span>La administración académica ya está separada. Para recibir candidatos aquí falta aplicar la migración <code>20261009000100_crm_ag_networking.sql</code> en el Supabase de AG.</span></div>';
  var rows=state.data.candidates.map(function(c){return row([
    '<strong>'+esc(c.full_name)+'</strong><small>'+esc(c.email||c.phone||'')+'</small>',
    esc(c.interest||typesafe(c.candidate_type)),
    badge(c.stage,c.stage),
    badge(c.priority,c.priority),
    esc(fmt(c.next_follow_up_at)),
    '<a class="back-link" href="./">Abrir CRM</a>'
  ]);});
  return panel('Candidatos','Pipeline comercial',rows.length?table(['Candidato','Interés','Etapa','Prioridad','Seguimiento',''],rows):empty('No hay candidatos registrados.'),'<a href="./">Pipeline visual</a>');
}
function typesafe(v){return ({course:'Curso',membership:'Membresía',service:'Servicio',event:'Evento',provider:'Proveedor',partner:'Alianza',other:'Otro'})[v]||v||'—';}

function renderFollowups(){
  if(!state.crmReady)return renderCandidates();
  var tasks=state.data.tasks.filter(function(x){return x.status==='pending';});
  var rows=tasks.map(function(t){var c=state.data.candidates.find(function(x){return x.id===t.candidate_id;});return row([
    '<strong>'+esc(c?c.full_name:'Candidato')+'</strong><small>'+esc(t.title||'Seguimiento')+'</small>',
    esc(t.task_type||'follow_up'),
    badge(t.priority,t.priority),
    esc(fmt(t.due_at)),
    t.due_at&&new Date(t.due_at)<new Date()?badge('lost','Vencido'):badge('active','Pendiente'),
    '<a class="back-link" href="./">Gestionar</a>'
  ]);});
  return panel('Seguimientos pendientes','CRM comercial',rows.length?table(['Candidato / tarea','Tipo','Prioridad','Fecha','Estado',''],rows):empty('No hay seguimientos pendientes.'),'<a href="./">Abrir CRM</a>');
}

function renderStudentPipeline(){
  var items=studentPipelineItems();
  var counts={not_started:0,in_progress:0,completed:0,certified:0};
  items.forEach(function(x){counts[x.stage]=(counts[x.stage]||0)+1;});

  function card(x){
    var moduleText='—';
    if(x.stage==='certified')moduleText='Curso finalizado · certificado emitido';
    else if(x.stage==='completed')moduleText='Curso finalizado · pendiente de certificado';
    else if(x.currentModule){
      var idx=x.modules.findIndex(function(m){return m.id===x.currentModule.id;})+1;
      moduleText='Módulo '+idx+' de '+x.modules.length+' · '+(x.currentModule.title||'Sin título');
    }else if(!x.totalLessons)moduleText='Contenido pendiente de configurar';

    var cert=x.certificate
      ? '<span class="student-cert ok">✓ Certificado '+esc(x.certificate.credential_code||'emitido')+'</span>'
      : '<span class="student-cert">Sin certificado</span>';

    return '<article class="student-pipeline-card">'+
      '<div class="student-pipeline-person"><div><strong>'+esc(x.profile.full_name||x.profile.email||'Alumno')+'</strong><small>'+esc(x.profile.email||'')+'</small></div><span class="student-progress-number">'+x.percent+'%</span></div>'+
      '<div class="student-phone-row"><span>Teléfono</span>'+phoneHtml(x.phone)+'</div>'+
      '<div class="student-course">'+esc(x.course.title||'Curso')+'</div>'+
      '<div class="student-progress"><i style="width:'+x.percent+'%"></i></div>'+
      '<div class="student-module">'+esc(moduleText)+'</div>'+
      '<div class="student-card-foot"><span>'+x.completedLessons+' / '+x.totalLessons+' lecciones</span>'+cert+'</div>'+
    '</article>';
  }

  var columns=[
    ['not_started','No iniciado','Aún no comenzó'],
    ['in_progress','En curso','Ya comenzó'],
    ['completed','Terminado','Curso completado'],
    ['certified','Certificado','Constancia emitida']
  ];

  var metrics='<section class="back-metrics student-pipeline-metrics">'+
    metric('Alumnos / cursos',items.length,'inscripciones activas o terminadas','navy')+
    metric('No iniciados',counts.not_started,'requieren activación','gold')+
    metric('En curso',counts.in_progress,'avance registrado','blue')+
    metric('Terminados',counts.completed,'pendientes de certificado','purple')+
    metric('Certificados',counts.certified,'proceso completo','green')+
  '</section>';

  var board='<section class="student-pipeline-board">'+columns.map(function(col){
    var list=items.filter(function(x){return x.stage===col[0];});
    return '<div class="student-pipeline-column" data-pipeline-stage="'+col[0]+'">'+
      '<div class="student-pipeline-head"><div><strong>'+esc(col[1])+'</strong><small>'+esc(col[2])+'</small></div><b>'+list.length+'</b></div>'+
      '<div class="student-pipeline-list">'+(list.length?list.map(card).join(''):'<div class="student-pipeline-empty">Sin alumnos</div>')+'</div>'+
    '</div>';
  }).join('')+'</section>';

  var note='<div class="back-note student-pipeline-note"><strong>Teléfonos</strong><span>Se muestra el teléfono guardado en el perfil cuando exista; mientras Academia termina de migrarse al Supabase maestro, también se cruza por correo con el CRM AG. Los alumnos antiguos sin teléfono registrado aparecerán como “Sin teléfono”.</span></div>';

  return panel('Pipeline de alumnos','Academia AG · progreso por curso',metrics+board+note,'<a href="../academia.html?crm_admin=1#workspace/general">Abrir Academia</a>');
}

function renderStudents(){
  var students=state.data.profiles.filter(function(x){return x.role==='student';});
  var rows=students.map(function(s){
    var active=state.data.enrollments.filter(function(e){return e.user_id===s.id&&e.status==='active';}).length;
    var phone=studentPhone(s);
    return row([
      '<strong>'+esc(s.full_name||'Alumno')+'</strong><small>'+esc(s.email||'')+'</small>',
      phoneHtml(phone),
      badge(s.account_status||'active'),
      '<strong>'+active+'</strong><small>cursos activos</small>',
      esc(fmt(s.created_at)),
      '<div class="back-actions">'+
        (s.account_status==='active'?'<button data-user-status="'+s.id+'" data-status="suspended">Suspender</button>':'<button data-user-status="'+s.id+'" data-status="active">Activar</button>')+
        '<a href="../academia.html?crm_admin=1#workspace/general">Gestionar</a>'+
      '</div>'
    ]);
  });
  return panel('Alumnos','Usuarios de Academia AG',rows.length?table(['Alumno','Teléfono','Estado','Inscripciones','Registro','Acciones'],rows):empty('No hay alumnos registrados.'),'<a href="../importar-alumnos.html">Importar alumnos</a>');
}

function renderCourses(){
  var rows=state.data.courses.map(function(c){
    var enrolled=state.data.enrollments.filter(function(e){return e.course_id===c.id&&e.status==='active';}).length;
    return row([
      '<strong>'+esc(c.title)+'</strong><small>'+esc(c.category||c.slug||'')+'</small>',
      badge(c.status),
      '<strong>'+enrolled+'</strong><small>alumnos activos</small>',
      esc(c.instructor_name||'—'),
      esc(c.sale_price!=null?money(c.sale_price,'USD'):(c.price!=null?money(c.price,'USD'):'—')),
      '<div class="back-actions"><button data-course-status="'+c.id+'" data-status="'+(c.status==='published'?'draft':'published')+'">'+(c.status==='published'?'Pasar a borrador':'Publicar')+'</button><button data-editor-course="'+c.id+'">Editar</button></div>'
    ]);
  });
  return panel('Cursos','Academia AG',rows.length?table(['Curso','Estado','Alumnos','Instructor','Precio','Acciones'],rows):empty('No hay cursos.'),'<button data-editor-course="">Abrir editor académico</button>');
}

function renderEnrollments(){
  var rows=state.data.enrollments.map(function(e){return row([
    '<strong>'+esc(profileName(e.user_id))+'</strong>',
    esc(courseName(e.course_id)),
    badge(e.status),
    esc(fmt(e.enrolled_at)),
    esc(fmt(e.completed_at)),
    esc(fmt(e.expires_at))
  ]);});
  return panel('Inscripciones','Relación alumno · curso',rows.length?table(['Alumno','Curso','Estado','Inscripción','Completado','Vence'],rows):empty('No hay inscripciones.'));
}

function renderPayments(){
  var rows=state.data.orders.map(function(o){return row([
    '<strong>'+esc(productName(o.product_id)||'Compra')+'</strong><small>'+esc(o.payer_email||profileName(o.user_id))+'</small>',
    '<strong>'+esc(o.amount==null?'—':money(o.amount,o.currency||'MXN'))+'</strong>',
    badge(o.status),
    esc(o.provider||'manual'),
    esc(fmt(o.approved_at||o.created_at)),
    esc(o.external_reference||o.provider_order_id||'—')
  ]);});
  return panel('Pagos y órdenes','Operación comercial',rows.length?table(['Producto / comprador','Importe','Estado','Proveedor','Fecha','Referencia'],rows):empty('No hay pagos registrados.'));
}

function renderAccess(){
  var rows=state.data.accesses.map(function(a){return row([
    '<strong>'+esc(profileName(a.user_id))+'</strong>',
    esc(productName(a.product_id)),
    badge(a.status),
    esc(a.source||'manual'),
    esc(fmt(a.granted_at)),
    esc(fmt(a.expires_at))
  ]);});
  return panel('Accesos','Productos y permisos',rows.length?table(['Alumno','Producto','Estado','Origen','Otorgado','Vence'],rows):empty('No hay accesos registrados.'),'<button data-open-legacy="access-center">Gestionar accesos</button>');
}

function renderCertificates(){
  var rows=state.data.certificates.map(function(c){return row([
    '<strong>'+esc(profileName(c.user_id))+'</strong>',
    esc(courseName(c.course_id)),
    '<code>'+esc(c.credential_code)+'</code>',
    badge(c.status),
    esc(fmt(c.issued_at)),
    c.revoked_at?esc(fmt(c.revoked_at)):'—'
  ]);});
  return panel('Certificados','Credenciales emitidas',rows.length?table(['Alumno','Curso','Código','Estado','Emisión','Revocado'],rows):empty('No hay certificados emitidos.'));
}

function renderSupport(){
  var rows=state.data.tickets.map(function(t){return row([
    '<strong>'+esc(profileName(t.user_id))+'</strong><small>'+esc(t.subject||'')+'</small>',
    esc(t.category||'general'),
    badge(t.priority,t.priority),
    badge(t.status),
    esc(fmt(t.created_at)),
    '<select data-ticket-status="'+t.id+'"><option value="open" '+(t.status==='open'?'selected':'')+'>Abierto</option><option value="in_progress" '+(t.status==='in_progress'?'selected':'')+'>En proceso</option><option value="resolved" '+(t.status==='resolved'?'selected':'')+'>Resuelto</option><option value="closed" '+(t.status==='closed'?'selected':'')+'>Cerrado</option></select>'
  ]);});
  return panel('Soporte','Tickets de alumnos',rows.length?table(['Alumno / asunto','Categoría','Prioridad','Estado','Creado','Cambiar estado'],rows):empty('No hay tickets.'));
}

function renderSettings(){
  var studentCount=state.data.profiles.filter(function(x){return x.role==='student';}).length;
  var migration='<div class="migration-tool">'+
    '<div class="migration-copy"><strong>Migrar alumnos anteriores al Supabase maestro</strong><span>'+studentCount+' alumnos detectados en la Academia actual. Como no tienen avance académico, se migrarán perfiles y se guardarán sus inscripciones originales para reasignarlas al copiar los cursos.</span></div>'+
    '<button class="migration-button" id="migrate-old-students">Migrar '+studentCount+' alumnos</button>'+
    '<div class="migration-result" id="migration-result"></div>'+
  '</div>';
  return '<section class="back-grid two">'+
    panel('Estructura del sistema','Arquitectura','<div class="back-setting-list"><div><strong>CRM AG</strong><span>agbusinessnetworking.com/crm/</span></div><div><strong>Administrador AG</strong><span>agbusinessnetworking.com/crm/admin.html</span></div><div><strong>Academia AG</strong><span>agbusinessnetworking.com/academia.html</span></div></div>')+
    panel('Migración de alumnos','Supabase maestro',migration)+
    panel('Documentos legales','Sitio público','<div class="back-setting-list"><a href="../privacidad/" target="_blank"><strong>Privacidad</strong><span>/privacidad/</span></a><a href="../terminos/" target="_blank"><strong>Términos</strong><span>/terminos/</span></a><a href="../reembolsos/" target="_blank"><strong>Reembolsos</strong><span>/reembolsos/</span></a><a href="../conducta/" target="_blank"><strong>Conducta</strong><span>/conducta/</span></a><a href="../derechos-de-autor/" target="_blank"><strong>Derechos de autor</strong><span>/derechos-de-autor/</span></a><a href="../accesibilidad/" target="_blank"><strong>Accesibilidad</strong><span>/accesibilidad/</span></a></div>')+
    panel('Seguridad','Accesos internos','<div class="back-warning"><strong>Administración separada de la Academia</strong><span>Las cuentas admin se redirigen a este Back Office. Los alumnos e instructores permanecen en Academia AG.</span></div>')+
    panel('Operación','Herramientas','<div class="back-quick"><a href="../importar-alumnos.html">Importar alumnos</a><button data-open-legacy="admin-users">Administración avanzada de alumnos</button><button data-open-legacy="admin-courses">Editor avanzado de cursos</button><button data-open-legacy="access-center">Centro avanzado de accesos</button></div>')+
  '</section>';
}

function renderSection(){
  var box=document.getElementById('back-content');if(!box)return;
  var html='';
  if(state.section==='summary')html=renderSummary();
  else if(state.section==='candidates')html=renderCandidates();
  else if(state.section==='followups')html=renderFollowups();
  else if(state.section==='student_pipeline')html=renderStudentPipeline();
  else if(state.section==='students')html=renderStudents();
  else if(state.section==='courses')html=renderCourses();
  else if(state.section==='enrollments')html=renderEnrollments();
  else if(state.section==='payments')html=renderPayments();
  else if(state.section==='access')html=renderAccess();
  else if(state.section==='certificates')html=renderCertificates();
  else if(state.section==='support')html=renderSupport();
  else if(state.section==='settings')html=renderSettings();
  else html=renderSummary();
  box.innerHTML=html;
  bindSection();
}

function bindSection(){
  document.querySelectorAll('[data-jump]').forEach(function(b){b.onclick=function(){state.section=b.dataset.jump;location.hash=state.section;render();};});
  document.querySelectorAll('[data-user-status]').forEach(function(b){b.onclick=async function(){var r=await db.rpc('admin_set_account_status',{target_user:b.dataset.userStatus,new_status:b.dataset.status});if(r.error)return toast(r.error.message,true);toast('Estado del alumno actualizado.');await loadAll();render();};});
  document.querySelectorAll('[data-course-status]').forEach(function(b){b.onclick=async function(){var r=await db.from('courses').update({status:b.dataset.status}).eq('id',b.dataset.courseStatus);if(r.error)return toast(r.error.message,true);toast('Curso actualizado.');await loadAll();render();};});
  document.querySelectorAll('[data-ticket-status]').forEach(function(s){s.onchange=async function(){var r=await db.from('support_tickets').update({status:s.value,updated_at:new Date().toISOString()}).eq('id',s.dataset.ticketStatus);if(r.error)return toast(r.error.message,true);toast('Ticket actualizado.');await loadAll();render();};});
  document.querySelectorAll('[data-editor-course]').forEach(function(b){b.onclick=function(){openAcademyEditor(b.dataset.editorCourse||'');};});
  document.querySelectorAll('[data-open-legacy]').forEach(function(b){b.onclick=function(){openAcademyAdmin(b.dataset.openLegacy||'');};});
  var migrateButton=document.getElementById('migrate-old-students');
  if(migrateButton)migrateButton.onclick=migrateOldStudents;
}

function csvCell(v){var s=String(v==null?'':v);return '"'+s.replace(/"/g,'""')+'"';}
function downloadMigrationCredentials(results){
  var created=(results||[]).filter(function(x){return x.status==='created'&&x.temporary_password;});
  if(!created.length)return;
  var lines=[['Nombre','Correo','Teléfono','Contraseña temporal','ID nuevo'].map(csvCell).join(',')];
  created.forEach(function(x){lines.push([x.full_name,x.email,x.phone||'',x.temporary_password,x.target_user_id].map(csvCell).join(','));});
  var blob=new Blob([lines.join('\n')],{type:'text/csv;charset=utf-8'});
  var url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='AG-alumnos-migrados-credenciales.csv';document.body.appendChild(a);a.click();a.remove();
  setTimeout(function(){URL.revokeObjectURL(url);},2000);
}
async function migrateOldStudents(){
  var button=document.getElementById('migrate-old-students'),box=document.getElementById('migration-result');
  var students=state.data.profiles.filter(function(x){return x.role==='student';});
  if(!students.length){if(box)box.innerHTML='<strong>No hay alumnos para migrar.</strong>';return;}
  if(!crmDb||!masterCfg.url){if(box)box.innerHTML='<strong>No hay conexión con el Supabase maestro.</strong>';return;}
  var masterSession=await crmDb.auth.getSession();
  var session=masterSession.data&&masterSession.data.session;
  if(!session){
    if(box)box.innerHTML='<strong>Falta iniciar sesión en el CRM maestro.</strong><span>Abre “CRM candidatos”, inicia sesión y vuelve a esta pantalla.</span>';
    return;
  }
  if(!window.confirm('Se migrarán '+students.length+' alumnos al Supabase maestro. No se borrará nada del Supabase anterior. ¿Continuar?'))return;
  button.disabled=true;button.textContent='Migrando alumnos…';
  if(box)box.innerHTML='<span>Preparando perfiles e inscripciones anteriores…</span>';
  var payload=students.map(function(s){
    return {
      source_user_id:s.id,
      email:s.email,
      full_name:s.full_name,
      account_status:s.account_status||'active',
      created_at:s.created_at||null,
      enrollments:state.data.enrollments.filter(function(e){return e.user_id===s.id;}).map(function(e){
        return {course_id:e.course_id,status:e.status,enrolled_at:e.enrolled_at,completed_at:e.completed_at||null,expires_at:e.expires_at||null};
      })
    };
  });
  try{
    var response=await fetch(masterCfg.url+'/functions/v1/ag-migrate-academy-students',{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'apikey':masterCfg.publishableKey,
        'Authorization':'Bearer '+session.access_token
      },
      body:JSON.stringify({students:payload})
    });
    var data=await response.json().catch(function(){return {};});
    if(!response.ok||!data.ok)throw new Error(data.error||'No fue posible completar la migración.');
    var s=data.summary||{};
    if(box)box.innerHTML='<strong>Migración terminada</strong><span>Procesados: '+(s.processed||0)+' · Nuevos: '+(s.created||0)+' · Existentes: '+((s.existing||0)+(s.already_migrated||0))+' · Errores: '+(s.errors||0)+'</span><small>El Supabase anterior permanece intacto. Las inscripciones originales quedaron guardadas para el siguiente paso.</small>';
    downloadMigrationCredentials(data.results||[]);
    toast('Alumnos migrados al Supabase maestro.');
  }catch(e){
    console.error('[AG migration]',e);
    if(box)box.innerHTML='<strong>No se completó la migración</strong><span>'+esc(e.message||String(e))+'</span>';
    toast(e.message||'Error de migración',true);
  }finally{
    button.disabled=false;button.textContent='Migrar '+students.length+' alumnos';
  }
}

function openAcademyEditor(courseId){
  openEmbedded('../academia.html?crm_admin=1#'+(courseId?'course/'+encodeURIComponent(courseId):'workspace/general'),'Editor académico');
}
function openAcademyAdmin(target){
  try{sessionStorage.setItem('ag-admin-scroll-target',target||'');}catch(_){}
  openEmbedded('../academia.html?crm_admin=1#workspace/general','Administración avanzada');
}
function openEmbedded(src,title){
  var box=document.getElementById('back-content');if(!box)return;
  box.innerHTML='<section class="back-embed"><div class="back-embed-head"><div><span>HERRAMIENTA INTERNA</span><h2>'+esc(title)+'</h2></div><button id="back-embed-close">Volver</button></div><iframe id="back-embed-frame" src="'+esc(src)+'" title="'+esc(title)+'"></iframe></section>';
  document.getElementById('back-embed-close').onclick=function(){renderSection();};
  var frame=document.getElementById('back-embed-frame');
  frame.addEventListener('load',function(){try{var doc=frame.contentDocument;if(!doc)return;var style=doc.createElement('style');style.textContent='.sidebar,.topbar,.mobile-nav{display:none!important}.app-shell{display:block!important}.main-area{margin:0!important;width:100%!important}.content{padding:0!important;max-width:none!important}.page{padding:16px!important;max-width:none!important}.adminexec-boundary{display:none!important}';doc.head.appendChild(style);}catch(e){console.warn(e);}});
}

async function boot(){
  if(!db){root.innerHTML='<main class="crm-admin-denied"><section class="crm-admin-denied-card"><h1>No hay conexión</h1><p>No se pudo iniciar Supabase.</p></section></main>';return;}
  var s=await db.auth.getSession(),user=s.data.session?s.data.session.user:null;
  if(!user){window.location.replace('./');return;}
  state.user=user;
  var p=await db.from('profiles').select('*').eq('id',user.id).maybeSingle();
  if(p.error||!p.data||p.data.role!=='admin'||(p.data.account_status&&p.data.account_status!=='active')){
    root.innerHTML='<main class="crm-admin-denied"><section class="crm-admin-denied-card"><img src="../logo-completo-oficial.png"><h1>Acceso restringido</h1><p>Esta sección es exclusiva para administradores activos de AG Business Networking.</p><a class="crm-button secondary" href="../academia.html">Ir a Academia AG</a></section></main>';return;
  }
  state.profile=p.data;
  var hash=location.hash.replace(/^#/,'');
  if(NAV.some(function(n){return n[0]===hash;}))state.section=hash;
  await loadAll();
  shell();
}

window.addEventListener('hashchange',function(){var h=location.hash.replace(/^#/,'');if(NAV.some(function(n){return n[0]===h;})){state.section=h;render();}});
if(db)db.auth.onAuthStateChange(function(){setTimeout(boot,0);});
boot();
})();