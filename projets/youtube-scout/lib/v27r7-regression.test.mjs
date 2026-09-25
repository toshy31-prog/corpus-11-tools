import test from "node:test";
import assert from "node:assert/strict";
import { runtimeRecordingPlan, primaryRuntimeQuery } from "./recording-resolution-runtime.mjs";
test("V2.7R7 Nexxor caller projection", () => {
  const q=primaryRuntimeQuery(runtimeRecordingPlan({title: '\"Time Travel\" - Nexxor - Statik Travel 21', artist:"Nexxor", durationSeconds:370}));
  assert.equal(q.artist,"Nexxor"); assert.equal(q.title,"Time Travel"); assert.equal(q.kind,"runtime_caller_artist_projection");
});
test("V2.7R7 caller projection is query only", () => {
  const q=primaryRuntimeQuery(runtimeRecordingPlan({title:"Track - Artist B - CAT001",artist:"Artist B"}));
  assert.equal(q.artist,"Artist B"); assert.equal(q.title,"Track"); assert.equal(Object.prototype.hasOwnProperty.call(q,"externalIds"),false);
});