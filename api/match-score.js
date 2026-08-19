const { compatibility } = require('../lib/matching-engine');

module.exports = async function handler(req,res){
  if(req.method!=='POST'){
    res.setHeader('Allow','POST');
    return res.status(405).json({error:'Method not allowed.'});
  }
  try{
    const {personA,personB}=req.body||{};
    if(!personA||!personB) return res.status(400).json({error:'personA and personB are required.'});
    return res.status(200).json(compatibility(personA,personB));
  }catch(e){
    console.error('match-score',e);
    return res.status(500).json({error:'Unable to score compatibility.'});
  }
};