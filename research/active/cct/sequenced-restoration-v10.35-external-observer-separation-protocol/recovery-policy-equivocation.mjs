import { createHash } from "node:crypto";
import { verifyRecoveryPolicyTransition } from "./recovery-policy-transition.mjs";
const digest = value => `sha256:${createHash("sha256").update(value).digest("hex")}`;
export const detectRecoveryPolicyEquivocation = (left, leftNextPolicy, right, rightNextPolicy, previousPolicy) => {
  const leftValid = verifyRecoveryPolicyTransition(left, previousPolicy, leftNextPolicy).ok;
  const rightValid = verifyRecoveryPolicyTransition(right, previousPolicy, rightNextPolicy).ok;
  const sameDecisionPoint = left?.previousPolicyDigest === right?.previousPolicyDigest && left?.replacedId === right?.replacedId && left?.effectiveAfterStatusGeneration === right?.effectiveAfterStatusGeneration;
  const conflictingSuccessors = left?.nextPolicyDigest !== right?.nextPolicyDigest || left?.nextKeyDigest !== right?.nextKeyDigest;
  return { ok: leftValid && rightValid, equivocation: leftValid && rightValid && sameDecisionPoint && conflictingSuccessors, sameDecisionPoint, conflictingSuccessors, leftTransitionDigest: digest(`${JSON.stringify(left)}\n`), rightTransitionDigest: digest(`${JSON.stringify(right)}\n`) };
};
