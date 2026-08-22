const {nextItem}=require('../../lib/adaptive-assessment');
const {elementExperience}=require('../../lib/element-experience');

module.exports=async function handler(req,res){
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed.'});
 try{
   const responses=req.body?.responses||{};
   const result=nextItem(responses);
   if(result.item){
     const {options,...rest}=result.item;
     result.item={...rest,options:options?.map(({w,dimension,...o})=>o)};
     result.experience=elementExperience(result.item,result.element||'Ether');
   }
   return res.status(200).json(result);
 }catch(e){
   console.error('assessment next',e);
   return res.status(500).json({error:'Unable to choose the next question.'});
 }
};