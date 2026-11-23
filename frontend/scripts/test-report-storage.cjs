const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/lib/utils/reportStorage.ts'), 'utf8');
const code = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
function setup(blockLocal = false, blockSession = false) {
  const local = new Map(), session = new Map(), events = [];
  const storage = (data, blocked) => ({getItem: k => {if (blocked) throw Error('blocked'); return data.get(k) ?? null;}, setItem: (k,v) => {if (blocked) throw Error('blocked'); data.set(k,v);}, removeItem: k => {if (blocked) throw Error('blocked');data.delete(k);}});
  const exports = {};
  const window = {localStorage: storage(local, blockLocal), sessionStorage: storage(session, blockSession), dispatchEvent: e => events.push(e.type)};
  vm.runInNewContext(code, {exports, window, Event: class {constructor(type){this.type=type;}}, queueMicrotask: f => f(), console});
  return {api: exports, local, session, events};
}
const mix = {cement:350,water:175,blastFurnaceSlag:0,flyAsh:0,superplasticizer:2.5,coarseAggregate:1040,fineAggregate:760,ageDays:28};
let t = setup();
t.api.saveLastReport({createdAt:'2026-11-23T00:00:00Z',mix,strength:{predictedStrengthMPa:42,modelVersion:'grouped-v1'},cost:{currency:'USD',totalCostPerM3:12,isComplete:false},provenance:{model_sha256:'fixture-hash',effective_unit_costs:{cement:.12}},request:{mix},search:{seed:42,candidate_budget:64}});
let report = t.api.readSavedReport();
assert.equal(report.strength.predictedStrengthMPa,42);
assert.equal(report.cost,undefined);
assert.equal(report.knownSubtotals.cost,12);
assert.equal(report.search.seed,42);
assert.equal(report.provenance.model_sha256,'fixture-hash');
assert.ok(t.events.includes('astramix-report-updated'));
let saved = t.local.get('astramix:report:v2');
let reopened = setup();reopened.local.set('astramix:report:v2', saved);
assert.equal(reopened.api.readSavedReport().request.mix.ageDays,28);
reopened.api.clearSavedReport();assert.equal(Object.keys(reopened.api.readSavedReport()).length,0);
t = setup();t.session.set('astramix:report',JSON.stringify({strength:{mix,predictedStrengthMPa:33,modelUsed:'old'}}));
assert.equal(t.api.readSavedReport().provenanceStatus,'legacy_missing');
t = setup(true,true);t.api.persistReport({createdAt:'now',search:{seed:91}});assert.equal(t.api.readSavedReport().search.seed,91);assert.ok(t.api.readSavedReport().storageNotice);
t = setup();t.local.set('astramix:report:v2','{broken');assert.ok(t.api.readSavedReport().storageNotice);
t = setup();t.local.set('astramix:report:v2',JSON.stringify({version:2,savedAt:1,data:{createdAt:'older'}}));t.session.set('astramix:report:v2',JSON.stringify({version:2,savedAt:2,data:{createdAt:'newer'}}));assert.equal(t.api.readSavedReport().createdAt,'newer');

t = setup();t.local.set('astramix:report:v2', saved);t.session.set('astramix:report', JSON.stringify({createdAt:'legacy'}));assert.equal(t.api.readSavedReport().provenanceStatus,'recorded');
t = setup();t.local.set('astramix:report:v2','{broken');t.session.set('astramix:report:v2',saved);assert.equal(t.api.readSavedReport().strength.predictedStrengthMPa,42);

t = setup();t.local.set('astramix:report:v2',JSON.stringify({version:2,data:{optimized:{mix:{},warnings:[]}}}));assert.ok(t.api.readSavedReport().storageNotice);
console.log('Report storage checks passed: round-trip, provenance, incomplete totals, legacy data, blocked storage, corrupted data, and fallback freshness.');
