import { readFileSync } from "node:fs";
import { assessSentinelClassWindowMatrix } from "../sequenced-restoration-v10.27-sentinel-class-window-matrix/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));

export function assessSentinelClassConstructValidation(args) {
  const prior = assessSentinelClassWindowMatrix(args);
  if (prior.status !== "sentinel_class_window_matrix_candidate") return prior;
  const descriptors = new Map((args.sentinelExecutionDescriptors ?? []).map((item) => [item.sentinelId, item]));
  const constructAudits = args.sentinelClassWindowMatrix.cells.map((cell) => {
    const item = descriptors.get(cell.sentinelId);
    const failures = [];
    if (!item) return { ...cell, failures: ["missing_execution_descriptor"] };
    const [start, end] = SPEC.windowBoundsMs[cell.window];
    if (!(start <= item.observedOffsetMs && item.observedOffsetMs <= end)) failures.push("sentinel_outside_claimed_window");
    if (cell.pathClass === "direct" && item.entryCount !== 1) failures.push("direct_class_not_observed");
    if (cell.pathClass === "alias" && !(item.aliasResolutionDepth >= 1)) failures.push("alias_resolution_not_observed");
    if (cell.pathClass === "delayed_activation" && (!(item.activationDelayMs > 0) || !item.activationTraceHash)) failures.push("delayed_activation_not_observed");
    if (cell.pathClass === "privileged" && (item.requiredPrivilege === "none" || !item.authorizationTraceHash)) failures.push("privileged_authorization_not_observed");
    return { ...cell, failures };
  });
  if (constructAudits.some((audit) => audit.failures.length)) return { status: "not_established", failures: ["sentinel_class_construct_not_supported"], constructAudits };
  return { ...prior, status: SPEC.successStatus, evidenceLevel: "observable_class_and_window_descriptors", constructAudits, declaredConstructsSupportedForFixtureScope: true, realPathEquivalenceEstablished: false, notEstablished: SPEC.notEstablished };
}
