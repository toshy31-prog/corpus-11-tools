import { readFileSync } from "node:fs";
import { assessContentAddressedExternalGateState } from "../sequenced-restoration-v10.33-content-addressed-external-gate-state/runtime.mjs";
import { createLocalGateComponent } from "../sequenced-restoration-v10.30-local-runtime-capture-reobservation/local-gate-harness.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));

export function assessGateConfigReadEffectReceipt(args, componentFactory = createLocalGateComponent) {
  const prior = assessContentAddressedExternalGateState(args);
  if (prior.status !== "content_addressed_external_gate_state_candidate") return prior;
  const component = componentFactory(true);
  const transitions = args.externalGateStateArtifacts.map((artifact) => {
    const config = JSON.parse(artifact.content);
    const receipt = component.applyConfig(config, artifact.contentHash);
    const attempt = component.attempt();
    const observation = { actorId: "synthetic-independent-transition-observer", observedConfigHash: attempt.loadedConfigHash, observedBlocked: attempt.blocked, observedPassed: attempt.passed };
    return { stateId: artifact.stateId, artifactHash: artifact.contentHash, receipt, attempt, observation };
  });
  const failures = [];
  const expected = [{ before: true, after: false, blocked: true, passed: false }, { before: false, after: true, blocked: false, passed: true }];
  transitions.forEach((transition, index) => {
    if (transition.receipt.loadedConfigHash !== transition.artifactHash || transition.attempt.loadedConfigHash !== transition.artifactHash || transition.observation.observedConfigHash !== transition.artifactHash) failures.push(`config_read_receipt_hash_mismatch_${transition.stateId}`);
    if (transition.receipt.before !== expected[index].before || transition.receipt.after !== expected[index].after) failures.push(`gate_transition_mismatch_${transition.stateId}`);
    if (transition.observation.observedBlocked !== expected[index].blocked || transition.observation.observedPassed !== expected[index].passed) failures.push(`gate_effect_mismatch_${transition.stateId}`);
    if (transition.observation.actorId === transition.receipt.actorId) failures.push("transition_observer_not_distinct");
  });
  if (failures.length) return { status: "not_established", failures, transitions };
  return { ...prior, status: SPEC.successStatus, evidenceLevel: "stateful_component_config_read_and_observed_effect", transitions, bothConfigReadsLinkedToEffects: true, observerDistinctByDeclaredActor: true, processIsolationEstablished: false, productionComponentIdentityEstablished: false, notEstablished: SPEC.notEstablished };
}
