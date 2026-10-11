(function(){
'use strict';
var form=document.getElementById('ag-lead-form');
if(!form)return;
var cfg=window.SUPABASE_CONFIG||{};
var result=document.getElementById('ag-lead-result');
var follow=document.getElementById('ag-lead-followup');
var button=form.querySelector('button[type="submit"]');
function show(message,type){if(!result)return;result.textContent=message;result.className='lead-result is-visible '+(type==='success'?'is-success':'is-error');}
function utm(){var p=new URLSearchParams(location.search),o={};['utm_source','utm_medium','utm_campaign','utm_content','utm_term','utm_id','fbclid','gclid','msclkid'].forEach(function(k){var v=p.get(k);if(v)o[k]=v;});return o;}
function candidateType(intent){var v=String(intent||'').toLowerCase();if(v.indexOf('curso')>=0)return 'course';if(v.indexOf('membres')>=0)return 'membership';if(v.indexOf('evento')>=0)return 'event';if(v.indexOf('proveedor')>=0)return 'provider';if(v.indexOf('negocio')>=0||v.indexOf('apoyo')>=0)return 'service';return 'other';}
form.addEventListener('submit',async function(ev){
  ev.preventDefault();
  var data=new FormData(form);
  var name=String(data.get('name')||'').trim();
  var email=String(data.get('email')||'').trim();
  var phone=String(data.get('phone')||'').trim();
  var company=String(data.get('company')||'').trim();
  var intent=String(data.get('intent')||'').trim();
  var message=String(data.get('message')||'').trim();
  var consent=data.get('consent')==='on';
  if(!email&&!phone){show('Escribe al menos un correo o teléfono para poder darte seguimiento.','error');return;}
  if(!consent){show('Necesitamos tu autorización para registrar la solicitud y darle seguimiento.','error');return;}
  if(!cfg.url||!cfg.publishableKey){show('El sistema de atención no está disponible en este momento.','error');return;}
  button.disabled=true;var original=button.textContent;button.textContent='Registrando solicitud…';if(result)result.classList.remove('is-visible');if(follow)follow.classList.remove('is-visible');
  try{
    var response=await fetch(cfg.url+'/rest/v1/rpc/ag_crm_create_public_candidate',{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':cfg.publishableKey,'Authorization':'Bearer '+cfg.publishableKey},
      body:JSON.stringify({
        p_full_name:name,p_email:email||null,p_phone:phone||null,p_company:company||null,
        p_candidate_type:candidateType(intent),p_interest:intent||null,p_message:message||null,
        p_source:'website',p_page_url:location.href,p_utm:utm(),p_consent:true,p_honeypot:null
      })
    });
    var payload=await response.json().catch(function(){return null;});
    if(!response.ok)throw new Error(payload&&payload.message?payload.message:'No fue posible registrar la solicitud.');
    show('¡Listo! Tu solicitud quedó registrada en AG Business Networking. Nuestro equipo podrá darle seguimiento.','success');
    form.reset();
  }catch(error){
    console.error('AG_CRM_LEAD_FAILED',error);
    show('No pudimos registrar tu solicitud en este momento. Intenta nuevamente o contáctanos por nuestros canales oficiales.','error');
  }finally{button.disabled=false;button.textContent=original;}
});
})();