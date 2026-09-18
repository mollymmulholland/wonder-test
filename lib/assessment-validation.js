const {ALL_ITEMS,CORE_IDS,PRECISION_MIN}=require('./adaptive-assessment');
const {PRECISION_IDS}=require('./archetype-precision');
const ITEMS=new Map(ALL_ITEMS.map(x=>[x.id,x]));
function validResponse(item,r){
 if(!item)return false;
 if(item.type==='single')return Number.isInteger(r)&&r>=0&&r<item.options.length;
 if(item.type==='scale')return Number.isInteger(r)&&r>=1&&r<=7;
 if(['multi','rank'].includes(item.type))return Array.isArray(r)&&r.length>0&&r.length<=(item.max||3)&&(item.type!=='rank'||r.length===(item.max||5))&&new Set(r).size===r.length&&r.every(n=>Number.isInteger(n)&&n>=0&&n<item.options.length);
 return false;
}
function validateAnswers(responses,complete=false){
 if(!responses||Array.isArray(responses)||typeof responses!=='object'||Object.keys(responses).length>ALL_ITEMS.length)throw new Error('Invalid assessment responses.');
 for(const [id,v]of Object.entries(responses))if(!validResponse(ITEMS.get(id),v))throw new Error('Invalid assessment response.');
 if(complete&&(!CORE_IDS.every(id=>Object.hasOwn(responses,id))||PRECISION_IDS.filter(id=>Object.hasOwn(responses,id)).length<PRECISION_MIN))throw new Error('Complete all five elements and the final questions first.');
 return responses;
}
module.exports={validResponse,validateAnswers};
