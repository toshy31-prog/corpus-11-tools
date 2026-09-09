import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { assessBoundedLogConsistency } from "../sequenced-restoration-v6.1-bounded-log-consistency/runtime.mjs";
import { assessGeneralLogConsistency, CctGeneralLogConsistencyRuntime, verifyConsistency } from "./runtime.mjs";
import { audit, axes, completeExercise, consistencyPath, inconsistentPrefixValidation, treeHash, validAmendment, validValidation } from "./fixtures.mjs";

const RFC_VECTORS = JSON.parse(readFileSync(new URL("./rfc9162-vectors.json", import.meta.url)));

test("accepts frozen RFC 9162 example paths without invoking the local proof generator", () => {
  for (const vector of RFC_VECTORS.vectors) {
    assert.equal(verifyConsistency(vector.first, vector.second, vector.firstRoot, vector.secondRoot, vector.path), true);
    const corrupted = [...vector.path];
    corrupted[0] = "00".repeat(32);
    assert.equal(verifyConsistency(vector.first, vector.second, vector.firstRoot, vector.secondRoot, corrupted), false);
  }
});

test("verifies RFC 9162 consistency across several arbitrary tree-size pairs", () => {
  const leaves = Array.from({ length: 13 }, (_, i) => `vector-${i}`);
  for (const [first, second] of [[1, 2], [2, 3], [3, 7], [4, 8], [5, 13], [8, 13]]) {
    const current = leaves.slice(0, second);
    assert.equal(verifyConsistency(first, second, treeHash(current.slice(0, first)), treeHash(current), consistencyPath(first, current)), true);
  }
});

test("anchors the general tree in 6.1 and accepts a 3-to-7 extension", () => {
  const result = assessGeneralLogConsistency(axes, audit, completeExercise(), validAmendment(), validValidation());
  assert.equal(result.status, "general_append_only_log_consistency_candidate");
  assert.deepEqual([result.previousTreeSize, result.treeSize], [3, 7]);
});

test("a signed checkpoint with a corrupted path passes 6.1 but fails 6.2", () => {
  const validation = inconsistentPrefixValidation();
  assert.equal(assessBoundedLogConsistency(axes, audit, completeExercise(), validAmendment(), validation).status,
    "bounded_append_only_log_extension_candidate");
  assert.deepEqual(assessGeneralLogConsistency(axes, audit, completeExercise(), validAmendment(), validation).failures,
    ["general_log_consistency_invalid"]);
});

test("runtime blocks actions without a general consistency proof", () => {
  const runtime = new CctGeneralLogConsistencyRuntime();
  runtime.state.phase = "staged_restoration_receipt_pending";
  runtime.state.debts = axes.map((axis) => ({ axis, status: "open" }));
  assert.throws(() => runtime.decide({ view: { cct: { tick: 22 } }, allowedActions: ["restore"] }),
    { message: /CCT_GENERAL_LOG_CONSISTENCY_UNESTABLISHED/ });
});
