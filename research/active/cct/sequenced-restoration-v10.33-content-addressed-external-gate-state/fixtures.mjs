import { createHash } from "node:crypto";
import { fullSetup as parentSetup } from "../sequenced-restoration-v10.32-gate-state-negative-control/fixtures.mjs";

const hash = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;

export function gateStateArtifacts() {
  const disabled = JSON.stringify({ schema: "cct-local-gate-state/v1", authorityQuorumEnabled: false });
  const enabled = JSON.stringify({ schema: "cct-local-gate-state/v1", authorityQuorumEnabled: true });
  return [
    { stateId: "disabled", content: disabled, contentHash: hash(disabled) },
    { stateId: "enabled", content: enabled, contentHash: hash(enabled) },
  ];
}

export function fullSetup(overrides = {}) {
  return { ...parentSetup(), externalGateStateArtifacts: gateStateArtifacts(), ...overrides };
}
