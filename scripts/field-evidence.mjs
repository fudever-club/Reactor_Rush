/** Validate FIELD-01 CSV evidence, never substitute for physical/human acceptance. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export function parseCsv(text) {
  const rows=[];let row=[],field='',quoted=false;
  text=text.replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(c==='"'){
      if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;
    }else if(c===','&&!quoted){row.push(field);field='';}
    else if((c==='\n'||c==='\r')&&!quoted){
      if(c==='\r'&&text[i+1]==='\n')i++;
      row.push(field);if(row.some(v=>v.trim()))rows.push(row);row=[];field='';
    }else field+=c;
  }
  if(quoted)throw Error('Unclosed quoted CSV field');
  if(field||row.length){row.push(field);if(row.some(v=>v.trim()))rows.push(row);}
  const headers=(rows.shift()??[]).map(header=>header.trim());
  if(headers.some(header=>!header))throw Error('Empty CSV header');
  if(new Set(headers).size!==headers.length)throw Error('Duplicate CSV headers');
  return rows.map((values,index)=>{
    if(values.length!==headers.length)throw Error(`CSV row ${index+2}: expected ${headers.length} columns, got ${values.length}`);
    return Object.fromEntries(headers.map((header,i)=>[header.trim(),values[i].trim()]));
  });
}

export function assessFieldEvidence(observations,metrics) {
  const issues=[],failures=[];
  const numeric=(row,key,label,integer=false,positive=false)=>{
    const raw=row[key];const value=Number(raw);
    if(raw===undefined||String(raw).trim()===''||!Number.isFinite(value)||value<0||
       (integer&&!Number.isInteger(value))||(positive&&value===0)){
      issues.push(`${label}: invalid/missing ${key}`);return null;
    }
    return value;
  };
  const required=(row,keys,label)=>{for(const key of keys)if(!row[key]?.trim())issues.push(`${label}: missing ${key}`);};
  const common=(row,label)=>{
    required(row,['test_id','run_id','scheme','status'],label);
    if(row.namespace!=='MASTER-V3')issues.push(`${label}: namespace must be MASTER-V3`);
    if(!['H0','P1','P2'].includes(row.scheme))issues.push(`${label}: unknown scheme`);
    if(!['MEASURED','PASS','FAIL'].includes(row.status?.toUpperCase()))issues.push(`${label}: status is not measured`);
    if(row.status?.toUpperCase()==='FAIL')failures.push(`${label}: operator reported FAIL`);
  };
  if(!observations.length)issues.push('No physical observation rows');
  if(!metrics.length)issues.push('No physical metric rows');
  const observationResults=observations.map((row,i)=>{
    const label=`observation ${i+1}`;common(row,label);required(row,['consent_reference'],label);
    const tp=numeric(row,'tp',label,true),fp=numeric(row,'fp',label,true),fn=numeric(row,'fn',label,true);
    const swaps=numeric(row,'silent_reassignments',label,true);const distance=numeric(row,'distance_m',label,false,true);
    const precision=tp!==null&&fp!==null&&tp+fp>0?tp/(tp+fp):null;
    const recall=tp!==null&&fn!==null&&tp+fn>0?tp/(tp+fn):null;
    if(precision===null||recall===null)issues.push(`${label}: precision/recall undefined`);
    if(distance!==null&&distance<2)issues.push(`${label}: distance below required >=2m; retain as diagnostic data`);
    if(precision!==null&&precision<.9)failures.push(`${label}: precision below90%`);
    if(recall!==null&&recall<.85)failures.push(`${label}: recall below85%`);
    if(swaps!==null&&swaps!==0)failures.push(`${label}: silent reassignment observed`);
    return {run_id:row.run_id,scheme:row.scheme,precision,recall,distance_m:distance};
  });
  const metricResults=metrics.map((row,i)=>{
    const label=`metric ${i+1}`;common(row,label);required(row,['measurement_method','evidence'],label);
    const fps=numeric(row,'render_fps_p5',label),latency=numeric(row,'body_to_robot_p95_ms',label),neutral=numeric(row,'neutral_after_loss_ms',label);
    const resolution=numeric(row,'timing_resolution_ms',label,false,true);
    if(fps!==null&&fps<45)failures.push(`${label}: render FPS p5 below45`);
    if(latency!==null&&latency>200)failures.push(`${label}: body-to-robot p95 exceeds200ms target`);
    if(neutral!==null&&neutral>250)failures.push(`${label}: neutral-after-loss exceeds250ms mandatory limit`);
    return {run_id:row.run_id,scheme:row.scheme,render_fps_p5:fps,body_to_robot_p95_ms:latency,neutral_after_loss_ms:neutral,timing_resolution_ms:resolution};
  });
  for(const [rows,other,label] of [[observations,metrics,'observation'],[metrics,observations,'metric']]){
    for(const row of rows)if(!other.some(r=>r.run_id===row.run_id&&r.scheme===row.scheme&&r.test_id===row.test_id))issues.push(`${label} ${row.run_id}: missing matching test/run/scheme evidence`);
  }
  return {status:issues.length?'INCOMPLETE':failures.length?'THRESHOLDS_NOT_MET':'MEASURED_THRESHOLDS_MET',
    physicalAcceptance:'PENDING_HUMAN',issues,failures,observations:observationResults,metrics:metricResults,
    limitations:['Validates supplied numbers and provenance fields, not authenticity of measurements.',
      'Does not certify complete distance/lighting/participant matrix, TV readability, offline hardware or endurance.',
      'Threshold equality does not incorporate measurement uncertainty; retain timing resolution and method.',
      'Historical CV-02 protocol is distinct from MASTER-V3. No automatic G3/G4 approval.']};
}

async function main(){
  const [observationsPath,metricsPath,output]=process.argv.slice(2);
  if(!observationsPath||!metricsPath)throw Error('Usage: node scripts/field-evidence.mjs OBSERVATIONS.csv METRICS.csv [OUTPUT.json]');
  const result=assessFieldEvidence(parseCsv(await fs.readFile(observationsPath,'utf8')),parseCsv(await fs.readFile(metricsPath,'utf8')));
  if(output)await fs.writeFile(output,JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
  process.exitCode=result.status==='MEASURED_THRESHOLDS_MET'?0:2;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(error=>{console.error(error.message);process.exitCode=1;});
