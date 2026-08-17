import { createHash } from "node:crypto";

export const PROTOCOL_SCHEMA = "corpus-experiment-protocol/v1";
export const LOCK_SCHEMA = "corpus-experiment-protocol-lock/v1";
export const RAW_SCHEMA = "corpus-experiment-raw-result/v1";
export const CLASSIFICATION_SCHEMA = "corpus-experiment-classification/v1";

function clone(value) {
  return structuredClone(value);
}

function normalize(value, path = "$") {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`${path} must be a finite number`);
    return value;
  }
  if (Array.isArray(value)) return value.map((item, index) => normalize(item, `${path}[${index}]`));
  if (typeof value !== "object") throw new Error(`${path} contains a non-serializable value`);
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, normalize(value[key], `${path}.${key}`)]));
}

export function canonicalStringify(value) {
  return JSON.stringify(normalize(value));
}

export function sha256(value) {
  return `sha256:${createHash("sha256").update(canonicalStringify(value)).digest("hex")}`;
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const item of Object.values(value)) deepFreeze(item);
  }
  return value;
}

function requireString(value, label, errors) {
  if (typeof value !== "string" || value.length === 0) errors.push(`${label} must be a non-empty string`);
}

function uniqueIds(items, label, errors) {
  if (!Array.isArray(items) || items.length === 0) {
    errors.push(`${label} must be a non-empty array`);
    return [];
  }
  const ids = [];
  for (const [index, item] of items.entries()) {
    requireString(item?.id, `${label}[${index}].id`, errors);
    if (item?.id) ids.push(item.id);
  }
  if (new Set(ids).size !== ids.length) errors.push(`${label} ids must be unique`);
  return ids;
}

export function validateProtocolManifest(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new Error("Invalid protocol manifest:\n- manifest must be an object");
  }
  if (manifest.schema !== PROTOCOL_SCHEMA) errors.push(`schema must equal ${PROTOCOL_SCHEMA}`);
  requireString(manifest.protocolId, "protocolId", errors);
  requireString(manifest.version, "version", errors);
  requireString(manifest.hypothesis, "hypothesis", errors);
  if (!Array.isArray(manifest.alternatives) || manifest.alternatives.length === 0
    || manifest.alternatives.some((item) => typeof item !== "string" || !item)) {
    errors.push("alternatives must contain at least one non-empty string");
  }
  requireString(manifest.model?.id, "model.id", errors);
  requireString(manifest.model?.version, "model.version", errors);
  if (!/^sha256:[0-9a-f]{64}$/.test(manifest.model?.contentHash ?? "")) {
    errors.push("model.contentHash must be a sha256 hash");
  }
  if (!manifest.model?.configuration || typeof manifest.model.configuration !== "object"
    || Array.isArray(manifest.model.configuration)) errors.push("model.configuration must be an object");

  const observableIds = uniqueIds(manifest.observables, "observables", errors);
  for (const [index, observable] of (manifest.observables ?? []).entries()) {
    requireString(observable?.measure, `observables[${index}].measure`, errors);
    requireString(observable?.channel, `observables[${index}].channel`, errors);
  }
  uniqueIds(manifest.controls, "controls", errors);
  for (const [index, control] of (manifest.controls ?? []).entries()) {
    requireString(control?.purpose, `controls[${index}].purpose`, errors);
  }

  const observer = manifest.observer;
  if (!observer || !Array.isArray(observer.allowedOperations) || observer.allowedOperations.length === 0
    || observer.allowedOperations.some((item) => typeof item !== "string" || !item)
    || new Set(observer.allowedOperations).size !== observer.allowedOperations.length) {
    errors.push("observer.allowedOperations must contain unique non-empty strings");
  }
  if (!Number.isInteger(observer?.maxSteps) || observer.maxSteps < 0) {
    errors.push("observer.maxSteps must be a non-negative integer");
  }
  if (!Number.isFinite(observer?.successThreshold)) errors.push("observer.successThreshold must be finite");

  const reversalIds = uniqueIds(manifest.reversalConditions, "reversalConditions", errors);
  const operators = new Set(["eq", "ne", "gt", "gte", "lt", "lte"]);
  for (const [index, condition] of (manifest.reversalConditions ?? []).entries()) {
    if (!observableIds.includes(condition?.observableId)) {
      errors.push(`reversalConditions[${index}].observableId must name a declared observable`);
    }
    if (!operators.has(condition?.operator)) errors.push(`reversalConditions[${index}].operator is unsupported`);
    if (!("value" in (condition ?? {}))) errors.push(`reversalConditions[${index}].value is required`);
    requireString(condition?.outcome, `reversalConditions[${index}].outcome`, errors);
  }
  if (reversalIds.length === 0) errors.push("at least one reversal condition is required");

  if (!Number.isInteger(manifest.seed) || manifest.seed < 0) errors.push("seed must be a non-negative integer");
  requireString(manifest.analysis?.stoppingRule, "analysis.stoppingRule", errors);
  requireString(manifest.analysis?.comparisonPlan, "analysis.comparisonPlan", errors);
  if (!Array.isArray(manifest.classification?.allowedOutcomes)
    || manifest.classification.allowedOutcomes.length === 0
    || manifest.classification.allowedOutcomes.some((item) => typeof item !== "string" || !item)) {
    errors.push("classification.allowedOutcomes must contain non-empty strings");
  } else {
    for (const condition of manifest.reversalConditions ?? []) {
      if (condition?.outcome && !manifest.classification.allowedOutcomes.includes(condition.outcome)) {
        errors.push(`reversal outcome ${condition.outcome} is not allowed by classification.allowedOutcomes`);
      }
    }
  }
  normalize(manifest);
  if (errors.length) throw new Error(`Invalid protocol manifest:\n- ${errors.join("\n- ")}`);
  return true;
}

