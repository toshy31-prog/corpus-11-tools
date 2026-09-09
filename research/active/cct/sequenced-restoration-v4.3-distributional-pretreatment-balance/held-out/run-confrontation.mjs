import assert from "node:assert/strict";
import { assessDistributionalPretreatmentBalance } from "../runtime.mjs";
import { assessPretreatmentPlacebos } from "../../sequenced-restoration-v4.2-pretreatment-placebos/runtime.mjs";
import { audit, axes, completeExercise, recommitPretreatmentBalance } from "../fixtures.mjs";

const exercise = completeExercise();
const probe = exercise.crossSignalPerturbations[0].probes[0];
for (const cluster of probe.clusterAssignment.clusters) cluster.pretreatment.values.baseline_event_rate += 0.1;
for (const cluster of probe.clusterAssignment.clusters) {
  const high = cluster.pretreatment.values.dependency_load >= 0.1375;
  const direction = cluster.arm === "baseline" ? 1 : -1;
  cluster.pretreatment.values.baseline_event_rate += (high ? 0.04 : -0.04) * direction;
}
recommitPretreatmentBalance(exercise);

assert.equal(assessPretreatmentPlacebos(axes, audit, exercise).status, "bounded_pretreatment_placebo_candidate");
const result = assessDistributionalPretreatmentBalance(axes, audit, exercise);
assert.equal(result.status, "not_established");
assert.match(result.failures[0].details.join("\n"), /higher_dependency_load:baseline_event_rate/);
console.log("held-out confrontation: subgroup balance exposes opposing high- and low-exposure imbalances hidden by the aggregate mean");
