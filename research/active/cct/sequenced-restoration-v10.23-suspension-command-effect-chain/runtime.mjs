import { readFileSync } from "node:fs";
import { assessUpheldChallengeQuorumRecalculation } from "../sequenced-restoration-v10.22-upheld-challenge-quorum-recalculation/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));

export function assessSuspensionCommandEffectChain(args) {
  const prior = assessUpheldChallengeQuorumRecalculation(args);
  if (prior.status !== "upheld_challenge_quorum_recalculation_candidate") return prior;
  if (prior.requiredAction !== "suspend_authority_quorum") return { ...prior, status: SPEC.successStatus, strongestEstablishedLink: "suspension_not_required", suspensionEffectEstablished: false };
  const events = args.suspensionEffectChain ?? [];
  const failures = [];
  if (JSON.stringify(events.map((event) => event.eventType)) !== JSON.stringify(SPEC.requiredEventTypes)) failures.push("command_effect_sequence_incomplete_or_reordered");
  if (events.some((event, index) => index > 0 && !(events[index - 1].at < event.at))) failures.push("command_effect_time_order_invalid");
  if (events.some((event) => !event.traceHash)) failures.push("command_effect_trace_missing");
  const blocked = events.find((event) => event.eventType === "execution_attempt_blocked");
  const observed = events.find((event) => event.eventType === "independent_effect_observed");
  if (blocked?.attemptedCapability !== "authority_quorum") failures.push("wrong_capability_blocked");
  if (observed?.observedTraceHash !== blocked?.traceHash) failures.push("observer_not_linked_to_blocked_attempt");
  if (observed?.actorId === events.find((event) => event.eventType === "gate_disabled")?.actorId) failures.push("effect_observer_not_independent_of_executor");
  if (failures.length) {
    const observerFailed = failures.includes("observer_not_linked_to_blocked_attempt") || failures.includes("effect_observer_not_independent_of_executor");
    const strongestEstablishedLink = blocked ? "execution_attempt_blocked" : (events.findLast?.((event) => event.traceHash)?.eventType ?? "none");
    return { status: "not_established", failures, strongestEstablishedLink: observerFailed ? "execution_attempt_blocked" : strongestEstablishedLink };
  }
  return { ...prior, status: SPEC.successStatus, evidenceLevel: "ordered_command_to_blocked_attempt_trace", strongestEstablishedLink: "independent_effect_observed", suspensionEffectEstablished: true, allExecutionPathsBlocked: false, institutionalEnforcementEstablished: false, notEstablished: SPEC.notEstablished };
}
