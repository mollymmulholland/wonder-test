const {nextItem}=require('../../lib/adaptive-assessment');

module.exports=async function handler(req,res){
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed.'});
 try{
   const responses=req.body?.responses||{};
   const result=nextItem(responses);
   if(result.item){
     const {options,...rest}=result.item;
     result.item={...rest,options:options?.map(({w,dimension,...o})=>o)};
   }
   return res.status(200).json(result);
 }catch(e){
   console.error('assessment next',e);
   return res.status(500).json({error:'Unable to choose the next question.'});
 }
};