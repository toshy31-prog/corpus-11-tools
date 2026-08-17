import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  attachInterpretation,
  createAccessGuard,
  evaluateLockedReversals,
  lockProtocol,
  prepareExecution,
  sealRawResults,
  verifyProtocolLock,
  verifyRawResults,
} from "../protocol-lock.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(await readFile(resolve(here, "../fixtures/negative-control-protocol.json"), "utf8"));

function requestFor(lock, overrides = {}) {
  return {
    protocolHash: lock.protocolHash,
    modelContentHash: manifest.model.contentHash,
    observableIds: ["score"],
    controlIds: ["zero_control"],
    observer: manifest.observer,
    seed: manifest.seed,
    ...overrides,
  };
}

test("lock is deterministic and verifies its complete manifest", () => {
  const first = lockProtocol(manifest);
  const second = lockProtocol(structuredClone(manifest));
  assert.equal(first.protocolHash, second.protocolHash);
  assert.equal(verifyProtocolLock(first), true);
  assert.equal(Object.isFrozen(first.protocol), true);
});

test("manifest modification after locking is refused", () => {
  const lock = structuredClone(lockProtocol(manifest));
  lock.protocol.observables[0].measure = "post-hoc measure";
  assert.throws(() => verifyProtocolLock(lock), /Protocol hash mismatch/);
});

test("adding a control after seeing a result is refused", () => {
  const lock = lockProtocol(manifest);
  assert.throws(() => prepareExecution(lock, requestFor(lock, {
    controlIds: ["zero_control", "post_hoc_control"],
  })), /controls differ/);
});

test("changing the observer after calculation is refused", () => {
  const lock = lockProtocol(manifest);
  assert.throws(() => prepareExecution(lock, requestFor(lock, {
    observer: { ...manifest.observer, maxSteps: 2 },
  })), /observer differs/);
});

test("changing a reversal condition invalidates the lock", () => {
  const lock = structuredClone(lockProtocol(manifest));
  lock.protocol.reversalConditions[0].operator = "lt";
  assert.throws(() => verifyProtocolLock(lock), /Protocol hash mismatch/);
});

test("missing observable, control, or reversal condition blocks locking", () => {
  for (const field of ["observables", "controls", "reversalConditions"]) {
    const candidate = structuredClone(manifest);
    candidate[field] = [];
    assert.throws(() => lockProtocol(candidate), new RegExp(field));
  }
});

test("access guard enforces allowed operations and max steps", () => {
  const lock = lockProtocol(manifest);
  const execution = prepareExecution(lock, requestFor(lock));
  const guard = createAccessGuard(lock, execution);
  assert.deepEqual(guard.authorize("inspect_score"), { operation: "inspect_score", step: 1, maxSteps: 1 });
  assert.throws(() => guard.authorize("inspect_score"), /budget exceeded/);
  const secondGuard = createAccessGuard(lock, execution);
  assert.throws(() => secondGuard.authorize("inspect_hidden_state"), /not allowed/);
});

test("negative control triggers the locked reversal mechanically", () => {
  const lock = lockProtocol(manifest);
  const execution = prepareExecution(lock, requestFor(lock));
  const guard = createAccessGuard(lock, execution);
  guard.authorize("inspect_score");
  const raw = sealRawResults(lock, execution, {
    observables: { score: 0 },
    controls: { zero_control: { passed: true } },
  }, guard.snapshot());
  assert.equal(verifyRawResults(lock, raw), true);
  const classification = evaluateLockedReversals(lock, raw);
  assert.equal(classification.status, "reversal_triggered");
  assert.deepEqual(classification.outcomes, ["hypothesis_not_supported"]);
});

test("raw data and later interpretation remain separate", () => {
  const lock = lockProtocol(manifest);
  const execution = prepareExecution(lock, requestFor(lock));
  const guard = createAccessGuard(lock, execution);
  guard.authorize("inspect_score");
  const raw = sealRawResults(lock, execution, {
    observables: { score: 0 }, controls: { zero_control: { passed: true } },
  }, guard.snapshot());
  const classification = evaluateLockedReversals(lock, raw);
  const first = attachInterpretation(lock, raw, classification, {
    outcome: "hypothesis_not_supported", narrative: "The preregistered reversal fired.",
  });
  const second = attachInterpretation(lock, raw, classification, {
    outcome: "inconclusive", narrative: "A reviewer disputes external relevance.",
  });
  assert.equal(first.rawHash, second.rawHash);
  assert.equal(first.rawHash, raw.rawHash);
  assert.notEqual(first.interpretationHash, second.interpretationHash);
  assert.equal(verifyRawResults(lock, raw), true);
});

test("a post-hoc classification rewrite is refused", () => {
  const lock = lockProtocol(manifest);
  const execution = prepareExecution(lock, requestFor(lock));
  const guard = createAccessGuard(lock, execution);
  guard.authorize("inspect_score");
  const raw = sealRawResults(lock, execution, {
    observables: { score: 0 }, controls: { zero_control: { passed: true } },
  }, guard.snapshot());
  const classification = structuredClone(evaluateLockedReversals(lock, raw));
  classification.status = "not_triggered";
  assert.throws(() => attachInterpretation(lock, raw, classification, {
    outcome: "inconclusive", narrative: "Post-hoc rewrite.",
  }), /differs from the locked mechanical evaluation/);
});
