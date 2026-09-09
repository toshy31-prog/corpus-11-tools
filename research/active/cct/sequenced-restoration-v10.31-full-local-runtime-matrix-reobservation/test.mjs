import test from "node:test";
import assert from "node:assert/strict";
import { assessFullLocalRuntimeMatrixReobservation } from "./runtime.mjs";
import { fullSetup } from "./fixtures.mjs";

test("locally executes all twelve class-window cells", () => {
  const result = assessFullLocalRuntimeMatrixReobservation(fullSetup());
  assert.equal(result.status, "full_local_runtime_matrix_reobservation_candidate");
  assert.equal(result.locallyReobservedCells, 12);
  assert.equal(result.allDeclaredCellsLocallyReobserved, true);
  assert.equal(result.processIsolationEstablished, false);
});

test("a locally easier privileged path invalidates its pair", () => {
  const setup = fullSetup();
  setup.expectedFullLocalMatrix.find((item) => item.sentinelId === "sentinel-privileged-rotation").requiredPrivilege = "none";
  const result = assessFullLocalRuntimeMatrixReobservation(setup);
  assert.deepEqual(result.failures, ["local_runtime_matrix_cell_mismatch"]);
});

test("an incomplete expected matrix cannot be called full", () => {
  const setup = fullSetup();
  setup.expectedFullLocalMatrix.pop();
  const result = assessFullLocalRuntimeMatrixReobservation(setup);
  assert.ok(result.failures.includes("local_runtime_matrix_cell_count_mismatch"));
});
