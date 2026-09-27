import test from "node:test";
import assert from "node:assert/strict";
import { createIdentityCandidateIndex } from "./identity-candidate-index.mjs";
test("retrieves noisy names without ids or gold labels", () => {
  const index = createIdentityCandidateIndex([{id:"1",artist:"Múm",title:"Yesterday"},{id:"2",artist:"Other",title:"Tomorrow"}]);
  assert.equal(index.search({artist:"Mum",title:"Yesterda"})[0].candidate.id,"1");
  assert.deepEqual(index.search({artist:"",title:""}),[]);
});
test("deterministic ties and bounds", () => {
  const index = createIdentityCandidateIndex([{id:"b",artist:"A",title:"Song"},{id:"a",artist:"A",title:"Song"}]);
  assert.equal(index.search({artist:"A",title:"Song"},{k:1})[0].candidate.id,"a");
  assert.throws(() => index.search({}, {k:Infinity}));
  assert.throws(() => createIdentityCandidateIndex([{id:"a"},{id:"a"}]));
});
test("index snapshots candidates and rejects invalid identifier types", () => {
  const record={id:"a",artist:"Artist",title:"Before"};
  const index=createIdentityCandidateIndex([record]);
  record.title="After"; record.id="changed";
  const hit=index.search({artist:"Artist",title:"Before"})[0].candidate;
  assert.equal(hit.title,"Before"); assert.equal(hit.id,"a");
  assert.throws(()=>{hit.title="changed again";},TypeError);
  assert.throws(()=>createIdentityCandidateIndex([{id:1,title:"Same"}]),/nonempty strings/);
});
