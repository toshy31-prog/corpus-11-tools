import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { assessBlindedPathSentinelDetectability } from "../sequenced-restoration-v10.26-blinded-path-sentinel-detectability/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));
const hash = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;

export function assessSentinelClassWindowMatrix(args) {
  const prior = assessBlindedPathSentinelDetectability(args);
  if (prior.status !== "blinded_path_sentinel_detectability_candidate") return prior;
  const matrix = args.sentinelClassWindowMatrix;
  const expectedCells = SPEC.pathClasses.flatMap((pathClass) => SPEC.windows.map((window) => ({ pathClass, window, sentinelId: `sentinel-${pathClass}-${window}` })));
  const failures = [];
  if (!matrix || matrix.matrixHash !== hash(JSON.stringify(matrix.cells)) || JSON.stringify(matrix.cells) !== JSON.stringify(expectedCells)) failures.push("sentinel_matrix_not_precommitted_or_complete");
  if (!(matrix?.frozenAt < args.blindedPathSentinelTrial.injectedAt)) failures.push("sentinel_matrix_not_frozen_before_injection");
  const channels = args.executionPathDiscoveryReports.map((item) => item.channel);
  const cellAudits = channels.flatMap((channel) => expectedCells.map((cell) => {
    const result = matrix?.channelResults?.find((item) => item.channel === channel && item.sentinelId === cell.sentinelId);
    return { channel, ...cell, detected: result?.detected === true };
  }));
  if (cellAudits.some((cell) => !cell.detected)) failures.push("sentinel_class_window_cell_failed");
  if (failures.length) return { status: "not_established", failures, cellAudits };
  return { ...prior, status: SPEC.successStatus, evidenceLevel: "precommitted_path_class_by_time_window_sentinels", testedCells: cellAudits.length, allDeclaredCellsDetected: true, unmodeledDetectabilityEstablished: false, notEstablished: SPEC.notEstablished };
}
