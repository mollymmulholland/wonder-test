const assert=require('node:assert/strict'),J=require('../public-shared/journey'),Engine=require('../lib/introduction-engine');
const {configuration,memoryProposal}=require('../lib/mirror-runtime');
const w=J.fixture(),a=w.users.alex,b=w.users.rowan;
for(const s of [a,b]){s.preferences={...s.preferences,gender:'nonbinary',meet:['nonbinary'],structure:'Monogamy'};s.portrait.topics=['Art','Nature'];s.portrait.planning='planned';s.moderation={photoApproved:true};}
const scores=Object.fromEntries(Engine.DIMENSIONS.map(k=>[k,.4])),evidence=Object.fromEntries(Engine.DIMENSIONS.map(k=>[k,2])),snapshot={scores,confidence:{evidence}};
assert.ok(Engine.evaluate(a,b,snapshot,snapshot));
b.preferences.meet=['woman'];assert.equal(Engine.evaluate(a,b,snapshot,snapshot),null);b.preferences.meet=['nonbinary'];
b.preferences.structure='Consensual non-monogamy';assert.equal(Engine.evaluate(a,b,snapshot,snapshot),null);b.preferences.structure='Monogamy';
b.preferences.familyRequired=true;b.preferences.family='Want children';a.preferences.family='Do not want children';assert.equal(Engine.evaluate(a,b,snapshot,snapshot),null);b.preferences.familyRequired=false;
assert.equal(Engine.evaluate(a,b,{scores,confidence:{evidence:{}}},snapshot),null);
a.corrections={values:{fit:'doesnt',matching:true},attraction:{fit:'unsure',matching:false},conditions:{fit:'partly',matching:true}};const x=Engine.evaluate(a,b,snapshot,snapshot);assert.equal(x,null,'Rejected values and uncertain attraction cannot silently drive a new pair');
a.corrections={};a.portrait.topics=['Science'];assert.equal(Engine.evaluate(a,b,snapshot,snapshot),null);a.portrait.topics=['Nature'];
const result=Engine.evaluate(a,b,snapshot,snapshot);assert.ok(result.reason.join(' ').includes('Nature'));assert.ok(!JSON.stringify(result.reason).includes('scores'));assert.ok(!JSON.stringify(result.reason).includes('stress'));
assert.equal(configuration(),null);assert.throws(()=>memoryProposal('{"body":"An inference"}'));assert.deepEqual(memoryProposal('{"body":"Predictable communication may help.","context":"One reported date; tentative."}'),{kind:'memory',body:'Predictable communication may help.',context:'One reported date; tentative.'});
console.log('PASS: reciprocal audience, structure and family requirements; actual discovery evidence; rejected and uncertain inferences excluded; approved shared interests; unavailable runtime; reviewable action schema.');
