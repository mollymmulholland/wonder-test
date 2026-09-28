const {nextItem}=require('../../../lib/adaptive-assessment');
const {secureApi}=require('../../../lib/api-security');
const {validateAnswers}=require('../../../lib/assessment-validation');
module.exports=async(req,res)=>{
 if(!secureApi(req,res))return;
 try {const result=nextItem(validateAnswers(req.body?.responses||{}));
 if(result.item){const {options,scale,...item}=result.item;result.item={...item,options:options?.map(({w,dimension,...o})=>o)};}
 return res.status(200).json(result);
 }catch(e){return res.status(400).json({error:'Invalid assessment answers.'});}
};
