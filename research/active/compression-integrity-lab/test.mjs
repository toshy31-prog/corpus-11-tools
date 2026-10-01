import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  INVALID_EPISTEMIC_STATE,
  adjudicateThreshold,
  promoteVerdict,
  validateCompressionAudit
} from "./adjudication.mjs";

function stableHash(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function makePacket() {
  return {
    metric: "capture_financiere",
    value: 0.61,
    uncertainty: 0.04,
    observations: [
      { observer: "A", value: 0.59 },
      { observer: "B", value: 0.63 }
    ],
    provenanceHash: "sha256:external-packet-001"
  };
}

function storageWith(packet) {
  return {
    has(hash) {
      return hash === packet.provenanceHash;
    }
  };
}

test("adjudication preserves source material and records its compression", () => {
  const rawPacket = makePacket();
  const before = structuredClone(rawPacket);
  const beforeHash = stableHash(before);

  const result = adjudicateThreshold({
    metricName: rawPacket.metric,
    metricValue: rawPacket.value,
    threshold: 0.50,
    rawContext: rawPacket
  });

  assert.equal(result.execution, "FAIL");
  assert.deepEqual(rawPacket, before);
  assert.equal(stableHash(rawPacket), beforeHash);
  assert.equal(result.compression_audit.discarded_or_merged.exact_value, 0.61);
  assert.equal(result.compression_audit.discarded_or_merged.raw_provenance_hash, rawPacket.provenanceHash);
  assert.ok(result.compression_audit.explanatory_ceiling);
});

test("the same preserved packet can be replayed under another threshold", () => {
  const rawPacket = makePacket();
  const strictResult = adjudicateThreshold({
    metricName: rawPacket.metric,
    metricValue: rawPacket.value,
    threshold: 0.50,
    rawContext: rawPacket
  });
  const permissiveResult = adjudicateThreshold({
    metricName: rawPacket.metric,
    metricValue: rawPacket.value,
    threshold: 0.65,
    rawContext: rawPacket
  });

  assert.equal(strictResult.execution, "FAIL");
  assert.equal(permissiveResult.execution, "PASS");
  assert.equal(
    strictResult.compression_audit.discarded_or_merged.raw_provenance_hash,
    permissiveResult.compression_audit.discarded_or_merged.raw_provenance_hash
  );
});

test("dead provenance invalidates an otherwise successful verdict", () => {
  const rawPacket = makePacket();
  const result = adjudicateThreshold({
    metricName: rawPacket.metric,
    metricValue: 0.40,
    threshold: 0.50,
    rawContext: rawPacket
  });

  const deadStorage = { has: () => false };
  const promotion = promoteVerdict(result, deadStorage);

  assert.equal(promotion.status, INVALID_EPISTEMIC_STATE);
  assert.ok(promotion.errors.includes(`${INVALID_EPISTEMIC_STATE}:provenance_hash_is_dead_end`));
});

test("declared resolvability without a resolver is itself an invalid epistemic state", () => {
  const rawPacket = makePacket();
  const result = adjudicateThreshold({
    metricName: rawPacket.metric,
    metricValue: rawPacket.value,
    threshold: 0.50,
    rawContext: rawPacket
  });

  const errors = validateCompressionAudit(result, null);
  assert.ok(errors.includes(`${INVALID_EPISTEMIC_STATE}:resolver_unavailable`));
});

test("resolvable material allows audited promotion", () => {
  const rawPacket = makePacket();
  const result = adjudicateThreshold({
    metricName: rawPacket.metric,
    metricValue: rawPacket.value,
    threshold: 0.50,
    rawContext: rawPacket
  });

  const promotion = promoteVerdict(result, storageWith(rawPacket));
  assert.equal(promotion.status, "FAIL");
  assert.deepEqual(promotion.errors, []);
});

test("removing provenance is rejected rather than silently treated as evidence", () => {
  const rawPacket = makePacket();
  const result = adjudicateThreshold({
    metricName: rawPacket.metric,
    metricValue: rawPacket.value,
    threshold: 0.50,
    rawContext: rawPacket
  });
  result.compression_audit.discarded_or_merged.raw_provenance_hash = null;
  result.compression_audit.compression_reversibility.raw_material_resolvable = false;

  const errors = validateCompressionAudit(result, storageWith(rawPacket));
  assert.ok(errors.includes("irreversible_compression:missing_provenance"));
});
