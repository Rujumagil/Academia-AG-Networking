(function(){
'use strict';

var root=document.getElementById('crm-admin-app');
var cfg=window.SUPABASE_CONFIG||window.AG_CRM_MASTER_CONFIG||{};
var ACADEMY_TABLES={
  profiles:'academy_profiles',
  courses:'academy_courses',
  modules:'academy_modules',
  lessons:'academy_lessons',
  lesson_progress:'academy_lesson_progress',
  enrollments:'academy_enrollments',
  resources:'academy_resources',
  lesson_blocks:'academy_lesson_blocks',
  course_versions:'academy_course_versions',
  assessments:'academy_assessments',
  assessment_questions:'academy_assessment_questions',
  assessment_options:'academy_assessment_options',
  lesson_quizzes:'academy_lesson_quizzes',
  module_exam_attempts:'academy_module_exam_attempts',
  orders:'academy_orders',
  student_access:'academy_student_access',
  products:'academy_products',
  certificates:'academy_certificates',
  support_tickets:'academy_support_tickets'
};
var db=null;
if(window.supabase&&window.supabase.createClient&&cfg.url&&cfg.publishableKey){
  db=window.supabase.createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  var nativeFrom=db.from.bind(db);
  db.from=function(name){return nativeFrom(ACADEMY_TABLES[name]||name);};
}
var masterCfg=cfg;
var crmDb=db;

var state={
  user:null,profile:null,section:'summary',crmReady:true,
  recordUserId:null,recordCourseId:null,
  data:{profiles:[],courses:[],modules:[],lessons:[],lessonProgress:[],enrollments:[],resources:[],lessonBlocks:[],courseVersions:[],assessments:[],assessmentQuestions:[],assessmentOptions:[],lessonQuizzes:[],moduleExamAttempts:[],orders:[],accesses:[],products:[],certificates:[],tickets:[],candidates:[],tasks:[]}
};

var NAV=[
  ['summary','Resumen','⌂'],
  ['candidates','Candidatos','◎'],
  ['followups','Seguimientos','◷'],
  ['student_pipeline','Pipeline alumnos','▦'],
  ['reports','Reportes académicos','◫'],
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
      var lessons=d.lessons.filter(function(l){
        return moduleIds.has(l.module_id)
          && String(l.lesson_kind||'lesson').toLowerCase()!=='promo';
      });
      var lessonIds=new Set(lessons.map(function(l){return l.id;}));
      var progress=d.lessonProgress.filter(function(p){return p.user_id===e.user_id&&lessonIds.has(p.lesson_id);});
      var progressByLesson={};
      progress.forEach(function(p){progressByLesson[p.lesson_id]=p;});
      var completedLessons=lessons.filter(function(l){var p=progressByLesson[l.id];return p&&p.completed===true;}).length;
      var started=progress.some(function(p){return p.completed===true||Number(p.progress_seconds||0)>0||Number(p.watch_percentage||0)>0;});
      var total=lessons.length;
      var percent=total?Math.min(100,Math.round((completedLessons/total)*100)):(e.status==='completed'?100:0);
      var lastProgress=progress.slice().sort(function(a,b){
        var ad=new Date(a.last_watched_at||a.updated_at||a.completed_at||0).getTime()||0;
        var bd=new Date(b.last_watched_at||b.updated_at||b.completed_at||0).getTime()||0;
        return bd-ad;
      })[0]||null;
      var lastActivityAt=lastProgress?(lastProgress.last_watched_at||lastProgress.updated_at||lastProgress.completed_at||null):null;
      var currentLesson=null;
      var lessonWatch=0;
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

      if(lastProgress){
        currentLesson=lessons.find(function(l){return l.id===lastProgress.lesson_id;})||null;
        lessonWatch=Math.max(0,Math.min(100,Number(lastProgress.watch_percentage||0)));
      }
      if(!currentLesson&&currentModule){
        currentLesson=lessons.find(function(l){
          if(l.module_id!==currentModule.id)return false;
          var p=progressByLesson[l.id];
          return !(p&&p.completed===true);
        })||lessons.find(function(l){return l.module_id===currentModule.id;})||null;
      }

      var academicModules=modules.map(function(m,index){
        var ls=lessons.filter(function(l){return l.module_id===m.id;});
        var done=ls.filter(function(l){var p=progressByLesson[l.id];return p&&p.completed===true;}).length;
        var pct=ls.length?Math.min(100,Math.round((done/ls.length)*100)):0;
        var attempts=(d.moduleExamAttempts||[]).filter(function(a){return a.user_id===e.user_id&&a.module_id===m.id;});
        var best=attempts.slice().sort(function(a,b){return Number(b.percentage||0)-Number(a.percentage||0);})[0]||null;
        var type=String(m.section_type||'').toLowerCase();
        var number=Number(m.academic_number||0);
        var label=type==='introduction'?'Introducción':(type==='closing'?'Cierre':(number?'Módulo '+number:'Módulo '+(index+1)));
        return {
          module:m,label:label,percent:pct,completed:done,total:ls.length,
          examApplicable:type==='academic',attempts:attempts.length,bestExam:best
        };
      });
      var scoredModules=academicModules.filter(function(m){return m.examApplicable&&m.bestExam;});
      var examAverage=scoredModules.length
        ? Math.round(scoredModules.reduce(function(sum,m){return sum+Number(m.bestExam.percentage||0);},0)/scoredModules.length)
        : null;
      var examsDone=scoredModules.length;
      var examsAvailable=academicModules.filter(function(m){return m.examApplicable;}).length;

      var candidate=d.candidates.find(function(item){
        return (item.metadata&&String(item.metadata.academy_user_id||'')===String(e.user_id))
          || (profile.email&&normalizeEmail(item.email)===normalizeEmail(profile.email));
      })||null;
      var pendingFollowup=candidate?d.tasks.find(function(task){
        return task.candidate_id===candidate.id
          && task.status==='pending'
          && task.metadata
          && task.metadata.automation==='academy_inactivity'
          && String(task.metadata.academy_user_id||'')===String(e.user_id)
          && String(task.metadata.academy_course_id||'')===String(e.course_id);
      })||null:null;

      return {
        enrollment:e,profile:profile,course:course,stage:stage,percent:percent,
        completedLessons:completedLessons,totalLessons:total,
        currentModule:currentModule,currentLesson:currentLesson,lessonWatch:lessonWatch,
        lastActivityAt:lastActivityAt,modules:modules,certificate:cert,
        phone:studentPhone(profile),candidate:candidate,pendingFollowup:pendingFollowup,
        academicModules:academicModules,examAverage:examAverage,
        examsDone:examsDone,examsAvailable:examsAvailable
      };
    });
}
function empty(msg){return '<div class="back-empty"><strong>Sin registros</strong><span>'+esc(msg)+'</span></div>';}
function sectionTitle(k){if(k==='student_record')return 'Expediente académico';var x=NAV.find(function(i){return i[0]===k;});return x?x[1]:'Administración';}

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
  var workspaceId=cfg.workspaceId||'fa4411f8-65c6-4762-8302-50789998e5b7';

  var courses=await safe('courses',
    db.from('courses').select('*').eq('workspace_id',workspaceId).order('created_at',{ascending:false})
  );
  var courseIds=courses.map(function(x){return x.id;});

  var modules=courseIds.length
    ? await safe('modules',db.from('modules').select('*').in('course_id',courseIds).order('position',{ascending:true}))
    : [];
  var moduleIds=modules.map(function(x){return x.id;});

  var lessons=moduleIds.length
    ? await safe('lessons',db.from('lessons').select('*').in('module_id',moduleIds).order('position',{ascending:true}))
    : [];
  var lessonIds=lessons.map(function(x){return x.id;});

  var enrollments=courseIds.length
    ? await safe('enrollments',db.from('enrollments').select('*').in('course_id',courseIds).order('enrolled_at',{ascending:false}))
    : [];

  var migrationMap=await safeMaster(
    'ag_academy_student_migration_map',
    db.from('ag_academy_student_migration_map').select('target_user_id')
  );

  var agUserIds=new Set();
  if(state.user&&state.user.id)agUserIds.add(state.user.id);
  enrollments.forEach(function(x){if(x.user_id)agUserIds.add(x.user_id);});
  migrationMap.forEach(function(x){if(x.target_user_id)agUserIds.add(x.target_user_id);});

  var profileIds=Array.from(agUserIds);
  var profiles=profileIds.length
    ? await safe('profiles',db.from('profiles').select('*').in('id',profileIds).order('created_at',{ascending:false}))
    : [];

  var assessments=courseIds.length
    ? await safe('assessments',db.from('assessments').select('*').in('course_id',courseIds).limit(3000))
    : [];
  var assessmentIds=assessments.map(function(x){return x.id;});

  var assessmentQuestions=assessmentIds.length
    ? await safe('assessment_questions',db.from('assessment_questions').select('*').in('assessment_id',assessmentIds).order('position',{ascending:true}).limit(10000))
    : [];
  var questionIds=assessmentQuestions.map(function(x){return x.id;});

  var products=await safe('products',
    db.from('products').select('*').eq('workspace_id',workspaceId).order('created_at',{ascending:false})
  );
  var productIds=products.map(function(x){return x.id;});

  var moduleExamAttempts=moduleIds.length
    ? await safe('module_exam_attempts',db.from('module_exam_attempts').select('*').in('module_id',moduleIds).order('attempted_at',{ascending:false}).limit(20000))
    : [];

  var rest=await Promise.all([
    lessonIds.length
      ? safe('lesson_progress',db.from('lesson_progress').select('*').in('lesson_id',lessonIds).limit(10000))
      : Promise.resolve([]),
    safe('resources',db.from('resources').select('*').eq('workspace_id',workspaceId).limit(3000)),
    lessonIds.length
      ? safe('lesson_blocks',db.from('lesson_blocks').select('*').in('lesson_id',lessonIds).order('position',{ascending:true}).limit(10000))
      : Promise.resolve([]),
    courseIds.length
      ? safe('course_versions',db.from('course_versions').select('*').in('course_id',courseIds).limit(3000))
      : Promise.resolve([]),
    questionIds.length
      ? safe('assessment_options',db.from('assessment_options').select('*').in('question_id',questionIds).order('position',{ascending:true}).limit(20000))
      : Promise.resolve([]),
    lessonIds.length
      ? safe('lesson_quizzes',db.from('lesson_quizzes').select('*').in('lesson_id',lessonIds).limit(10000))
      : Promise.resolve([]),
    safe('orders',db.from('orders').select('*').eq('workspace_id',workspaceId).order('created_at',{ascending:false}).limit(1000)),
    productIds.length
      ? safe('student_access',db.from('student_access').select('*').in('product_id',productIds).order('granted_at',{ascending:false}).limit(1000))
      : Promise.resolve([]),
    courseIds.length
      ? safe('certificates',db.from('certificates').select('*').in('course_id',courseIds).order('issued_at',{ascending:false}).limit(1000))
      : Promise.resolve([]),
    profileIds.length
      ? safe('support_tickets',db.from('support_tickets').select('*').in('user_id',profileIds).order('created_at',{ascending:false}).limit(1000))
      : Promise.resolve([])
  ]);

  var candidates=[],tasks=[];
  state.crmReady=false;
  try{
    var cr=await Promise.all([
      safeMaster('ag_crm_candidates',db.from('ag_crm_candidates').select('*').order('created_at',{ascending:false}).limit(1500)),
      safeMaster('ag_crm_tasks',db.from('ag_crm_tasks').select('*').order('due_at',{ascending:true}).limit(2000))
    ]);
    candidates=cr[0];
    tasks=cr[1];
    state.crmReady=true;
  }catch(e){
    console.warn('[Back Office · CRM master]',e);
  }

  state.data={
    profiles:profiles,
    courses:courses,
    modules:modules,
    lessons:lessons,
    lessonProgress:rest[0],
    enrollments:enrollments,
    resources:rest[1],
    lessonBlocks:rest[2],
    courseVersions:rest[3],
    assessments:assessments,
    assessmentQuestions:assessmentQuestions,
    assessmentOptions:rest[4],
    lessonQuizzes:rest[5],
    moduleExamAttempts:moduleExamAttempts,
    orders:rest[6],
    accesses:rest[7],
    products:products,
    certificates:rest[8],
    tickets:rest[9],
    candidates:candidates,
    tasks:tasks
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
      '<nav class="back-nav">'+NAV.map(function(n){var active=state.section===n[0]||(state.section==='student_record'&&n[0]==='student_pipeline');return '<button data-section="'+n[0]+'" class="'+(active?'active':'')+'"><span class="back-nav-icon">'+n[2]+'</span><span class="back-nav-label">'+n[1]+'</span><b>'+esc(navCount(n[0]))+'</b></button>';}).join('')+'</nav>'+
      '<div class="back-user"><strong>'+esc(name)+'</strong><small>'+esc(state.profile.email||'')+'</small><a href="./">CRM candidatos</a><button id="back-signout">Cerrar sesión</button></div>'+
    '</aside>'+
    '<section class="back-main">'+
      '<header class="back-topbar"><button class="back-mobile" id="back-mobile">☰</button><div><span>AG BUSINESS NETWORKING</span><h1>'+esc(sectionTitle(state.section))+'</h1></div><div class="back-top-actions"><button id="back-refresh">Actualizar</button><a href="../" target="_blank" rel="noopener">Ver sitio</a></div></header>'+
      '<main class="back-content" id="back-content"></main>'+
    '</section>'+
  '</div>';

  document.querySelectorAll('[data-section]').forEach(function(b){b.onclick=function(){state.recordUserId=null;state.recordCourseId=null;state.section=b.dataset.section;location.hash=state.section;render();};});
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

  var rows=tasks.map(function(t){
    var candidate=state.data.candidates.find(function(x){return x.id===t.candidate_id;});
    var academic=Boolean(t.metadata&&t.metadata.automation==='academy_inactivity');
    var threshold=academic?Number(t.metadata.threshold_days||0):0;
    var cleanPhone=String(candidate&&candidate.phone||'').replace(/[^0-9]/g,'');
    var actions='<div class="back-actions">'+
      (candidate&&candidate.email?'<a href="mailto:'+esc(candidate.email)+'">Correo</a>':'')+
      (cleanPhone.length>=10?'<a href="https://wa.me/'+esc(cleanPhone)+'" target="_blank" rel="noopener">WhatsApp</a>':'')+
      '<button data-complete-task="'+esc(t.id)+'">Atendido</button>'+
    '</div>';

    return row([
      '<strong>'+esc(candidate?candidate.full_name:'Candidato')+'</strong><small>'+esc(t.title||'Seguimiento')+'</small>'+
        (academic?'<small class="followup-origin">Academia AG · '+threshold+' días</small>':''),
      esc(t.task_type||'follow_up'),
      badge(t.priority,t.priority),
      esc(fmt(t.due_at)),
      t.due_at&&new Date(t.due_at)<new Date()?badge('lost','Vencido'):badge('active','Pendiente'),
      actions
    ]);
  });

  var autoCount=tasks.filter(function(t){return t.metadata&&t.metadata.automation==='academy_inactivity';}).length;
  var header='<div class="followup-summary"><strong>'+autoCount+' seguimientos académicos automáticos</strong><span>Se generan a los 7 y 14 días sin actividad.</span></div>';

  return panel(
    'Seguimientos pendientes',
    'CRM comercial · Academia AG',
    header+(rows.length?table(['Candidato / tarea','Tipo','Prioridad','Fecha','Estado','Acciones'],rows):empty('No hay seguimientos pendientes.')),
    '<a href="./">Abrir CRM</a>'
  );
}