export function lockProtocol(manifest) {
  validateProtocolManifest(manifest);
  const protocol = normalize(clone(manifest));
  return deepFreeze({ schema: LOCK_SCHEMA, protocolHash: sha256(protocol), protocol });
}

export function verifyProtocolLock(lock) {
  if (lock?.schema !== LOCK_SCHEMA || typeof lock?.protocolHash !== "string" || !lock?.protocol) {
    throw new Error("Invalid protocol lock envelope");
  }
  validateProtocolManifest(lock.protocol);
  const actual = sha256(lock.protocol);
  if (actual !== lock.protocolHash) throw new Error(`Protocol hash mismatch: expected ${lock.protocolHash}, got ${actual}`);
  return true;
}

function sameSet(left, right) {
  return canonicalStringify([...left].sort()) === canonicalStringify([...right].sort());
}

export function prepareExecution(lock, request) {
  verifyProtocolLock(lock);
  if (request?.protocolHash !== lock.protocolHash) throw new Error("Execution protocolHash does not match the lock");
  if (request?.modelContentHash !== lock.protocol.model.contentHash) throw new Error("Model content hash changed after lock");
  const observableIds = lock.protocol.observables.map(({ id }) => id);
  const controlIds = lock.protocol.controls.map(({ id }) => id);
  if (!sameSet(request?.observableIds ?? [], observableIds)) throw new Error("Execution observables differ from the locked manifest");
  if (!sameSet(request?.controlIds ?? [], controlIds)) throw new Error("Execution controls differ from the locked manifest");
  if (canonicalStringify(request?.observer) !== canonicalStringify(lock.protocol.observer)) {
    throw new Error("Execution observer differs from the locked manifest");
  }
  if (request?.seed !== lock.protocol.seed) throw new Error("Execution seed differs from the locked manifest");
  const execution = normalize({
    protocolHash: lock.protocolHash,
    protocolId: lock.protocol.protocolId,
    version: lock.protocol.version,
    modelContentHash: request.modelContentHash,
    observableIds,
    controlIds,
    observer: lock.protocol.observer,
    seed: request.seed,
  });
  return deepFreeze({ ...execution, executionHash: sha256(execution) });
}

export function createAccessGuard(lock, execution) {
  verifyProtocolLock(lock);
  if (execution?.protocolHash !== lock.protocolHash) throw new Error("Execution is not bound to this protocol");
  let used = 0;
  const operations = [];
  return {
    authorize(operation) {
      if (!lock.protocol.observer.allowedOperations.includes(operation)) {
        throw new Error(`Observer operation is not allowed: ${operation}`);
      }
      if (used >= lock.protocol.observer.maxSteps) throw new Error("Observer access budget exceeded");
      used += 1;
      operations.push(operation);
      return { operation, step: used, maxSteps: lock.protocol.observer.maxSteps };
    },
    snapshot() {
      return deepFreeze({ used, maxSteps: lock.protocol.observer.maxSteps, operations: [...operations] });
    },
  };
}

