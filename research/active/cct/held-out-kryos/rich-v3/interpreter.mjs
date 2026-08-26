import { verifyScenarioFreeze } from "../../../../../corpus-11-tools/labs/experiment-lab/arena/declarative/hash.mjs";

const EXECUTION_ORDER = [
  "check_preconditions",
  "apply_action_ops",
  "apply_dependency_link",
  "apply_irreversible_if",
  "apply_immediate_gain_destroys_future",
  "apply_exogenous_ops",
  "queue_delayed",
  "apply_due_delayed",
  "apply_global_rules_once",
  "clamp_all",
];

const CONDITION_OPS = new Set(["and", "or", "not", "lt", "lte", "gt", "gte", "eq", "action_was"]);
const VALUE_OPS = new Set(["var", "add", "sub", "mul", "div", "min", "max", "abs", "mean"]);
const FORCED_NO_ACTION = "__forced_no_action__";

function clone(value) {
  return structuredClone(value);
}

function unique(values) {
  return [...new Set(values)];
}

function assertFinite(value, message, errors) {
  if (!Number.isFinite(value)) errors.push(message);
}

function validateCondition(node, stateNames, path, errors) {
  if (!node || typeof node !== "object" || Array.isArray(node) || !CONDITION_OPS.has(node.op)) {
    errors.push(`${path}: unsupported condition`);
    return;
  }
  if (["and", "or"].includes(node.op)) {
    if (!Array.isArray(node.args) || node.args.length < 1) errors.push(`${path}: ${node.op} requires args`);
    else node.args.forEach((arg, index) => validateCondition(arg, stateNames, `${path}.args[${index}]`, errors));
    return;
  }
  if (node.op === "not") {
    if (!Array.isArray(node.args) || node.args.length !== 1) errors.push(`${path}: not requires one arg`);
    else validateCondition(node.args[0], stateNames, `${path}.args[0]`, errors);
    return;
  }
  if (node.op === "action_was") {
    if (typeof node.value !== "string" || !node.value) errors.push(`${path}: action_was requires a value`);
    return;
  }
  if (!stateNames.has(node.var)) errors.push(`${path}: unknown state variable ${node.var}`);
  assertFinite(node.value, `${path}: comparison value must be finite`, errors);
}

function validateValue(node, stateNames, path, errors) {
  if (Number.isFinite(node)) return;
  if (typeof node === "string") {
    if (!stateNames.has(node)) errors.push(`${path}: unknown variable reference ${node}`);
    return;
  }
  if (!node || typeof node !== "object" || Array.isArray(node)) {
    errors.push(`${path}: unsupported value expression`);
    return;
  }
  if (Object.keys(node).length === 1 && typeof node.var === "string") {
    if (!stateNames.has(node.var)) errors.push(`${path}: unknown variable ${node.var}`);
    return;
  }
  if (!VALUE_OPS.has(node.op)) {
    errors.push(`${path}: unsupported value operator ${node.op ?? "<missing>"}`);
    return;
  }
  if (node.op === "var") {
    if (!stateNames.has(node.var)) errors.push(`${path}: unknown variable ${node.var}`);
    return;
  }
  if (!Array.isArray(node.args) || node.args.length < 1) {
    errors.push(`${path}: ${node.op} requires args`);
    return;
  }
  node.args.forEach((arg, index) => validateValue(arg, stateNames, `${path}.args[${index}]`, errors));
}

function validateOps(ops, stateNames, path, errors) {
  if (!Array.isArray(ops)) {
    errors.push(`${path}: ops must be an array`);
    return;
  }
  for (const [index, operation] of ops.entries()) {
    const opPath = `${path}[${index}]`;
    if (!operation || typeof operation !== "object" || !stateNames.has(operation.var)) {
      errors.push(`${opPath}: operation requires a known var`);
      continue;
    }
    if (Object.hasOwn(operation, "delta")) assertFinite(operation.delta, `${opPath}: delta must be finite`, errors);
    else if (["min", "max"].includes(operation.op) && Array.isArray(operation.args)) {
      operation.args.forEach((arg, argIndex) => validateValue(arg, stateNames, `${opPath}.args[${argIndex}]`, errors));
    } else errors.push(`${opPath}: only delta|min|max operations are supported`);
  }
}

