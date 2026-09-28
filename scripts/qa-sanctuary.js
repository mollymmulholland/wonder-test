const assert=require('node:assert/strict'),fs=require('node:fs');const {JSDOM,VirtualConsole}=require('jsdom');
const {reportFor,personalizedReport}=require('../lib/archetype-reports');const {nextItem}=require('../lib/adaptive-assessment');const {scoreResponses}=require('../lib/archetype-precision');const {inferArchetypes}=require('../lib/archetype-system-v2');const {buildMirror}=require('../lib/mirror-engine');
const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://wonder.test/?demo=1',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc}),w=dom.window,d=w.document;
w.scrollTo=()=>{};w.WonderPool={mount:()=>()=>{}};w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(value){this.returnValue=value;this.open=false;this.dispatchEvent(new w.Event('close'))};
w.fetch=async(url,opt)=>{const b=JSON.parse(opt.body),m=scoreResponses(b.responses||{}),a=inferArchetypes(m);const data=url==='/api/assessment/next'?nextItem(b.responses||{}):b.action==='demo_report'?{report:reportFor('Seer')}:b.action==='discovery_review'?{items:Object.keys(b.responses).map(id=>({element:'Reviewed',item:{prompt:id},summary:'Saved response'}))}:b.action==='demo_complete'?{report:personalizedReport(m,a,buildMirror(m,a))}:{};return {ok:true,status:200,json:async()=>data};};
for(const f of ['public-shared/journey.js','journey-ui.js','sanctuary.js','device-ui.js','operations-ui.js','app.js'])w.eval(fs.readFileSync(f,'utf8'));
const sleep=()=>new Promise(r=>setTimeout(r,10));async function until(fn,label){for(let i=0;i<150;i++){if(fn())return;await sleep()}throw Error('Missing '+label+'\n'+d.body.textContent.slice(-800))}
const click=sel=>{const el=d.querySelector(sel);assert.ok(el,'Missing '+sel);el.click()};
(async()=>{
 await until(()=>d.querySelector('[data-w-action="fresh"]'),'home');click('[data-w-action="fresh"]');d.querySelector('#confirm').close('ok');await until(()=>d.querySelector('#w-basics'),'essentials');
 for(const [key,value] of Object.entries({name:'Alex',dob:'1996-04-12',city:'Dallas'})){d.querySelector(`[name="${key}"]`).value=value}d.querySelector('[name="process"]').checked=true;d.querySelector('#w-basics').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 await until(()=>d.querySelector('.path-room'),'path');assert.equal(d.querySelectorAll('.path-chapter').length,5);click('[data-element="Water"]');await until(()=>d.querySelector('.path-room.scene-Water'),'inspect Water');assert.ok(d.body.textContent.includes('0 answers saved'));click('[data-sanctuary="continue"]');
 const visited=new Set();let answered=0;
 for(let i=0;i<70;i++){
  await until(()=>d.querySelector('.element-gate')||d.querySelector('#question-options')||d.querySelector('[data-action="finish-discovery"]'),'next stage');
  const gate=d.querySelector('[data-sanctuary="enter-chapter"]');if(gate){visited.add(gate.dataset.element);gate.click();await until(()=>d.querySelector('#question-options'),'question');}
  if(d.querySelector('[data-action="finish-discovery"]'))break;
  const saved=JSON.parse(w.sessionStorage.getItem('wonder_editorial_demo_v1')||'{}'),next=nextItem(saved.assessment?.responses||{}),q=next.item;
  if(!q)throw Error('Missing current question');
  if(q.type==='rank'){for(let n=0;n<q.max;n++)click(`[data-choice="${n}"]`)}else click(`[data-choice="${q.type==='scale'?3:0}"]`);
  click('[data-action="question-next"]');answered++;await sleep();await sleep();
 }
 assert.equal(visited.size,5);assert.ok(answered>=41&&answered<=45);assert.ok(d.querySelector('[data-action="finish-discovery"]'));click('[data-action="finish-discovery"]');await until(()=>d.querySelector('.mirror-arrival'),'Mirror arrival');assert.ok(d.body.textContent.includes('Meet my Mirror'));assert.deepEqual(errors,[]);console.log(`PASS: exploratory five-element map, inspection without answer mutation, all chapter gates, ${answered} answers, review, real scored archetype, Mirror arrival.`);
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>w.close());
