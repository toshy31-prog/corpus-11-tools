import assert from "node:assert/strict";
import { assessFullLocalRuntimeMatrixReobservation } from "../runtime.mjs";
import { fullSetup } from "../fixtures.mjs";

const setup = fullSetup();
setup.expectedFullLocalMatrix.find((item) => item.sentinelId === "sentinel-delayed_activation-steady_state").activationDelayMs = 0;
const result = assessFullLocalRuntimeMatrixReobservation(setup);
assert.deepEqual(result.failures, ["local_runtime_matrix_cell_mismatch"]);
assert.deepEqual(result.cellAudits.find((item) => item.sentinelId === "sentinel-delayed_activation-steady_state").mismatchedFields, ["activationDelayMs"]);
console.log(JSON.stringify({ ok: true, failure: result.failures[0], failedCell: "delayed_activation×steady_state" }));
