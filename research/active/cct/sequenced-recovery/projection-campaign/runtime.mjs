import { readFileSync } from "node:fs";

const defaultContractUrl = new URL("./contract.json", import.meta.url);
const AXES = [
  "besoins_vitaux",
  "plafond_ecologique",
  "droits",
  "attribution_du_pouvoir",
  "portabilite_effective",
  "recuperation",
];

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

export function loadProjectionContract(url = defaultContractUrl) {
  return JSON.parse(readFileSync(url, "utf8"));
}

export function validateProjectionContract(contract) {
  const errors = [];
  if (contract?.schema !== "cct-virelia-projection-contract/v1") errors.push("unsupported projection schema");
  if (contract?.version !== "0.1-candidate") errors.push("projection must remain a candidate");
  if (!contract?.worldFreeze?.contentHash?.startsWith("sha256:")) errors.push("world freeze hash required");
  if (!contract?.cctFreeze?.id) errors.push("CCT freeze id required");
  if (JSON.stringify(Object.keys(contract?.publicProxyAxes ?? {})) !== JSON.stringify(AXES)) errors.push("six ordered CCT axes required");
  if (contract?.publicProxyAxes?.attribution_du_pouvoir?.constructStatus !== "unobservable_unconfirmed") errors.push("power attribution must remain unobservable");
  for (const axis of AXES.filter((name) => name !== "attribution_du_pouvoir")) {
    if (contract?.publicProxyAxes?.[axis]?.constructStatus !== "proxy_substitution") errors.push(`${axis} must remain marked as proxy substitution`);
  }
  const profiles = contract?.profiles ?? [];
  if (profiles.length !== 3 || new Set(profiles.map((profile) => profile.id)).size !== 3) errors.push("three unique projection profiles required");
  if (profiles.find((profile) => profile.id === "P0-strict-original-view")?.executableForCct !== false) errors.push("P0 must remain non-executable for CCT");
  if (profiles.find((profile) => profile.id === "P2-optimistic-harm-omission")?.omitCompiledHarms !== true) errors.push("P2 must omit compiled harms");
  if (contract?.fairness?.noScalarWinner !== true) errors.push("scalar winners are forbidden");
  if (!(contract?.reversalConditions ?? []).some((item) => item.includes("do not fabricate post-refusal"))) errors.push("post-refusal fabrication fence missing");
  return errors;
}

function profileById(contract, profileId) {
  const profile = contract.profiles.find((item) => item.id === profileId);
  if (!profile) throw new Error(`unknown projection profile: ${profileId}`);
  return profile;
}

export function compileAxisRisks(publicState) {
  const values = {
    besoins_vitaux: ((100 - publicState.groundwater_index) + publicState.disease_load) / 40,
    plafond_ecologique: (100 - publicState.seismic_stability) / 20,
    droits: (100 - publicState.trust_index) / 20,
    attribution_du_pouvoir: 0,
    portabilite_effective: (100 - publicState.harbor_depth) / 20,
    recuperation: ((100 - publicState.material_stock) + (100 - publicState.seismic_stability)) / 40,
  };
  const channels = {
    besoins_vitaux: "groundwater_index+disease_load",
    plafond_ecologique: "seismic_stability",
    droits: "trust_index",
    attribution_du_pouvoir: "unobservable",
    portabilite_effective: "harbor_depth",
    recuperation: "material_stock+seismic_stability",
  };
  return AXES.map((axis) => ({
    id: `virelia-proxy:${axis}`,
    axis,
    severity: axis === "attribution_du_pouvoir" ? 0 : clamp(values[axis], 0, 5),
    confirmed: axis !== "attribution_du_pouvoir",
    channel: channels[axis],
    failureDomain: `public-proxy:${channels[axis]}`,
  }));
}

