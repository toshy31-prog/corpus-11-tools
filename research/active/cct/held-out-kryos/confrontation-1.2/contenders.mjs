function numericPredictions(view, keys) { return Object.fromEntries(keys.map((key) => [key, Number(view[key]) || 0])); }
function cost(view, action) { return view.cct.actionOntology[action].resourceCost; }

export function createCheapest(keys) { return { manifest: { id: "rival-cheapest", version: "1.0", title: "Cheapest admissible", family: "minimal-cost" }, decide({ view, allowedActions }) {
  const action = [...allowedActions].sort((a, b) => cost(view, a) - cost(view, b) || a.localeCompare(b))[0];
  return { action, predictions: numericPredictions(view, keys) };
}}; }

export function createPublicMaximin(keys) { return { manifest: { id: "rival-public-maximin", version: "1.0", title: "Public immediate maximin", family: "public-vector-preservation" }, decide({ view, allowedActions }) {
  const dimensions = ["structural_integrity", "marine_ecosystem_health", "freshwater_reservoir", "energy_grid_stability", "population_morale", "trade_volume"];
  const score = (action) => {
    const e = view.cct.actionOntology[action].projectionTrace.immediatePublicEffects;
    return Math.min(...dimensions.map((name) => (view[name] + (e[name] ?? 0)) / 100));
  };
  const action = [...allowedActions].sort((a, b) => score(b) - score(a) || a.localeCompare(b))[0];
  return { action, predictions: numericPredictions(view, keys) };
}}; }

export function createLowestAxis(keys) { return { manifest: { id: "rival-lowest-axis", version: "1.0", title: "Protect lowest public axis", family: "weakest-axis-first" }, decide({ view, allowedActions }) {
  const dimensions = ["structural_integrity", "marine_ecosystem_health", "freshwater_reservoir", "energy_grid_stability", "population_morale", "trade_volume"];
  const lowest = dimensions.sort((a, b) => view[a] - view[b] || a.localeCompare(b))[0];
  const score = (action) => view.cct.actionOntology[action].projectionTrace.immediatePublicEffects[lowest] ?? 0;
  const action = [...allowedActions].sort((a, b) => score(b) - score(a) || cost(view, a) - cost(view, b) || a.localeCompare(b))[0];
  return { action, predictions: numericPredictions(view, keys) };
}}; }