function renderStudentPipeline(){
  var items=studentPipelineItems();
  var counts={not_started:0,in_progress:0,completed:0,certified:0};
  items.forEach(function(x){counts[x.stage]=(counts[x.stage]||0)+1;});

  function relativeActivity(value){
    if(!value)return 'Sin actividad';
    var t=new Date(value).getTime();
    if(!t)return 'Sin actividad';
    var diff=Math.max(0,Date.now()-t);
    var min=Math.floor(diff/60000);
    if(min<1)return 'Ahora';
    if(min<60)return 'Hace '+min+' min';
    var hours=Math.floor(min/60);
    if(hours<24)return 'Hace '+hours+' h';
    var days=Math.floor(hours/24);
    if(days===1)return 'Ayer';
    if(days<30)return 'Hace '+days+' días';
    return fmt(value);
  }

  function contactActions(x){
    var actions=[];
    var cleanPhone=String(x.phone||'').replace(/[^0-9]/g,'');
    if(x.phone)actions.push('<a class="student-contact-btn" href="tel:'+esc(String(x.phone).replace(/[^+0-9]/g,''))+'" title="Llamar">☎</a>');
    if(cleanPhone.length>=10)actions.push('<a class="student-contact-btn" href="https://wa.me/'+esc(cleanPhone)+'" target="_blank" rel="noopener" title="WhatsApp">WA</a>');
    if(x.profile.email)actions.push('<a class="student-contact-btn" href="mailto:'+esc(x.profile.email)+'" title="Correo">✉</a>');
    return actions.length?'<div class="student-contact-actions">'+actions.join('')+'</div>':'';
  }

  function card(x){
    var moduleText='—';
    if(x.stage==='certified')moduleText='Curso finalizado · certificado emitido';
    else if(x.stage==='completed')moduleText='Curso finalizado · pendiente de certificado';
    else if(x.currentModule){
      var idx=x.modules.findIndex(function(m){return m.id===x.currentModule.id;})+1;
      moduleText='Módulo '+idx+' de '+x.modules.length+' · '+(x.currentModule.title||'Sin título');
    }else if(!x.totalLessons)moduleText='Contenido pendiente de configurar';

    var lessonText=x.currentLesson
      ? (x.currentLesson.lesson_code?x.currentLesson.lesson_code+' · ':'')+(x.currentLesson.title||'Lección')
      : (x.stage==='not_started'?'Pendiente de iniciar':'—');

    var activityClass='student-activity';
    if(x.lastActivityAt){
      var age=Date.now()-new Date(x.lastActivityAt).getTime();
      if(age>14*86400000)activityClass+=' stale';
      else if(age<=3*86400000)activityClass+=' fresh';
    }

    var cert=x.certificate
      ? '<span class="student-cert ok">✓ Certificado '+esc(x.certificate.credential_code||'emitido')+'</span>'
      : '<span class="student-cert">Sin certificado</span>';

    var followup='';
    if(x.pendingFollowup){
      var threshold=Number(x.pendingFollowup.metadata&&x.pendingFollowup.metadata.threshold_days||0);
      followup='<div class="student-followup-alert '+(threshold>=14?'urgent':'warning')+'">'+
        '<div><span>Seguimiento automático</span><strong>⚠ '+threshold+' días sin actividad</strong></div>'+
        '<button type="button" data-jump="followups">Abrir tarea</button>'+
      '</div>';
    }

    var academicRows=(x.academicModules||[]).map(function(m){
      var exam=m.examApplicable
        ? (m.bestExam
          ? '<span class="pipeline-exam '+(m.bestExam.passed?'passed':'attempted')+'">'+Math.round(Number(m.bestExam.percentage||0))+'% · '+m.attempts+' intento'+(m.attempts===1?'':'s')+'</span>'
          : '<span class="pipeline-exam">Sin intento</span>')
        : '<span class="pipeline-exam neutral">No aplica</span>';
      return '<div class="pipeline-module-row">'+
        '<div><strong>'+esc(m.label)+'</strong><small>'+esc(m.module.title||'')+'</small></div>'+
        '<div class="pipeline-module-progress"><i style="width:'+m.percent+'%"></i></div>'+
        '<b>'+m.percent+'%</b>'+
        exam+
      '</div>';
    }).join('');

    var academicDetail='<details class="student-academic-detail">'+
      '<summary><span>Resumen académico</span><strong>'+x.examsDone+'/'+x.examsAvailable+' evaluaciones · '+(x.examAverage==null?'sin promedio':x.examAverage+'% promedio')+'</strong></summary>'+
      '<div class="student-academic-detail-body">'+academicRows+'</div>'+
    '</details>';

    var search=[x.profile.full_name,x.profile.email,x.phone,x.course.title].join(' ').toLowerCase();

    return '<article class="student-pipeline-card" data-student-card data-course-id="'+esc(x.course.id)+'" data-search="'+esc(search)+'">'+
      '<div class="student-pipeline-person"><div><strong>'+esc(x.profile.full_name||x.profile.email||'Alumno')+'</strong><small>'+esc(x.profile.email||'')+'</small></div><span class="student-progress-number">'+x.percent+'%</span></div>'+
      '<div class="student-contact-row"><div class="student-phone-row"><span>Teléfono</span>'+phoneHtml(x.phone)+'</div>'+contactActions(x)+'</div>'+
      '<div class="student-course">'+esc(x.course.title||'Curso')+'</div>'+
      '<div class="student-progress"><i style="width:'+x.percent+'%"></i></div>'+
      '<div class="student-module">'+esc(moduleText)+'</div>'+
      '<div class="student-current-lesson"><span>Lección actual</span><strong>'+esc(lessonText)+'</strong>'+
        (x.stage==='in_progress'&&x.lessonWatch>0?'<small>Avance de esta lección: '+Math.round(x.lessonWatch)+'%</small>':'')+
      '</div>'+
      '<div class="'+activityClass+'"><span>Última actividad</span><strong>'+esc(relativeActivity(x.lastActivityAt))+'</strong></div>'+
      followup+
      academicDetail+
      '<div class="student-record-actions"><button type="button" data-student-record="'+esc(x.profile.id)+'" data-student-course="'+esc(x.course.id)+'">Ver expediente académico</button></div>'+
      '<div class="student-card-foot"><span>'+x.completedLessons+' / '+x.totalLessons+' lecciones completadas</span>'+cert+'</div>'+
    '</article>';
  }

  var columns=[
    ['not_started','No iniciado','Aún no comenzó'],
    ['in_progress','En curso','Ya comenzó'],
    ['completed','Terminado','Curso completado'],
    ['certified','Certificado','Constancia emitida']
  ];

  var courseOptions=state.data.courses.map(function(c){return '<option value="'+esc(c.id)+'">'+esc(c.title)+'</option>';}).join('');
  var pendingFollowups=items.filter(function(x){return Boolean(x.pendingFollowup);}).length;
  var filters='<section class="student-pipeline-tools">'+
    '<div><span>Buscar alumno</span><input id="pipeline-search" type="search" placeholder="Nombre, correo o teléfono"></div>'+
    '<div><span>Curso</span><select id="pipeline-course"><option value="">Todos los cursos</option>'+courseOptions+'</select></div>'+
    '<div class="student-pipeline-tool-status"><span>Seguimiento</span><strong id="pipeline-visible-count">'+items.length+' registros</strong><small>'+pendingFollowups+' tareas automáticas pendientes</small></div>'+
  '</section>';

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
      '<div class="student-pipeline-head"><div><strong>'+esc(col[1])+'</strong><small>'+esc(col[2])+'</small></div><b data-stage-count>'+list.length+'</b></div>'+
      '<div class="student-pipeline-list">'+(list.length?list.map(card).join(''):'<div class="student-pipeline-empty">Sin alumnos</div>')+'</div>'+
    '</div>';
  }).join('')+'</section>';

  var note='<div class="back-note student-pipeline-note"><strong>Seguimiento académico</strong><span>El pipeline se actualiza con el avance real guardado en Supabase maestro. La actividad reciente se marca en verde; después de 14 días sin actividad se resalta para seguimiento.</span></div>';

  return panel('Pipeline de alumnos','Academia AG · progreso por curso',metrics+filters+board+note,'<a href="../academia.html?crm_admin=1#workspace/general/students">Abrir Academia</a>');
}

