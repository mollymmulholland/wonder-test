const {authUser,rest}=require('../lib/supabase-server');

module.exports=async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed.'});
  const auth=String(req.headers.authorization||'');
  const token=auth.startsWith('Bearer ')?auth.slice(7):'';
  const user=await authUser(token);
  if(!user?.id)return res.status(401).json({error:'Authentication required.'});

  const body=req.body||{};
  const accuracy=Number(body.overall_accuracy);
  if(!Number.isFinite(accuracy)||accuracy<1||accuracy>7)return res.status(400).json({error:'overall_accuracy must be between 1 and 7.'});

  try{
    let snapshotId=body.person_model_snapshot_id||null;
    if(!snapshotId){
      const rows=await rest(`/person_model_snapshots?user_id=eq.${user.id}&select=id,assessment_session_id&order=created_at.desc&limit=1`,{admin:true});
      snapshotId=rows[0]?.id||null;
      if(!body.assessment_session_id)body.assessment_session_id=rows[0]?.assessment_session_id||null;
    }
    const rows=await rest('/mirror_feedback',{
      method:'POST',accessToken:token,prefer:'return=representation',
      body:{
        user_id:user.id,
        person_model_snapshot_id:snapshotId,
        assessment_session_id:body.assessment_session_id||null,
        overall_accuracy:accuracy,
        accurate_sections:Array.isArray(body.accurate_sections)?body.accurate_sections:[],
        inaccurate_sections:Array.isArray(body.inaccurate_sections)?body.inaccurate_sections:[],
        correction:String(body.correction||'').trim()||null,
        archetype_resonance:Number.isFinite(Number(body.archetype_resonance))?Number(body.archetype_resonance):null
      }
    });
    return res.status(200).json({saved:true,feedback:rows[0]||null});
  }catch(e){
    console.error('mirror feedback',e);
    return res.status(500).json({error:'Unable to save Mirror feedback.'});
  }
};