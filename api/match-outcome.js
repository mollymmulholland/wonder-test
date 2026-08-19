const {authUser,rest}=require('../lib/supabase-server');

const ratingFields=['felt_understood','conversational_ease','attraction','emotional_safety','intellectual_stimulation','values_fit'];

module.exports=async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed.'});
  const auth=String(req.headers.authorization||'');
  const token=auth.startsWith('Bearer ')?auth.slice(7):'';
  const user=await authUser(token);
  if(!user?.id)return res.status(401).json({error:'Authentication required.'});
  const b=req.body||{};
  if(!b.candidate_user_id)return res.status(400).json({error:'candidate_user_id is required.'});
  const row={user_id:user.id,candidate_user_id:b.candidate_user_id,match_id:b.match_id||null,met_in_person:b.met_in_person==null?null:!!b.met_in_person,wanted_second_date:b.wanted_second_date==null?null:!!b.wanted_second_date,rejection_reasons:Array.isArray(b.rejection_reasons)?b.rejection_reasons:[],notes:String(b.notes||'').trim()||null};
  for(const f of ratingFields){
    if(b[f]==null){row[f]=null;continue}
    const n=Number(b[f]);if(!Number.isFinite(n)||n<1||n>7)return res.status(400).json({error:`${f} must be between 1 and 7.`});row[f]=n;
  }
  try{
    const rows=await rest('/match_outcomes',{method:'POST',accessToken:token,prefer:'return=representation',body:row});
    return res.status(200).json({saved:true,outcome:rows[0]||null});
  }catch(e){
    console.error('match outcome',e);
    return res.status(500).json({error:'Unable to save match outcome.'});
  }
};