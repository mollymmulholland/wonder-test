const {scoreResponses}=require('../lib/archetype-precision');
const {inferArchetypes,deriveFoundations,VERSION:archetype_version}=require('../lib/archetype-system-v2');
const {buildMirror}=require('../lib/mirror-engine');
module.exports=async function handler(req,res){
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed.'});}
 try{const responses=req.body?.responses||{},model=scoreResponses(responses),foundations=deriveFoundations(model),archetypes=inferArchetypes(model),mirror=buildMirror({...model,foundations},archetypes),archetype_gap=Math.max(0,(archetypes[0]?.score||0)-(archetypes[1]?.score||0));return res.status(200).json({model:{...model,foundations},archetypes,mirror,archetype_version,archetype_gap});}catch(e){console.error('assessment-score',e);return res.status(500).json({error:'Wonder could not finish the portrait yet.'});}
};