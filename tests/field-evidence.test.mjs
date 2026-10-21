import assert from 'node:assert/strict';
import test from 'node:test';
import { assessFieldEvidence, parseCsv } from '../scripts/field-evidence.mjs';
const observations = () => [{namespace:'MASTER-V3',test_id:'FIELD-01',run_id:'run1',scheme:'P1',distance_m:'2',status:'MEASURED',tp:'90',fp:'10',fn:'10',silent_reassignments:'0',consent_reference:'local consent note'}];
const metrics = () => [{namespace:'MASTER-V3',test_id:'FIELD-01',run_id:'run1',scheme:'P1',status:'MEASURED',render_fps_p5:'45',body_to_robot_p95_ms:'200',neutral_after_loss_ms:'250',timing_resolution_ms:'10',measurement_method:'consented timestamped video',evidence:'local measurement log'}];
test('empty field templates never produce a passing readiness claim',()=>{
 const r=assessFieldEvidence([],[]);assert.equal(r.status,'INCOMPLETE');assert.equal(r.physicalAcceptance,'PENDING_HUMAN');
});
test('valid measured rows report thresholds without certifying overall field acceptance',()=>{
 const r=assessFieldEvidence(observations(),metrics());assert.equal(r.status,'MEASURED_THRESHOLDS_MET');assert.equal(r.physicalAcceptance,'PENDING_HUMAN');assert.equal(r.observations[0].precision,.9);assert.equal(r.observations[0].recall,.9);
});
test('zero denominators, missing provenance and mismatched runs cannot pass',()=>{
 const o=observations();o[0].tp='0';o[0].fp='0';o[0].fn='0';o[0].consent_reference='';const m=metrics();m[0].run_id='other';m[0].evidence='';
 const r=assessFieldEvidence(o,m);assert.equal(r.status,'INCOMPLETE');assert.equal(r.observations[0].precision,null);assert.ok(r.issues.length>=3);
});
test('silent reassignment and failure to neutralize are blocking even with good FPS',()=>{
 const o=observations();o[0].silent_reassignments='1';const m=metrics();m[0].neutral_after_loss_ms='251';const r=assessFieldEvidence(o,m);assert.equal(r.status,'THRESHOLDS_NOT_MET');assert.ok(r.failures.length>=2);
});
test('nonfinite, negative and fractional event counts cannot be treated as valid measurements',()=>{
 for(const value of ['NaN','Infinity','-1','1.5','']){const o=observations();o[0].fp=value;assert.equal(assessFieldEvidence(o,metrics()).status,'INCOMPLETE');}
});
test('near-distance data and a claimed PASS cannot replace required measurement provenance',()=>{
 const o=observations();o[0].distance_m='1.5';o[0].status='PASS';const m=metrics();m[0].measurement_method='';assert.equal(assessFieldEvidence(o,m).status,'INCOMPLETE');
});
test('CSV reads quoted operator notes, CRLF and a UTF-8 BOM',()=>{
 assert.deepEqual(parseCsv('\uFEFFa,b\r\n"x,y","two\nlines"\r\n'),[{a:'x,y',b:'two\nlines'}]);
});
test('CSV rejects header aliases and unnamed columns instead of silently overwriting evidence',()=>{
 assert.throws(()=>parseCsv('tp, tp\n90,1\n'),/Duplicate/);
 assert.throws(()=>parseCsv('tp,\n90,1\n'),/Empty/);
});
test('different test IDs cannot be combined into a passing field result',()=>{
 const m=metrics();m[0].test_id='different-test';assert.equal(assessFieldEvidence(observations(),m).status,'INCOMPLETE');
});
