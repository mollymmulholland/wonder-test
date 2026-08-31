const {SUPABASE_URL,SECRET}=require('../lib/supabase-server');

const USERS=[
 {email:'wonder.qa.1788202683.1@example.com',password:'4U4Nljdlg#nkzckS_CYQ',name:'Aster'},
 {email:'wonder.qa.1788202683.2@example.com',password:'RtaPSfT$2yQEejNGgbA2',name:'Marlow'},
 {email:'wonder.qa.1788202683.3@example.com',password:'oAvLeBR7sumsHPT1vPVg',name:'Sage'}
];

async function createUser(u){
 const r=await fetch(`${SUPABASE_URL}/auth/v1/admin/users`,{
  method:'POST',
  headers:{apikey:SECRET,Authorization:`Bearer ${SECRET}`,'Content-Type':'application/json'},
  body:JSON.stringify({email:u.email,password:u.password,email_confirm:true,user_metadata:{phone:'+15555550100',wonder_preview:true,qa:true,qa_name:u.name}})
 });
 const text=await r.text();let data={};try{data=text?JSON.parse(text):{}}catch{data={raw:text}};
 if(!r.ok){if(/already|registered|exists/i.test(String(data.msg||data.message||data.error_description||'')))return{email:u.email,name:u.name,status:'exists'};throw new Error(`${u.email}: ${data.msg||data.message||data.error_description||r.status}`)}
 return{email:u.email,password:u.password,name:u.name,status:'created',id:data.id||data.user?.id||null};
}

module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 if(!SUPABASE_URL||!SECRET)return res.status(503).json({error:'Supabase unavailable'});
 try{const out=[];for(const u of USERS)out.push(await createUser(u));return res.status(200).json({ok:true,users:out});}
 catch(e){console.error('qa seed',e);return res.status(500).json({error:String(e.message||e)});}
};