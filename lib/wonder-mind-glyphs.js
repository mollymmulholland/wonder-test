'use strict';

const {hash,canonical}=require('./wonder-mind-geometry');

const GLYPH_LANGUAGE_VERSION='wgl-ir/1';
const LEXICON={
  PROGRAM:{code:'E000',name:'program',arity:'many'},
  OBSERVE:{code:'E001',name:'observation',arity:'many'},
  INFER:{code:'E002',name:'inference',arity:'many'},
  HYPOTHESIS:{code:'E003',name:'hypothesis',arity:'many'},
  PREDICT:{code:'E004',name:'prediction',arity:'many'},
  JUDGE:{code:'E005',name:'judgment',arity:'many'},
  SUPPORT:{code:'E006',name:'support',arity:'many'},
  CONTRADICT:{code:'E007',name:'counterevidence',arity:'many'},
  ALTERNATIVE:{code:'E008',name:'alternative',arity:'many'},
  UNCERTAINTY:{code:'E009',name:'uncertainty',arity:0},
  TIME:{code:'E00A',name:'time',arity:'many'},
  DYAD:{code:'E00B',name:'dyad',arity:'many'},
  BRANCH:{code:'E00C',name:'scenario branch',arity:'many'},
  BOUNDARY:{code:'E00D',name:'constitutional boundary',arity:'many'},
  CORRECT:{code:'E00E',name:'correction',arity:'many'},
  ABSTAIN:{code:'E00F',name:'abstention',arity:'many'},
  CLAIM:{code:'E010',name:'claim',arity:0},
  EVIDENCE_REF:{code:'E011',name:'evidence reference',arity:0},
  CHANGE_CONDITION:{code:'E012',name:'falsification condition',arity:0},
  CONFIDENCE:{code:'E013',name:'confidence',arity:0}
};
const ALLOWED=new Set(Object.keys(LEXICON));

function safeAttrs(attrs={}){
  if(!attrs||typeof attrs!=='object'||Array.isArray(attrs))return {};
  return Object.fromEntries(Object.entries(attrs).filter(([,v])=>v==null||['string','number','boolean'].includes(typeof v)).map(([k,v])=>[String(k).slice(0,80),typeof v==='string'?v.slice(0,4000):v]));
}
function node(op,attrs={},children=[]){
  const normalized=String(op||'').toUpperCase();
  if(!ALLOWED.has(normalized))throw new Error(`Unknown Wonder glyph operator: ${normalized}`);
  return {op:normalized,attrs:safeAttrs(attrs),children:(Array.isArray(children)?children:[]).map(c=>node(c.op,c.attrs,c.children))};
}
function b64(value){return Buffer.from(canonical(value),'utf8').toString('base64url');}
function unb64(value){return JSON.parse(Buffer.from(value,'base64url').toString('utf8'));}

function flatten(root,out=[]){
  const n=node(root.op,root.attrs,root.children);
  out.push({glyph:LEXICON[n.op].code,op:n.op,arity:n.children.length,payload:b64(n.attrs)});
  n.children.forEach(c=>flatten(c,out));
  return out;
}
function encode(root){
  const ast=node(root.op,root.attrs,root.children),tokens=flatten(ast);
  const sourceHash=hash(ast);
  const program={language_version:GLYPH_LANGUAGE_VERSION,source_hash:sourceHash,tokens,serialized:`WGL1|${tokens.map(t=>`${t.glyph}.${t.arity}.${t.payload}`).join('|')}`};
  const decoded=decode(program);
  return {...program,round_trip_hash:hash(decoded),reversible:hash(decoded)===sourceHash};
}
function decode(program){
  const tokens=Array.isArray(program)?program:program?.tokens;
  if(!Array.isArray(tokens)||!tokens.length)throw new Error('Wonder glyph token sequence is empty');
  let cursor=0;
  function read(){
    const token=tokens[cursor++];
    if(!token||!ALLOWED.has(token.op)||LEXICON[token.op].code!==token.glyph)throw new Error('Invalid Wonder glyph token');
    const arity=Math.max(0,Math.min(128,Number(token.arity)||0)),children=[];
    for(let i=0;i<arity;i++)children.push(read());
    return node(token.op,unb64(token.payload),children);
  }
  const result=read();
  if(cursor!==tokens.length)throw new Error('Wonder glyph program has trailing tokens');
  return result;
}

function listNodes(op,values=[],attr='text'){return (values||[]).filter(Boolean).map(value=>node(op,{[attr]:String(value)}));}
function epistemicOperator(epistemicClass){
  return {observation:'OBSERVE',validated_inference:'INFER',pattern_hypothesis:'HYPOTHESIS',speculation:'HYPOTHESIS',philosophical_lens:'HYPOTHESIS',prediction:'PREDICT',judgment:'JUDGE'}[epistemicClass]||'HYPOTHESIS';
}
function compileJudgment(output={},options={}){
  const op=epistemicOperator(output.epistemic_class);
  const children=[
    node('CLAIM',{text:String(output.claim||'')}),
    node('CONFIDENCE',{value:Number(output.confidence)||0}),
    node('SUPPORT',{},listNodes('EVIDENCE_REF',options.validEvidenceRefs||output.supporting_evidence_refs||[],'key')),
    node('CONTRADICT',{},listNodes('CLAIM',output.counterevidence)),
    node('ALTERNATIVE',{},listNodes('CLAIM',output.alternative_hypotheses)),
    ...listNodes('CHANGE_CONDITION',output.what_would_change_mind),
    node(options.ethicsClear===false?'ABSTAIN':'BOUNDARY',{ethics_clear:options.ethicsClear!==false,constitutional_version:String(options.constitutionalVersion||'wonder-constitution-v1')})
  ];
  const judgment=node(op,{epistemic_class:String(output.epistemic_class||'pattern_hypothesis')},children);
  const body=options.candidateUserId?[node('DYAD',{candidate_user_id:String(options.candidateUserId)},[judgment])]:[judgment];
  return node('PROGRAM',{purpose:String(options.purpose||'auditable_judgment'),run_id:String(options.runId||'')},body);
}

function lexiconRows(){return Object.entries(LEXICON).map(([op,g])=>({glyph_code:g.code,operator:op,name:g.name,language_version:GLYPH_LANGUAGE_VERSION,semantic_contract:{arity:g.arity,canonical_operator:op},visual_grammar:{family:'wonder_compositional_marks_v1',rendering:'svg_or_custom_font'}}));}

module.exports={GLYPH_LANGUAGE_VERSION,LEXICON,node,encode,decode,compileJudgment,lexiconRows};
