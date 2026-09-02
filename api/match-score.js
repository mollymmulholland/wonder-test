const {buildMatchPrior}=require('../lib/wonder-mind-match');

module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed.'});}
  try{
    const {personA,personB}=req.body||{};
    if(!personA||!personB)return res.status(400).json({error:'personA and personB are required.'});
    const prior=buildMatchPrior(personA,personB);
    return res.status(200).json({...prior,note:'This endpoint returns a pre-interaction prior only. It does not assert attraction, chemistry, recognition, or future relationship quality.'});
  }catch(e){
    console.error('match-score',e);
    return res.status(500).json({error:'Unable to construct matching prior.'});
  }
};