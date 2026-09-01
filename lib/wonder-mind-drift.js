'use strict';

const {rest}=require('./supabase-server');

function mean(xs=[]){const vals=xs.map(Number).filter(Number.isFinite);return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;}
function statusFor(delta,threshold){if(delta==null)return'observing';const a=Math.abs(delta);if(a>=threshold*2)return'critical';if(a>=threshold)return'warning';return'healthy';}

async function recordMetric({modelVersionId=null,metricName,domain='global',sampleSize=0,value=null,baselineValue=null,threshold=.1,breakdown={}}){
  const delta=value==null||baselineValue==null?null:Number(value)-Number(baselineValue);
  const status=statusFor(delta,threshold);
  await rest('/wonder_mind_drift_metrics',{method:'POST',admin:true,prefer:'return=minimal',body:{model_version_id:modelVersionId,metric_name:metricName,domain,sample_size:sampleSize,value,baseline_value:baselineValue,delta,threshold,status,breakdown,window_end:new Date().toISOString()}});
  return{metricName,domain,sampleSize,value,baselineValue,delta,threshold,status};
}

async function evaluateEvidenceDrift({modelVersionId=null,windowSize=100,baselineSize=300}={}){
  const rows=await rest(`/wonder_mind_evidence_audits?select=contamination_score,independent_source_count,created_at&order=created_at.desc&limit=${Math.max(windowSize+baselineSize,50)}`,{admin:true});
  const recent=rows.slice(0,windowSize),baseline=rows.slice(windowSize,windowSize+baselineSize);
  const recentContamination=mean(recent.map(r=>r.contamination_score)),baselineContamination=mean(baseline.map(r=>r.contamination_score));
  const recentIndependence=mean(recent.map(r=>r.independent_source_count)),baselineIndependence=mean(baseline.map(r=>r.independent_source_count));
  const contamination=await recordMetric({modelVersionId,metricName:'evidence_contamination',sampleSize:recent.length,value:recentContamination,baselineValue:baselineContamination,threshold:.12,breakdown:{window_size:windowSize,baseline_size:baseline.length}});
  const independence=await recordMetric({modelVersionId,metricName:'evidence_independence',sampleSize:recent.length,value:recentIndependence,baselineValue:baselineIndependence,threshold:.75,breakdown:{window_size:windowSize,baseline_size:baseline.length}});
  return{contamination,independence};
}

async function evaluateCalibrationDrift({modelVersionId=null,domain='matching'}={}){
  const rows=await rest(`/wonder_mind_calibration_metrics?metric_name=eq.brier_score&domain=eq.${encodeURIComponent(domain)}&select=value,sample_size,created_at&order=created_at.desc&limit=8`,{admin:true});
  const current=rows[0]||null,baseline=rows.length>1?mean(rows.slice(1).map(r=>r.value)):null;
  return recordMetric({modelVersionId,metricName:'brier_drift',domain,sampleSize:current?.sample_size||0,value:current?.value??null,baselineValue:baseline,threshold:.05,breakdown:{historical_points:Math.max(0,rows.length-1)}});
}

async function detectDrift({modelVersionId=null}={}){
  const [evidence,calibration]=await Promise.all([evaluateEvidenceDrift({modelVersionId}),evaluateCalibrationDrift({modelVersionId})]);
  const statuses=[evidence.contamination.status,evidence.independence.status,calibration.status];
  const overall=statuses.includes('critical')?'critical':statuses.includes('warning')?'warning':statuses.every(s=>s==='healthy')?'healthy':'observing';
  return{overall,evidence,calibration};
}

module.exports={detectDrift,evaluateEvidenceDrift,evaluateCalibrationDrift,recordMetric,statusFor};