function validatePermanentOps(ops, stateNames, path, errors) {
  validateOps(ops, stateNames, path, errors);
  for (const [index, operation] of (ops ?? []).entries()) {
    if (!["min", "max"].includes(operation?.op)) {
      errors.push(`${path}[${index}]: permanent effects require min|max`);
    } else if (!(operation.args ?? []).some(Number.isFinite)) {
      errors.push(`${path}[${index}]: permanent effects require a numeric literal bound`);
    }
  }
}

export function validateRichDocument(document) {
  const errors = [];
  const warnings = [];
  if (document?.schema !== "corpus-open-world/v1") errors.push("schema must be corpus-open-world/v1");
  const manifest = document?.manifest ?? {};
  if (!manifest.id || !manifest.version || !manifest.title) errors.push("manifest id, version and title are required");
  if (!Number.isInteger(manifest.rounds) || manifest.rounds < 1) errors.push("manifest.rounds must be positive");
  if (!Number.isInteger(manifest.action_budget_per_round) || manifest.action_budget_per_round < 1) errors.push("positive action budget required");
  if (!Number.isInteger(manifest.max_actions_per_round) || manifest.max_actions_per_round < 1 || manifest.max_actions_per_round > 2) errors.push("interpreter v2 supports one or two actions per round");

  const descriptors = document?.state ?? {};
  const stateNames = new Set(Object.keys(descriptors));
  if (stateNames.size < 2) errors.push("at least two state variables required");
  for (const [name, descriptor] of Object.entries(descriptors)) {
    assertFinite(descriptor?.value, `state.${name}.value must be finite`, errors);
    assertFinite(descriptor?.min, `state.${name}.min must be finite`, errors);
    assertFinite(descriptor?.max, `state.${name}.max must be finite`, errors);
    if (descriptor?.min > descriptor?.value || descriptor?.value > descriptor?.max) errors.push(`state.${name} initial value outside bounds`);
    if (document?.initialState?.[name] !== descriptor?.value) errors.push(`initialState.${name} must equal state descriptor value`);
  }
  if (Object.keys(document?.initialState ?? {}).some((name) => !stateNames.has(name))) errors.push("initialState contains an unknown variable");

  const actions = document?.actions ?? {};
  const actionNames = Object.keys(actions);
  if (actionNames.length < 2) errors.push("at least two actions required");
  for (const [name, action] of Object.entries(actions)) {
    if (!Number.isFinite(action?.cost) || action.cost <= 0 || action.cost > manifest.action_budget_per_round) errors.push(`actions.${name}.cost invalid`);
    validateCondition(action?.precondition, stateNames, `actions.${name}.precondition`, errors);
  }

  if (!Array.isArray(document?.exogenous) || document.exogenous.length !== manifest.rounds) errors.push("exogenous length must equal rounds");
  else document.exogenous.forEach((event, index) => {
    if (event.round !== index + 1) errors.push(`exogenous[${index}].round must be ${index + 1}`);
    validateOps(event.ops, stateNames, `exogenous[${index}].ops`, errors);
  });

  const transitions = document?.transitions ?? {};
  if (JSON.stringify(transitions.execution_order) !== JSON.stringify(EXECUTION_ORDER)) errors.push("execution_order is unsupported or ambiguous");
  const rules = Array.isArray(transitions.rules) ? transitions.rules : [];
  if (unique(rules.map((rule) => rule.action)).length !== actionNames.length
      || actionNames.some((name) => !rules.some((rule) => rule.action === name))) errors.push("transitions.rules must contain exactly one rule per action");
  for (const [index, rule] of rules.entries()) {
    validateOps(rule.ops, stateNames, `transitions.rules[${index}].ops`, errors);
    for (const [delayedIndex, delayed] of (rule.delayed ?? []).entries()) {
      if (!Number.isInteger(delayed.after_rounds) || delayed.after_rounds < 1) errors.push(`transitions.rules[${index}].delayed[${delayedIndex}] invalid delay`);
      validateOps(delayed.ops, stateNames, `transitions.rules[${index}].delayed[${delayedIndex}].ops`, errors);
    }
    if (rule.dependency_link) {
      if (!stateNames.has(rule.dependency_link.source_var) || !stateNames.has(rule.dependency_link.target_var)
          || !Number.isFinite(rule.dependency_link.factor)) errors.push(`transitions.rules[${index}].dependency_link invalid`);
      const sourceOp = rule.ops?.find((operation) => operation.var === rule.dependency_link.source_var && Number.isFinite(operation.delta));
      if (!sourceOp) errors.push(`transitions.rules[${index}].dependency_link lacks finite source delta`);
    }
    if (rule.irreversible_if) {
      validateCondition(rule.irreversible_if.condition, stateNames, `transitions.rules[${index}].irreversible_if.condition`, errors);
      validatePermanentOps(rule.irreversible_if.ops, stateNames, `transitions.rules[${index}].irreversible_if.ops`, errors);
    }
    if (rule.immediate_gain_destroys_future) validatePermanentOps(rule.immediate_gain_destroys_future.ops, stateNames, `transitions.rules[${index}].immediate_gain_destroys_future.ops`, errors);
  }

  const globalRules = document?.transitions?.global_rules;
  if (!Array.isArray(globalRules) || globalRules.length < 1) errors.push("transitions.global_rules required in rich v3");
  else {
    if (unique(globalRules.map((rule) => rule.id)).length !== globalRules.length) errors.push("global rule ids must be unique");
    if (unique(globalRules.map((rule) => rule.flag)).length !== globalRules.length) errors.push("global rule flags must be unique");
    globalRules.forEach((rule, index) => {
      const path = `transitions.global_rules[${index}]`;
      if (!rule.id || typeof rule.id !== "string") errors.push(`${path}.id required`);
      if (!(rule.round === null || (Number.isInteger(rule.round) && rule.round >= 1 && rule.round <= manifest.rounds))) errors.push(`${path}.round invalid`);
      if (rule.once !== true) errors.push(`${path}.once must be true`);
      if (!stateNames.has(rule.flag)) errors.push(`${path}.flag must name a state variable`);
      else {
        const descriptor = descriptors[rule.flag];
        if (descriptor.min !== 0 || descriptor.max !== 1 || document.initialState[rule.flag] !== 0) errors.push(`${path}.flag must be hidden binary state initialized to zero`);
        if (!document?.view?.hidden?.includes(rule.flag)) errors.push(`${path}.flag must be hidden`);
      }
      validateCondition(rule.condition, stateNames, `${path}.condition`, errors);
      validateOps(rule.ops, stateNames, `${path}.ops`, errors);
    });
  }

  const publicNames = document?.view?.public_visible;
  if (!Array.isArray(publicNames) || publicNames.length < 1 || publicNames.some((name) => !stateNames.has(name))) errors.push("view.public_visible must name known state variables");
  if (document?.observation?.computation?.op !== "select"
      || JSON.stringify(document.observation.computation.vars) !== JSON.stringify(publicNames)) errors.push("observation must select exactly the public view variables");

  const dimensions = document?.outcomes?.dimensions;
  if (!Array.isArray(dimensions) || dimensions.length < 2) errors.push("outcomes.dimensions must contain at least two dimensions");
  else {
    if (manifest.dimensions !== dimensions.length) errors.push("manifest.dimensions count mismatch");
    if (unique(dimensions.map((dimension) => dimension.id)).length !== dimensions.length) errors.push("outcome dimension ids must be unique");
    dimensions.forEach((dimension, index) => {
      validateValue(dimension.derived_from, stateNames, `outcomes.dimensions[${index}].derived_from`, errors);
      assertFinite(dimension.failure_threshold, `outcomes.dimensions[${index}].failure_threshold must be finite`, errors);
      if (dimension.favorable !== "higher" || dimension.never_merge !== true) errors.push(`outcomes.dimensions[${index}] orientation or non-merge fence unsupported`);
    });
  }
  if (document?.outcomes?.no_global_score !== true || document?.outcomes?.no_hidden_weights !== true) errors.push("outcome scalar fences required");

  const reversals = document?.reversalConditions;
  if (!Array.isArray(reversals) || reversals.length < 1) errors.push("reversalConditions required");
  else {
    if (manifest.reversalConditions !== reversals.length) errors.push("manifest.reversalConditions count mismatch");
    reversals.forEach((reversal, index) => {
      validateCondition(reversal.trigger, stateNames, `reversalConditions[${index}].trigger`, errors);
      if (!["lock_all_dimensions_failed", undefined].includes(reversal.effect?.op)) errors.push(`reversalConditions[${index}].effect op unsupported`);
      if (reversal.effect?.ops) validatePermanentOps(reversal.effect.ops, stateNames, `reversalConditions[${index}].effect.ops`, errors);
    });
  }

  if (!Array.isArray(document?.predictionTargets)) errors.push("predictionTargets must be an array in rich v2");
  else warnings.push("prediction targets are normalized to public observable variables to prevent hidden-outcome leakage");
  warnings.push("two-action bundles are treated as unordered sets; phase operations are applied in canonical action-id order");
  warnings.push("admissible bundle lists can reveal whether hidden-state preconditions hold");
  warnings.push("when no declared action is admissible, the interpreter exposes a reserved forced-inaction action so exogenous and due delayed effects still advance");
  return { valid: errors.length === 0, errors, warnings };
}

