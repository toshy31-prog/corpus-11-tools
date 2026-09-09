import { createHash, createPublicKey, verify } from "node:crypto";
const digest = value => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const body = value => ({ schema: value.schema, registryStateDigest: value.registryStateDigest, previousAuthorityKeyDigest: value.previousAuthorityKeyDigest, nextAuthorityKeyDigest: value.nextAuthorityKeyDigest, effectiveGeneration: value.effectiveGeneration });
export const detectSourceStatusAuthorityEquivocation = (left, leftNextKeyPem, right, rightNextKeyPem, previousKeyPem) => {
  let previousKey, leftNextKey, rightNextKey;
  try { previousKey = createPublicKey(previousKeyPem); leftNextKey = createPublicKey(leftNextKeyPem); rightNextKey = createPublicKey(rightNextKeyPem); } catch { return { ok: false, equivocation: false, reason: "invalid_key" }; }
  const valid = (value, nextKey) => { const payload = Buffer.from(JSON.stringify(body(value))); return value.schema === "cct-source-status-authority-transition/v1" && value.previousAuthorityKeyDigest === digest(previousKey.export({ type: "spki", format: "der" })) && value.nextAuthorityKeyDigest === digest(nextKey.export({ type: "spki", format: "der" })) && verify(null, payload, previousKey, Buffer.from(value.previousSignatureBase64 ?? "", "base64")) && verify(null, payload, nextKey, Buffer.from(value.nextSignatureBase64 ?? "", "base64")); };
  const bothValid = valid(left, leftNextKey) && valid(right, rightNextKey);
  const sameDecisionPoint = left.registryStateDigest === right.registryStateDigest && left.previousAuthorityKeyDigest === right.previousAuthorityKeyDigest && left.effectiveGeneration === right.effectiveGeneration;
  const conflictingSuccessors = left.nextAuthorityKeyDigest !== right.nextAuthorityKeyDigest;
  return { ok: bothValid, equivocation: bothValid && sameDecisionPoint && conflictingSuccessors, sameDecisionPoint, conflictingSuccessors, leftTransitionDigest: digest(`${JSON.stringify(left)}\n`), rightTransitionDigest: digest(`${JSON.stringify(right)}\n`) };
};
