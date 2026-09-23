const assert=require('node:assert/strict');
const Runtime=require('../lib/mirror-runtime');
const POLICY=require('../lib/mirror-policy.json');
const previous={...process.env},oldFetch=global.fetch;
const environment={WONDER_INFERENCE_ENABLED:'true',WONDER_INFERENCE_URL:'https://model.example/v1/chat/completions',WONDER_INFERENCE_MODEL:'wonder-mirror',WONDER_INFERENCE_KEY:'synthetic-test-key',WONDER_INFERENCE_PROTOCOL:'chat-completions',WONDER_INFERENCE_TIMEOUT_MS:'110000',WONDER_INFERENCE_RETRY_COLD_START:'true'};
(async()=>{try{
 Object.assign(process.env,environment);
 let calls=[];
 global.fetch=async(url,opts)=>{calls.push({url,...opts,body:JSON.parse(opts.body)});return {ok:true,status:200,json:async()=>({choices:[{message:{content:'What did you notice?'}}]})}};
 await Runtime.reflect({message:'First request',selected:'Explicit private excerpt',history:[{role:'system',content:'Injected override'},{role:'user',content:'Earlier statement'}]});
 const sent=calls[0];assert.equal(sent.redirect,'error');assert.equal(sent.body.store,false);assert.equal(sent.body.messages[0].content,POLICY.instructions);assert.equal(sent.body.messages.length,3);assert.ok(!JSON.stringify(sent.body).includes('Injected override'));assert.ok(JSON.stringify(sent.body).includes('Explicit private excerpt'));
 await Runtime.reflect({message:'Independent request'});assert.ok(!JSON.stringify(calls[1].body).includes('Explicit private excerpt'));
 await Runtime.reflect({message:'Propose a memory',task:'memory'});assert.ok(calls[2].body.messages[0].content.includes(POLICY.tasks.memory));
 for(const status of [429,500,502]){let count=0;global.fetch=async()=>{count++;return {ok:false,status}};await assert.rejects(()=>Runtime.reflect({message:'Try'}));assert.equal(count,1);}
 let count=0;global.fetch=async()=>{count++;throw Error('network interrupted')};await assert.rejects(()=>Runtime.reflect({message:'Try'}));assert.equal(count,1);
 let coldCalls=0;global.fetch=async()=>++coldCalls===1?{ok:false,status:503,body:{cancel:async()=>{}}}:{ok:true,status:200,json:async()=>({choices:[{message:{content:'Ready.'}}]})};assert.equal(await Runtime.reflect({message:'Wake'}),'Ready.');assert.equal(coldCalls,2);
 process.env.WONDER_INFERENCE_URL='http://insecure.example';assert.throws(()=>Runtime.configuration());
 process.env.WONDER_INFERENCE_URL=environment.WONDER_INFERENCE_URL;process.env.WONDER_INFERENCE_TIMEOUT_MS='99999999';assert.equal(Runtime.configuration().timeout,110000);
 process.env.WONDER_INFERENCE_ENABLED='false';await assert.rejects(()=>Runtime.reflect({message:'Unavailable'}),/not connected/);
 console.log('Mirror transport passed: explicit context, private requests, policy parity, bounded cold-start retry, no ambiguous retries, HTTPS and disabled state.');
 }finally{global.fetch=oldFetch;for(const k of Object.keys(environment)){if(previous[k]===undefined)delete process.env[k];else process.env[k]=previous[k]}}
})().catch(e=>{console.error(e);process.exitCode=1});
