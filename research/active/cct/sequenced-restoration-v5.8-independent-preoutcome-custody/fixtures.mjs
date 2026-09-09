import { generateKeyPairSync, sign } from "node:crypto";
import { audit, axes, completeExercise, validAmendment, validValidation as sourceValidation } from "../sequenced-restoration-v5.7-content-addressed-lineage/fixtures.mjs";
import { lineageDigest } from "../sequenced-restoration-v5.7-content-addressed-lineage/runtime.mjs";
import { custodyBundleDigest } from "./runtime.mjs";

export { audit, axes, completeExercise, validAmendment };

function custodian(digest, suffix) {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  return { custodianId: `custodian-${suffix}`, controller: `custody-controller-${suffix}`, failureDomain: `custody-domain-${suffix}`,
    recordedAtTick: 6, algorithm: "ed25519", publicKeyDer: publicKey.export({ format: "der", type: "spki" }).toString("base64"),
    signature: sign(null, Buffer.from(digest), privateKey).toString("base64") };
}

export function validValidation() {
  const validation = sourceValidation();
  const digest = custodyBundleDigest(validation);
  validation.lineageCustody = { schema: "cct-lineage-custody-record/v1", bundleDigest: digest,
    attestations: [custodian(digest, "a"), custodian(digest, "b")] };
  return validation;
}

export function postCustodyRewrite() {
  const validation = validValidation();
  const artifact = validation.transportAudit.targetContexts[0].lineageCommitments.rawData;
  artifact.content += "-rewritten";
  artifact.digest = lineageDigest(artifact.content);
  return validation;
}
