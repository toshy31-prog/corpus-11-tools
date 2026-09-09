import { fullSetup as parentSetup } from "../sequenced-restoration-v10.22-upheld-challenge-quorum-recalculation/fixtures.mjs";

export function effectChain() {
  return [
    { eventType: "suspension_authorized", actorId: "synthetic-authorizer", at: "2026-01-02T01:00:00.000Z", traceHash: "sha256:authorization" },
    { eventType: "command_received", actorId: "synthetic-gate-operator", at: "2026-01-02T01:01:00.000Z", traceHash: "sha256:receipt" },
    { eventType: "gate_disabled", actorId: "synthetic-gate-operator", at: "2026-01-02T01:02:00.000Z", traceHash: "sha256:disable" },
    { eventType: "execution_attempt_blocked", actorId: "synthetic-probe", at: "2026-01-02T01:03:00.000Z", traceHash: "sha256:blocked-attempt", attemptedCapability: "authority_quorum" },
    { eventType: "independent_effect_observed", actorId: "synthetic-independent-observer", at: "2026-01-02T01:04:00.000Z", traceHash: "sha256:observation", observedTraceHash: "sha256:blocked-attempt" },
  ];
}

export function fullSetup(overrides = {}) {
  return { ...parentSetup(), suspensionCommandId: "suspend-quorum-1", suspensionEffectChain: effectChain(), ...overrides };
}
