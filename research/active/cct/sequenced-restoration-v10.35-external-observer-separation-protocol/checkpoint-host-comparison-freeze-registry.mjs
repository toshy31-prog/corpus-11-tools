import { createHash, createPrivateKey, sign } from "node:crypto";
import { readFileSync } from "node:fs";
import { atomicReplaceDurable } from "./atomic-replace.mjs";

const [registryPath, signerPrivateKeyPath, previousCheckpointPath, outputPath] = process.argv.slice(2);
if (!outputPath) {
  process.stderr.write("usage: node checkpoint-host-comparison-freeze-registry.mjs REGISTRY SIGNER_PRIVATE_KEY PREVIOUS_CHECKPOINT_OR_DASH OUTPUT\n");
  process.exit(2);
}
const digest = value => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const registryText = readFileSync(registryPath, "utf8");
const registry = JSON.parse(registryText);
const registryBody = { schema: registry.schema, generation: registry.generation, records: registry.records };
if (registry.schema !== "cct-host-comparison-freeze-registry/v1" ||
    registry.stateDigest !== digest(JSON.stringify(registryBody))) throw new Error("freeze registry integrity invalid");
const body = {
  schema: "cct-host-comparison-freeze-registry-checkpoint/v1",
  registryStateDigest: registry.stateDigest,
  generation: registry.generation,
  totalRecords: registry.records.length,
  previousCheckpointDigest: previousCheckpointPath === "-" ? null : digest(readFileSync(previousCheckpointPath, "utf8"))
};
const checkpoint = { ...body, signatureBase64: sign(null, Buffer.from(JSON.stringify(body)), createPrivateKey(readFileSync(signerPrivateKeyPath))).toString("base64") };
atomicReplaceDurable(outputPath, `${JSON.stringify(checkpoint)}\n`);
