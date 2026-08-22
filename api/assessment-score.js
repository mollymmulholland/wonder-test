const {scoreResponses}=require('../lib/person-model');
const {inferArchetypes,deriveFoundations,VERSION:archetype_version}=require('../lib/archetype-system-v2');
const {buildMirror}=require('../lib/mirror-engine');

module.exports=async function handler(req,res){
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed.'});}
  try{
    const responses=req.body?.responses||{};
    const model=scoreResponses(responses);
    const foundations=deriveFoundations(model);
    const archetypes=inferArchetypes(model);
    const mirror=buildMirror(model,archetypes);
    return res.status(200).json({model:{...model,foundations},archetypes,mirror,archetype_version});
  }catch(e){
    console.error('assessment-score',e);
    return res.status(500).json({error:'Wonder could not finish the portrait yet.'});
  }
};