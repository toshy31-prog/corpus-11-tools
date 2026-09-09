import { createHash, createPrivateKey, createPublicKey, sign } from "node:crypto";
import { readFileSync } from "node:fs";
import { atomicReplaceDurable } from "./atomic-replace.mjs";

const [anchorStatePath, checkpointPath, previousPrivateKeyPath, nextPrivateKeyPath, outputPath] = process.argv.slice(2);
if (!outputPath) {
  process.stderr.write("usage: node create-registry-authority-transition.mjs ANCHOR_STATE NEXT_CHECKPOINT PREVIOUS_PRIVATE_KEY NEXT_PRIVATE_KEY OUTPUT\n");
  process.exit(2);
}
const digest = value => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const keyDigest = key => digest(createPublicKey(key).export({ type: "spki", format: "der" }));
const state = JSON.parse(readFileSync(anchorStatePath, "utf8"));
const checkpoint = JSON.parse(readFileSync(checkpointPath, "utf8"));
const previousKey = createPrivateKey(readFileSync(previousPrivateKeyPath));
const nextKey = createPrivateKey(readFileSync(nextPrivateKeyPath));
const body = {
  schema: "cct-registry-authority-transition/v1",
  checkpointSchema: checkpoint.schema,
  previousRegistryKeyDigest: keyDigest(previousKey),
  nextRegistryKeyDigest: keyDigest(nextKey),
  previousAnchorReceiptDigest: state.receiptDigest,
  previousCheckpointDigest: state.checkpointDigest,
  effectiveGeneration: checkpoint.generation
};
if (state.schema !== "cct-monotonic-anchor-state/v2" ||
    body.previousRegistryKeyDigest !== state.registryKeyDigest ||
    checkpoint.previousCheckpointDigest !== state.checkpointDigest ||
    checkpoint.generation <= state.generation ||
    body.previousRegistryKeyDigest === body.nextRegistryKeyDigest) throw new Error("authority transition inputs invalid");
const payload = Buffer.from(JSON.stringify(body));
const transition = {
  ...body,
  previousSignatureBase64: sign(null, payload, previousKey).toString("base64"),
  nextSignatureBase64: sign(null, payload, nextKey).toString("base64")
};
atomicReplaceDurable(outputPath, `${JSON.stringify(transition)}\n`);
