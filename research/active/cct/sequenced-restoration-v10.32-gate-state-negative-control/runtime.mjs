import { readFileSync } from "node:fs";
import { assessFullLocalRuntimeMatrixReobservation } from "../sequenced-restoration-v10.31-full-local-runtime-matrix-reobservation/runtime.mjs";
import { runLocalGateMatrix } from "../sequenced-restoration-v10.30-local-runtime-capture-reobservation/local-gate-harness.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));

export function assessGateStateNegativeControl(args, runner = runLocalGateMatrix) {
  const prior = assessFullLocalRuntimeMatrixReobservation(args);
  if (prior.status !== "full_local_runtime_matrix_reobservation_candidate") return prior;
  const disabled = runner(false);
  const enabled = runner(true);
  const failures = [];
  if (disabled.length !== SPEC.expectedCellsPerState || enabled.length !== SPEC.expectedCellsPerState) failures.push("negative_control_cell_count_mismatch");
  const transitionAudits = disabled.map((off, index) => {
    const on = enabled[index];
    const cellFailures = [];
    if (off.sentinelId !== on?.sentinelId) cellFailures.push("state_pair_identity_mismatch");
    if (!(off.blocked === true && off.passed === false)) cellFailures.push("disabled_gate_did_not_block");
    if (!(on?.blocked === false && on?.passed === true)) cellFailures.push("enabled_gate_did_not_pass");
    return { sentinelId: off.sentinelId, failures: cellFailures };
  });
  if (transitionAudits.some((audit) => audit.failures.length)) failures.push("gate_state_discrimination_failed");
  if (failures.length) return { status: "not_established", failures, transitionAudits };
  return { ...prior, status: SPEC.successStatus, evidenceLevel: "paired_disabled_enabled_gate_negative_control", transitionAudits, allCellsDiscriminateGateState: true, alwaysBlockedInstrumentRejected: true, productionGateCouplingEstablished: false, notEstablished: SPEC.notEstablished };
}