function evaluateValue(node, state) {
  if (Number.isFinite(node)) return node;
  if (typeof node === "string") return state[node];
  if (Object.keys(node).length === 1 && typeof node.var === "string") return state[node.var];
  if (node.op === "var") return state[node.var];
  const values = node.args.map((arg) => evaluateValue(arg, state));
  if (node.op === "add") return values.reduce((sum, value) => sum + value, 0);
  if (node.op === "sub") return values.slice(1).reduce((result, value) => result - value, values[0]);
  if (node.op === "mul") return values.reduce((result, value) => result * value, 1);
  if (node.op === "div") return values.slice(1).reduce((result, value) => result / value, values[0]);
  if (node.op === "min") return Math.min(...values);
  if (node.op === "max") return Math.max(...values);
  if (node.op === "abs") return Math.abs(values[0]);
  if (node.op === "mean") return values.reduce((sum, value) => sum + value, 0) / values.length;
  throw new Error(`unsupported value operator at runtime: ${node.op}`);
}

function evaluateCondition(node, state, actions = []) {
  if (node.op === "and") return node.args.every((arg) => evaluateCondition(arg, state, actions));
  if (node.op === "or") return node.args.some((arg) => evaluateCondition(arg, state, actions));
  if (node.op === "not") return !evaluateCondition(node.args[0], state, actions);
  if (node.op === "action_was") return actions.includes(node.value);
  const left = state[node.var];
  if (node.op === "lt") return left < node.value;
  if (node.op === "lte") return left <= node.value;
  if (node.op === "gt") return left > node.value;
  if (node.op === "gte") return left >= node.value;
  if (node.op === "eq") return left === node.value;
  throw new Error(`unsupported condition operator at runtime: ${node.op}`);
}

