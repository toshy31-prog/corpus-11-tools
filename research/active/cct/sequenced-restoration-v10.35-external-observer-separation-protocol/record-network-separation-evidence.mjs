import { closeSync, existsSync, openSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { atomicReplaceDurable } from "./atomic-replace.mjs";
import { verifyNetworkSeparationEvidence } from "./network-separation-evidence.mjs";
import { assessNetworkSeparationReplay, digest, historyBody } from "./network-separation-history.mjs";

const [evidencePath, sourceRegistryPath, observerRegistryPath, challengePath, historyPath] = process.argv.slice(2);
if (!historyPath) { process.stderr.write("usage: node record-network-separation-evidence.mjs EVIDENCE SOURCE_REGISTRY OBSERVER_REGISTRY CHALLENGE HISTORY\n"); process.exit(2); }
const read = path => JSON.parse(readFileSync(path, "utf8"));
const evidence = read(evidencePath), sourceRegistry = read(sourceRegistryPath), observerRegistry = read(observerRegistryPath), challenge = read(challengePath);
if (!verifyNetworkSeparationEvidence(evidence, sourceRegistry, observerRegistry, challenge).ok) throw new Error("network separation evidence invalid");
const sourceRegistryDigest = digest(`${JSON.stringify(sourceRegistry)}\n`), lockPath = `${historyPath}.lock`;
let lock;
try {
  lock = openSync(lockPath, "wx", 0o600); writeFileSync(lock, `${JSON.stringify({ schema: "cct-process-lock/v1", pid: process.pid })}\n`);
  let history = { schema: "cct-network-separation-history/v1", sourceRegistryDigest, generation: 0, records: [], stateDigest: null };
  if (existsSync(historyPath)) history = read(historyPath);
  const initial = history.generation === 0 && history.records.length === 0 && history.stateDigest === null;
  if (history.schema !== "cct-network-separation-history/v1" || history.sourceRegistryDigest !== sourceRegistryDigest || (!initial && history.stateDigest !== digest(JSON.stringify(historyBody(history))))) throw new Error("network separation history invalid");
  const replay = assessNetworkSeparationReplay(evidence, history);
  if (!replay.ok) throw new Error("network separation evidence replayed");
  const records = [...history.records, { evidenceDigest: digest(`${JSON.stringify(evidence)}\n`), ...replay.candidate, admittedAtMs: Date.now() }];
  const next = { schema: history.schema, sourceRegistryDigest, generation: history.generation + 1, records };
  atomicReplaceDurable(historyPath, `${JSON.stringify({ ...next, stateDigest: digest(JSON.stringify(next)) })}\n`);
  process.stdout.write(`${JSON.stringify({ ok: true, generation: next.generation })}\n`);
} finally { if (lock !== undefined) { closeSync(lock); unlinkSync(lockPath); } }