function bindStudentPipelineFilters(){
  var search=document.getElementById('pipeline-search');
  var course=document.getElementById('pipeline-course');
  if(!search&&!course)return;

  function apply(){
    var term=String(search&&search.value||'').trim().toLowerCase();
    var courseId=String(course&&course.value||'');
    var visible=0;

    document.querySelectorAll('[data-student-card]').forEach(function(card){
      var show=(!term||String(card.dataset.search||'').indexOf(term)>=0)&&(!courseId||card.dataset.courseId===courseId);
      card.hidden=!show;
      if(show)visible++;
    });

    document.querySelectorAll('[data-pipeline-stage]').forEach(function(column){
      var n=Array.from(column.querySelectorAll('[data-student-card]')).filter(function(card){return !card.hidden;}).length;
      var badge=column.querySelector('[data-stage-count]');
      if(badge)badge.textContent=n;
      var empty=column.querySelector('.student-pipeline-filter-empty');
      if(!empty&&n===0){
        empty=document.createElement('div');
        empty.className='student-pipeline-empty student-pipeline-filter-empty';
        empty.textContent='Sin coincidencias';
        column.querySelector('.student-pipeline-list')?.appendChild(empty);
      }else if(empty){
        empty.hidden=n>0;
      }
    });

    var counter=document.getElementById('pipeline-visible-count');
    if(counter)counter.textContent=visible+' '+(visible===1?'registro':'registros');
  }

  if(search)search.addEventListener('input',apply);
  if(course)course.addEventListener('change',apply);
}

