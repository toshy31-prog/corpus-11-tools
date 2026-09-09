import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { assessLocalRuntimeCaptureReobservation } from "../sequenced-restoration-v10.30-local-runtime-capture-reobservation/runtime.mjs";
import { runLocalGateMatrix } from "../sequenced-restoration-v10.30-local-runtime-capture-reobservation/local-gate-harness.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));
const hash = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;

export function assessFullLocalRuntimeMatrixReobservation(args) {
  const prior = assessLocalRuntimeCaptureReobservation(args);
  if (prior.status !== "local_runtime_capture_reobservation_candidate") return prior;
  const capture = runLocalGateMatrix();
  const expected = args.expectedFullLocalMatrix ?? [];
  const failures = [];
  if (capture.length !== SPEC.expectedCells || expected.length !== SPEC.expectedCells) failures.push("local_runtime_matrix_cell_count_mismatch");
  const cellAudits = expected.map((item, index) => {
    const actual = capture[index];
    const mismatchedFields = SPEC.matchedFields.filter((field) => actual?.[field] !== item[field]);
    if (actual?.attemptedCapability !== "authority_quorum") mismatchedFields.push("attemptedCapability");
    return { sentinelId: item.sentinelId, mismatchedFields, matches: mismatchedFields.length === 0 };
  });
  if (cellAudits.some((item) => !item.matches)) failures.push("local_runtime_matrix_cell_mismatch");
  if (failures.length) return { status: "not_established", failures, cellAudits, capture };
  const envelope = { capture, nodeVersion: process.version, platform: process.platform, architecture: process.arch };
  return { ...prior, status: SPEC.successStatus, evidenceLevel: "executed_full_local_module_matrix", locallyReobservedCells: capture.length, allDeclaredCellsLocallyReobserved: true, processIsolationEstablished: false, deployedRuntimeObservationEstablished: false, localMatrixEnvelopeHash: hash(JSON.stringify(envelope)), notEstablished: SPEC.notEstablished };
}
