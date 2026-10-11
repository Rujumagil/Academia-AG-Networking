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
  data:{profiles:[],courses:[],modules:[],lessons:[],lessonProgress:[],enrollments:[],resources:[],lessonBlocks:[],courseVersions:[],assessments:[],assessmentQuestions:[],assessmentOptions:[],lessonQuizzes:[],orders:[],accesses:[],products:[],certificates:[],tickets:[],candidates:[],tasks:[]}
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
  document.querySelectorAll('[data-jump]').forEach(function(b){b.onclick=function(){state.section=b.dataset.jump;location.hash=state.section;render();};});
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
  if(NAV.some(function(n){return n[0]===hash;}))state.section=hash;
  await loadAll();
  shell();
}

window.addEventListener('hashchange',function(){var h=location.hash.replace(/^#/,'');if(NAV.some(function(n){return n[0]===h;})){state.section=h;render();}});
if(db)db.auth.onAuthStateChange(function(){setTimeout(boot,0);});
boot();
})();