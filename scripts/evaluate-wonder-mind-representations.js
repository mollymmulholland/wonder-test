'use strict';

const assert=require('assert');
const {createState,deriveHumanState,projectState,buildTrajectory,branchScenarios,PROJECTIONS,SPACE_VERSIONS}=require('../lib/wonder-mind-geometry');
const {node,encode,decode,compileJudgment}=require('../lib/wonder-mind-glyphs');

function state(at,recognition,safety,confidence=.8){
  return createState({spaceVersion:SPACE_VERSIONS.dyadic_field,entityType:'dyadic_field',observedAt:at,dimensions:{recognition:{value:recognition,confidence,evidence_refs:['outcome:1'],basis:'observed'},emotional_safety:{value:safety,confidence,evidence_refs:['outcome:1'],basis:'observed'},friction:{value:-.2,confidence:.6,evidence_refs:['outcome:1'],basis:'observed'}},evidenceRefs:['outcome:1']});
}

const checks=[];
function check(name,fn){try{fn();checks.push({name,pass:true});}catch(error){checks.push({name,pass:false,error:error.message});}}

check('3D projection preserves missingness as coverage',()=>{
  const projected=projectState(state('2026-09-01T00:00:00Z',.4,.2),PROJECTIONS.dyadic_field);
  assert.equal(projected.coordinates.length,3);
  assert(projected.axes.some(a=>a.coverage<1));
});

check('human model remains high-dimensional before projection',()=>{
  const human=deriveHumanState({personModel:{id:'model-1',created_at:'2026-09-01T00:00:00Z',model_version:'v2',scores:{autonomy_need:.8,belonging_need:.7,ambiguity_tolerance:.9,repair_orientation:.6},confidence:{architecture_confidence:.8,coverage:.75}},evidenceRefs:['assessment:model-1']});
  assert.equal(Object.keys(human.dimensions).length,4);
  const projected=projectState(human,PROJECTIONS.human_state);
  assert.equal(projected.coordinates.length,3);
  assert(projected.axes.every(a=>a.coverage<1));
});

check('trajectory is ordered and explicitly non-causal',()=>{
  const trajectory=buildTrajectory([
    createState({spaceVersion:SPACE_VERSIONS.cognitive_process,entityType:'cognitive_process',observedAt:'2026-09-02T00:00:00Z',dimensions:{'self-identity':{value:.7,confidence:1}}}),
    createState({spaceVersion:SPACE_VERSIONS.cognitive_process,entityType:'cognitive_process',observedAt:'2026-09-01T00:00:00Z',dimensions:{'self-identity':{value:.3,confidence:1}}})
  ],PROJECTIONS.cognitive_process);
  assert.equal(trajectory.points[0].observed_at,'2026-09-01T00:00:00Z');
  assert.equal(trajectory.causal_status,'observed_path_not_forecast');
});

check('scenario branches remain plausible branches, not predictions',()=>{
  const branches=branchScenarios({origin:state('2026-09-01T00:00:00Z',.2,.1),branches:[{id:'repair',label:'repair improves',horizon:'2026-10-01T00:00:00Z',dimensions:{emotional_safety:{value:.7,confidence:.35}},evidence_needed:['observed repair']} ]});
  assert.equal(branches[0].causal_status,'plausible_branch_not_prediction');
  assert.equal(branches[0].probability,null);
});

check('glyph IR round-trips without semantic loss',()=>{
  const ast=node('PROGRAM',{purpose:'test'},[node('HYPOTHESIS',{},[node('CLAIM',{text:'A context-bound pattern may exist'}),node('EVIDENCE_REF',{key:'message:current'})])]);
  const encoded=encode(ast),decoded=decode(encoded);
  assert(encoded.reversible);
  assert.deepEqual(decoded,ast);
  assert.equal(encoded.source_hash,encoded.round_trip_hash);
});

check('judgment compiler carries epistemic class, evidence, alternatives and correction conditions',()=>{
  const ast=compileJudgment({claim:'A provisional interpretation',confidence:.48,epistemic_class:'pattern_hypothesis',supporting_evidence_refs:['message:current'],counterevidence:['one contrary observation'],alternative_hypotheses:['context effect'],what_would_change_mind:['repeated contrary outcomes']},{ethicsClear:true,runId:'run-1'});
  const encoded=encode(ast),ops=encoded.tokens.map(t=>t.op);
  ['HYPOTHESIS','SUPPORT','CONTRADICT','ALTERNATIVE','CHANGE_CONDITION','BOUNDARY'].forEach(op=>assert(ops.includes(op)));
});

check('unknown glyph operators fail closed',()=>assert.throws(()=>node('DESTINY',{}),/Unknown Wonder glyph operator/));

const failed=checks.filter(c=>!c.pass);
console.log(JSON.stringify({suite:'wonder-mind-representations-v1',total:checks.length,passed:checks.length-failed.length,failed:failed.length,promotable:failed.length===0,checks},null,2));
process.exit(failed.length?1:0);