function canonicalActionSet(actions) {
  return unique(actions).sort();
}

function actionSetId(actions) {
  return canonicalActionSet(actions).join("+");
}

function combinations(names, maxSize) {
  const result = [];
  const visit = (start, selected) => {
    if (selected.length) result.push([...selected]);
    if (selected.length === maxSize) return;
    for (let index = start; index < names.length; index += 1) {
      selected.push(names[index]);
      visit(index + 1, selected);
      selected.pop();
    }
  };
  visit(0, []);
  return result;
}

function outcomeVector(document, state) {
  return Object.fromEntries(document.outcomes.dimensions.map((dimension) => [dimension.id, evaluateValue(dimension.derived_from, state)]));
}

function failedOutcomeVector(document) {
  return Object.fromEntries(document.outcomes.dimensions.map((dimension) => [dimension.id, dimension.failure_threshold]));
}

function permanentBound(operation) {
  const literals = (operation.args ?? []).filter(Number.isFinite);
  if (!literals.length) throw new Error(`permanent ${operation.op} operation on ${operation.var} requires a numeric literal bound`);
  return operation.op === "min" ? Math.min(...literals) : Math.max(...literals);
}

function applyOps(ops, world, { permanentCap = false } = {}) {
  for (const operation of ops ?? []) {
    if (Object.hasOwn(operation, "delta")) world.state[operation.var] += operation.delta;
    else {
      const value = evaluateValue({ op: operation.op, args: operation.args }, world.state);
      world.state[operation.var] = value;
      if (permanentCap && operation.op === "min") {
        world.caps[operation.var] = Math.min(world.caps[operation.var] ?? Infinity, permanentBound(operation));
      }
      if (permanentCap && operation.op === "max") {
        world.floors[operation.var] = Math.max(world.floors[operation.var] ?? -Infinity, permanentBound(operation));
      }
    }
  }
}

