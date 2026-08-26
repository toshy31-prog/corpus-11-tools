const AXES = ["besoins_vitaux", "plafond_ecologique", "droits", "attribution_du_pouvoir", "portabilite_effective", "recuperation"];

function clamp(x) { return Math.max(0, Math.min(5, x)); }
function effectsFor(document, bundle) {
  const effects = Object.fromEntries(document.view.public_visible.map((name) => [name, 0]));
  const components = bundle.startsWith("__") ? [] : [...new Set(bundle.split("+"))].sort();
  for (const action of components) {
    const rule = document.transitions.rules.find((item) => item.action === action);
    for (const op of rule?.ops ?? []) if (Number.isFinite(op.delta) && Object.hasOwn(effects, op.var)) effects[op.var] += op.delta;
  }
  return { components, effects };
}
function axisEffects(e) {
  return {
    besoins_vitaux: (e.freshwater_reservoir + e.energy_grid_stability) / 2,
    plafond_ecologique: e.marine_ecosystem_health - e.deep_sea_pressure,
    droits: e.population_morale,
    attribution_du_pouvoir: -e.harvester_influence,
    portabilite_effective: e.structural_integrity,
    recuperation: -e.bridge_maintenance_debt,
  };
}
export function project({ document, baseView, allowedActions, profileId, tick }) {
  const omitHarms = profileId === "P2-optimistic-harm-omission";
  const risks = {
    besoins_vitaux: ((100 - baseView.freshwater_reservoir) + (100 - baseView.energy_grid_stability)) / 40,
    plafond_ecologique: ((100 - baseView.marine_ecosystem_health) + baseView.deep_sea_pressure) / 40,
    droits: (100 - baseView.population_morale) / 20,
    attribution_du_pouvoir: baseView.harvester_influence / 20,
    portabilite_effective: (100 - baseView.structural_integrity) / 20,
    recuperation: baseView.bridge_maintenance_debt / 20,
  };
  const actionOntology = Object.fromEntries(allowedActions.map((action) => {
    const { components, effects } = effectsFor(document, action);
    const raw = axisEffects(effects);
    const effective = Object.fromEntries(AXES.map((axis) => [axis, omitHarms ? Math.max(0, raw[axis]) : raw[axis]]));
    const protects = AXES.filter((axis) => effective[axis] > 0);
    const harms = AXES.filter((axis) => effective[axis] < 0);
    const vital = effective.besoins_vitaux > 0;
    const ecology = effective.plafond_ecologique > 0;
    let kind = "ordinary";
    if (vital && ecology) kind = "triage";
    else if (effective.portabilite_effective > 0 || effective.recuperation > 0) kind = "capacity_acquisition";
    const gain = kind === "capacity_acquisition" ? Math.max(0, effective.portabilite_effective, effective.recuperation) : 0;
    const cost = components.reduce((sum, id) => sum + document.actions[id].cost, 0);
    return [action, {
      resourceCost: cost, protectsAxes: protects, harmsAxes: harms, constitutionalTags: [], recoveryKind: kind,
      ensuresVitalMinimum: vital, suspendsIrreversibility: ecology, capacityGain: gain,
      gainMaturesAfterTicks: gain > 0 ? 1 : 0, gainFailureDomain: gain > 0 ? "kryos-public-proxy" : "none",
      restoresAxes: [], responsibleActor: "unspecified-kryos-operator", debtBearers: ["unresolved-kryos-publics"],
      recourseChannel: "absent-in-kryos-source",
      effectEvidence: { axisDeltas: effective, observedFrom: "public_immediate_effects", noFutureLeak: true },
      projectionTrace: { components, immediatePublicEffects: effects, rawAxisEffects: raw }
    }];
  }));
  return { ...structuredClone(baseView), cct: {
    tick, axisRisks: AXES.map((axis) => ({ id: `kryos-proxy:${axis}`, axis, severity: clamp(risks[axis]), confirmed: true, channel: "public-proxy", failureDomain: "projection" })),
    capacityBudget: 10, actionOntology, capacityReceipts: [], repairReceipts: [], signals: [], keyGrants: [], keyRevocations: [], evidence: [], projectionProfile: profileId
  }};
}
export const PROJECTION_AXES = [...AXES];
