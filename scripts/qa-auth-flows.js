// Contract tests use a fake Auth provider. They never send mail or change a real password.
const assert = require('node:assert/strict');
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://auth.example.test';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'public-test-key';
process.env.SUPABASE_SECRET_KEY = 'test-signing-key-not-a-live-credential';
process.env.WONDER_AUTH_ORIGINS = 'https://wonder.example.test';
const handler = require('../server/handlers/signup');
let calls=[], autoConfirm=false, denied=false, userId='qa-user', exchangeError=false;
global.fetch = async (url, options={}) => {
 const body=options.body?JSON.parse(options.body):undefined;calls.push({url,body,method:options.method});
 const respond=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
 if(url.includes('/rpc/wonder_auth_allow'))return respond(!denied);
 if(url.endsWith('/settings'))return respond({mailer_autoconfirm:autoConfirm});
 if(url.includes('/signup?'))return respond({id:userId});
 if(url.includes('/recover?'))return respond({});
 if(url.includes('grant_type=pkce')&&exchangeError)return respond({code:'flow_state_expired'},400);
 if(url.includes('/token?'))return respond({user:{id:userId,email:'qa@example.test'},access_token:'private-test-access',refresh_token:'private-test-refresh',expires_in:3600});
 if(url.endsWith('/user'))return respond({id:userId});
 if(url.includes('/logout?'))return respond({});
 throw new Error('Unexpected request: '+url);
};
const req=(body,cookie='',origin='https://wonder.example.test')=>({method:'POST',url:'/api/signup',headers:{host:'wonder.example.test','content-type':'application/json',origin,cookie},body});
async function run(body,cookie='',origin){const headers={};const res={setHeader(k,v){headers[k]=v;},getHeader(k){return headers[k];},status(n){this.statusCode=n;return this;},json(d){this.body=d;return this;}};calls=[];await handler(req(body,cookie,origin),res);return{...res,headers};}
function cookieHeader(r){return(r.headers['Set-Cookie']||[]).map(x=>x.split(';')[0]).join('; ')}
const signup={action:'create',email:'qa@example.test',password:'test-password-only',phone:'2025550187',adult:true};
(async()=>{
 let r=await run(signup,'','https://attacker.example');assert.equal(r.statusCode,403);assert.equal(calls.length,0);
 r=await run({...signup,adult:false});assert.equal(r.statusCode,400);assert.ok(!calls.some(x=>x.url.includes('/signup?')));
 autoConfirm=true;r=await run(signup);assert.equal(r.statusCode,503);assert.ok(!calls.some(x=>x.url.includes('/signup?')));autoConfirm=false;
 r=await run(signup);assert.equal(r.statusCode,200);assert.equal(r.body.needs_email_confirmation,true);assert.ok(!JSON.stringify(r.body).includes('private-test'));assert.ok(!calls.some(x=>x.url.includes('/admin/users')));
 const provider=calls.find(x=>x.url.includes('/signup?'));assert.equal(provider.body.code_challenge_method,'s256');assert.equal(provider.body.code_challenge.length,43);assert.ok(provider.url.includes(encodeURIComponent('https://wonder.example.test/')));
 const signupCookie=cookieHeader(r);assert.ok(r.headers['Set-Cookie'][0].includes('HttpOnly; Secure; SameSite=Lax'));
 r=await run({action:'exchange',code:'a-valid-code-123456789'});assert.equal(r.statusCode,400);assert.ok(!calls.some(x=>x.url.includes('/token?')));
 r=await run({action:'exchange',code:'a-valid-code-123456789'},signupCookie+'tampered');assert.equal(r.statusCode,400);
 r=await run({action:'exchange',code:'a-valid-code-123456789'},signupCookie);assert.equal(r.statusCode,200);assert.equal(r.body.recovery,false);assert.ok(!JSON.stringify(r.body).includes('private-test'));
 const verifier=calls.find(x=>x.url.includes('grant_type=pkce')).body.code_verifier;assert.equal(require('node:crypto').createHash('sha256').update(verifier).digest('base64url'),provider.body.code_challenge);
 r=await run({action:'update_password',password:'another-password-only'},'wonder_access=private-test-access');assert.equal(r.statusCode,401);assert.ok(!calls.some(x=>x.method==='PUT'));
 r=await run({action:'recover',email:'qa@example.test'});assert.equal(r.statusCode,200);const recoveryFlow=cookieHeader(r);
 r=await run({action:'exchange',code:'a-valid-code-123456789'},recoveryFlow);assert.equal(r.body.recovery,true);const recoveryCookies=cookieHeader(r);
 userId='another-user';r=await run({action:'update_password',password:'another-password-only'},recoveryCookies);assert.equal(r.statusCode,401);userId='qa-user';
 r=await run({action:'update_password',password:'another-password-only'},recoveryCookies);assert.equal(r.statusCode,200);assert.ok(calls.some(x=>x.method==='PUT'));assert.ok(calls.some(x=>x.url.includes('/logout?scope=global')));assert.ok(r.headers['Set-Cookie'].every(x=>x.includes('Max-Age=0')));
 const originalNow=Date.now;Date.now=()=>originalNow()+3600001;r=await run({action:'exchange',code:'a-valid-code-123456789'},signupCookie);assert.equal(r.statusCode,400);Date.now=originalNow;
 exchangeError=true;r=await run({action:'exchange',code:'a-valid-code-123456789'},signupCookie);assert.equal(r.statusCode,400);exchangeError=false;
 denied=true;r=await run(signup);assert.equal(r.statusCode,429);assert.ok(!calls.some(x=>x.url.includes('/signup?')));denied=false;
 r=await run({action:'logout'},'wonder_access=private-test-access');assert.equal(r.statusCode,200);assert.ok(calls.some(x=>x.url.includes('/logout?scope=local')));
 console.log('Auth contracts passed: confirmation required, PKCE binding, token privacy, signed/expired flow rejection, user-bound recovery, session revocation, durable limiter use, and origin rejection. No mail sent.');
})().catch(e=>{console.error(e);process.exitCode=1});
