import { createHash, createPrivateKey, sign } from "node:crypto";
import { readFileSync } from "node:fs";
import { atomicReplaceDurable } from "./atomic-replace.mjs";

const [subjectId, subjectControllerId, subjectFailureDomain, sourceId, sourceControllerId, sourceFailureDomain, documentPath, upstreamJson, sourcePrivateKeyPath, outputPath] = process.argv.slice(2);
if (!outputPath) {
  process.stderr.write("usage: node create-recovery-control-evidence-attestation.mjs SUBJECT_ID SUBJECT_CONTROLLER SUBJECT_DOMAIN SOURCE_ID SOURCE_CONTROLLER SOURCE_DOMAIN DOCUMENT UPSTREAM_DIGESTS_JSON SOURCE_PRIVATE_KEY OUTPUT\n");
  process.exit(2);
}
const digest = value => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const upstreamDigests = JSON.parse(upstreamJson);
if (!Array.isArray(upstreamDigests) || new Set(upstreamDigests).size !== upstreamDigests.length || !upstreamDigests.every(value => /^sha256:[0-9a-f]{64}$/.test(value))) throw new Error("invalid upstream lineage");
const body = {
  schema: "cct-recovery-control-evidence-attestation/v1", subjectId, subjectControllerId, subjectFailureDomain,
  sourceId, sourceControllerId, sourceFailureDomain, documentDigest: digest(readFileSync(documentPath)),
  upstreamDigests: [...upstreamDigests].sort(), lineageComplete: true
};
const value = { ...body, signatureBase64: sign(null, Buffer.from(JSON.stringify(body)), createPrivateKey(readFileSync(sourcePrivateKeyPath))).toString("base64") };
atomicReplaceDurable(outputPath, `${JSON.stringify(value)}\n`);
