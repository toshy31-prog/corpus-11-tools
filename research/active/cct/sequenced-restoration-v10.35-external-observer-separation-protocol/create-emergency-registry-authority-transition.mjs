import { createHash, createPrivateKey, createPublicKey, sign } from "node:crypto";
import { readFileSync } from "node:fs";
import { atomicReplaceDurable } from "./atomic-replace.mjs";

const [statePath, checkpointPath, nextPrivateKeyPath, policyPath, firstId, firstPrivateKeyPath, secondId, secondPrivateKeyPath, evidencePath, outputPath] = process.argv.slice(2);
if (!outputPath) {
  process.stderr.write("usage: node create-emergency-registry-authority-transition.mjs STATE CHECKPOINT NEXT_PRIVATE_KEY POLICY SIGNER1_ID SIGNER1_PRIVATE_KEY SIGNER2_ID SIGNER2_PRIVATE_KEY EQUIVOCATION_EVIDENCE OUTPUT\n");
  process.exit(2);
}
const digest = value => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const keyDigest = key => digest(createPublicKey(key).export({ type: "spki", format: "der" }));
const state = JSON.parse(readFileSync(statePath, "utf8"));
const checkpoint = JSON.parse(readFileSync(checkpointPath, "utf8"));
const policyText = readFileSync(policyPath, "utf8");
const policy = JSON.parse(policyText);
const nextKey = createPrivateKey(readFileSync(nextPrivateKeyPath));
const signers = [[firstId, firstPrivateKeyPath], [secondId, secondPrivateKeyPath]].map(([id, path]) => ({ id, key: createPrivateKey(readFileSync(path)) }));
if (state.schema !== "cct-monotonic-anchor-state/v2" || state.recoveryPolicyDigest !== digest(policyText) ||
    policy.schema !== "cct-registry-recovery-policy/v1" || policy.threshold !== 2 || firstId === secondId ||
    checkpoint.previousCheckpointDigest !== state.checkpointDigest || checkpoint.generation <= state.generation ||
    !evidencePath) throw new Error("emergency transition inputs invalid");
for (const signer of signers) {
  const member = policy.members.find(value => value.id === signer.id);
  if (!member || member.keyDigest !== keyDigest(signer.key)) throw new Error("recovery signer not admitted by policy");
}
const body = {
  schema: "cct-emergency-registry-authority-transition/v1", checkpointSchema: checkpoint.schema,
  previousRegistryKeyDigest: state.registryKeyDigest, nextRegistryKeyDigest: keyDigest(nextKey),
  previousAnchorReceiptDigest: state.receiptDigest, previousCheckpointDigest: state.checkpointDigest,
  effectiveGeneration: checkpoint.generation, recoveryPolicyDigest: state.recoveryPolicyDigest,
  compromiseEvidenceDigest: digest(readFileSync(evidencePath, "utf8")), recoverySignerIds: signers.map(value => value.id)
};
const payload = Buffer.from(JSON.stringify(body));
const value = { ...body, recoverySignaturesBase64: signers.map(value => sign(null, payload, value.key).toString("base64")), nextSignatureBase64: sign(null, payload, nextKey).toString("base64") };
atomicReplaceDurable(outputPath, `${JSON.stringify(value)}\n`);
