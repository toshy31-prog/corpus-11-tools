import assert from "node:assert/strict";
import { assessLocalRuntimeCaptureReobservation } from "../runtime.mjs";
import { fullSetup } from "../fixtures.mjs";

const setup = fullSetup();
setup.expectedLocalCapture.entryCount = 2;
const result = assessLocalRuntimeCaptureReobservation(setup);
assert.ok(result.failures.includes("local_capture_mismatch_entryCount"));
console.log(JSON.stringify({ ok: true, failure: "local_capture_mismatch_entryCount", actualEntryCount: result.capture.entryCount }));