function academicReportData(){
  var items=studentPipelineItems();
  var now=Date.now();

  function anchor(x){
    return x.lastActivityAt || x.enrollment.enrolled_at || null;
  }
  function inactiveDays(x){
    var value=anchor(x);
    if(!value)return null;
    var t=new Date(value).getTime();
    if(!t)return null;
    return Math.max(0,Math.floor((now-t)/86400000));
  }

  var activeItems=items.filter(function(x){
    return x.enrollment.status==='active' || x.enrollment.status==='completed';
  });
  var avgProgress=activeItems.length
    ? Math.round(activeItems.reduce(function(sum,x){return sum+Number(x.percent||0);},0)/activeItems.length)
    : 0;

  var uniqueStudents=new Set(items.map(function(x){return x.profile.id;}));
  var inactive7=activeItems.filter(function(x){var d=inactiveDays(x);return d!==null&&d>=7;});
  var inactive14=activeItems.filter(function(x){var d=inactiveDays(x);return d!==null&&d>=14;});
  var recent7=activeItems.filter(function(x){var d=inactiveDays(x);return d!==null&&d<7;});
  var certified=items.filter(function(x){return x.stage==='certified';});
  var completed=items.filter(function(x){return x.stage==='completed'||x.stage==='certified';});

  var byCourse=state.data.courses.map(function(course){
    var list=items.filter(function(x){return x.course.id===course.id;});
    var scored=list.filter(function(x){return x.examAverage!=null;});
    return {
      course:course,
      enrollments:list.length,
      averageProgress:list.length?Math.round(list.reduce(function(sum,x){return sum+Number(x.percent||0);},0)/list.length):0,
      notStarted:list.filter(function(x){return x.stage==='not_started';}).length,
      inProgress:list.filter(function(x){return x.stage==='in_progress';}).length,
      completed:list.filter(function(x){return x.stage==='completed';}).length,
      certified:list.filter(function(x){return x.stage==='certified';}).length,
      inactive7:list.filter(function(x){var d=inactiveDays(x);return d!==null&&d>=7;}).length,
      examAverage:scored.length?Math.round(scored.reduce(function(sum,x){return sum+Number(x.examAverage||0);},0)/scored.length):null
    };
  });

  var moduleRisks=[];
  state.data.courses.forEach(function(course){
    var courseItems=items.filter(function(x){return x.course.id===course.id;});
    var modules=state.data.modules
      .filter(function(m){return m.course_id===course.id;})
      .sort(function(a,b){return Number(a.position||0)-Number(b.position||0);});

    modules.forEach(function(module,index){
      var requiredLessons=state.data.lessons.filter(function(l){
        return l.module_id===module.id && String(l.lesson_kind||'lesson').toLowerCase()!=='promo';
      });
      var lessonIds=new Set(requiredLessons.map(function(l){return l.id;}));
      var started=0,completedCount=0,stalled7=0,stalled14=0;

      courseItems.forEach(function(x){
        var rows=state.data.lessonProgress.filter(function(p){
          return p.user_id===x.profile.id && lessonIds.has(p.lesson_id);
        });
        var moduleStarted=rows.some(function(p){
          return p.completed===true||Number(p.progress_seconds||0)>0||Number(p.watch_percentage||0)>0;
        });
        var done=requiredLessons.length>0 && requiredLessons.every(function(l){
          return rows.some(function(p){return p.lesson_id===l.id&&p.completed===true;});
        });
        if(moduleStarted)started++;
        if(done)completedCount++;

        var current=x.currentModule && x.currentModule.id===module.id;
        if(current){
          var days=inactiveDays(x);
          if(days!==null&&days>=7)stalled7++;
          if(days!==null&&days>=14)stalled14++;
        }
      });

      var type=String(module.section_type||'').toLowerCase();
      var number=Number(module.academic_number||0);
      var label=type==='introduction'?'Introducción':(type==='closing'?'Cierre':(number?'Módulo '+number:'Módulo '+(index+1)));
      moduleRisks.push({
        course:course,
        module:module,
        label:label,
        started:started,
        completed:completedCount,
        stalled7:stalled7,
        stalled14:stalled14,
        completionRate:started?Math.round((completedCount/started)*100):0
      });
    });
  });

  var bestByUserModule={};
  (state.data.moduleExamAttempts||[]).forEach(function(a){
    var key=a.user_id+'|'+a.module_id;
    var current=bestByUserModule[key];
    if(!current||Number(a.percentage||0)>Number(current.percentage||0))bestByUserModule[key]=a;
  });

  var examModules=state.data.modules
    .filter(function(m){return String(m.section_type||'').toLowerCase()==='academic';})
    .map(function(module){
      var attempts=(state.data.moduleExamAttempts||[]).filter(function(a){return a.module_id===module.id;});
      var best=Object.keys(bestByUserModule)
        .map(function(k){return bestByUserModule[k];})
        .filter(function(a){return a.module_id===module.id;});
      var course=state.data.courses.find(function(c){return c.id===module.course_id;})||{};
      return {
        module:module,
        course:course,
        attempts:attempts.length,
        students:best.length,
        average:best.length?Math.round(best.reduce(function(sum,a){return sum+Number(a.percentage||0);},0)/best.length):null,
        passed:best.filter(function(a){return a.passed===true;}).length
      };
    });

  return {
    items:items,
    activeItems:activeItems,
    uniqueStudents:uniqueStudents.size,
    avgProgress:avgProgress,
    inactive7:inactive7,
    inactive14:inactive14,
    recent7:recent7,
    certified:certified,
    completed:completed,
    byCourse:byCourse,
    moduleRisks:moduleRisks,
    examModules:examModules,
    inactiveDays:inactiveDays
  };
}

