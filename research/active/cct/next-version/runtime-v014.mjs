import { readFileSync } from "node:fs";

const defaultSpecUrl = new URL("./v0.14-candidate.json", import.meta.url);

function clone(value) {
  return structuredClone(value);
}

function finiteMean(value) {
  const values = [];
  const visit = (item) => {
    if (Number.isFinite(item)) values.push(Number(item));
    else if (Array.isArray(item)) item.forEach(visit);
    else if (item && typeof item === "object") Object.values(item).forEach(visit);
  };
  visit(value);
  return values.length ? values.reduce((sum, item) => sum + item, 0) / values.length : 0;
}

function unique(values) {
  return [...new Set(values)];
}

export function loadV014Spec(url = defaultSpecUrl) {
  return JSON.parse(readFileSync(url, "utf8"));
}

export function validateV014Spec(spec) {
  const errors = [];
  if (spec?.document_kind !== "cct_executable_candidate") errors.push("document_kind must be cct_executable_candidate");
  if (spec?.version !== "0.14-candidate") errors.push("version must be 0.14-candidate");
  if (spec?.lifecycle?.state !== "written_untested" && spec?.lifecycle?.state !== "locally_tested") {
    errors.push("lifecycle must remain written_untested or locally_tested");
  }
  const mechanisms = spec?.mechanisms ?? [];
  if (mechanisms.length !== 3 || unique(mechanisms.map((item) => item.id)).length !== 3) errors.push("three unique executable mechanisms required");
  for (const mechanism of mechanisms) {
    const prefix = mechanism.id ?? "unknown";
    const activation = mechanism.activation ?? {};
    const active = mechanism.active ?? {};
    const expiry = mechanism.expiry ?? {};
    if (!activation.signalKinds?.length || !activation.requiredKeys?.length) errors.push(`${prefix}: observable signal and keys required`);
    if (unique(activation.requiredKeys ?? []).length !== activation.requiredKeys?.length) errors.push(`${prefix}: keys must be distinct`);
    if (!Number.isInteger(activation.minimumDistinctFailureDomains) || activation.minimumDistinctFailureDomains < 1) errors.push(`${prefix}: positive failure-domain threshold required`);
    if (!Number.isInteger(active.ttlSteps) || active.ttlSteps < 1) errors.push(`${prefix}: positive ttl required`);
    if (!active.obligationTags?.length || !active.safeFallbackTags?.length) errors.push(`${prefix}: obligations and safe fallback required`);
    if ((active.obligationTags ?? []).some((tag) => active.forbiddenTags?.includes(tag))) errors.push(`${prefix}: obligation cannot be forbidden`);
    if (!expiry.phase || typeof expiry.clearKeys !== "boolean") errors.push(`${prefix}: executable expiry required`);
    if (expiry.restitutionRequired && !expiry.renewalEvidence?.length) errors.push(`${prefix}: renewal evidence required`);
    if (!mechanism.traces?.length) errors.push(`${prefix}: traces required`);
  }
  if (spec?.future_arena?.old_worlds_role !== "development_regression_only") errors.push("old worlds must remain development-only");
  for (const field of ["acceptance_requires_new_frozen_worlds", "matched_information_budget", "matched_action_budget", "matched_public_action_ontology", "blind_identity_until_vector_verdict", "scalar_winner_forbidden"]) {
    if (spec?.future_arena?.[field] !== true) errors.push(`future_arena.${field} must be true`);
  }
  return errors;
}

function initialMechanismState() {
  return {
    phase: "inactive",
    cycle: 0,
    activatedAt: null,
    expiresAt: null,
    signals: [],
    keys: [],
    evidence: [],
    fulfilledTags: [],
  };
}

