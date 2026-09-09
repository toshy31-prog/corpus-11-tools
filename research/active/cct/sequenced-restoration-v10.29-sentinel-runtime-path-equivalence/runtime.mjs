import { readFileSync } from "node:fs";
import { assessSentinelClassConstructValidation } from "../sequenced-restoration-v10.28-sentinel-class-construct-validation/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));

export function assessSentinelRuntimePathEquivalence(args) {
  const prior = assessSentinelClassConstructValidation(args);
  if (prior.status !== "sentinel_class_construct_validation_candidate") return prior;
  const runtime = new Map((args.matchedRuntimePathDescriptors ?? []).map((item) => [item.sentinelId, item]));
  const sentinel = new Map(args.sentinelExecutionDescriptors.map((item) => [item.sentinelId, item]));
  const equivalenceAudits = args.sentinelClassWindowMatrix.cells.map((cell) => {
    const source = sentinel.get(cell.sentinelId);
    const target = runtime.get(cell.sentinelId);
    const failures = [];
    if (!target) return { sentinelId: cell.sentinelId, failures: ["missing_matched_runtime_path"] };
    if (!target.runtimePathId || target.runtimePathId === cell.sentinelId) failures.push("runtime_path_not_distinct_from_sentinel");
    const mismatchedFields = SPEC.matchedFields.filter((field) => source[field] !== target[field]);
    if (mismatchedFields.length) failures.push("constitutive_field_mismatch");
    if (!target.blocked || !target.blockTraceHash) failures.push("matched_runtime_path_not_observably_blocked");
    return { sentinelId: cell.sentinelId, runtimePathId: target.runtimePathId, mismatchedFields, failures };
  });
  if (equivalenceAudits.some((audit) => audit.failures.length)) return { status: "not_established", failures: ["sentinel_runtime_equivalence_failed"], equivalenceAudits };
  return { ...prior, status: SPEC.successStatus, evidenceLevel: "field_matched_sentinel_runtime_path_pairs", equivalenceAudits, allDeclaredPairsEquivalentOnMeasuredFields: true, realRuntimeObservationEstablished: false, unmeasuredEquivalenceEstablished: false, notEstablished: SPEC.notEstablished };
}