function renderReports(){
  var r=academicReportData();

  var metrics='<section class="back-metrics report-metrics">'+
    metric('Alumnos',r.uniqueStudents,'perfiles con inscripción','navy')+
    metric('Avance promedio',r.avgProgress+'%','promedio por inscripción','green')+
    metric('Activos 7 días',r.recent7.length,'con actividad reciente','blue')+
    metric('Sin actividad 7+d',r.inactive7.length,'requieren seguimiento','gold')+
    metric('Sin actividad 14+d',r.inactive14.length,'prioridad alta','red')+
    metric('Certificados',r.certified.length,r.completed.length+' cursos terminados','purple')+
  '</section>';

  var funnelTotal=Math.max(1,r.items.length);
  var funnel=[
    ['Inscritos',r.items.length,'#1e293b'],
    ['Iniciaron',r.items.filter(function(x){return x.stage!=='not_started';}).length,'#005134'],
    ['En curso',r.items.filter(function(x){return x.stage==='in_progress';}).length,'#64748b'],
    ['Terminaron',r.completed.length,'#475569'],
    ['Certificados',r.certified.length,'#0f766e']
  ];
  var funnelHtml='<div class="report-funnel">'+funnel.map(function(row){
    var pct=Math.round((row[1]/funnelTotal)*100);
    return '<div class="report-funnel-row"><div><strong>'+esc(row[0])+'</strong><span>'+row[1]+' · '+pct+'%</span></div><div class="report-funnel-track"><i style="width:'+pct+'%;background:'+row[2]+'"></i></div></div>';
  }).join('')+'</div>';

  var courseRows=r.byCourse.map(function(x){
    return row([
      '<strong>'+esc(x.course.title||'Curso')+'</strong>',
      '<strong>'+x.enrollments+'</strong>',
      '<strong>'+x.averageProgress+'%</strong><div class="report-mini-bar"><i style="width:'+x.averageProgress+'%"></i></div>',
      x.notStarted+' / '+x.inProgress,
      x.completed+' / '+x.certified,
      '<span class="'+(x.inactive7?'report-risk':'')+'">'+x.inactive7+'</span>',
      x.examAverage==null?'—':x.examAverage+'%'
    ]);
  });

  var riskyModules=r.moduleRisks
    .slice()
    .sort(function(a,b){
      return (b.stalled14*100+b.stalled7*10+(100-b.completionRate))-(a.stalled14*100+a.stalled7*10+(100-a.completionRate));
    })
    .slice(0,12);

  var moduleRows=riskyModules.map(function(x){
    var risk=x.stalled14>0?'Alta':(x.stalled7>0?'Media':'Baja');
    return row([
      '<strong>'+esc(x.label)+'</strong><small>'+esc(x.module.title||'')+'</small><small>'+esc(x.course.title||'')+'</small>',
      x.started,
      x.completed,
      '<strong>'+x.completionRate+'%</strong><div class="report-mini-bar"><i style="width:'+x.completionRate+'%"></i></div>',
      '<span class="'+(x.stalled7?'report-risk':'')+'">'+x.stalled7+'</span>',
      '<span class="'+(x.stalled14?'report-risk high':'')+'">'+x.stalled14+'</span>',
      badge(risk==='Alta'?'lost':(risk==='Media'?'pending':'active'),risk)
    ]);
  });

  var examRows=r.examModules.map(function(x){
    var passRate=x.students?Math.round((x.passed/x.students)*100):0;
    return row([
      '<strong>Módulo '+esc(x.module.academic_number||'')+'</strong><small>'+esc(x.module.title||'')+'</small>',
      esc(x.course.title||''),
      x.students,
      x.attempts,
      x.average==null?'—':x.average+'%',
      x.students?passRate+'%':'—'
    ]);
  });

  var inactiveRows=r.inactive14
    .slice()
    .sort(function(a,b){return r.inactiveDays(b)-r.inactiveDays(a);})
    .slice(0,12)
    .map(function(x){
      var days=r.inactiveDays(x);
      return row([
        '<strong>'+esc(x.profile.full_name||x.profile.email||'Alumno')+'</strong><small>'+esc(x.profile.email||'')+'</small>',
        esc(x.course.title||''),
        x.percent+'%',
        x.currentModule?esc(x.currentModule.title||''):'—',
        '<strong class="report-risk high">'+days+' días</strong>',
        '<button data-student-record="'+esc(x.profile.id)+'" data-student-course="'+esc(x.course.id)+'">Expediente</button>'
      ]);
    });

  var actions='<div class="report-actions">'+
    '<button id="report-export-csv">Exportar CSV</button>'+
    '<button id="report-print">Imprimir reporte</button>'+
  '</div>';

  return '<section class="reports-heading">'+
      '<div><span class="eyebrow">Inteligencia académica</span><h2>Centro de reportes</h2><p>Visión global de avance, actividad, abandono, evaluaciones y certificación de Academia AG.</p></div>'+
      actions+
    '</section>'+
    metrics+
    '<section class="back-grid two report-top-grid">'+
      panel('Embudo académico','Conversión del alumno',funnelHtml)+
      panel('Riesgo prioritario','14+ días sin actividad',inactiveRows.length?table(['Alumno','Curso','Avance','Módulo','Inactividad',''],inactiveRows):empty('No hay alumnos con 14 o más días sin actividad.'))+
    '</section>'+
    panel('Rendimiento por curso','Comparativo académico',courseRows.length?table(['Curso','Inscritos','Avance','No inició / En curso','Terminados / Cert.','7+d','Prom. eval.'],courseRows):empty('No hay cursos con inscripciones.'))+
    panel('Módulos con mayor riesgo','Puntos de abandono o estancamiento',moduleRows.length?table(['Módulo','Iniciaron','Completaron','Finalización','7+d','14+d','Riesgo'],moduleRows):empty('No hay datos de módulos.'))+
    panel('Evaluaciones opcionales','Resultados por módulo',examRows.length?table(['Módulo','Curso','Alumnos','Intentos','Promedio','Aprobación'],examRows):empty('No hay evaluaciones configuradas.'));
}