function signalQualifies(mechanism, signals) {
  const activation = mechanism.activation;
  const relevant = signals.filter((signal) => activation.signalKinds.includes(signal.kind) && signal.confirmed === true);
  const groups = new Map();
  for (const signal of relevant) {
    if (activation.requiredAffectsAny?.length && !activation.requiredAffectsAny.includes(signal.affects)) continue;
    const group = signal[activation.groupBy] ?? "__ungrouped__";
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(signal);
  }
  return [...groups.values()].some((items) => unique(items.map((item) => item.failureDomain)).length >= activation.minimumDistinctFailureDomains);
}

function requirePublicView(view, allowedActions) {
  const cct = view?.cct;
  if (!cct || !Number.isInteger(cct.tick)) throw new Error("CCT_INTERFACE_MISSING: view.cct.tick");
  for (const field of ["signals", "keyGrants", "keyRevocations", "evidence"]) {
    if (!Array.isArray(cct[field])) throw new Error(`CCT_INTERFACE_MISSING: view.cct.${field}`);
  }
  if (!cct.actionOntology || typeof cct.actionOntology !== "object") throw new Error("CCT_INTERFACE_MISSING: view.cct.actionOntology");
  for (const action of allowedActions) {
    const semantics = cct.actionOntology[action];
    if (!semantics || !Array.isArray(semantics.tags) || !Number.isFinite(semantics.burden) || !semantics.actor || semantics.traceable !== true) {
      throw new Error(`CCT_ACTION_SEMANTICS_MISSING: ${action}`);
    }
  }
  return cct;
}

export class CctV014Runtime {
  constructor(spec = loadV014Spec()) {
    const errors = validateV014Spec(spec);
    if (errors.length) throw new Error(`invalid CCT v0.14 spec: ${errors.join("; ")}`);
    this.spec = clone(spec);
    this.state = Object.fromEntries(spec.mechanisms.map((mechanism) => [mechanism.id, initialMechanismState()]));
    this.trace = [];
    this.lastTick = -1;
  }

  #advance(mechanism, publicView) {
    const state = this.state[mechanism.id];
    const tick = publicView.tick;
    if (state.phase === "active" && tick >= state.expiresAt) {
      state.phase = mechanism.expiry.phase;
      state.activatedAt = null;
      state.expiresAt = null;
      state.fulfilledTags = [];
      if (mechanism.expiry.clearKeys) state.keys = [];
      this.trace.push({ tick, mechanismId: mechanism.id, event: "expired", phase: state.phase });
    }

    const revocations = publicView.keyRevocations.filter((item) => item.mechanismId === mechanism.id).map((item) => item.key);
    if (revocations.length) {
      state.keys = state.keys.filter((key) => !revocations.includes(key));
      if (state.phase === "active") {
        state.phase = mechanism.expiry.phase;
        state.activatedAt = null;
        state.expiresAt = null;
        state.fulfilledTags = [];
        this.trace.push({ tick, mechanismId: mechanism.id, event: "key_revoked", keys: unique(revocations).sort(), phase: state.phase });
      }
    }

    const serializedSignals = [
      ...state.signals.map((item) => JSON.stringify(item)),
      ...publicView.signals.filter((item) => item.id).map((item) => JSON.stringify(item)),
    ];
    state.signals = unique(serializedSignals).sort().map((item) => JSON.parse(item));
    state.evidence = unique([...state.evidence, ...publicView.evidence.filter((item) => item.mechanismId === mechanism.id).map((item) => item.kind)]).sort();
    state.keys = unique([...state.keys, ...publicView.keyGrants.filter((item) => item.mechanismId === mechanism.id && item.authorityTrace).map((item) => item.key)]).sort();

