import { MUSIC_SORTS } from "./music-sorting.mjs";
export const SCOUT_DIRECTIONS = Object.freeze([
  Object.freeze({ id: "label",       label: "LABEL" }),
  Object.freeze({ id: "remix",       label: "REMIX" }),
  Object.freeze({ id: "featuring",   label: "FEAT" }),
  Object.freeze({ id: "compilation", label: "COMP" }),
  Object.freeze({ id: "alias",       label: "ALIAS" }),
  Object.freeze({ id: "curator",     label: "CURATOR" }),
  Object.freeze({ id: "scene",       label: "SCENE" }),
  Object.freeze({ id: "era",         label: "ERA" })
]);

const DIRECTION_IDS = new Set(SCOUT_DIRECTIONS.map(({ id }) => id));
const DEPTH_STEPS = Object.freeze([3, 6, 9]);
function finite(value, fallback) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function depthValue(value, fallback = 6) {
  const n = finite(value, fallback);
  return DEPTH_STEPS.reduce((best, step) => Math.abs(step - n) < Math.abs(best - n) ? step : best, DEPTH_STEPS[0]);
}

const ROUTE_PARAMETERS = SCOUT_DIRECTIONS.map(({ id, label }) => Object.freeze({
  id: `direction.${id}.weight`, label, group: "route-mixer", direction: id, control: "continuous",
  min: 0, max: 1, step: 0.05, defaultValue: 1, semantic: "routing_weight", evidenceAuthority: false, execution: "local"
}));
const SHAPE_PARAMETERS = [
  Object.freeze({ id: "shape.depth", label: "DEPTH", group: "shape", control: "stepped", values: DEPTH_STEPS, defaultValue: 6, semantic: "graph_depth", evidenceAuthority: false, execution: "next_dig" }),
  Object.freeze({ id: "shape.spread", label: "SPREAD", group: "shape", control: "continuous", min: 0, max: 1, step: 0.05, defaultValue: 1, semantic: "artist_dispersion", evidenceAuthority: false, execution: "local" })
];
export const SCOUT_PARAMETER_REGISTRY = Object.freeze([...ROUTE_PARAMETERS, ...SHAPE_PARAMETERS, ...["scope.distant", "scope.otherArtists", "scope.unknownArtists", "scope.collaborations", "scope.editorial", "scope.promotional", "view.sort"].map(id => Object.freeze({ id, group: "scope", control: id === "view.sort" ? "select" : "boolean", defaultValue: id === "view.sort" ? "explore" : false, semantic: "display_scope", evidenceAuthority: false, execution: "local" }))]);

export function createScoutPatch(input = {}) {
  const previous = input && typeof input === "object" ? input : {};
  const incoming = previous.directionWeights && typeof previous.directionWeights === "object" ? previous.directionWeights : {};
  const shape = previous.shape && typeof previous.shape === "object" ? previous.shape : {};
  const directionWeights = {};
  for (const { id } of SCOUT_DIRECTIONS) directionWeights[id] = clamp(finite(incoming[id], 1), 0, 1);
  return { schemaVersion: 2, directionWeights, includeUnknownArtists: previous.includeUnknownArtists === true, includeCollaborations: previous.includeCollaborations === true, includeEditorial: previous.includeEditorial === true, includePromotional: previous.includePromotional === true, includeDistant: previous.includeDistant === true, otherArtistsOnly: previous.otherArtistsOnly === true, sort: MUSIC_SORTS.some(([id]) => id === previous.sort) ? previous.sort : "explore", shuffleKey: String(previous.shuffleKey || "scout").slice(0, 100), shape: { depth: depthValue(shape.depth ?? previous.depth, 6), spread: clamp(finite(shape.spread ?? previous.spread, 1), 0, 1) } };
}
export function scoutParameterDefinition(parameterId) { return SCOUT_PARAMETER_REGISTRY.find(({ id }) => id === parameterId) || null; }
export function scoutParameterValue(patch, parameterId) {
  const d=scoutParameterDefinition(parameterId); if (!d) return undefined; const p=createScoutPatch(patch);
  if (d.group === "route-mixer") return p.directionWeights[d.direction];
  if (parameterId === "shape.depth") return p.shape.depth;
  if (parameterId === "shape.spread") return p.shape.spread;
  if (parameterId === "scope.distant") return p.includeDistant;
  if (parameterId === "scope.otherArtists") return p.otherArtistsOnly;
  if (parameterId === "scope.unknownArtists") return p.includeUnknownArtists;
  if (parameterId === "scope.collaborations") return p.includeCollaborations;
  if (parameterId === "scope.editorial") return p.includeEditorial;
  if (parameterId === "scope.promotional") return p.includePromotional;
  if (parameterId === "view.sort") return p.sort;
}
export function setScoutParameter(patch, parameterId, value) {
  const d=scoutParameterDefinition(parameterId); if (!d) throw new Error(`Paramètre Scout inconnu: ${parameterId}`); const p=createScoutPatch(patch);
  if (parameterId === "scope.distant") return { ...p, includeDistant: value === true };
  if (parameterId === "scope.otherArtists") return { ...p, otherArtistsOnly: value === true };
  if (parameterId === "scope.unknownArtists") return { ...p, includeUnknownArtists: value === true };
  if (parameterId === "scope.collaborations") return { ...p, includeCollaborations: value === true };
  if (parameterId === "scope.editorial") return { ...p, includeEditorial: value === true };
  if (parameterId === "scope.promotional") return { ...p, includePromotional: value === true };
  if (parameterId === "view.sort") return createScoutPatch({ ...p, sort: value });
  if (d.group === "route-mixer") {
    if (!DIRECTION_IDS.has(d.direction)) throw new Error(`Direction Scout inconnue: ${d.direction}`);
    return { ...p, directionWeights: { ...p.directionWeights, [d.direction]: clamp(finite(value,d.defaultValue), d.min, d.max) } };
  }
  if (parameterId === "shape.depth") return { ...p, shape: { ...p.shape, depth: depthValue(value,d.defaultValue) } };
  if (parameterId === "shape.spread") return { ...p, shape: { ...p.shape, spread: clamp(finite(value,d.defaultValue), d.min, d.max) } };
  throw new Error(`Paramètre Scout non câblé: ${parameterId}`);
}
