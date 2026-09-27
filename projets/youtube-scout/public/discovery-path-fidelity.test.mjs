import test from "node:test";
import assert from "node:assert/strict";
import { summarizeDiscoveryFrontier, convergeDiscoveryCandidates } from "./discovery-frontier.mjs";
import { SCOUT_DIRECTIONS } from "./scout-parameters.mjs";

const candidate = (direction, from, to) => ({ direction, target: { id: `target:${direction}`, type: "track" },
  status: "candidate", steps: [{ from: { id: from }, relation: "published_by", to: { id: to } }] });

test("SYNTHETIC: delimiter-bearing IDs never collapse two distinct paths across eight routes", () => {
  const branches = SCOUT_DIRECTIONS.map(({ id }) => {
    const a = candidate(id, `${id}>published_by>b`, "c");
    const b = candidate(id, id, "b>published_by>c");
    return { direction: id, candidates: [a, b, structuredClone(a)] };
  });
  const before = structuredClone(branches), summary = summarizeDiscoveryFrontier(branches);
  assert.equal(summary.distinctPaths, 16);
  for (const { id } of SCOUT_DIRECTIONS) {
    assert.equal(summary.byDirection[id].paths, 2);
    const converged = convergeDiscoveryCandidates(branches.find(b => b.direction === id).candidates);
    assert.equal(converged.length, 1);
    assert.equal(converged[0].provenance.length, 2);
    assert.equal(converged[0].status, "candidate");
  }
  assert.deepEqual(branches, before);
});

test("SYNTHETIC: empty paths remain absent and cyclic/long paths are reported, not silently certified or trimmed", () => {
  const steps = Array.from({ length: 10 }, (_, i) => ({ from: { id: `${i % 2}` }, relation: "related", to: { id: `${(i + 1) % 2}` } }));
  const branch = { direction: "label", candidates: [{ target: { id: "empty" } }, { target: { id: "cycle" }, steps }] };
  const before = structuredClone(branch);
  const summary = summarizeDiscoveryFrontier([branch], { depth: 6 });
  assert.equal(summary.distinctPaths, 1);
  assert.equal(summary.maxObservedDepth, 10);
  assert.equal(summary.depthLimit, 6);
  assert.deepEqual(branch, before);
  assert.equal("valid" in summary, false);
});
