import assert from "node:assert/strict";
import { assessFrozenExecutionPathCoverage } from "../runtime.mjs";
import { fullSetup } from "../fixtures.mjs";

const setup = fullSetup();
const replay = setup.executionPathProbes.find((probe) => probe.path === "replay");
replay.observedTraceHash = "sha256:unrelated-replay";
const result = assessFrozenExecutionPathCoverage(setup);
assert.deepEqual(result.failures, ["inventoried_path_coverage_failed"]);
assert.ok(result.probeAudits.find((audit) => audit.path === "replay").failures.includes("path_observation_not_linked_to_block_trace"));
console.log(JSON.stringify({ ok: true, failure: result.failures[0], failedPath: "replay" }));
