import test from 'node:test';
import assert from 'node:assert/strict';
import {createSourceRegistry} from '../lib/multisource-source-registry.mjs';
const now = () => Date.parse('2026-09-27T12:00:00Z');
const contract = () => ({version:1,scope:'global',mode:'merge',capabilities:['identity'],access:{status:'reviewed',verifiedAt:'2026-09-26T00:00:00Z',evidence:'fixture:access-review'},storage:{status:'reviewed',verifiedAt:'2026-09-26T00:00:00Z',evidence:'fixture:storage-review',retention:'ephemeral'}});
const source = (id, admission) => ({id,resolve:async()=>({candidates:[]}),admission});
test('legacy unchanged, explicit unknown admission denied',()=>{
 const r=createSourceRegistry({now}).register({id:'legacy',resolve(){}});
 for(const [i,a] of [undefined,null,{}, {version:2}].entries())r.register(source(`denied${i}`,a));
 assert.deepEqual(r.list().map(s=>s.id),['legacy']);
 assert.equal(r.get('legacy').admission.status,'legacy');
 assert.equal(r.get('denied0').enabled,false);
});
test('candidate-only and private contracts never reach default merge listing',()=>{
 const r=createSourceRegistry({now});
 r.register(source('merge',contract()));
 r.register(source('candidate',{...contract(),mode:'candidateOnly'}));
 r.register(source('private',{...contract(),scope:'private'}));
 assert.deepEqual(r.list().map(s=>s.id),['merge']);
 assert.deepEqual(r.list({purpose:'candidates'}).map(s=>s.id),['candidate','merge']);
 assert.deepEqual(r.list({scope:'private'}).map(s=>s.id),['private']);
 assert.deepEqual(r.list({capability:'playback'}),[]);
 assert.deepEqual(r.list({scope:'unknown'}),[]);
});
test('incomplete access/storage, future review and unknown capabilities fail closed',()=>{
 const variants=[{scope:'unknown'},{mode:'unknown'},{capabilities:['unknown']},{capabilities:[]},{access:{}},{storage:{}},{access:{...contract().access,evidence:' '}},{access:{...contract().access,verifiedAt:'2099-01-01'}},{storage:{...contract().storage,retention:'forever'}}];
 for(const changes of variants){const r=createSourceRegistry({now}).register(source('x',{...contract(),...changes}));assert.equal(r.get('x').admission.status,'denied');assert.deepEqual(r.list({purpose:'candidates'}),[]);}
});
test('recorded admission is immutable and does not retain caller mutable arrays',()=>{
 const a=contract(),r=createSourceRegistry({now}).register(source('x',a));
 a.capabilities.push('playback');a.storage.evidence='changed';
 assert.deepEqual(r.get('x').admission.capabilities,['identity']);
 assert.equal(r.get('x').admission.storage.evidence,'fixture:storage-review');
 assert.throws(()=>{r.get('x').admission.mode='candidateOnly';},TypeError);
});
test('get and list cannot replace opt-in admission to bypass global merge filtering',()=>{
 const r=createSourceRegistry({now}).register(source('private',{...contract(),scope:'private',mode:'candidateOnly'}));
 const fromGet=r.get('private');
 const fromList=r.list({scope:'private',purpose:'candidates'})[0];
 for(const entry of [fromGet,fromList]){
   assert.throws(()=>{entry.admission={status:'legacy'};},TypeError);
   assert.throws(()=>{entry.enabled=true;},TypeError);
 }
 assert.deepEqual(r.list(),[]);
 assert.equal(r.get('private').admission.scope,'private');
 assert.equal(r.get('private').admission.mode,'candidateOnly');
});
