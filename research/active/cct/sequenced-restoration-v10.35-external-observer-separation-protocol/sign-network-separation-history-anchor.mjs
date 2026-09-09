import { createHash, createPrivateKey, sign } from "node:crypto";
import { readFileSync } from "node:fs";
import { atomicReplaceDurable } from "./atomic-replace.mjs";
import { historyAnchorBody } from "./network-separation-history-anchor.mjs";

const [witnessId, witnessPrivateKeyPath, historyPath, networkEvidencePath, outputPath] = process.argv.slice(2);
if (!outputPath) { process.stderr.write("usage: node sign-network-separation-history-anchor.mjs WITNESS_ID PRIVATE_KEY HISTORY NETWORK_EVIDENCE OUTPUT\n"); process.exit(2); }
const digest = value => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const historyText = readFileSync(historyPath, "utf8"), history = JSON.parse(historyText), evidenceText = readFileSync(networkEvidencePath, "utf8"), evidence = JSON.parse(evidenceText), now = Date.now();
if (history.records?.at(-1)?.evidenceDigest !== digest(evidenceText) || now < history.records.at(-1).admittedAtMs || now > evidence.challenge?.expiresAtMs) throw new Error("history or evidence not current");
const value = { schema: "cct-network-separation-history-anchor/v1", witnessId, historyDigest: digest(historyText), historyGeneration: history.generation, networkEvidenceDigest: digest(evidenceText), challengeDigest: evidence.challengeDigest, signedAtMs: now };
atomicReplaceDurable(outputPath, `${JSON.stringify({ ...value, signatureBase64: sign(null, Buffer.from(JSON.stringify(historyAnchorBody(value))), createPrivateKey(readFileSync(witnessPrivateKeyPath))).toString("base64") })}\n`);