function clampWorld(document, world) {
  for (const [name, descriptor] of Object.entries(document.state)) {
    const maximum = Math.min(descriptor.max, world.caps[name] ?? Infinity);
    const minimum = Math.max(descriptor.min, world.floors[name] ?? -Infinity);
    world.state[name] = Math.max(minimum, Math.min(maximum, world.state[name]));
  }
}

function ruleByAction(document, action) {
  return document.transitions.rules.find((rule) => rule.action === action);
}

function availableBundles(document, state) {
  const names = Object.keys(document.actions).sort();
  const bundles = combinations(names, document.manifest.max_actions_per_round)
    .filter((bundle) => bundle.reduce((sum, action) => sum + document.actions[action].cost, 0) <= document.manifest.action_budget_per_round)
    .filter((bundle) => bundle.every((action) => evaluateCondition(document.actions[action].precondition, state, bundle)))
    .map(actionSetId)
    .sort();
  return bundles.length ? bundles : [FORCED_NO_ACTION];
}

function applyRound(document, world, bundleId, round, exogenous) {
  const actions = bundleId === FORCED_NO_ACTION ? [] : canonicalActionSet(bundleId.split("+").filter(Boolean));
  const admissible = availableBundles(document, world.state);
  const canonicalBundleId = actions.length ? actionSetId(actions) : FORCED_NO_ACTION;
  if (!admissible.includes(canonicalBundleId)) {
    world.trace.push({ round, event: "invalid_bundle_skipped", bundleId });
    return;
  }
  const rules = actions.map((action) => ruleByAction(document, action));
  const before = clone(world.state);

  for (const rule of rules) applyOps(rule.ops, world);
  for (const rule of rules) {
    if (!rule.dependency_link) continue;
    const source = rule.ops.find((operation) => operation.var === rule.dependency_link.source_var && Number.isFinite(operation.delta));
    world.state[rule.dependency_link.target_var] += rule.dependency_link.factor * source.delta;
  }
  for (const rule of rules) {
    if (rule.irreversible_if && evaluateCondition(rule.irreversible_if.condition, world.state, actions)) applyOps(rule.irreversible_if.ops, world, { permanentCap: true });
  }
  for (const rule of rules) {
    if (rule.immediate_gain_destroys_future) applyOps(rule.immediate_gain_destroys_future.ops, world, { permanentCap: true });
  }
  applyOps(exogenous[round].ops, world);
  for (const rule of rules) {
    for (const delayed of rule.delayed ?? []) world.delayed.push({ dueRound: round + delayed.after_rounds, sourceAction: rule.action, ops: clone(delayed.ops) });
  }
  const due = world.delayed.filter((item) => item.dueRound === round);
  for (const item of due) applyOps(item.ops, world);
  world.delayed = world.delayed.filter((item) => item.dueRound > round);
  const triggeredGlobalRules = [];
  for (const rule of document.transitions.global_rules) {
    const roundMatches = rule.round === null || rule.round === round + 1;
    if (!roundMatches || world.state[rule.flag] !== 0 || !evaluateCondition(rule.condition, world.state, actions)) continue;
    applyOps(rule.ops, world);
    world.state[rule.flag] = 1;
    triggeredGlobalRules.push(rule.id);
  }
  clampWorld(document, world);

  for (const reversal of document.reversalConditions) {
    if (world.reversalFlags[reversal.id] || !evaluateCondition(reversal.trigger, world.state, actions)) continue;
    world.reversalFlags[reversal.id] = true;
    if (reversal.effect?.op === "lock_all_dimensions_failed") world.lockedOutcomes = failedOutcomeVector(document);
    if (reversal.effect?.ops) applyOps(reversal.effect.ops, world, { permanentCap: true });
    clampWorld(document, world);
  }
  world.lastActions = actions;
  world.trace.push({ round, event: actions.length ? "applied_bundle" : "forced_no_action", bundleId: canonicalBundleId, before, after: clone(world.state), delayed: clone(world.delayed), triggeredGlobalRules, reversalFlags: clone(world.reversalFlags) });
}

