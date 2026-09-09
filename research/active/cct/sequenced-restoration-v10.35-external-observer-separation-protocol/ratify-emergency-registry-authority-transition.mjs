import { createHash, createPrivateKey, createPublicKey, sign } from "node:crypto";
import { readFileSync } from "node:fs";
import { atomicReplaceDurable } from "./atomic-replace.mjs";

const [transitionPath, policyPath, firstId, firstPrivateKeyPath, secondId, secondPrivateKeyPath, outputPath] = process.argv.slice(2);
if (!outputPath) {
  process.stderr.write("usage: node ratify-emergency-registry-authority-transition.mjs TRANSITION POLICY RATIFIER1_ID PRIVATE_KEY RATIFIER2_ID PRIVATE_KEY OUTPUT\n");
  process.exit(2);
}
const digest = value => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const keyDigest = key => digest(createPublicKey(key).export({ type: "spki", format: "der" }));
const transitionText = readFileSync(transitionPath, "utf8");
const transition = JSON.parse(transitionText);
const policyText = readFileSync(policyPath, "utf8");
const policy = JSON.parse(policyText);
const signers = [[firstId, firstPrivateKeyPath], [secondId, secondPrivateKeyPath]].map(([id, path]) => ({ id, key: createPrivateKey(readFileSync(path)) }));
if (transition.schema !== "cct-emergency-registry-authority-transition/v1" || policy.schema !== "cct-registry-recovery-policy/v1" ||
    transition.recoveryPolicyDigest !== digest(policyText) || firstId === secondId) throw new Error("ratification inputs invalid");
for (const signer of signers) {
  const admitted = policy.ratifiers?.find(value => value.id === signer.id);
  if (!admitted || admitted.keyDigest !== keyDigest(signer.key)) throw new Error("ratifier not admitted by policy");
}
const body = {
  schema: "cct-emergency-transition-ratification/v1", transitionDigest: digest(transitionText),
  recoveryPolicyDigest: transition.recoveryPolicyDigest, previousAnchorReceiptDigest: transition.previousAnchorReceiptDigest,
  nextRegistryKeyDigest: transition.nextRegistryKeyDigest, compromiseEvidenceDigest: transition.compromiseEvidenceDigest,
  ratifierIds: signers.map(value => value.id), ratifiedAtMs: Date.now()
};
const payload = Buffer.from(JSON.stringify(body));
atomicReplaceDurable(outputPath, `${JSON.stringify({ ...body, signaturesBase64: signers.map(value => sign(null, payload, value.key).toString("base64")) })}\n`);
