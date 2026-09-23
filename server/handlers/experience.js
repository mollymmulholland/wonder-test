const {secureApi,cleanText}=require('../../lib/api-security');
const {authRequest,rest}=require('../../lib/supabase-server');
const {catalog,reportFor,personalizedReport}=require('../../lib/archetype-reports');
const {scoreResponses}=require('../../lib/archetype-precision');
const {inferArchetypes}=require('../../lib/archetype-system-v2');
const {buildMirror}=require('../../lib/mirror-engine');
const {validateAnswers}=require('../../lib/assessment-validation');
const uuid=x=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x||'');
const unpack=row=>{try{return {...row,entry:JSON.parse(row.body)}}catch{return {...row,entry:{kind:'journal',title:'Reflection',text:row.body}}}};
module.exports=async(req,res)=>{
 if(!secureApi(req,res))return;
 const b=req.body||{},action=b.action;
 try{
  if(action==='discovery_review'){
   const {ITEMS}=require('../../lib/person-model');const {PRECISION_ITEMS}=require('../../lib/archetype-precision');const {ELEMENT_IDS}=require('../../lib/adaptive-assessment');
   validateAnswers(b.responses,false);const items=[...ITEMS,...PRECISION_ITEMS].filter(i=>Object.hasOwn(b.responses,i.id)).map(item=>{const answer=b.responses[item.id],value=n=>item.type==='scale'?String(n):item.options[n]?.label||item.options[n]?.text||item.options[n];const {options,scale,...clean}=item;const publicItem={...clean,options:options?.map(({w,dimension,...o})=>o)};return {item:publicItem,count:Object.keys(b.responses).length,element:Object.entries(ELEMENT_IDS).find(([,ids])=>ids.includes(item.id))?.[0]||'Refinement',summary:(Array.isArray(answer)?answer:[answer]).map(value).join(' · ')};});return res.status(200).json({items});
  }
  if(action==='catalog')return res.status(200).json({reports:catalog()});
  if(action==='demo_report') {const report=reportFor(b.name);return report?res.status(200).json({report,demo:true}):res.status(400).json({error:'Unknown archetype.'});}
  if(action==='demo_complete'){
   validateAnswers(b.responses,true);const model=scoreResponses(b.responses),archetypes=inferArchetypes(model),mirror=buildMirror(model,archetypes,{response_count:Object.keys(b.responses).length});
   return res.status(200).json({demo:true,archetypes,mirror,report:personalizedReport(model,archetypes,mirror)});
  }
  const {token,user}=await authRequest(req);if(!user?.id)return res.status(401).json({error:'Please sign in to continue.'});
  const uid=encodeURIComponent(user.id),opts={accessToken:token};
  if(action==='report'){
   const [snap]=await rest(`/person_model_snapshots?user_id=eq.${uid}&select=*&order=created_at.desc&limit=1`,opts);
   if(!snap)return res.status(409).json({error:'Complete your elemental assessment first.'});
   const model={dimensions:snap.scores,evidence:snap.confidence?.evidence||{},coverage:snap.confidence?.coverage||0},mirror=buildMirror(model,snap.archetypes);
   const report={...personalizedReport(model,snap.archetypes,mirror),snapshot_id:snap.id};
   const existing=await rest(`/mirror_reports?user_id=eq.${uid}&snapshot_id=eq.${encodeURIComponent(snap.id)}&select=id&limit=1`,opts);
   if(!existing.length)await rest('/mirror_reports?on_conflict=snapshot_id',{...opts,method:'POST',prefer:'resolution=ignore-duplicates',body:{user_id:user.id,snapshot_id:snap.id,report}});
   return res.status(200).json({report,archetypes:snap.archetypes,mirror});
  }
  if(action==='entries'){
   const rows=await rest(`/journal_entries?user_id=eq.${uid}&select=*&order=created_at.desc&limit=100`,opts);
   return res.status(200).json({entries:rows.map(unpack).filter(x=>['journal','reflection'].includes(x.entry.kind))});
  }
  if(action==='save_entry'){
   const title=cleanText(b.title,160),text=cleanText(b.text,12000),kind=b.kind==='reflection'?'reflection':'journal';
   if(!text||!title)return res.status(400).json({error:'Add a title and a reflection before saving.'});
   const ratings={};for(const k of ['understood','ease','attraction','safety','curiosity']){if(b.ratings?.[k]!=null){const n=b.ratings[k];if(!Number.isInteger(n)||n<1||n>7)return res.status(400).json({error:'Ratings must be between 1 and 7.'});ratings[k]=n}}
   const entry={kind,title,text,mood:cleanText(b.mood,40),ratings,continue:typeof b.continue==='boolean'?b.continue:null,date:cleanText(b.date,20),person:cleanText(b.person,100)};
   if(b.id&&!uuid(b.id))return res.status(400).json({error:'Invalid entry.'});
   const rows=await rest(b.id?`/journal_entries?id=eq.${b.id}&user_id=eq.${uid}`:'/journal_entries',{...opts,method:b.id?'PATCH':'POST',prefer:'return=representation',body:{user_id:user.id,body:JSON.stringify(entry),updated_at:new Date().toISOString()}});
   if(!rows?.length)return res.status(404).json({error:'Entry not found.'});return res.status(200).json({entry:unpack(rows[0])});
  }
  if(action==='delete_entry'){
   if(!uuid(b.id))return res.status(400).json({error:'Invalid entry.'});
   const rows=await rest(`/journal_entries?id=eq.${b.id}&user_id=eq.${uid}`,{...opts,method:'DELETE',prefer:'return=representation'});
   return rows.length?res.status(200).json({ok:true}):res.status(404).json({error:'Entry not found.'});
  }
  if(action==='messages'){
   const conversations=await rest(`/ai_conversations?user_id=eq.${uid}&order=created_at.desc&limit=1`,opts);
   const c=conversations[0];const messages=c?await rest(`/ai_messages?user_id=eq.${uid}&conversation_id=eq.${c.id}&order=created_at.desc&limit=60`,opts):[];
   return res.status(200).json({conversation_id:c?.id||null,messages:messages.reverse()});
  }
  return res.status(400).json({error:'Unknown action.'});
 }catch(e){console.error('experience',{action,message:e.message});return res.status(action==='demo_complete'?400:500).json({error:action==='demo_complete'?e.message:'Unable to save or load this right now. Please try again.'});}
};
