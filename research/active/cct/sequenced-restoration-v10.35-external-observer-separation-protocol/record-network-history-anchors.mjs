import { closeSync, existsSync, openSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { atomicReplaceDurable } from "./atomic-replace.mjs";
import { anchorLedgerBody, historyAnchorBody } from "./network-separation-history-anchor.mjs";
import { createHash, createPublicKey, verify } from "node:crypto";

const [sourceRegistryPath, policyPath, anchorsManifestPath, ledgerPath] = process.argv.slice(2);
if (!ledgerPath) { process.stderr.write("usage: node record-network-history-anchors.mjs SOURCE_REGISTRY POLICY ANCHOR_PATHS_JSON LEDGER\n"); process.exit(2); }
const digest = value => `sha256:${createHash("sha256").update(value).digest("hex")}`, read = path => JSON.parse(readFileSync(path, "utf8"));
const sourceRegistry = read(sourceRegistryPath), sourceRegistryDigest = digest(`${JSON.stringify(sourceRegistry)}\n`), policy = read(policyPath), paths = read(anchorsManifestPath), values = paths.map(read);
if (values.length !== 2 || values.some(value => { const witness = policy.timeWitnesses?.find(candidate => candidate.id === value.witnessId); try { return !witness || !verify(null, Buffer.from(JSON.stringify(historyAnchorBody(value))), createPublicKey(witness.publicKeyPem), Buffer.from(value.signatureBase64 ?? "", "base64")); } catch { return true; } })) throw new Error("history anchors invalid");
const lockPath = `${ledgerPath}.lock`; let lock;
try {
  lock = openSync(lockPath, "wx", 0o600); writeFileSync(lock, `${JSON.stringify({ schema: "cct-process-lock/v1", pid: process.pid })}\n`);
  let ledger = { schema: "cct-network-history-anchor-ledger/v1", sourceRegistryDigest, generation: 0, anchors: [], stateDigest: null };
  if (existsSync(ledgerPath)) ledger = read(ledgerPath);
  const initial = ledger.generation === 0 && ledger.anchors.length === 0 && ledger.stateDigest === null;
  if (ledger.schema !== "cct-network-history-anchor-ledger/v1" || ledger.sourceRegistryDigest !== sourceRegistryDigest || (!initial && ledger.stateDigest !== digest(JSON.stringify(anchorLedgerBody(ledger))))) throw new Error("anchor ledger invalid");
  for (const value of values) { const prior = ledger.anchors.find(entry => entry.witnessId === value.witnessId && entry.historyGeneration === value.historyGeneration); if (prior && prior.historyDigest !== value.historyDigest) throw new Error("witness history equivocation"); if (!prior) ledger.anchors.push({ anchorDigest: digest(`${JSON.stringify(value)}\n`), witnessId: value.witnessId, historyGeneration: value.historyGeneration, historyDigest: value.historyDigest }); }
  const next = { schema: ledger.schema, sourceRegistryDigest, generation: ledger.anchors.length, anchors: ledger.anchors };
  atomicReplaceDurable(ledgerPath, `${JSON.stringify({ ...next, stateDigest: digest(JSON.stringify(next)) })}\n`);
} finally { if (lock !== undefined) { closeSync(lock); unlinkSync(lockPath); } }
