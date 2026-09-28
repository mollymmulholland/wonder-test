const S = require('./supabase-server');
const fail = (message, status=400) => Object.assign(new Error(message), {status});
const normalizeUsername = value => String(value || '').trim().toLowerCase();
function validUsername(value) { return /^[a-z][a-z0-9_]{2,29}$/.test(value) && !['admin','support','wonder','moderator','security','system'].includes(value); }
async function adminAuth(path, body, method='POST') {
  return S.jsonFetch(`${S.SUPABASE_URL}/auth/v1${path}`, {method, headers:{apikey:S.SECRET,Authorization:`Bearer ${S.SECRET}`,'Content-Type':'application/json'}, ...(body===undefined?{}:{body:JSON.stringify(body)})});
}
async function reauthenticate(user, password) {
  if(typeof password!=='string'||password.length<10||password.length>128)throw fail('Enter your password to confirm this change.');
  try {
    const session=await S.jsonFetch(`${S.SUPABASE_URL}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:S.ANON,'Content-Type':'application/json'},body:JSON.stringify({email:user.email,password})});
    if(session.user?.id!==user.id)throw new Error('Wrong account');
    // This session is for reauthentication only; do not deliver a second refresh token.
    await S.jsonFetch(`${S.SUPABASE_URL}/auth/v1/logout?scope=local`,{method:'POST',headers:{apikey:S.ANON,Authorization:`Bearer ${session.access_token}`}});
  }catch {throw fail('The password could not be verified. Please try again.',403);}
}
async function emailForUsername(input) {
  const username=normalizeUsername(input);
  if(!validUsername(username))return null;
  const [record]=await S.rest(`/wonder_usernames?username=eq.${encodeURIComponent(username)}&select=user_id`,{admin:true});
  if(!record)return null;
  const data=await adminAuth(`/admin/users/${record.user_id}`,undefined,'GET');
  return (data.user||data).email||null;
}
async function claimUsername(userId,value) {
  const username=normalizeUsername(value);
  if(!validUsername(username))throw fail('Use 3–30 letters, numbers, or underscores, beginning with a letter.');
  try {await S.rest('/wonder_usernames?on_conflict=user_id',{admin:true,method:'POST',prefer:'resolution=merge-duplicates',body:{user_id:userId,username}});}
  catch(e){if(e.status===409)throw fail('That username is already in use. Choose another.',409);throw e;}
  return username;
}
module.exports={adminAuth,reauthenticate,emailForUsername,claimUsername,validUsername,normalizeUsername,fail};
