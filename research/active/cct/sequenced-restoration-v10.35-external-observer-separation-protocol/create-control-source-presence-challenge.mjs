import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { atomicReplaceDurable } from "./atomic-replace.mjs";

const [sourceRegistryPath, hostComparisonSalt, durationText, outputPath] = process.argv.slice(2);
if (!outputPath) {
  process.stderr.write("usage: node create-control-source-presence-challenge.mjs SOURCE_REGISTRY HOST_COMPARISON_SALT DURATION_MS OUTPUT\n");
  process.exit(2);
}
const durationMs = Number(durationText);
if (!Number.isSafeInteger(durationMs) || durationMs < 1 || durationMs > 300_000) throw new Error("invalid challenge duration");
const digest = value => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const registryText = readFileSync(sourceRegistryPath, "utf8");
const now = Date.now();
const challenge = {
  schema: "cct-control-source-presence-challenge/v1", nonce: randomBytes(24).toString("hex"),
  sourceRegistryDigest: digest(registryText), hostComparisonContextDigest: digest(hostComparisonSalt),
  issuedAtMs: now, expiresAtMs: now + durationMs
};
atomicReplaceDurable(outputPath, `${JSON.stringify(challenge)}\n`);
