const S=require('./supabase-server');
const J=require('../public-shared/journey');
const {cohort}=require('./operations');
const {evaluate}=require('./introduction-engine');
const connections=require('./connection-store');
async function snapshot(id){const [s]=await S.rest(`/person_model_snapshots?user_id=eq.${id}&select=scores,confidence&order=created_at.desc&limit=1`,{admin:true});return s;}
async function propose(id){
 const group=await cohort(id);if(!group)return {status:'outside_cohort'};
 const [r]=await S.rest(`/wonder_private_journey?user_id=eq.${id}&select=state,version`,{admin:true});if(!r||!J.eligible(r.state))return {status:'incomplete'};
 const prior=await S.rest(`/wonder_connections?or=(member_a.eq.${id},member_b.eq.${id})&select=id,member_a,member_b,state,version`,{admin:true});
 const pending=prior.find(p=>['proposed','pending'].includes(p.state.status));
 if(pending){const existing=await connections.view(id,pending.id);if(existing.status!=='unavailable')return {connection:existing,status:existing.status};
   // A stale proposed pair is withdrawn, never reintroduced, before considering another.
   await S.rest(`/wonder_connections?id=eq.${pending.id}&version=eq.${pending.version}&state->>status=in.(proposed,pending)`,{admin:true,method:'PATCH',body:{version:pending.version+1,state:{...pending.state,status:'withdrawn',messages:[],plan:null,reminders:[]},updated_at:new Date().toISOString()}});
 }
 const cohortMembers=await S.rest(`/wonder_cohort_members?cohort=eq.${encodeURIComponent(group)}&enabled=eq.true&user_id=neq.${id}&select=user_id&limit=100`,{admin:true});
 const seen=new Set(prior.flatMap(p=>[p.member_a,p.member_b])),mine=await snapshot(id);let best=null;
 const idsToRead=cohortMembers.filter(c=>!seen.has(c.user_id)).map(c=>c.user_id);
 if(!idsToRead.length)return {status:'waiting'};
 const [records,snapshots,openPairs]=await Promise.all([
   S.rest(`/wonder_private_journey?user_id=in.(${idsToRead.join(',')})&state->>availability=eq.available&select=user_id,state,version`,{admin:true}),
   S.rest(`/person_model_snapshots?user_id=in.(${idsToRead.join(',')})&select=user_id,scores,confidence&order=created_at.desc&limit=1000`,{admin:true}),
   S.rest('/wonder_connections?state->>status=in.(proposed,pending)&select=member_a,member_b&limit=1000',{admin:true})
 ]);
 const pendingIds=new Set(openPairs.flatMap(p=>[p.member_a,p.member_b]));
 // No journal, conversation, shadow, or feedback enters the candidate comparison.
 for(const other of records){
  if(pendingIds.has(other.user_id)||r.state.blocks?.includes(other.user_id)||other.state.blocks?.includes(id))continue;
  const result=evaluate(r.state,other.state,mine,snapshots.find(s=>s.user_id===other.user_id));
  if(result&&(!best||result.rank>best.result.rank))best={id:other.user_id,record:other,result};
 }
 if(!best)return {status:'waiting'};
 const ids=[id,best.id].sort(),a=ids[0]===id?r:best.record,b=ids[1]===id?r:best.record;
 const state={...J.pairState(),reason:best.result.reason,difference:best.result.difference,unknown:best.result.unknown};
 try{
  const pairId=await S.rest('/rpc/wonder_propose_connection',{admin:true,method:'POST',body:{p_a:ids[0],p_b:ids[1],p_a_version:a.version,p_b_version:b.version,p_state:state}});
  return {status:'proposed',connection:await connections.view(id,pairId)};
 }catch(e){if(e.status===400||e.status===409)return {status:'changed',message:'Availability changed while this introduction was being considered. Refresh to see the current state.'};throw e;}
}
module.exports={propose};
