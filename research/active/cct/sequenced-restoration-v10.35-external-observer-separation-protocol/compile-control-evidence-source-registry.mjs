import { createHash, createPublicKey } from "node:crypto";
import { readFileSync } from "node:fs";
import { atomicReplaceDurable } from "./atomic-replace.mjs";

const [inputPath, outputPath] = process.argv.slice(2);
if (!outputPath) {
  process.stderr.write("usage: node compile-control-evidence-source-registry.mjs INPUT OUTPUT\n");
  process.exit(2);
}
const digest = value => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const input = JSON.parse(readFileSync(inputPath, "utf8"));
if (!input.statusAuthorityPublicKeyPath) throw new Error("status authority public key required");
const statusAuthorityKey = createPublicKey(readFileSync(input.statusAuthorityPublicKeyPath));
const statusAuthorityKeyDigest = digest(statusAuthorityKey.export({ type: "spki", format: "der" }));
const sources = input.sources.map(value => {
  const key = createPublicKey(readFileSync(value.publicKeyPath));
  if (!value.networkOperatorId || !value.networkFailureDomain) throw new Error("source network operator and failure domain required");
  return { sourceId: value.sourceId, controllerId: value.controllerId, failureDomain: value.failureDomain, networkOperatorId: value.networkOperatorId, networkFailureDomain: value.networkFailureDomain, publicKeyPem: key.export({ type: "spki", format: "pem" }).toString(), keyDigest: digest(key.export({ type: "spki", format: "der" })) };
});
if (sources.length < 10 || new Set(sources.map(value => value.sourceId)).size !== sources.length || new Set(sources.map(value => value.keyDigest)).size !== sources.length) throw new Error("source registry invalid");
const body = { schema: "cct-control-evidence-source-registry/v1", statusAuthorityKeyDigest, sources };
atomicReplaceDurable(outputPath, `${JSON.stringify({ ...body, stateDigest: digest(JSON.stringify(body)) })}\n`);
