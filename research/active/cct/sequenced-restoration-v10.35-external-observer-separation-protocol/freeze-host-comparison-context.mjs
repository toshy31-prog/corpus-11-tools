import { createHash, createPrivateKey, createPublicKey, sign } from "node:crypto";
import { closeSync, existsSync, openSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { atomicReplaceDurable } from "./atomic-replace.mjs";

const [campaignId, hostComparisonSalt, firstFreezerId, firstPrivateKeyPath, secondFreezerId, secondPrivateKeyPath, durationText, registryPath, outputPath] = process.argv.slice(2);
if (!outputPath) {
  process.stderr.write("usage: node freeze-host-comparison-context.mjs CAMPAIGN_ID HOST_COMPARISON_SALT FIRST_FREEZER_ID FIRST_PRIVATE_KEY SECOND_FREEZER_ID SECOND_PRIVATE_KEY DURATION_MS REGISTRY OUTPUT\n");
  process.exit(2);
}
const durationMs = Number(durationText);
if (!Number.isSafeInteger(durationMs) || durationMs < 1) throw new Error("invalid freeze duration");
const privateKeys = [createPrivateKey(readFileSync(firstPrivateKeyPath)), createPrivateKey(readFileSync(secondPrivateKeyPath))];
const keyDigest = key => `sha256:${createHash("sha256").update(createPublicKey(key).export({ type: "spki", format: "der" })).digest("hex")}`;
const freezerKeyDigests = privateKeys.map(keyDigest);
if (firstFreezerId === secondFreezerId || freezerKeyDigests[0] === freezerKeyDigests[1]) throw new Error("freeze signers must be distinct");
const frozenAtMs = Date.now();
const body = {
  schema: "cct-host-comparison-context-freeze/v2", campaignId,
  freezerIds: [firstFreezerId, secondFreezerId], freezerKeyDigests,
  contextDigest: `sha256:${createHash("sha256").update(hostComparisonSalt).digest("hex")}`,
  frozenAtMs, validFromMs: frozenAtMs, validUntilMs: frozenAtMs + durationMs
};
const value = { ...body, signaturesBase64: privateKeys.map(key => sign(null, Buffer.from(JSON.stringify(body)), key).toString("base64")) };
const digest = value => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const lockPath = `${registryPath}.lock`;
let lock;
try {
  lock = openSync(lockPath, "wx", 0o600);
  writeFileSync(lock, `${JSON.stringify({ schema: "cct-process-lock/v1", pid: process.pid })}\n`);
  let registry = { schema: "cct-host-comparison-freeze-registry/v1", generation: 0, records: [], stateDigest: null };
  if (existsSync(registryPath)) registry = JSON.parse(readFileSync(registryPath, "utf8"));
  const currentBody = { schema: registry.schema, generation: registry.generation, records: registry.records };
  const initial = registry.generation === 0 && registry.records.length === 0 && registry.stateDigest === null;
  if (registry.schema !== "cct-host-comparison-freeze-registry/v1" || !Array.isArray(registry.records) || (!initial && registry.stateDigest !== digest(JSON.stringify(currentBody)))) throw new Error("freeze registry integrity invalid");
  if (registry.records.some(record => record.campaignId === campaignId)) throw new Error("campaign context already frozen");
  const nextBody = { schema: registry.schema, generation: registry.generation + 1, records: [...registry.records, { campaignId, freezeDigest: digest(JSON.stringify(value)) }] };
  atomicReplaceDurable(registryPath, `${JSON.stringify({ ...nextBody, stateDigest: digest(JSON.stringify(nextBody)) })}\n`);
  atomicReplaceDurable(outputPath, `${JSON.stringify(value)}\n`);
} finally {
  if (lock !== undefined) { closeSync(lock); unlinkSync(lockPath); }
}
