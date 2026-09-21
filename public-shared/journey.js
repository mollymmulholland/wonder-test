/* Shared deterministic rules. No inference, network, analytics, or personal data. */
(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.WonderJourney=api;})(typeof window==='object'?window:this,function(){
'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
const fail=(message,status=409)=>{throw Object.assign(new Error(message),{status});};
const text=(v,max=4000)=>typeof v==='string'?v.trim().slice(0,max):'';
const oneOf=(v,values)=>{if(!values.includes(v))fail('Choose one of the available options.',400);return v;};
function age(dob,now=new Date()){if(!/^\d{4}-\d{2}-\d{2}$/.test(dob||''))return null;const d=new Date(dob+'T12:00:00Z');if(!Number.isFinite(+d)||d.toISOString().slice(0,10)!==dob)return null;return now.getUTCFullYear()-d.getUTCFullYear()-((now.getUTCMonth()<d.getUTCMonth()||(now.getUTCMonth()===d.getUTCMonth()&&now.getUTCDate()<d.getUTCDate()))?1:0);}
function initial(){return {schema:2,version:0,basics:{name:'',dob:'',city:''},consent:{process:false,matching:false,research:false},preferences:{intention:'',minAge:18,maxAge:120,cityRequired:true},display:{largeText:false,reducedMotion:false},portrait:{bio:'',ordinary:'',care:'',interest:'',photo:'',approved:false},availability:'paused',mirrorReviewed:false,lens:'provisional',corrections:{},history:[],memories:[],journal:[],reflections:[],blocks:[],reports:[],cityInterest:null,deleted:false};}
function eligible(s){return !s.deleted&&age(s.basics.dob)>=18&&age(s.basics.dob)<=120&&s.consent.process&&s.consent.matching&&s.mirrorReviewed&&s.portrait.approved&&s.availability==='available';}
function permits(a,b){if(!eligible(a)||!eligible(b))return false;const aa=age(a.basics.dob),ba=age(b.basics.dob);return ba>=a.preferences.minAge&&ba<=a.preferences.maxAge&&aa>=b.preferences.minAge&&aa<=b.preferences.maxAge&&(!a.preferences.cityRequired&&!b.preferences.cityRequired||a.basics.city.toLowerCase()===b.basics.city.toLowerCase());}
function privateEvent(source,event,now=new Date().toISOString()){
 const s=clone(source);if(s.deleted)fail('This account has been deleted.',410);const p=event.payload||{};
 switch(event.type){
 case 'basics':{const n=age(p.dob);if(n===null||n<18||n>120)fail('WONDER is for adults aged 18 and older. Enter a valid birth date.',400);if(!text(p.name,80)||!text(p.city,120)||p.process!==true)fail('Add your name, broad city, and permission to process discovery.',400);s.basics={name:text(p.name,80),city:text(p.city,120),dob:p.dob};s.consent.process=true;s.portrait.approved=false;s.availability='paused';break;}
 case 'city_interest':s.cityInterest=p.active===true?{city:s.basics.city,savedAt:now}:null;break;
 case 'display':s.display={largeText:p.largeText===true,reducedMotion:p.reducedMotion===true};break;
 case 'consent':s.consent={process:p.process===true,matching:p.matching===true,research:false};if(!s.consent.matching||!s.consent.process){s.availability='paused';s.memories.forEach(m=>m.matching=false);Object.values(s.corrections).forEach(c=>c.matching=false);}if(!s.consent.process){s.memories=[];s.consent.matching=false;}break;
 case 'preferences':{const min=Number(p.minAge),max=Number(p.maxAge);if(!Number.isInteger(min)||!Number.isInteger(max)||min<18||max>120||max<min)fail('Choose a valid adult age range.',400);s.preferences={minAge:min,maxAge:max,cityRequired:p.cityRequired!==false,intention:text(p.intention,100)};s.availability='paused';break;}
 case 'portrait':{const photo=text(p.photo,600);if(photo&&!/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(photo)&&!/^assets\/demo-(alex|rowan)\.svg$/.test(photo))fail('Use an approved portrait image.',400);s.portrait={bio:text(p.bio,1000),ordinary:text(p.ordinary,600),care:text(p.care,600),interest:text(p.interest,600),photo,approved:false};break;}
 case 'approve_portrait':if(!s.basics.name||!s.portrait.bio||!s.portrait.ordinary||!s.preferences.intention)fail('Complete the portrait and relationship intention first.');s.portrait.approved=true;break;
 case 'review_mirror':s.mirrorReviewed=true;break;
 case 'lens':s.lens=oneOf(p.value,['provisional','mixed','unassigned','rejected']);break;
 case 'correct':{const id=text(p.claim,100);if(!id||!text(p.original))fail('The original insight is missing.',400);const fit=oneOf(p.fit,['fits','partly','doesnt','unsure']);const revision=text(p.revision);if(['partly','doesnt'].includes(fit)&&!revision)fail('Add the words you want us to use instead.',400);const update={claim:id,fit,original:text(p.original),revision,matching:p.matching===true&&s.consent.matching,at:now,reportVersion:text(p.reportVersion,100)};s.corrections[id]=update;s.history.push(update);s.availability='paused';break;}
 case 'memory':{if(!text(p.body))fail('Write the takeaway first.',400);if(p.remember!==true)fail('Choose whether to remember this insight.',400);s.memories.push({id:p.id||now,body:text(p.body,1500),source:text(p.source,100)||'User-authored',sourceId:text(p.sourceId,100),context:text(p.context,1500),matching:p.matching===true&&s.consent.matching,at:now});break;}
 case 'forget':s.memories=s.memories.filter(m=>m.id!==p.id);s.availability='paused';break;
 case 'availability':{const v=oneOf(p.value,['available','paused','seeing']);if(v==='available'&&!eligible({...s,availability:v}))fail('Review your Mirror, approve your portrait, and permit introductions first.');s.availability=v;break;}
 case 'journal':{if(!text(p.body,12000))fail('Write a little before saving.',400);const entry={id:text(p.id,100)||now,title:text(p.title,160)||'Untitled reflection',body:text(p.body,12000),tags:text(p.tags,200),at:s.journal.find(e=>e.id===p.id)?.at||now,updated:now};s.journal=[entry,...s.journal.filter(e=>e.id!==entry.id)];break;}
 case 'delete_journal':s.journal=s.journal.filter(e=>e.id!==p.id);s.memories=s.memories.filter(m=>m.sourceId!==p.id);s.availability='paused';break;
 case 'reflection':{const attendance=oneOf(p.attendance,['yes','rescheduled','cancelled','no','private']);const entry={id:text(p.id,100)||now,pairId:text(p.pairId,100),attendance,at:now,body:text(p.body,8000),answers:{}};if(attendance==='yes')for(const k of ['feeling','authentic','understood','attraction','again'])entry.answers[k]=oneOf(p.answers?.[k]||'unsure',['yes','partly','no','unsure']);s.reflections=[entry,...s.reflections.filter(e=>e.id!==entry.id)];break;}
 case 'block':if(!text(p.userId,100))fail('Choose the person to block.',400);s.blocks=[...new Set([...s.blocks,p.userId])];break;
 case 'report':s.reports.push({id:now,userId:text(p.userId,100),reason:text(p.reason,3000),at:now});break;
 case 'delete':return {...initial(),version:s.version+1,deleted:true};
 default:fail('Unknown change.',400);
 }
 s.version++;return s;
}
function shared(s){if(!s.portrait.approved)return null;return {name:s.basics.name,age:age(s.basics.dob),city:s.basics.city,intention:s.preferences.intention,...clone(s.portrait)};}
function pairState(){return {version:0,status:'proposed',interest:{},messages:[],plan:null,reminders:[],reason:['Both approved portraits name a committed relationship with room for independent interests.','Both describe art and time outdoors as things they would like to share.'],difference:'One prefers a planned weekend; the other leaves more space for spontaneity.',unknown:'Chemistry, comfort, and how your conversation feels remain unknown.'};}
function pairView(pair,actor,users){if(!pair.members.includes(actor))fail('Connection not found.',404);const other=pair.members.find(x=>x!==actor),a=users[actor],b=users[other];if(!a||!b||a.deleted||b.deleted)return {status:'withdrawn'};if(a.blocks.includes(other)||b.blocks.includes(actor)||pair.status==='blocked')return {status:'unavailable'};const active=permits(a,b);if(!active&&['proposed','pending','mutual'].includes(pair.status))return {status:'unavailable',reason:'Availability or required preferences changed.'};const out=clone(pair);delete out.interest;out.myInterest=pair.interest[actor]||null;out.otherPortrait=shared(b);if(pair.status!=='mutual'){out.messages=[];out.plan=null;}return out;}
function pairEvent(source,event,actor,users,now=new Date().toISOString()){
 const pair=clone(source);if(!pair.members.includes(actor))fail('Connection not found.',404);const other=pair.members.find(x=>x!==actor),a=users[actor],b=users[other];if(!a||!b||a.deleted||b.deleted)fail('This introduction has been withdrawn.');
 if(event.type==='block'){pair.status='blocked';pair.reminders=[];pair.plan=null;pair.version++;return pair;}
 if(a.blocks.includes(other)||b.blocks.includes(actor)||['blocked','declined','closed','withdrawn'].includes(pair.status))fail('This introduction is no longer available.');
 if(!permits(a,b))fail('Availability or required preferences changed. Review this introduction before continuing.');
 const p=event.payload||{};
 switch(event.type){
 case 'interest':if(!['proposed','pending'].includes(pair.status))fail('Your choice is already recorded.');pair.interest[actor]='interested';pair.status=pair.interest[other]==='interested'?'mutual':'pending';break;
 case 'decline':pair.status='declined';pair.reminders=[];break;
 case 'later':break;
 case 'message':if(pair.status!=='mutual')fail('Both people must express interest before contact opens.');if(!text(p.body,3000))fail('Write a message first.',400);if(pair.messages.some(m=>m.id===p.id))return pair;pair.messages.push({id:text(p.id,100)||now,from:actor,body:text(p.body,3000),at:now});break;
 case 'plan':if(pair.status!=='mutual')fail('A meeting plan requires mutual interest.');if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(p.when||'')||!text(p.zone,80)||!text(p.place,300))fail('Add a day, time, time zone, and public location.',400);try{new Intl.DateTimeFormat('en',{timeZone:p.zone});}catch{fail('Choose a valid time zone.',400);}pair.plan={when:p.when,zone:p.zone,place:text(p.place,300),budget:text(p.budget,200),access:text(p.access,300),by:actor,status:'proposed'};pair.reminders=[];break;
 case 'accept_plan':if(pair.status!=='mutual'||!pair.plan||pair.plan.status!=='proposed'||pair.plan.by===actor)fail('The other person needs to review this proposal.');pair.plan.status='confirmed';break;
 case 'cancel_plan':if(!pair.plan)fail('There is no plan to cancel.');pair.plan.status='cancelled';pair.reminders=[];break;
 case 'close':pair.status='closed';pair.reminders=[];if(pair.plan)pair.plan.status='cancelled';break;
 default:fail('Unknown connection action.',400);
 }
 pair.version++;return pair;
}
function effective(section,s){const c=s.corrections[section.id];if(!c)return section;if(c.fit==='doesnt'||c.fit==='partly')return {...section,body:c.revision,label:'You corrected this',support:'Your reviewed correction replaces the earlier interpretation.',matching:c.matching};if(c.fit==='unsure')return {...section,body:'You marked this interpretation as uncertain. It is not accepted as a fact about you.',label:'Still unclear',matching:false};return {...section,label:'You confirmed this',matching:c.matching};}
function fixture(){const users={};for(const [id,name,dob]of [['alex','Alex','1996-04-12'],['rowan','Rowan','1997-08-19']]){let s=initial();s.basics={name,dob,city:'Dallas, Texas'};s.consent={process:true,matching:true,research:false};s.preferences={intention:'A committed relationship',minAge:25,maxAge:40,cityRequired:true};s.portrait={bio:id==='alex'?'Curious by nature. I want a committed relationship with room for our independent interests.':'I build things and read slowly. I want commitment while we each keep independent interests.',ordinary:id==='alex'?'Leaving a weekend open: a gallery on a whim, a walk outdoors, and a meal made together.':'Planning a weekend around a gallery visit, a walk outdoors, and a meal made together.',care:'A clear plan and room to be myself.',interest:'Art, the outdoors, and the ideas a conversation uncovers.',photo:`assets/demo-${id}.svg`,approved:true};s.mirrorReviewed=true;s.availability='available';users[id]=s;}return {actor:'alex',users,pair:{id:'demo-introduction',members:['alex','rowan'],...pairState()},scenario:'normal'};}
return {initial,privateEvent,pairEvent,pairView,pairState,shared,eligible,permits,effective,fixture,age};
});
