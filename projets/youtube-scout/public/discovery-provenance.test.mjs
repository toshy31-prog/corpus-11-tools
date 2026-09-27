import test from "node:test";
import assert from "node:assert/strict";
import { convergeDiscoveryCandidates } from "./discovery-frontier.mjs";

const candidate = (direction, source = "label:a") => ({
  target: { id: "track:x", type: "track" }, direction, signature: "target:x",
  steps: [{ from: { id: source }, relation: "publishes", to: { id: "track:x" }, evidence: ["catalogue"] }]
});

test("replaying the exact same route does not multiply explanations", () => {
  const a = candidate("label");
  const original = structuredClone(a);
  const [merged] = convergeDiscoveryCandidates([a, structuredClone(a), a]);
  assert.equal(merged.provenance.length, 1);
  assert.deepEqual(a, original);
});

test("same target signature preserves distinct paths and directions", () => {
  const [merged] = convergeDiscoveryCandidates([candidate("label"), candidate("label", "label:b"), candidate("compilation")]);
  assert.equal(merged.provenance.length, 3);
  assert.deepEqual(new Set(merged.directions), new Set(["label", "compilation"]));
});

test("new evidence for the same path is retained without merging graph identities", () => {
  const a = candidate("label");
  const b = structuredClone(a);
  b.steps[0].evidence = ["second-source"];
  const other = structuredClone(a);
  other.target.id = "track:y";
  const merged = convergeDiscoveryCandidates([a, b, other]);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].provenance.length, 2);
});
