const { scoreResponses, inferArchetypes } = require('../lib/person-model');

module.exports = async function handler(req,res){
  if(req.method!=='POST'){
    res.setHeader('Allow','POST');
    return res.status(405).json({error:'Method not allowed.'});
  }
  try{
    const responses=req.body?.responses||{};
    const model=scoreResponses(responses);
    const archetypes=inferArchetypes(model);
    return res.status(200).json({model,archetypes});
  }catch(e){
    console.error('assessment-score',e);
    return res.status(500).json({error:'Unable to score assessment.'});
  }
};