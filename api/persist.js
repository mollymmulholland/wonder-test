const RAW_SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_URL=String(RAW_SUPABASE_URL||'').replace(/\/(?:rest|auth)\/v1\/?$/,'').replace(/\/$/,'');
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const {buildMirror}=require('../lib/mirror-engine');

async function getUser(accessToken){const r=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${accessToken}`}});return r.ok?r.json():null;}
async function request(path,{method='GET',body,accessToken,prefer}={}){const r=await fetch(`${SUPABASE_URL}/rest/v1${path}`,{method,headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json',...(prefer?{Prefer:prefer}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});if(!r.ok){const text=await r.text();throw new Error(text||`Supabase request failed: ${path}`)}if(r.status===204)return null;const text=await r.text();return text?JSON.parse(text):null;}
async function upsert(table,rows,accessToken,onConflict){const q=onConflict?`?on_conflict=${encodeURIComponent(onConflict)}`:'';return request(`/${table}${q}`,{method:'POST',body:rows,accessToken,prefer:'resolution=merge-duplicates,return=minimal'});}
async function upsertOptionalLocation(table,row,accessToken,onConflict){try{return await upsert(table,row,accessToken,onConflict)}catch(e){if(!('location_data'in row))throw e;const fallback={...row};delete fallback.location_data;return upsert(table,fallback,accessToken,onConflict);}}

async function hydrate(uid,accessToken){
  const [profiles,births,snapshots,sessions]=await Promise.all([
    request(`/profiles?user_id=eq.${uid}&select=*&limit=1`,{accessToken}),
    request(`/birth_data?user_id=eq.${uid}&select=*&limit=1`,{accessToken}),
    request(`/person_model_snapshots?user_id=eq.${uid}&select=*&order=created_at.desc&limit=1`,{accessToken}),
    request(`/assessment_sessions?user_id=eq.${uid}&status=eq.in_progress&select=*&order=started_at.desc&limit=1`,{accessToken})
  ]);
  const profile=profiles?.[0]||null,birth=births?.[0]||null,snapshot=snapshots?.[0]||null,session=sessions?.[0]||null;
  let assessment=null,active=null;
  if(snapshot){
    const model={dimensions:snapshot.scores||{},evidence:snapshot.confidence?.evidence||{},coverage:Number(snapshot.confidence?.coverage||0)};
    const archetypes=Array.isArray(snapshot.archetypes)?snapshot.archetypes:[];
    assessment={model,archetypes,mirror:buildMirror(model,archetypes),snapshot_id:snapshot.id,assessment_session_id:snapshot.assessment_session_id,model_version:snapshot.model_version,created_at:snapshot.created_at};
  }
  if(session){
    const rows=await request(`/assessment_responses_v2?session_id=eq.${encodeURIComponent(session.id)}&user_id=eq.${uid}&select=item_id,response&order=created_at.asc`,{accessToken});
    const responses={};for(const row of rows||[])responses[row.item_id]=row.response;
    active={session,responses};
  }
  return{profile,birth,assessment,active_assessment:active};
}

async function saveMirrorFeedback(uid,body,accessToken){const accuracy=Number(body.overall_accuracy);if(!Number.isFinite(accuracy)||accuracy<1||accuracy>7)throw new Error('overall_accuracy must be between 1 and 7');let snapshotId=body.person_model_snapshot_id||null,sessionId=body.assessment_session_id||null;if(!snapshotId){const rows=await request(`/person_model_snapshots?user_id=eq.${uid}&select=id,assessment_session_id&order=created_at.desc&limit=1`,{accessToken});snapshotId=rows?.[0]?.id||null;sessionId=sessionId||rows?.[0]?.assessment_session_id||null;}return request('/mirror_feedback',{method:'POST',accessToken,prefer:'return=representation',body:{user_id:uid,person_model_snapshot_id:snapshotId,assessment_session_id:sessionId,overall_accuracy:accuracy,accurate_sections:Array.isArray(body.accurate_sections)?body.accurate_sections:[],inaccurate_sections:Array.isArray(body.inaccurate_sections)?body.inaccurate_sections:[],correction:String(body.correction||'').trim()||null,archetype_resonance:Number.isFinite(Number(body.archetype_resonance))?Number(body.archetype_resonance):null}});}
async function saveMatchOutcome(uid,b,accessToken){if(!b.candidate_user_id)throw new Error('candidate_user_id is required');const ratingFields=['felt_understood','conversational_ease','attraction','emotional_safety','intellectual_stimulation','values_fit'];const row={user_id:uid,candidate_user_id:b.candidate_user_id,match_id:b.match_id||null,met_in_person:b.met_in_person==null?null:!!b.met_in_person,wanted_second_date:b.wanted_second_date==null?null:!!b.wanted_second_date,rejection_reasons:Array.isArray(b.rejection_reasons)?b.rejection_reasons:[],notes:String(b.notes||'').trim()||null};for(const f of ratingFields){if(b[f]==null){row[f]=null;continue}const n=Number(b[f]);if(!Number.isFinite(n)||n<1||n>7)throw new Error(`${f} must be between 1 and 7`);row[f]=n;}return request('/match_outcomes',{method:'POST',accessToken,prefer:'return=representation',body:row});}

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

  const {birth,essentials,answers,places={}}=body;
  if(birth){await upsertOptionalLocation('birth_data',{user_id:uid,date_of_birth:birth.dob||null,time_of_birth:birth.tob||null,place_of_birth:birth.pob||null,time_accuracy:birth.toa||null,...(places.birthplace?{location_data:places.birthplace}:{}),updated_at:new Date().toISOString()},accessToken,'user_id');}
  if(essentials){await upsertOptionalLocation('profiles',{user_id:uid,first_name:essentials.firstName||null,current_city:essentials.currentCity||null,gender:essentials.gender||null,interested_in:essentials.interested||null,relationship_intention:essentials.intent||null,relationship_structure:essentials.structure||null,children:essentials.children||null,religion:essentials.religion||null,age_range:essentials.ageRange||null,max_distance:essentials.distance||null,nonnegotiables:essentials.nonnegotiables||null,...(places.current_city?{location_data:places.current_city}:{}),updated_at:new Date().toISOString()},accessToken,'user_id');}
  if(answers&&typeof answers==='object'){const rows=Object.entries(answers).filter(([,v])=>Number.isInteger(Number(v))).map(([questionId,answerIndex])=>({user_id:uid,question_id:Number(questionId),answer_index:Number(answerIndex),updated_at:new Date().toISOString()}));if(rows.length)await upsert('assessment_responses',rows,accessToken,'user_id,question_id');}
  return res.status(200).json({ok:true,user_id:uid});
 }catch(error){console.error('Wonder persistence error',error);const msg=String(error.message||'');if(/between 1 and 7|required/.test(msg))return res.status(400).json({error:msg});return res.status(500).json({error:'Wonder could not sync your progress yet.'});}
};