function exportAcademicReportCsv(){
  var r=academicReportData();
  var rows=[[
    'Alumno','Correo','Teléfono','Curso','Etapa','Avance %','Lecciones completadas','Lecciones requeridas',
    'Módulo actual','Última actividad','Días sin actividad','Evaluaciones realizadas','Promedio evaluaciones','Certificado'
  ]];

  r.items.forEach(function(x){
    rows.push([
      x.profile.full_name||'',
      x.profile.email||'',
      x.phone||'',
      x.course.title||'',
      pipelineStageLabel(x.stage),
      x.percent,
      x.completedLessons,
      x.totalLessons,
      x.currentModule?x.currentModule.title||'':'',
      x.lastActivityAt?fmt(x.lastActivityAt):'',
      r.inactiveDays(x)==null?'':r.inactiveDays(x),
      x.examsDone,
      x.examAverage==null?'':x.examAverage,
      x.certificate?(x.certificate.credential_code||x.certificate.verification_code||'Emitido'):''
    ]);
  });

  function csvCell(value){
    var s=String(value==null?'':value);
    return '"'+s.replace(/"/g,'""')+'"';
  }

  var csv='\uFEFF'+rows.map(function(row){return row.map(csvCell).join(',');}).join('\r\n');
  var blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');
  a.href=url;
  a.download='AG-reporte-academico-'+new Date().toISOString().slice(0,10)+'.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function(){URL.revokeObjectURL(url);},500);
}

function renderStudentRecord(){
  var userId=state.recordUserId;
  if(!userId)return '<div class="back-warning large"><strong>Expediente no disponible</strong><span>No se especificó un alumno.</span></div>';

  var profile=state.data.profiles.find(function(p){return p.id===userId;})||null;
  if(!profile)return '<div class="back-warning large"><strong>Alumno no encontrado</strong><span>El perfil no pertenece al workspace de AG o ya no está disponible.</span><button data-jump="student_pipeline">Volver al Pipeline</button></div>';

  var items=studentPipelineItems().filter(function(x){return x.profile.id===userId;});
  if(!items.length)return '<div class="back-warning large"><strong>Sin inscripción académica</strong><span>Este alumno todavía no tiene un curso asignado.</span><button data-jump="students">Volver a alumnos</button></div>';

  var active=items.find(function(x){return state.recordCourseId&&x.course.id===state.recordCourseId;})||items[0];
  state.recordCourseId=active.course.id;

  function rel(value){
    if(!value)return 'Sin actividad';
    var time=new Date(value).getTime();
    if(!time)return 'Sin actividad';
    var days=Math.floor(Math.max(0,Date.now()-time)/86400000);
    if(days===0)return 'Hoy';
    if(days===1)return 'Ayer';
    return 'Hace '+days+' días';
  }

  var cleanPhone=String(active.phone||'').replace(/[^0-9]/g,'');
  var contacts='<div class="record-contact-actions">'+
    (active.phone?'<a href="tel:'+esc(String(active.phone).replace(/[^+0-9]/g,''))+'">☎ Llamar</a>':'')+
    (cleanPhone.length>=10?'<a href="https://wa.me/'+esc(cleanPhone)+'" target="_blank" rel="noopener">WA WhatsApp</a>':'')+
    (profile.email?'<a href="mailto:'+esc(profile.email)+'">✉ Correo</a>':'')+
  '</div>';

  var courseTabs=items.length>1
    ? '<div class="record-course-tabs">'+items.map(function(x){
        return '<button data-record-course="'+esc(x.course.id)+'" class="'+(x.course.id===active.course.id?'active':'')+'">'+esc(x.course.title)+'</button>';
      }).join('')+'</div>'
    : '';

  var modules=active.academicModules||[];
  var completedModules=modules.filter(function(m){return m.percent===100;}).length;
  var certificate=active.certificate;
  var followups=state.data.tasks.filter(function(t){
    return active.candidate&&t.candidate_id===active.candidate.id
      && t.metadata
      && t.metadata.automation==='academy_inactivity'
      && String(t.metadata.academy_course_id||'')===String(active.course.id);
  }).sort(function(a,b){return new Date(b.created_at||0)-new Date(a.created_at||0);});

  var moduleRows=modules.map(function(m){
    var best=m.bestExam;
    var exam=m.examApplicable
      ? (best
        ? '<span class="record-exam '+(best.passed?'passed':'attempted')+'"><strong>'+Math.round(Number(best.percentage||0))+'%</strong><small>'+m.attempts+' intento'+(m.attempts===1?'':'s')+'</small></span>'
        : '<span class="record-exam"><strong>—</strong><small>Sin intento</small></span>')
      : '<span class="record-exam neutral"><strong>—</strong><small>No aplica</small></span>';

    return '<article class="record-module-card '+(m.percent===100?'complete':'')+'">'+
      '<div class="record-module-main"><span>'+esc(m.label)+'</span><strong>'+esc(m.module.title||'')+'</strong><small>'+m.completed+' de '+m.total+' lecciones</small></div>'+
      '<div class="record-module-progress"><div><i style="width:'+m.percent+'%"></i></div><b>'+m.percent+'%</b></div>'+
      exam+
    '</article>';
  }).join('');

  var courseModuleIds=new Set(active.modules.map(function(m){return m.id;}));
  var lessonMap={};
  state.data.lessons.forEach(function(l){if(courseModuleIds.has(l.module_id))lessonMap[l.id]=l;});
  var moduleMap={};
  active.modules.forEach(function(m){moduleMap[m.id]=m;});

  var recentProgress=state.data.lessonProgress
    .filter(function(p){return p.user_id===userId&&lessonMap[p.lesson_id];})
    .slice()
    .sort(function(a,b){
      return new Date(b.last_watched_at||b.updated_at||b.completed_at||0)-new Date(a.last_watched_at||a.updated_at||a.completed_at||0);
    })
    .slice(0,12);

  var activityRows=recentProgress.map(function(p){
    var lesson=lessonMap[p.lesson_id]||{};
    var mod=moduleMap[lesson.module_id]||{};
    var watch=Math.round(Number(p.watch_percentage||0));
    return row([
      '<strong>'+esc(lesson.title||'Lección')+'</strong><small>'+esc(mod.title||'')+'</small>',
      p.completed?badge('completed','Completada'):badge('in_progress','En progreso'),
      '<strong>'+watch+'%</strong><small>'+Math.round(Number(p.last_position_seconds||p.progress_seconds||0))+' s registrados</small>',
      esc(fmt(p.last_watched_at||p.updated_at||p.completed_at))
    ]);
  });

  var followupRows=followups.map(function(t){
    return row([
      '<strong>'+esc(t.title||'Seguimiento')+'</strong><small>'+esc(t.description||'')+'</small>',
      badge(t.priority,t.priority),
      badge(t.status,t.status),
      esc(fmt(t.created_at)),
      esc(fmt(t.completed_at))
    ]);
  });

  var certCard=certificate
    ? '<div class="record-certificate valid"><span>Certificado</span><strong>✓ Emitido y válido</strong><small>Código: '+esc(certificate.credential_code||certificate.verification_code||'—')+' · '+esc(fmt(certificate.issued_at))+'</small></div>'
    : '<div class="record-certificate"><span>Certificado</span><strong>Pendiente</strong><small>Se emite automáticamente al cumplir los requisitos del curso.</small></div>';

  var header='<section class="student-record-hero">'+
    '<div class="student-record-breadcrumb"><button data-jump="student_pipeline">← Volver al Pipeline</button><button id="record-print">Imprimir expediente</button></div>'+
    '<div class="student-record-identity">'+
      '<div><span class="eyebrow">Expediente académico</span><h2>'+esc(profile.full_name||profile.email||'Alumno')+'</h2><p>'+esc(profile.email||'')+(active.phone?' · '+esc(active.phone):'')+'</p></div>'+
      '<div>'+badge(profile.account_status||'active')+contacts+'</div>'+
    '</div>'+
    courseTabs+
  '</section>';

  var metrics='<section class="record-metrics">'+
    metric('Avance del curso',active.percent+'%',active.completedLessons+' / '+active.totalLessons+' lecciones','green')+
    metric('Secciones',completedModules+'/'+modules.length,'completadas','blue')+
    metric('Evaluaciones',active.examsDone+'/'+active.examsAvailable,'opcionales realizadas','purple')+
    metric('Promedio',active.examAverage==null?'—':active.examAverage+'%','mejores intentos','gold')+
    metric('Actividad',rel(active.lastActivityAt),active.lastActivityAt?fmt(active.lastActivityAt):'sin registro','navy')+
  '</section>';

  var courseStatus='<section class="record-course-status">'+
    '<div><span>Curso</span><strong>'+esc(active.course.title)+'</strong><small>'+pipelineStageLabel(active.stage)+' · inscripción '+esc(active.enrollment.status||'—')+'</small></div>'+
    certCard+
  '</section>';

  return header+metrics+courseStatus+
    panel('Avance por módulo','Detalle académico',moduleRows||empty('No hay módulos configurados.'))+
    '<section class="back-grid two">'+
      panel('Actividad reciente','Lecciones',activityRows.length?table(['Lección','Estado','Avance','Actividad'],activityRows):empty('El alumno aún no registra actividad.'))+
      panel('Seguimientos','CRM académico',followupRows.length?table(['Seguimiento','Prioridad','Estado','Creado','Cerrado'],followupRows):empty('No hay seguimientos académicos para este curso.'))+
    '</section>';
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
        '<button data-student-record="'+s.id+'">Expediente</button>'+
        '<a href="../academia.html?crm_admin=1#workspace/general/students">Gestionar</a>'+
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
  var courseCount=state.data.courses.length;
  var enrollmentCount=state.data.enrollments.filter(function(x){return x.status==='active';}).length;
  var masterStatus='<div class="migration-tool">'+
    '<div class="migration-copy"><strong>Supabase maestro activo</strong><span>Back Office, CRM y Academia AG ya leen y escriben sobre la base maestra compartida. El Supabase anterior queda únicamente como respaldo temporal y ya no participa en la operación diaria.</span></div>'+
    '<div class="migration-result"><strong>Seguimiento automático activo</strong><span>Revisión diaria de alumnos: tarea de prioridad alta a los 7 días sin actividad y urgente a los 14 días. Si el alumno vuelve a estudiar, la tarea pendiente se cierra automáticamente.</span></div>'+
    '<div class="migration-result"><strong>Operación validada</strong><span>'+studentCount+' alumnos · '+courseCount+' cursos · '+enrollmentCount+' inscripciones activas</span></div>'+
  '</div>';
  return '<section class="back-grid two">'+
    panel('Estructura del sistema','Arquitectura','<div class="back-setting-list"><div><strong>CRM AG</strong><span>agbusinessnetworking.com/crm/</span></div><div><strong>Administrador AG</strong><span>agbusinessnetworking.com/crm/admin.html</span></div><div><strong>Academia AG</strong><span>agbusinessnetworking.com/academia.html</span></div></div>')+
    panel('Base de datos','Supabase maestro',masterStatus)+
    panel('Documentos legales','Sitio público','<div class="back-setting-list"><a href="../privacidad/" target="_blank"><strong>Privacidad</strong><span>/privacidad/</span></a><a href="../terminos/" target="_blank"><strong>Términos</strong><span>/terminos/</span></a><a href="../reembolsos/" target="_blank"><strong>Reembolsos</strong><span>/reembolsos/</span></a><a href="../conducta/" target="_blank"><strong>Conducta</strong><span>/conducta/</span></a><a href="../derechos-de-autor/" target="_blank"><strong>Derechos de autor</strong><span>/derechos-de-autor/</span></a><a href="../accesibilidad/" target="_blank"><strong>Accesibilidad</strong><span>/accesibilidad/</span></a></div>')+
    panel('Seguridad','Accesos internos','<div class="back-warning"><strong>Administración separada de la Academia</strong><span>Las cuentas admin se administran desde este Back Office. Los alumnos e instructores permanecen en Academia AG, con datos aislados por el workspace de AG.</span></div>')+
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
  else if(state.section==='reports')html=renderReports();
  else if(state.section==='student_record')html=renderStudentRecord();
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
  if(state.section==='student_pipeline')bindStudentPipelineFilters();
  var reportCsv=document.getElementById('report-export-csv');
  if(reportCsv)reportCsv.onclick=exportAcademicReportCsv;
  var reportPrint=document.getElementById('report-print');
  if(reportPrint)reportPrint.onclick=function(){window.print();};
  document.querySelectorAll('[data-student-record]').forEach(function(b){b.onclick=function(){
    state.recordUserId=b.dataset.studentRecord;
    state.recordCourseId=b.dataset.studentCourse||null;
    state.section='student_record';
    location.hash='student/'+encodeURIComponent(state.recordUserId)+(state.recordCourseId?'/'+encodeURIComponent(state.recordCourseId):'');
    render();
  };});
  document.querySelectorAll('[data-record-course]').forEach(function(b){b.onclick=function(){
    state.recordCourseId=b.dataset.recordCourse;
    location.hash='student/'+encodeURIComponent(state.recordUserId)+'/'+encodeURIComponent(state.recordCourseId);
    renderSection();
  };});
  var recordPrint=document.getElementById('record-print');
  if(recordPrint)recordPrint.onclick=function(){window.print();};
  document.querySelectorAll('[data-jump]').forEach(function(b){b.onclick=function(){state.recordUserId=null;state.recordCourseId=null;state.section=b.dataset.jump;location.hash=state.section;render();};});
  document.querySelectorAll('[data-user-status]').forEach(function(b){b.onclick=async function(){var r=await db.rpc('admin_set_account_status',{target_user:b.dataset.userStatus,new_status:b.dataset.status});if(r.error)return toast(r.error.message,true);toast('Estado del alumno actualizado.');await loadAll();render();};});
  document.querySelectorAll('[data-course-status]').forEach(function(b){b.onclick=async function(){var r=await db.from('courses').update({status:b.dataset.status}).eq('id',b.dataset.courseStatus);if(r.error)return toast(r.error.message,true);toast('Curso actualizado.');await loadAll();render();};});
  document.querySelectorAll('[data-ticket-status]').forEach(function(s){s.onchange=async function(){var r=await db.from('support_tickets').update({status:s.value,updated_at:new Date().toISOString()}).eq('id',s.dataset.ticketStatus);if(r.error)return toast(r.error.message,true);toast('Ticket actualizado.');await loadAll();render();};});
  document.querySelectorAll('[data-complete-task]').forEach(function(b){b.onclick=async function(){
    b.disabled=true;
    var r=await db.rpc('ag_complete_crm_task',{target_task:b.dataset.completeTask});
    if(r.error){b.disabled=false;return toast(r.error.message,true);}
    toast('Seguimiento marcado como atendido.');
    await loadAll();
    render();
  };});
  document.querySelectorAll('[data-editor-course]').forEach(function(b){b.onclick=function(){openAcademyEditor(b.dataset.editorCourse||'');};});
  document.querySelectorAll('[data-open-legacy]').forEach(function(b){b.onclick=function(){openAcademyAdmin(b.dataset.openLegacy||'');};});
}

function openAcademyEditor(courseId){
  openEmbedded('../academia.html?crm_admin=1#'+(courseId?'course/'+encodeURIComponent(courseId):'workspace/general/courses'),'Editor académico');
}
function openAcademyAdmin(target){
  var pageMap={'admin-users':'students','admin-courses':'courses','access-center':'access'};
  openEmbedded('../academia.html?crm_admin=1#workspace/general/'+(pageMap[target]||'overview'),'Administración avanzada');
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
  var studentMatch=hash.match(/^student\/([^/]+)(?:\/([^/]+))?$/);
  if(studentMatch){
    state.section='student_record';
    state.recordUserId=decodeURIComponent(studentMatch[1]);
    state.recordCourseId=studentMatch[2]?decodeURIComponent(studentMatch[2]):null;
  }else if(NAV.some(function(n){return n[0]===hash;})){
    state.section=hash;
  }
  await loadAll();
  shell();
}

window.addEventListener('hashchange',function(){
  var h=location.hash.replace(/^#/,'');
  var studentMatch=h.match(/^student\/([^/]+)(?:\/([^/]+))?$/);
  if(studentMatch){
    state.section='student_record';
    state.recordUserId=decodeURIComponent(studentMatch[1]);
    state.recordCourseId=studentMatch[2]?decodeURIComponent(studentMatch[2]):null;
    render();
    return;
  }
  if(NAV.some(function(n){return n[0]===h;})){
    state.recordUserId=null;
    state.recordCourseId=null;
    state.section=h;
    render();
  }
});
if(db)db.auth.onAuthStateChange(function(){setTimeout(boot,0);});
boot();
})();