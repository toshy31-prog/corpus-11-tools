import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { assessSuspensionCommandEffectChain } from "../sequenced-restoration-v10.23-suspension-command-effect-chain/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));
const hash = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;

export function assessFrozenExecutionPathCoverage(args) {
  const prior = assessSuspensionCommandEffectChain(args);
  if (prior.status !== "suspension_command_effect_chain_candidate") return prior;
  const inventory = args.executionPathInventory;
  const failures = [];
  if (!inventory || inventory.inventoryHash !== hash(JSON.stringify(inventory?.paths))) failures.push("execution_path_inventory_hash_mismatch");
  if (!(inventory?.frozenAt < args.suspensionEffectChain[0].at)) failures.push("execution_path_inventory_not_frozen_before_suspension");
  const expected = inventory?.paths ?? [];
  const probes = args.executionPathProbes ?? [];
  if (JSON.stringify(probes.map((probe) => probe.path)) !== JSON.stringify(expected)) failures.push("execution_path_probe_set_mismatch");
  const probeAudits = expected.map((path) => {
    const probe = probes.find((item) => item.path === path);
    const pathFailures = [];
    if (!probe?.blocked) pathFailures.push("path_not_observably_blocked");
    if (!probe?.blockTraceHash || probe.observedTraceHash !== probe.blockTraceHash) pathFailures.push("path_observation_not_linked_to_block_trace");
    if (probe?.observerId === args.suspensionEffectChain.find((event) => event.eventType === "gate_disabled")?.actorId) pathFailures.push("path_observer_not_independent");
    return { path, failures: pathFailures };
  });
  if (probeAudits.some((audit) => audit.failures.length)) failures.push("inventoried_path_coverage_failed");
  if (failures.length) return { status: "not_established", failures, probeAudits };
  return { ...prior, status: SPEC.successStatus, evidenceLevel: "frozen_inventory_pathwise_block_probes", inventoriedPaths: expected.length, allInventoriedPathsBlocked: true, inventoryExhaustivenessEstablished: false, allPossiblePathsBlocked: false, notEstablished: SPEC.notEstablished };
}
