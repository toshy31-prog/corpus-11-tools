import { createHash, createPrivateKey, sign } from "node:crypto";
import { readFileSync } from "node:fs";
import { atomicReplaceDurable } from "./atomic-replace.mjs";

const [statePath, challengePath, holderId, holderPrivateKeyPath, responsePath] = process.argv.slice(2);
if (!responsePath) { process.stderr.write("usage: node serve-anchor-state.mjs STATE CHALLENGE HOLDER_ID HOLDER_PRIVATE_KEY RESPONSE\n"); process.exit(2); }
const stateText = readFileSync(statePath, "utf8"), state = JSON.parse(stateText), challenge = JSON.parse(readFileSync(challengePath, "utf8"));
const stateDigest = `sha256:${createHash("sha256").update(stateText).digest("hex")}`;
const body = { schema: "cct-remote-anchor-state-response/v1", holderId, challengeNonce: challenge.nonce, stateDigest, generation: state.generation, servedAtMs: Date.now() };
const response = { ...body, signatureBase64: sign(null, Buffer.from(JSON.stringify(body)), createPrivateKey(readFileSync(holderPrivateKeyPath))).toString("base64") };
atomicReplaceDurable(responsePath, `${JSON.stringify(response)}\n`);
process.stdout.write(`${JSON.stringify({ ok: true, holderId, generation: state.generation, stateDigest })}\n`);
