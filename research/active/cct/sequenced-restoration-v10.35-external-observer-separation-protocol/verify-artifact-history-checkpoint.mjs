import { createHash, createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";

const [historyPath, checkpointPath, publicKeyPath] = process.argv.slice(2);
if (!publicKeyPath) { process.stderr.write("usage: node verify-artifact-history-checkpoint.mjs HISTORY CHECKPOINT PUBLIC_KEY\n"); process.exit(2); }
const digest = value => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const history = JSON.parse(readFileSync(historyPath, "utf8")), checkpoint = JSON.parse(readFileSync(checkpointPath, "utf8"));
const historyBody = { schema: history.schema, generation: history.generation, records: history.records };
const checkpointBody = { schema: checkpoint.schema, registryStateDigest: checkpoint.registryStateDigest, generation: checkpoint.generation, totalRecords: checkpoint.totalRecords, previousCheckpointDigest: checkpoint.previousCheckpointDigest };
const checks = { schema: checkpoint.schema === "cct-class-artifact-history-checkpoint/v1", historyIntegrity: history.schema === "cct-class-artifact-history/v1" && history.stateDigest === digest(JSON.stringify(historyBody)), signature: verify(null, Buffer.from(JSON.stringify(checkpointBody)), createPublicKey(readFileSync(publicKeyPath)), Buffer.from(checkpoint.signatureBase64, "base64")), stateDigest: checkpoint.registryStateDigest === history.stateDigest, generation: checkpoint.generation === history.generation, totalRecords: checkpoint.totalRecords === history.records.length };
const ok = Object.values(checks).every(Boolean);
process.stdout.write(`${JSON.stringify({ ok, checks, generation: checkpoint.generation })}\n`);
if (!ok) process.exitCode = 1;
