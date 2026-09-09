import { createHash, createPrivateKey, sign } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { atomicReplaceDurable } from "./atomic-replace.mjs";

const [registryPath, privateKeyPath, checkpointPath] = process.argv.slice(2);
if (!registryPath || !privateKeyPath || !checkpointPath) {
  process.stderr.write("usage: node checkpoint-registry.mjs REGISTRY PRIVATE_KEY CHECKPOINT\n");
  process.exit(2);
}
const digest = value => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const registry = JSON.parse(readFileSync(registryPath, "utf8"));
const registryBody = { schema: registry.schema, generation: registry.generation, records: registry.records };
if (registry.schema !== "cct-persistent-replay-registry/v1" ||
    registry.stateDigest !== digest(JSON.stringify(registryBody))) {
  process.stderr.write(`${JSON.stringify({ ok: false, failure: "registry_integrity_invalid" })}\n`);
  process.exit(1);
}
const previousCheckpointDigest = existsSync(checkpointPath)
  ? digest(readFileSync(checkpointPath, "utf8"))
  : null;
const body = {
  schema: "cct-replay-registry-checkpoint/v1",
  registryStateDigest: registry.stateDigest,
  generation: registry.generation,
  totalRecords: registry.records.length,
  previousCheckpointDigest,
};
const payload = JSON.stringify(body);
const checkpoint = {
  ...body,
  signatureBase64: sign(null, Buffer.from(payload), createPrivateKey(readFileSync(privateKeyPath))).toString("base64"),
};
atomicReplaceDurable(checkpointPath, `${JSON.stringify(checkpoint)}\n`);
process.stdout.write(`${JSON.stringify({ ok: true, generation: checkpoint.generation, totalRecords: checkpoint.totalRecords, checkpointDigest: digest(`${JSON.stringify(checkpoint)}\n`) })}\n`);
