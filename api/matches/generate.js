const {authUser,rest}=require('../../lib/supabase-server');
const {compatibility}=require('../../lib/matching-engine');

async function latestModel(userId){
  const rows=await rest(`/person_model_snapshots?user_id=eq.${userId}&select=*&order=created_at.desc&limit=1`,{admin:true});
  return rows[0]||null;
}

module.exports=async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed.'});
  const auth=String(req.headers.authorization||'');
  const token=auth.startsWith('Bearer ')?auth.slice(7):'';
  const user=await authUser(token);
  if(!user?.id)return res.status(401).json({error:'Authentication required.'});
  try{
    const meProfile=(await rest(`/profiles?user_id=eq.${user.id}&select=*`,{admin:true}))[0]||{};
    const meModel=await latestModel(user.id);
    if(!meModel)return res.status(409).json({error:'Complete the Wonder assessment before generating introductions.'});

    const candidates=await rest(`/profiles?user_id=neq.${user.id}&select=*`,{admin:true});
    const results=[];
    for(const profile of candidates){
      const model=await latestModel(profile.user_id);
      if(!model)continue;
      const result=compatibility({profile:meProfile,model:{scores:meModel.scores,confidence:meModel.confidence}},{profile,model:{scores:model.scores,confidence:model.confidence}});
      if(!result.eligible)continue;
      results.push({candidate_user_id:profile.user_id,...result});
      await rest('/compatibility_scores?on_conflict=user_id,candidate_user_id,engine_version',{
        method:'POST',admin:true,prefer:'resolution=merge-duplicates,return=minimal',
        body:{user_id:user.id,candidate_user_id:profile.user_id,engine_version:'wonder-match-v1',eligible:true,score:result.score,confidence:result.confidence,components:result.components,hard_conflicts:result.hard_conflicts,rationale:result.rationale}
      });
    }
    results.sort((a,b)=>b.score-a.score);
    return res.status(200).json({engine_version:'wonder-match-v1',matches:results.slice(0,3),evaluated:results.length});
  }catch(e){
    console.error('match generation',e);
    return res.status(500).json({error:'Unable to generate introductions.'});
  }
};