const list = (value) => Array.isArray(value) ? value : [];
const text = (value) => String(value || "").trim();

function targetId(candidate = {}) {
  return text(candidate.target?.id || candidate.id);
}
function targetType(candidate = {}) {
  return text(candidate.target?.type || candidate.type);
}
function firstHop(candidate = {}) {
  const step = list(candidate.steps)[0];
  return text(step?.to?.id || step?.to?.label || "");
}
function anchorId(candidate = {}) {
  const at = Number.isInteger(candidate.motifAt) ? candidate.motifAt : -1;
  const step = at >= 0 ? list(candidate.steps)[at] : null;
  return text(step?.to?.id || step?.from?.id || "");
}
function pathKey(candidate = {}) {
  return list(candidate.steps).map(step =>
    `${text(step?.from?.id)}>${text(step?.relation)}>${text(step?.to?.id)}`
  ).join("|");
}
function routeState(branch = {}) {
  if (["paused", "dismissed"].includes(branch.status)) return "blocked";
  if (branch.current || list(branch.candidates).length) return "available";
  if (branch.status === "source_unavailable") return "unavailable";
  if (branch.status === "exhausted") return "exhausted_scope";
  if (branch.status === "needs_enrichment") return "partial";
  return "stalled";
}

/**
 * Read-only summary of the exploration frontier.
 * It never upgrades evidence, creates identities, or claims source exhaustion.
 */
export function summarizeDiscoveryFrontier(branches = [], { depth = 6 } = {}) {
  const byDirection = {};
  const allTargets = new Set();
  const allFirstHops = new Set();
  const allPaths = new Set();
  let maxObservedDepth = 0;

  for (const branch of list(branches)) {
    const candidates = list(branch.candidates);
    const targets = new Set();
    const firstHops = new Set();
    const anchors = new Set();
    const paths = new Set();
    let localMaxDepth = 0;

    for (const candidate of candidates) {
      const id = targetId(candidate);
      if (id) targets.add(id);
      const hop = firstHop(candidate);
      if (hop) firstHops.add(hop);
      const anchor = anchorId(candidate);
      if (anchor) anchors.add(anchor);
      const key = pathKey(candidate);
      if (key) paths.add(key);
      localMaxDepth = Math.max(localMaxDepth, list(candidate.steps).length);
    }

    const direction = text(branch.direction || branch.id);
    byDirection[direction] = {
      state: routeState(branch),
      targets: targets.size,
      firstBranches: firstHops.size,
      anchors: anchors.size,
      paths: paths.size,
      maxObservedDepth: localMaxDepth,
      depthLimit: Number(depth || 6),
      canExpand: !["blocked", "unavailable", "exhausted_scope"].includes(routeState(branch))
    };
    targets.forEach(id => allTargets.add(id));
    firstHops.forEach(id => allFirstHops.add(id));
    paths.forEach(id => allPaths.add(id));
    maxObservedDepth = Math.max(maxObservedDepth, localMaxDepth);
  }

  return {
    schemaVersion: 1,
    depthLimit: Number(depth || 6),
    maxObservedDepth,
    distinctTargets: allTargets.size,
    distinctFirstBranches: allFirstHops.size,
    distinctPaths: allPaths.size,
    byDirection
  };
}

/**
 * Allocate a bounded expansion budget across route frontiers.
 * `spread` changes allocation only; it never changes evidence strength.
 */
export function scheduleDiscoveryFrontiers(frontier = {}, {
  weights = {},
  spread = 1,
  budget = 8,
  maxPerDirection = 3,
  previousAllocations = {}
} = {}) {
  const entries = Object.entries(frontier.byDirection || {})
    .filter(([, value]) => value?.canExpand)
    .map(([direction, value]) => ({
      direction,
      weight: Math.max(0, Number(weights[direction] ?? 1)),
      novelty: Math.max(1, Number(value.firstBranches || value.anchors || value.targets || 1)),
      state: value.state
    }))
    .filter(item => item.weight > 0);

  const cap = Math.max(0, Math.floor(Number(budget || 0)));
  if (!cap || !entries.length) return [];

  const s = Math.min(1, Math.max(0, Number(spread || 0)));
  // A feedback loop may allocate one call at a time against a refreshed graph.
  // Preserve its call counts so fairness and caps span the entire DIG operation.
  const allocations = new Map(entries.map(item => [item.direction,
    Math.max(0, Math.floor(Number(previousAllocations[item.direction]) || 0))
  ]));
  const plan = [];

  for (let slot = 0; slot < cap; slot++) {
    let best = null;
    // R11.1 — frontier execution fairness.
    // With a dispersive search, an already productive route may not consume a
    // second page while another executable route has never received one call.
    const unopened = s >= 0.5
      ? entries.filter(item => (allocations.get(item.direction) || 0) === 0)
      : [];
    const pool = unopened.length ? unopened : entries;
    for (const item of pool) {
      const used = allocations.get(item.direction) || 0;
      if (used >= Math.max(1, Number(maxPerDirection || 1))) continue;
      const repeatPenalty = 1 + s * used * used;
      const noveltyGain = 1 + s * Math.log2(1 + item.novelty);
      const score = item.weight * noveltyGain / repeatPenalty;
      if (!best || score > best.score ||
          (score === best.score && item.direction.localeCompare(best.direction) < 0)) {
        best = { ...item, score };
      }
    }
    if (!best) break;
    allocations.set(best.direction, (allocations.get(best.direction) || 0) + 1);
    plan.push({
      direction: best.direction,
      slot,
      reason: (allocations.get(best.direction) || 0) > 1 ? "continue_branch" : "open_branch"
    });
  }
  return plan;
}

/**
 * Presentation-level convergence only: one target can keep every documented
 * route/path without merging graph identities.
 */
export function convergeDiscoveryCandidates(candidates = []) {
  const map = new Map();
  for (const candidate of list(candidates)) {
    const id = targetId(candidate);
    if (!id) continue;
    const previous = map.get(id);
    const provenance = {
      direction: text(candidate.direction),
      path: list(candidate.steps),
      signature: text(candidate.signature || pathKey(candidate))
    };
    if (!previous) {
      map.set(id, { ...candidate, provenance: [provenance] });
      continue;
    }
    previous.provenance.push(provenance);
    previous.directions = [...new Set([
      ...list(previous.directions),
      text(previous.direction),
      text(candidate.direction)
    ].filter(Boolean))];
  }
  return [...map.values()];
}
