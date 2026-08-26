import assert from "node:assert/strict";
import test from "node:test";
import { execute } from "./run_campaign.mjs";
import { cctStressContenders } from "./scenario.mjs";

test("adversarial CCT worlds are matched, blinded, and multidimensional", () => {
  const { publicReport, identityMap } = execute();
  assert.equal(publicReport.worlds.length, 6);
  assert.equal(Object.keys(identityMap).length, cctStressContenders.length);
  for (const world of publicReport.worlds) {
    const serialized = JSON.stringify(world.report);
    for (const contender of cctStressContenders) assert.equal(serialized.includes(contender.manifest.id), false);
    assert.equal(world.report.runs.every((run) => JSON.stringify(run.baseline) === JSON.stringify(world.report.matchedBaseline)), true);
    assert.equal(world.report.runs.every((run) => !Object.hasOwn(run.outcomes, "winner")), true);
    assert.equal(world.report.runs.every((run) => Object.values(run.outcomes).every(Number.isFinite)), true);
  }
});

test("the candidate can lose and the loss rule is executable", () => {
  const { publicReport } = execute();
  assert.equal(publicReport.candidate_review.length, 6);
  assert.ok(publicReport.candidate_failure_worlds.length > 0);
  assert.ok(publicReport.candidate_review.some((item) => item.failed_dimensions.length > 0));
});
