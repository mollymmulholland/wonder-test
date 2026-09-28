const {rest}=require('./supabase-server');
async function isOperator(id){
  const rows=await rest(`/wonder_admins?user_id=eq.${encodeURIComponent(id)}&select=role`,{admin:true});
  return rows.some(r=>['admin','owner','operator','moderator'].includes(r.role));
}
async function cohort(id){const [r]=await rest(`/wonder_cohort_members?user_id=eq.${encodeURIComponent(id)}&enabled=eq.true&select=cohort`,{admin:true});return r?.cohort||null;}
module.exports={isOperator,cohort};