    const signalReady = signalQualifies(mechanism, state.signals);
    const keysReady = mechanism.activation.requiredKeys.every((key) => state.keys.includes(key));
    const renewalReady = mechanism.expiry.renewalEvidence.every((kind) => state.evidence.includes(kind));
    const canEnter = state.phase === "inactive" || state.phase === "awaiting_keys";
    const canRenew = ["restitution_due", "reconciliation_due"].includes(state.phase) && renewalReady;
    if ((canEnter || canRenew) && signalReady) {
      if (keysReady) {
        state.phase = "active";
        state.cycle += 1;
        state.activatedAt = tick;
        state.expiresAt = tick + mechanism.active.ttlSteps;
        state.fulfilledTags = [];
        state.evidence = [];
        this.trace.push({ tick, mechanismId: mechanism.id, event: canRenew ? "renewed" : "activated", cycle: state.cycle, expiresAt: state.expiresAt });
      } else if (canEnter) {
        state.phase = "awaiting_keys";
      }
    }
  }

  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (!Array.isArray(allowedActions) || !allowedActions.length) throw new Error("CCT_INTERFACE_MISSING: allowedActions");
    const publicView = requirePublicView(view, allowedActions);
    if (publicView.tick < this.lastTick) throw new Error("CCT_TIME_REGRESSION");
    this.lastTick = publicView.tick;
    [...this.spec.mechanisms].sort((a, b) => a.id.localeCompare(b.id)).forEach((mechanism) => this.#advance(mechanism, publicView));

    const active = this.spec.mechanisms.filter((mechanism) => this.state[mechanism.id].phase === "active");
    const forbidden = new Set(active.flatMap((mechanism) => mechanism.active.forbiddenTags));
    const pending = [];
    for (const mechanism of active) {
      const fulfilled = new Set(this.state[mechanism.id].fulfilledTags);
      for (const tag of mechanism.active.obligationTags) if (!fulfilled.has(tag)) pending.push({ tag, priority: mechanism.priority, mechanismId: mechanism.id });
    }
    const candidates = allowedActions.map((action) => {
      const semantics = publicView.actionOntology[action];
      const forbiddenHits = semantics.tags.filter((tag) => forbidden.has(tag));
      const covered = pending.filter((item) => semantics.tags.includes(item.tag));
      const score = covered.reduce((sum, item) => sum + item.priority, 0);
      const fallbackHits = active.reduce((sum, mechanism) => sum + mechanism.active.safeFallbackTags.filter((tag) => semantics.tags.includes(tag)).length, 0);
      return { action, semantics, forbiddenHits, covered, score, fallbackHits };
    }).filter((item) => item.forbiddenHits.length === 0)
      .sort((left, right) => right.score - left.score || right.fallbackHits - left.fallbackHits || left.semantics.burden - right.semantics.burden || left.action.localeCompare(right.action));
    if (!candidates.length) throw new Error("CCT_NO_ADMISSIBLE_NONFORBIDDEN_ACTION");
    const selected = candidates[0];
    for (const item of selected.covered) {
      const state = this.state[item.mechanismId];
      state.fulfilledTags = unique([...state.fulfilledTags, item.tag]).sort();
    }
    const traceEntry = {
      tick: publicView.tick,
      event: "decision",
      action: selected.action,
      activeMechanisms: active.map((item) => item.id).sort(),
      satisfiedTags: selected.covered.map((item) => item.tag).sort(),
      pendingTags: pending.map((item) => item.tag).sort(),
      burden: selected.semantics.burden,
    };
    this.trace.push(traceEntry);
    const estimate = finiteMean(view.publicState ?? view.observation ?? history.at(-1)?.observation ?? {});
    return {
      action: selected.action,
      predictions: Object.fromEntries(predictionKeys.map((key) => [key, estimate])),
      governance: traceEntry,
    };
  }

  snapshot() {
    return { mechanisms: clone(this.state), trace: clone(this.trace), lastTick: this.lastTick };
  }
}

export function createCctV014Contender({ spec = loadV014Spec(), predictionKeys = [] } = {}) {
  const runtime = new CctV014Runtime(spec);
  return {
    manifest: {
      id: "cct-v014-executable",
      version: "0.14.0-candidate",
      title: "CCT v0.14 executable institutional interface",
      family: "constitutional-state-machine",
    },
    decide({ view, allowedActions, history }) {
      return runtime.decide({ view, allowedActions, history, predictionKeys });
    },
    snapshot: () => runtime.snapshot(),
  };
}
