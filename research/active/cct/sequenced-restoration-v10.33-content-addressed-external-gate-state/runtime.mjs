import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { assessGateStateNegativeControl } from "../sequenced-restoration-v10.32-gate-state-negative-control/runtime.mjs";
import { runLocalGateMatrixFromConfig } from "../sequenced-restoration-v10.30-local-runtime-capture-reobservation/local-gate-harness.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));
const hash = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;

export function assessContentAddressedExternalGateState(args) {
  const prior = assessGateStateNegativeControl(args);
  if (prior.status !== "gate_state_negative_control_candidate") return prior;
  const artifacts = args.externalGateStateArtifacts ?? [];
  const failures = [];
  if (JSON.stringify(artifacts.map((item) => item.stateId)) !== JSON.stringify(["disabled", "enabled"])) failures.push("external_gate_state_pair_mismatch");
  const parsed = artifacts.map((item) => {
    if (item.contentHash !== hash(item.content)) failures.push(`external_gate_state_hash_mismatch_${item.stateId}`);
    try { return JSON.parse(item.content); } catch { failures.push(`external_gate_state_invalid_json_${item.stateId}`); return null; }
  });
  if (parsed.some((item) => item?.schema !== SPEC.configSchema)) failures.push("external_gate_state_schema_mismatch");
  if (!(parsed[0]?.authorityQuorumEnabled === false && parsed[1]?.authorityQuorumEnabled === true)) failures.push("external_gate_states_not_opposed");
  let disabled = [], enabled = [];
  try { disabled = runLocalGateMatrixFromConfig(parsed[0]); enabled = runLocalGateMatrixFromConfig(parsed[1]); } catch { failures.push("external_gate_config_execution_failed"); }
  if (!disabled.every((item) => item.blocked && !item.passed) || !enabled.every((item) => !item.blocked && item.passed)) failures.push("external_gate_state_effect_mismatch");
  if (failures.length) return { status: "not_established", failures };
  return { ...prior, status: SPEC.successStatus, evidenceLevel: "sha256_bound_external_config_driven_gate_transition", externalStateControlsHarness: true, artifactHashes: artifacts.map((item) => item.contentHash), productionConfigurationOriginEstablished: false, productionGateCouplingEstablished: false, notEstablished: SPEC.notEstablished };
}
