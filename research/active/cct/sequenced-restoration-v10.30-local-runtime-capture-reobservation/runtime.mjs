import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { assessSentinelRuntimePathEquivalence } from "../sequenced-restoration-v10.29-sentinel-runtime-path-equivalence/runtime.mjs";
import { runLocalGateAttempt } from "./local-gate-harness.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));
const harnessUrl = new URL("./local-gate-harness.mjs", import.meta.url);
const hash = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;

export function assessLocalRuntimeCaptureReobservation(args) {
  const prior = assessSentinelRuntimePathEquivalence(args);
  if (prior.status !== "sentinel_runtime_path_equivalence_candidate") return prior;
  const failures = [];
  const harnessHash = hash(readFileSync(harnessUrl));
  if (args.expectedLocalHarnessHash !== harnessHash) failures.push("local_harness_hash_mismatch");
  if (args.localCaptureTargetSentinelId !== SPEC.targetSentinelId) failures.push("local_capture_target_not_precommitted");
  let capture;
  try { capture = JSON.parse(JSON.stringify(runLocalGateAttempt())); } catch { failures.push("local_runtime_execution_failed"); }
  const expected = args.expectedLocalCapture;
  for (const field of ["sentinelId", "entryCount", "aliasResolutionDepth", "activationDelayMs", "requiredPrivilege", "blocked"]) if (capture?.[field] !== expected?.[field]) failures.push(`local_capture_mismatch_${field}`);
  if (capture?.attemptedCapability !== "authority_quorum") failures.push("local_capture_wrong_capability");
  if (failures.length) return { status: "not_established", failures, harnessHash, capture };
  const captureEnvelope = { capture, harnessHash, nodeVersion: process.version, platform: process.platform, architecture: process.arch };
  return { ...prior, status: SPEC.successStatus, evidenceLevel: "executed_local_module_runtime_capture", localExecutionObserved: true, processIsolationEstablished: false, captureEnvelope, captureEnvelopeHash: hash(JSON.stringify(captureEnvelope)), deployedRuntimeObservationEstablished: false, otherPathsReobserved: false, notEstablished: SPEC.notEstablished };
}
