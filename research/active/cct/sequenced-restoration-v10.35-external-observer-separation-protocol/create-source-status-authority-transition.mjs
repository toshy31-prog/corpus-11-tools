import { createHash, createPrivateKey, createPublicKey, sign } from "node:crypto";
import { readFileSync } from "node:fs";
import { atomicReplaceDurable } from "./atomic-replace.mjs";

const [registryPath, effectiveGenerationText, previousPrivateKeyPath, nextPrivateKeyPath, outputPath, previousTransitionPath] = process.argv.slice(2);
if (!outputPath) { process.stderr.write("usage: node create-source-status-authority-transition.mjs REGISTRY EFFECTIVE_GENERATION PREVIOUS_PRIVATE_KEY NEXT_PRIVATE_KEY OUTPUT [PREVIOUS_TRANSITION]\n"); process.exit(2); }
const digest = value => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const registry = JSON.parse(readFileSync(registryPath, "utf8"));
const previousKey = createPrivateKey(readFileSync(previousPrivateKeyPath));
const nextKey = createPrivateKey(readFileSync(nextPrivateKeyPath));
const body = { schema: "cct-source-status-authority-transition/v1", registryStateDigest: registry.stateDigest, previousAuthorityKeyDigest: digest(createPublicKey(previousKey).export({ type: "spki", format: "der" })), nextAuthorityKeyDigest: digest(createPublicKey(nextKey).export({ type: "spki", format: "der" })), effectiveGeneration: Number(effectiveGenerationText) };
const predecessor = previousTransitionPath ? JSON.parse(readFileSync(previousTransitionPath, "utf8")) : null;
const expectedPreviousDigest = predecessor?.nextAuthorityKeyDigest ?? predecessor?.selectedAuthorityKeyDigest ?? registry.statusAuthorityKeyDigest;
const minimumGeneration = predecessor?.effectiveGeneration ?? 0;
if (body.previousAuthorityKeyDigest !== expectedPreviousDigest || body.previousAuthorityKeyDigest === body.nextAuthorityKeyDigest || !Number.isSafeInteger(body.effectiveGeneration) || body.effectiveGeneration <= minimumGeneration) throw new Error("transition inputs invalid");
const payload = Buffer.from(JSON.stringify(body));
atomicReplaceDurable(outputPath, `${JSON.stringify({ ...body, previousSignatureBase64: sign(null, payload, previousKey).toString("base64"), nextSignatureBase64: sign(null, payload, nextKey).toString("base64") })}\n`);
