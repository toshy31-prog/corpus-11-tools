import { createHash, createPrivateKey, sign } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { atomicReplaceDurable } from "./atomic-replace.mjs";

const [historyPath, privateKeyPath, checkpointPath] = process.argv.slice(2);
if (!checkpointPath) { process.stderr.write("usage: node checkpoint-artifact-history.mjs HISTORY PRIVATE_KEY CHECKPOINT\n"); process.exit(2); }
const digest = value => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const history = JSON.parse(readFileSync(historyPath, "utf8"));
const historyBody = { schema: history.schema, generation: history.generation, records: history.records };
if (history.schema !== "cct-class-artifact-history/v1" || history.stateDigest !== digest(JSON.stringify(historyBody))) { process.stderr.write(`${JSON.stringify({ ok: false, failure: "history_integrity_invalid" })}\n`); process.exit(1); }
const body = { schema: "cct-class-artifact-history-checkpoint/v1", registryStateDigest: history.stateDigest, generation: history.generation, totalRecords: history.records.length, previousCheckpointDigest: existsSync(checkpointPath) ? digest(readFileSync(checkpointPath, "utf8")) : null };
const checkpoint = { ...body, signatureBase64: sign(null, Buffer.from(JSON.stringify(body)), createPrivateKey(readFileSync(privateKeyPath))).toString("base64") };
atomicReplaceDurable(checkpointPath, `${JSON.stringify(checkpoint)}\n`);
process.stdout.write(`${JSON.stringify({ ok: true, generation: checkpoint.generation, totalRecords: checkpoint.totalRecords })}\n`);
