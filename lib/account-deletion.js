const S=require('./supabase-server');
const {adminAuth}=require('./account-security');
const BUCKET='wonder-portraits';
async function eraseAccount(userId){
  // First deny current JWTs, server actions, queued matching, and refresh-derived access.
  await S.rest('/wonder_account_deletions?on_conflict=user_id',{admin:true,method:'POST',prefer:'resolution=ignore-duplicates',body:{user_id:userId}});
  const photos=await S.rest(`/wonder_portrait_photos?user_id=eq.${userId}&select=storage_path`,{admin:true});
  if(photos.length)await S.jsonFetch(`${S.SUPABASE_URL}/storage/v1/object/${BUCKET}`,{method:'DELETE',headers:{apikey:S.SECRET,Authorization:`Bearer ${S.SECRET}`,'Content-Type':'application/json'},body:JSON.stringify({prefixes:photos.map(p=>p.storage_path)})});
  // Older imports may refer to storage objects. Refuse to silently abandon unknown storage.
  const legacy=await S.rest(`/photo_assets?user_id=eq.${userId}&select=storage_path`,{admin:true});
  if(legacy.length)throw new Error('Legacy storage requires an operator removal step. Active access is already withdrawn.');
  const runs=await S.rest(`/wonder_mind_inference_runs?user_id=eq.${userId}&select=id`,{admin:true});
  await S.rest(`/wonder_mind_audit_log?actor_user_id=eq.${userId}`,{admin:true,method:'DELETE'});
  for(const r of runs)await S.rest(`/wonder_mind_audit_log?run_id=eq.${r.id}`,{admin:true,method:'DELETE'});
  // Foreign keys cascade through raw answers, reports, memories, operational pairs,
  // approved proposals, model records, chat records and all private journey state.
  await adminAuth(`/admin/users/${userId}`,{should_soft_delete:false},'DELETE');
  await S.rest(`/wonder_account_deletions?user_id=eq.${userId}`,{admin:true,method:'PATCH',body:{status:'complete',completed_at:new Date().toISOString()}});
}
module.exports={eraseAccount};