function immediatePublicEffects(document, actionId) {
  const publicNames = new Set(document.view.public_visible);
  const effects = Object.fromEntries(document.view.public_visible.map((name) => [name, 0]));
  const rule = document.transitions.rules.find((item) => item.action === actionId);
  if (!rule) return effects;
  for (const operation of rule.ops ?? []) {
    if (publicNames.has(operation.var) && Number.isFinite(operation.delta)) effects[operation.var] += operation.delta;
  }
  if (rule.dependency_link && publicNames.has(rule.dependency_link.target_var)) {
    const source = rule.ops.find((operation) => operation.var === rule.dependency_link.source_var && Number.isFinite(operation.delta));
    if (source) effects[rule.dependency_link.target_var] += source.delta * rule.dependency_link.factor;
  }
  return effects;
}

function bundleEffects(document, bundleId) {
  const effects = Object.fromEntries(document.view.public_visible.map((name) => [name, 0]));
  const components = bundleId.startsWith("__") ? [] : uniqueSorted(bundleId.split("+").filter(Boolean));
  for (const component of components) {
    for (const [name, delta] of Object.entries(immediatePublicEffects(document, component))) effects[name] += delta;
  }
  return { components, effects };
}

function axisEffect(effects) {
  return {
    besoins_vitaux: effects.groundwater_index - effects.disease_load,
    plafond_ecologique: effects.seismic_stability,
    droits: effects.trust_index,
    attribution_du_pouvoir: 0,
    portabilite_effective: effects.harbor_depth,
    recuperation: (effects.material_stock + effects.seismic_stability) / 2,
  };
}

export function compileActionSemantics(document, bundleId, { omitCompiledHarms = false } = {}) {
  const { components, effects } = bundleEffects(document, bundleId);
  const byAxis = axisEffect(effects);
  const protectsAxes = AXES.filter((axis) => byAxis[axis] > 0);
  const harmsAxes = omitCompiledHarms ? [] : AXES.filter((axis) => byAxis[axis] < 0);
  const vital = protectsAxes.includes("besoins_vitaux");
  const suspends = protectsAxes.includes("plafond_ecologique");
  let recoveryKind = "ordinary";
  if (vital && suspends) recoveryKind = "triage";
  else if (protectsAxes.includes("portabilite_effective") || protectsAxes.includes("recuperation")) recoveryKind = "capacity_acquisition";
  const capacityGain = recoveryKind === "capacity_acquisition"
    ? Math.max(0, byAxis.portabilite_effective, byAxis.recuperation)
    : 0;
  const resourceCost = components.reduce((sum, action) => sum + document.actions[action].cost, 0);
  return {
    tags: components.map((action) => document.actions[action].public_label).sort(),
    burden: resourceCost,
    actor: "unspecified-virelia-operator",
    traceable: true,
    resourceCost,
    protectsAxes,
    harmsAxes,
    constitutionalTags: [],
    recoveryKind,
    ensuresVitalMinimum: vital,
    suspendsIrreversibility: suspends,
    capacityGain,
    gainMaturesAfterTicks: capacityGain > 0 ? 1 : 0,
    gainFailureDomain: capacityGain > 0 ? "compiled-public-capacity-proxy" : "none",
    restoresAxes: [],
    responsibleActor: "unspecified-virelia-operator",
    debtBearers: ["unresolved-affected-virelia-publics"],
    recourseChannel: "absent-in-virelia-source",
    projectionTrace: { components, immediatePublicEffects: effects, proxyEffects: byAxis },
  };
}

export function projectCctInterface({ contract = loadProjectionContract(), document, baseView, allowedActions, profileId, tick }) {
  const profile = profileById(contract, profileId);
  if (!profile.executableForCct) return structuredClone(baseView);
  const actionOntology = Object.fromEntries(allowedActions.map((action) => [
    action,
    compileActionSemantics(document, action, { omitCompiledHarms: profile.omitCompiledHarms }),
  ]));
  const publicState = Object.fromEntries(document.view.public_visible.map((name) => [name, baseView[name]]));
  return {
    ...structuredClone(baseView),
    cct: {
      tick,
      axisRisks: compileAxisRisks(publicState),
      capacityBudget: document.manifest.action_budget_per_round,
      actionOntology,
      capacityReceipts: [],
      repairReceipts: [],
      signals: [],
      keyGrants: [],
      keyRevocations: [],
      evidence: [],
      projectionProfile: profileId,
    },
  };
}

export const CCT_PROJECTION_AXES = [...AXES];
