import { createHash, createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";
import { atomicReplaceDurable } from "./atomic-replace.mjs";

const [firstCheckpointPath, secondCheckpointPath, registryPublicKeyPath, outputPath] = process.argv.slice(2);
if (!outputPath) {
  process.stderr.write("usage: node compile-registry-key-equivocation-evidence.mjs CHECKPOINT_A CHECKPOINT_B REGISTRY_PUBLIC_KEY OUTPUT\n");
  process.exit(2);
}
const digest = value => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const key = createPublicKey(readFileSync(registryPublicKeyPath));
const texts = [readFileSync(firstCheckpointPath, "utf8"), readFileSync(secondCheckpointPath, "utf8")];
const values = texts.map(JSON.parse);
const body = value => ({ schema: value.schema, registryStateDigest: value.registryStateDigest, generation: value.generation, totalRecords: value.totalRecords, previousCheckpointDigest: value.previousCheckpointDigest });
const signaturesValid = values.every(value => verify(null, Buffer.from(JSON.stringify(body(value))), key, Buffer.from(value.signatureBase64 ?? "", "base64")));
const sameSlot = values[0].schema === values[1].schema && values[0].generation === values[1].generation && values[0].previousCheckpointDigest === values[1].previousCheckpointDigest;
const divergent = values[0].registryStateDigest !== values[1].registryStateDigest || values[0].totalRecords !== values[1].totalRecords;
if (!signaturesValid || !sameSlot || !divergent) throw new Error("registry key equivocation not established");
const evidence = {
  schema: "cct-registry-key-equivocation-evidence/v1",
  registryKeyDigest: digest(key.export({ type: "spki", format: "der" })),
  checkpointSchema: values[0].schema, generation: values[0].generation,
  previousCheckpointDigest: values[0].previousCheckpointDigest,
  checkpointTextsBase64: texts.map(value => Buffer.from(value).toString("base64"))
};
atomicReplaceDurable(outputPath, `${JSON.stringify(evidence)}\n`);