export function createRichScenario(document) {
  const freezeHash = verifyScenarioFreeze(document);
  const validation = validateRichDocument(document);
  if (!validation.valid) throw new Error(`invalid rich scenario:\n- ${validation.errors.join("\n- ")}`);
  const dimensions = document.outcomes.dimensions.map((dimension) => dimension.id);
  const reversalIds = document.reversalConditions.map((condition) => condition.id);
  const publicVariables = [...document.view.public_visible];
  const sourceRegime = document.source.source_regime === "independent_synthetic_unknown_contenders" ? "external_supplied" : "mixed";

  return {
    manifest: {
      id: document.manifest.id,
      version: document.manifest.version,
      title: document.manifest.title,
      rounds: document.manifest.rounds,
      dimensions,
      reversalConditions: reversalIds,
      predictionKeys: publicVariables,
      interpreter: "cct-rich-arena-v3/0.1-candidate",
      source: {
        regime: sourceRegime,
        authorId: document.source.authorId,
        authorRelationToCorpus: "independent",
        frozenBeforeContenders: document.source.frozenBeforeContenders,
        authorshipTrace: document.source.authorshipTrace,
        freezeHash,
        freezeVerified: true,
        independenceBoundary: "declared generator separation; lineage not independently verified",
      },
    },
    validation,

    createTrial() {
      return {
        world: {
          state: clone(document.initialState),
          delayed: [],
          caps: {},
          floors: {},
          reversalFlags: Object.fromEntries(reversalIds.map((id) => [id, false])),
          lockedOutcomes: null,
          lastActions: [],
          trace: [],
        },
        exogenous: clone(document.exogenous),
      };
    },

    project({ world }) {
      return {
        ...Object.fromEntries(publicVariables.map((name) => [name, world.state[name]])),
        availableBundles: availableBundles(document, world.state),
        actionBudget: document.manifest.action_budget_per_round,
        maxActions: document.manifest.max_actions_per_round,
      };
    },

    admissibleActions({ view }) {
      return [...view.availableBundles];
    },

    act({ world, action, round, exogenous }) {
      applyRound(document, world, action, round, exogenous);
    },

    observe({ world }) {
      return Object.fromEntries(publicVariables.map((name) => [name, world.state[name]]));
    },

    scorePredictions({ predictions, observation }) {
      return Object.fromEntries(publicVariables.map((name) => {
        const predicted = Number(predictions[name]);
        return [`${name}AbsoluteError`, Number.isFinite(predicted) ? Math.abs(predicted - observation[name]) : null];
      }));
    },

    close({ world }) {
      const outcomes = world.lockedOutcomes ? clone(world.lockedOutcomes) : outcomeVector(document, world.state);
      for (const id of reversalIds) outcomes[`__reversal_${id}`] = world.reversalFlags[id] ? 1 : 0;
      return outcomes;
    },
  };
}

export const RICH_INTERPRETER_EXECUTION_ORDER = [...EXECUTION_ORDER];
export const RICH_INTERPRETER_FORCED_NO_ACTION = FORCED_NO_ACTION;
