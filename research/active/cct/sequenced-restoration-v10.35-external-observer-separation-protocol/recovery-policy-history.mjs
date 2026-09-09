import { verifyRecoveryPolicyTransition } from "./recovery-policy-transition.mjs";
export const selectActiveRecoveryPolicy = (initialPolicy, transitions = [], successorPolicies = [], statusGeneration) => {
  if (!initialPolicy || !Array.isArray(transitions) || transitions.length !== successorPolicies.length || !Number.isSafeInteger(statusGeneration)) return { ok: false, activePolicy: null };
  let current = initialPolicy, previousEffect = -1, applied = 0;
  for (let index = 0; index < transitions.length; index++) {
    const transition = transitions[index], next = successorPolicies[index];
    if (transition.effectiveAfterStatusGeneration <= previousEffect || !verifyRecoveryPolicyTransition(transition, current, next).ok) return { ok: false, activePolicy: null };
    if (statusGeneration > transition.effectiveAfterStatusGeneration) { current = next; applied++; }
    else if (index < transitions.length - 1) return { ok: false, activePolicy: null };
    previousEffect = transition.effectiveAfterStatusGeneration;
  }
  return { ok: true, activePolicy: current, appliedTransitions: applied, pendingTransitions: transitions.length - applied };
};
