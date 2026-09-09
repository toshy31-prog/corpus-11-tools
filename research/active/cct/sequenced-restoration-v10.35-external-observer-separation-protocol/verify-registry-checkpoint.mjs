import { createHash, createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";

const [registryPath, checkpointPath, publicKeyPath] = process.argv.slice(2);
if (!registryPath || !checkpointPath || !publicKeyPath) {
  process.stderr.write("usage: node verify-registry-checkpoint.mjs REGISTRY CHECKPOINT PUBLIC_KEY\n");
  process.exit(2);
}
const registry = JSON.parse(readFileSync(registryPath, "utf8"));
const checkpoint = JSON.parse(readFileSync(checkpointPath, "utf8"));
const digest = value => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const registryBody = { schema: registry.schema, generation: registry.generation, records: registry.records };
const body = {
  schema: checkpoint.schema,
  registryStateDigest: checkpoint.registryStateDigest,
  generation: checkpoint.generation,
  totalRecords: checkpoint.totalRecords,
  previousCheckpointDigest: checkpoint.previousCheckpointDigest,
};
const checks = {
  schema: checkpoint.schema === "cct-replay-registry-checkpoint/v1",
  registryIntegrity: registry.schema === "cct-persistent-replay-registry/v1" && registry.stateDigest === digest(JSON.stringify(registryBody)),
  signature: verify(null, Buffer.from(JSON.stringify(body)), createPublicKey(readFileSync(publicKeyPath)), Buffer.from(checkpoint.signatureBase64, "base64")),
  stateDigest: registry.stateDigest === checkpoint.registryStateDigest,
  generation: registry.generation === checkpoint.generation,
  totalRecords: registry.records.length === checkpoint.totalRecords,
};
const ok = Object.values(checks).every(Boolean);
process.stdout.write(`${JSON.stringify({ ok, checks, generation: checkpoint.generation, totalRecords: checkpoint.totalRecords })}\n`);
if (!ok) process.exitCode = 1;
