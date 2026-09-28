const J=require('../public-shared/journey');
const {rest}=require('./supabase-server');
async function readState(userId,token,{create=false}={}){
 const path=`/wonder_private_journey?user_id=eq.${encodeURIComponent(userId)}&select=state,version`;
 let rows=await rest(path,{accessToken:token});
 if(!rows.length&&create){const initial=J.initial();const legacy=await rest(`/journal_entries?user_id=eq.${encodeURIComponent(userId)}&select=id,body,created_at,updated_at&order=created_at.desc&limit=1000`,{accessToken:token});for(const row of legacy){let entry;try{entry=JSON.parse(row.body);}catch{entry={kind:'journal',text:row.body};}if(entry.kind==='journal')initial.journal.push({id:row.id,title:entry.title||'Untitled reflection',body:entry.text||'',tags:entry.mood||'',at:row.created_at,updated:row.updated_at||row.created_at});else initial.reflections.push({id:row.id,attendance:'private',body:entry.text||'',at:row.created_at,legacy:entry});}await rest('/wonder_private_journey?on_conflict=user_id',{admin:true,method:'POST',prefer:'resolution=ignore-duplicates',body:{user_id:userId,state:initial,version:0}});rows=await rest(path,{accessToken:token});}
 return rows[0]?{...rows[0].state,version:rows[0].version}:null;
}
async function requireDiscovery(userId,token){const s=await readState(userId,token);if(!s||s.deleted||!s.consent.process||J.age(s.basics.dob)<18||J.age(s.basics.dob)===null)throw Object.assign(new Error('Complete adult eligibility and discovery permission first.'),{status:403});return s;}
module.exports={readState,requireDiscovery};
