const S=require('../../lib/supabase-server');
const {secureApi,cleanText}=require('../../lib/api-security');
const {isOperator}=require('../../lib/operations');
const {fail}=require('../../lib/account-security');
const {eraseAccount}=require('../../lib/account-deletion');
const UUID=/^[0-9a-f]{8}-[0-9a-f-]{27}$/;
module.exports=async(req,res)=>{
 if(!secureApi(req,res))return;
 const {user}=await S.authRequest(req);if(!user)return res.status(401).json({error:'Sign in first.'});
 try{
  if(!await isOperator(user.id))throw fail('This area is restricted to authorized WONDER operators.',403);
  const b=req.body||{};
  if(b.action==='load'){
    const [records,photos,reports,members,deletions]=await Promise.all([
      S.rest('/wonder_private_journey?select=user_id,state&order=updated_at.desc&limit=100',{admin:true}),
      S.rest('/wonder_portrait_photos?status=eq.pending&select=id,user_id,created_at&limit=100',{admin:true}),
      S.rest('/wonder_support_requests?status=neq.resolved&order=created_at.asc&limit=100',{admin:true}),
      S.rest('/wonder_cohort_members?select=user_id,cohort,enabled&limit=1000',{admin:true}),
      S.rest('/wonder_account_deletions?status=eq.pending&select=user_id,requested_at&limit=100',{admin:true})
    ]);
    return res.status(200).json({members:records.map(r=>({id:r.user_id,name:r.state.basics?.name,city:r.state.basics?.city,portrait:r.state.portrait?.approved,cohort:members.find(m=>m.user_id===r.user_id)||null})),photos,reports,deletions});
  }
  if(b.action==='photo'){
    if(!UUID.test(b.id)||!['approved','rejected'].includes(b.status))throw fail('Choose a photograph and review outcome.');
    const [p]=await S.rest(`/wonder_portrait_photos?id=eq.${b.id}&select=*`,{admin:true});if(!p)throw fail('Photograph not found.',404);
    const [r]=await S.rest(`/wonder_private_journey?user_id=eq.${p.user_id}&select=state,version`,{admin:true});if(!r)throw fail('Account no longer exists.',404);
    if(r.state.portrait?.photo!==`/api/photos?id=${p.id}`)throw fail('This photo has been replaced. Review the current photo instead.',409);
    const next={...r.state,moderation:{photoApproved:b.status==='approved',photoStatus:b.status,note:cleanText(b.note,500)},availability:'paused',version:r.version+1};
    const changed=await S.rest(`/wonder_private_journey?user_id=eq.${p.user_id}&version=eq.${r.version}`,{admin:true,method:'PATCH',prefer:'return=representation',body:{state:next,version:next.version}});
    if(!changed.length)throw fail('The portrait changed. Refresh the review queue.',409);
    await S.rest(`/wonder_portrait_photos?id=eq.${p.id}`,{admin:true,method:'PATCH',body:{status:b.status,review_note:cleanText(b.note,500),reviewed_at:new Date().toISOString()}});
    return res.status(200).json({ok:true});
  }
  if(b.action==='cohort'){
    if(!UUID.test(b.user_id)||!['dallas-beta'].includes(b.cohort)||typeof b.enabled!=='boolean')throw fail('Choose a member and valid cohort state.');
    await S.rest('/wonder_cohort_members?on_conflict=user_id',{admin:true,method:'POST',prefer:'resolution=merge-duplicates',body:{user_id:b.user_id,cohort:b.cohort,enabled:b.enabled,approved_at:new Date().toISOString()}});
    return res.status(200).json({ok:true});
  }
  if(b.action==='report'){
    if(!UUID.test(b.id)||!['reviewing','resolved'].includes(b.status))throw fail('Choose a report and status.');
    await S.rest(`/wonder_support_requests?id=eq.${b.id}`,{admin:true,method:'PATCH',body:{status:b.status,updated_at:new Date().toISOString()}});return res.status(200).json({ok:true});
  }
  if(b.action==='retry_deletion'){
    if(!UUID.test(b.user_id))throw fail('Choose a pending deletion.');
    const [pending]=await S.rest(`/wonder_account_deletions?user_id=eq.${b.user_id}&status=eq.pending`,{admin:true});if(!pending)throw fail('No pending deletion exists.');
    await eraseAccount(b.user_id);return res.status(200).json({ok:true});
  }
  throw fail('Unknown operation.');
 }catch(e){const status=[400,403,404,409].includes(e.status)?e.status:503;res.status(status).json({error:status===503?'The operation did not complete. Refresh the queue and retry.':e.message});}
};
