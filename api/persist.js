const RAW_SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_URL=String(RAW_SUPABASE_URL||'').replace(/\/(?:rest|auth)\/v1\/?$/,'').replace(/\/$/,'');
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const {buildMirror}=require('../lib/mirror-engine');
const {buildRelationalSelf}=require('../lib/relational-self');

async function getUser(accessToken){const r=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${accessToken}`}});return r.ok?r.json():null;}
async function request(path,{method='GET',body,accessToken,prefer}={}){const r=await fetch(`${SUPABASE_URL}/rest/v1${path}`,{method,headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json',...(prefer?{Prefer:prefer}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});if(!r.ok){const text=await r.text();throw new Error(text||`Supabase request failed: ${path}`)}if(r.status===204)return null;const text=await r.text();return text?JSON.parse(text):null;}
async function upsert(table,rows,accessToken,onConflict){const q=onConflict?`?on_conflict=${encodeURIComponent(onConflict)}`:'';return request(`/${table}${q}`,{method:'POST',body:rows,accessToken,prefer:'resolution=merge-duplicates,return=minimal'});}
async function upsertOptionalLocation(table,row,accessToken,onConflict){try{return await upsert(table,row,accessToken,onConflict)}catch(e){if(!('location_data'in row))throw e;const fallback={...row};delete fallback.location_data;return upsert(table,fallback,accessToken,onConflict);}}

async function hydrate(uid,accessToken){
  const [profiles,births,snapshots,sessions,relationalSelf]=await Promise.all([
    request(`/profiles?user_id=eq.${uid}&select=*&limit=1`,{accessToken}),
    request(`/birth_data?user_id=eq.${uid}&select=*&limit=1`,{accessToken}),
    request(`/person_model_snapshots?user_id=eq.${uid}&select=*&order=created_at.desc&limit=1`,{accessToken}),
    request(`/assessment_sessions?user_id=eq.${uid}&status=eq.in_progress&select=*&order=started_at.desc&limit=1`,{accessToken}),
    request(`/relational_self_snapshots?user_id=eq.${uid}&select=*&order=created_at.desc&limit=1`,{accessToken}).catch(()=>[])
  ]);
  const profile=profiles?.[0]||null,birth=births?.[0]||null,snapshot=snapshots?.[0]||null,session=sessions?.[0]||null;
  let assessment=null,active=null;
  if(snapshot){const model={dimensions:snapshot.scores||{},evidence:snapshot.confidence?.evidence||{},coverage:Number(snapshot.confidence?.coverage||0)};const archetypes=Array.isArray(snapshot.archetypes)?snapshot.archetypes:[];assessment={model,archetypes,mirror:buildMirror(model,archetypes),snapshot_id:snapshot.id,assessment_session_id:snapshot.assessment_session_id,model_version:snapshot.model_version,created_at:snapshot.created_at};}
  if(session){const rows=await request(`/assessment_responses_v2?session_id=eq.${encodeURIComponent(session.id)}&user_id=eq.${uid}&select=item_id,response&order=created_at.asc`,{accessToken});const responses={};for(const row of rows||[])responses[row.item_id]=row.response;active={session,responses};}
  return{profile,birth,assessment,active_assessment:active,relational_self:relationalSelf?.[0]||null};
}

async function saveMirrorFeedback(uid,body,accessToken){const accuracy=Number(body.overall_accuracy);if(!Number.isFinite(accuracy)||accuracy<1||accuracy>7)throw new Error('overall_accuracy must be between 1 and 7');let snapshotId=body.person_model_snapshot_id||null,sessionId=body.assessment_session_id||null;if(!snapshotId){const rows=await request(`/person_model_snapshots?user_id=eq.${uid}&select=id,assessment_session_id&order=created_at.desc&limit=1`,{accessToken});snapshotId=rows?.[0]?.id||null;sessionId=sessionId||rows?.[0]?.assessment_session_id||null;}return request('/mirror_feedback',{method:'POST',accessToken,prefer:'return=representation',body:{user_id:uid,person_model_snapshot_id:snapshotId,assessment_session_id:sessionId,overall_accuracy:accuracy,accurate_sections:Array.isArray(body.accurate_sections)?body.accurate_sections:[],inaccurate_sections:Array.isArray(body.inaccurate_sections)?body.inaccurate_sections:[],correction:String(body.correction||'').trim()||null,archetype_resonance:Number.isFinite(Number(body.archetype_resonance))?Number(body.archetype_resonance):null}});}
async function saveMatchOutcome(uid,b,accessToken){if(!b.candidate_user_id)throw new Error('candidate_user_id is required');const ratingFields=['felt_understood','conversational_ease','attraction','emotional_safety','intellectual_stimulation','values_fit'];const row={user_id:uid,candidate_user_id:b.candidate_user_id,match_id:b.match_id||null,met_in_person:b.met_in_person==null?null:!!b.met_in_person,wanted_second_date:b.wanted_second_date==null?null:!!b.wanted_second_date,rejection_reasons:Array.isArray(b.rejection_reasons)?b.rejection_reasons:[],notes:String(b.notes||'').trim()||null};for(const f of ratingFields){if(b[f]==null){row[f]=null;continue}const n=Number(b[f]);if(!Number.isFinite(n)||n<1||n>7)throw new Error(`${f} must be between 1 and 7`);row[f]=n;}return request('/match_outcomes',{method:'POST',accessToken,prefer:'return=representation',body:row});}

async function refreshRelationalSelf(uid,accessToken){
  const reflections=await request(`/connection_reflections?user_id=eq.${uid}&select=id,other_user_id,encounter_number,stage,mode,desire_to_continue,felt_safe,felt_seen,attraction,curiosity,ease,reflection,occurred_at&order=occurred_at.asc&limit=200`,{accessToken});
  const result=buildRelationalSelf(reflections||[]);
  if((result.evidence?.reflection_count||0)<3)return null;
  const rows=await request('/relational_self_snapshots',{method:'POST',accessToken,prefer:'return=representation',body:{user_id:uid,model_version:'relational-self-v1',hypotheses:result.hypotheses,evidence:result.evidence,source_reflection_count:result.evidence.reflection_count,distinct_connection_count:result.evidence.distinct_connection_count}});
  return rows?.[0]||null;
}

async function getConnectionContext(uid,b,accessToken){
  if(!b.other_user_id)throw new Error('other_user_id is required');
  const rows=await request(`/connection_reflections?user_id=eq.${uid}&other_user_id=eq.${encodeURIComponent(b.other_user_id)}&select=encounter_number,stage,mode,reflection,occurred_at&order=encounter_number.desc&limit=6`,{accessToken});
  const previous=rows||[];const last=previous[0]||null;let carry=null;
  for(const row of previous){const q=row?.reflection?.what_i_wonder||row?.reflection?.want_to_know;if(q){carry=q;break;}}
  const nextEncounter=(Number(last?.encounter_number)||0)+1;
  return{next_encounter:nextEncounter,stage:nextEncounter>=5?'established':nextEncounter>=3?'developing':'early',carry_forward_question:carry,last_mode:last?.mode||null,reflection_count:previous.length};
}

async function saveConnectionReflection(uid,b,accessToken){
  if(!b.other_user_id)throw new Error('other_user_id is required');
  const previous=await request(`/connection_reflections?user_id=eq.${uid}&other_user_id=eq.${encodeURIComponent(b.other_user_id)}&select=encounter_number&order=encounter_number.desc&limit=1`,{accessToken});
  const encounter=Number(b.encounter_number)||((previous?.[0]?.encounter_number||0)+1),stage=encounter>=5?'established':encounter>=3?'developing':'early';
  const allowedModes=new Set(['curiosity','reflection','concern','excitement']);const mode=allowedModes.has(b.mode)?b.mode:'reflection';
  const rate=(k)=>{if(b[k]==null||b[k]==='')return null;const n=Number(b[k]);if(!Number.isFinite(n)||n<1||n>7)throw new Error(`${k} must be between 1 and 7`);return n;};
  const reflection={surprised_by:String(b.surprised_by||'').trim()||null,how_i_felt:String(b.how_i_felt||'').trim()||null,what_i_know:String(b.what_i_know||'').trim()||null,what_i_interpret:String(b.what_i_interpret||'').trim()||null,what_i_wonder:String(b.what_i_wonder||b.want_to_know||'').trim()||null,what_i_noticed:String(b.what_i_noticed||'').trim()||null,what_changed:String(b.what_changed||'').trim()||null,repair_or_tension:String(b.repair_or_tension||'').trim()||null,where_more_or_less_self:String(b.where_more_or_less_self||'').trim()||null};
  const rows=await request('/connection_reflections',{method:'POST',accessToken,prefer:'return=representation',body:{match_id:b.match_id||null,user_id:uid,other_user_id:b.other_user_id,encounter_number:encounter,stage,mode,share_status:'private',occurred_at:b.occurred_at||new Date().toISOString(),desire_to_continue:b.desire_to_continue==null?null:!!b.desire_to_continue,felt_safe:rate('felt_safe'),felt_seen:rate('felt_seen'),attraction:rate('attraction'),curiosity:rate('curiosity'),ease:rate('ease'),reflection}});
  const reflectionId=rows?.[0]?.id;const observations=[];
  const add=(type,text,epistemic_status,scope)=>{text=String(text||'').trim();if(text)observations.push({reflection_id:reflectionId,observer_user_id:uid,other_user_id:b.other_user_id,observation_type:type,body:text,subjective:true,epistemic_status,scope});};
  add('self_response',b.how_i_felt,'observation','observer_self');add('interaction_pattern',b.what_i_know,'observation','interaction');add('noticed_quality',b.what_i_noticed,'observation','subjective_other');add('interaction_pattern',b.what_i_interpret,'interpretation','interaction');add('interaction_pattern',b.what_changed||b.repair_or_tension,'interpretation','interaction');add('open_question',b.what_i_wonder||b.want_to_know,'question','interaction');
  if(reflectionId&&observations.length)await request('/relational_observations',{method:'POST',accessToken,body:observations,prefer:'return=minimal'});
  const relationalSelf=await refreshRelationalSelf(uid,accessToken).catch(()=>null);
  return{reflection:rows?.[0]||null,relational_self:relationalSelf};
}

module.exports=async function handler(req,res){
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed.'});}
  if(!SUPABASE_URL||!SUPABASE_KEY)return res.status(500).json({error:'Supabase is not configured.'});
  const auth=String(req.headers.authorization||''),accessToken=auth.startsWith('Bearer ')?auth.slice(7):'';if(!accessToken)return res.status(401).json({error:'Sign in is required before Wonder can sync.'});
  try{
    const user=await getUser(accessToken);if(!user?.id)return res.status(401).json({error:'Your Wonder session needs to be refreshed.'});
    const body=req.body||{},uid=user.id,action=body.action||'onboarding';
    if(action==='hydrate')return res.status(200).json({ok:true,user_id:uid,...await hydrate(uid,accessToken)});
    if(action==='mirror_feedback'){const rows=await saveMirrorFeedback(uid,body,accessToken);return res.status(200).json({ok:true,user_id:uid,feedback:rows?.[0]||null});}
    if(action==='match_outcome'){const rows=await saveMatchOutcome(uid,body,accessToken);return res.status(200).json({ok:true,user_id:uid,outcome:rows?.[0]||null});}
    if(action==='connection_context')return res.status(200).json({ok:true,user_id:uid,...await getConnectionContext(uid,body,accessToken)});
    if(action==='connection_reflection'){const saved=await saveConnectionReflection(uid,body,accessToken);return res.status(200).json({ok:true,user_id:uid,...saved});}

    const {birth,essentials,answers,places={}}=body;
    if(birth){await upsertOptionalLocation('birth_data',{user_id:uid,date_of_birth:birth.dob||null,time_of_birth:birth.tob||null,place_of_birth:birth.pob||null,time_accuracy:birth.toa||null,...(places.birthplace?{location_data:places.birthplace}:{}),updated_at:new Date().toISOString()},accessToken,'user_id');}
    if(essentials){await upsertOptionalLocation('profiles',{user_id:uid,first_name:essentials.firstName||null,current_city:essentials.currentCity||null,gender:essentials.gender||null,interested_in:essentials.interested||null,relationship_intention:essentials.intent||null,relationship_structure:essentials.structure||null,children:essentials.children||null,religion:essentials.religion||null,age_range:essentials.ageRange||null,max_distance:essentials.distance||null,nonnegotiables:essentials.nonnegotiables||null,...(places.current_city?{location_data:places.current_city}:{}),updated_at:new Date().toISOString()},accessToken,'user_id');}
    if(answers&&typeof answers==='object'){const rows=Object.entries(answers).filter(([,v])=>Number.isInteger(Number(v))).map(([questionId,answerIndex])=>({user_id:uid,question_id:Number(questionId),answer_index:Number(answerIndex),updated_at:new Date().toISOString()}));if(rows.length)await upsert('assessment_responses',rows,accessToken,'user_id,question_id');}
    return res.status(200).json({ok:true,user_id:uid});
  }catch(error){console.error('Wonder persistence error',error);const msg=String(error.message||'');if(/between 1 and 7|required/.test(msg))return res.status(400).json({error:msg});return res.status(500).json({error:'Wonder could not sync your progress yet.'});}
};