function exactKeys(value, expected, label) {
  const actual = Object.keys(value ?? {}).sort();
  const wanted = [...expected].sort();
  if (canonicalStringify(actual) !== canonicalStringify(wanted)) {
    throw new Error(`${label} keys differ from the locked manifest`);
  }
}

export function sealRawResults(lock, execution, payload, access) {
  verifyProtocolLock(lock);
  if (execution?.protocolHash !== lock.protocolHash) throw new Error("Execution is not bound to this protocol");
  const expectedExecutionHash = sha256(normalize({
    protocolHash: execution.protocolHash,
    protocolId: execution.protocolId,
    version: execution.version,
    modelContentHash: execution.modelContentHash,
    observableIds: execution.observableIds,
    controlIds: execution.controlIds,
    observer: execution.observer,
    seed: execution.seed,
  }));
  if (execution.executionHash !== expectedExecutionHash) throw new Error("Execution envelope changed after preparation");
  exactKeys(payload?.observables, execution.observableIds, "Observable result");
  exactKeys(payload?.controls, execution.controlIds, "Control result");
  if (!access || access.used > access.maxSteps
    || access.maxSteps !== lock.protocol.observer.maxSteps
    || access.operations.some((operation) => !lock.protocol.observer.allowedOperations.includes(operation))) {
    throw new Error("Access record violates the locked observer budget");
  }
  const raw = normalize({
    schema: RAW_SCHEMA,
    protocolHash: lock.protocolHash,
    executionHash: execution.executionHash,
    observables: payload.observables,
    controls: payload.controls,
    access,
  });
  return deepFreeze({ ...raw, rawHash: sha256(raw) });
}

export function verifyRawResults(lock, raw) {
  verifyProtocolLock(lock);
  if (raw?.schema !== RAW_SCHEMA || raw?.protocolHash !== lock.protocolHash) throw new Error("Raw result is not bound to this protocol");
  const { rawHash, ...content } = raw;
  if (sha256(content) !== rawHash) throw new Error("Raw result hash mismatch");
  return true;
}

function compare(actual, operator, expected) {
  if (operator === "eq") return actual === expected;
  if (operator === "ne") return actual !== expected;
  if (operator === "gt") return actual > expected;
  if (operator === "gte") return actual >= expected;
  if (operator === "lt") return actual < expected;
  if (operator === "lte") return actual <= expected;
  throw new Error(`Unsupported operator: ${operator}`);
}

export function evaluateLockedReversals(lock, raw) {
  verifyRawResults(lock, raw);
  const evaluations = lock.protocol.reversalConditions.map((condition) => ({
    id: condition.id,
    observableId: condition.observableId,
    operator: condition.operator,
    expected: condition.value,
    actual: raw.observables[condition.observableId],
    triggered: compare(raw.observables[condition.observableId], condition.operator, condition.value),
    outcome: condition.outcome,
  }));
  const triggered = evaluations.filter((item) => item.triggered);
  const content = normalize({
    schema: CLASSIFICATION_SCHEMA,
    protocolHash: lock.protocolHash,
    rawHash: raw.rawHash,
    status: triggered.length ? "reversal_triggered" : "not_triggered",
    outcomes: [...new Set(triggered.map((item) => item.outcome))],
    evaluations,
  });
  return deepFreeze({ ...content, classificationHash: sha256(content) });
}

export function attachInterpretation(lock, raw, classification, interpretation) {
  verifyRawResults(lock, raw);
  const expectedClassification = evaluateLockedReversals(lock, raw);
  if (canonicalStringify(classification) !== canonicalStringify(expectedClassification)) {
    throw new Error("Classification differs from the locked mechanical evaluation");
  }
  if (!lock.protocol.classification.allowedOutcomes.includes(interpretation?.outcome)) {
    throw new Error("Interpretation outcome is not allowed by the locked protocol");
  }
  if (typeof interpretation?.narrative !== "string" || interpretation.narrative.length === 0) {
    throw new Error("interpretation.narrative must be a non-empty string");
  }
  const content = normalize({
    schema: "corpus-experiment-interpretation/v1",
    protocolHash: lock.protocolHash,
    rawHash: raw.rawHash,
    classificationHash: classification.classificationHash,
    outcome: interpretation.outcome,
    narrative: interpretation.narrative,
  });
  return deepFreeze({ ...content, interpretationHash: sha256(content) });
}
