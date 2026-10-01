export const INVALID_EPISTEMIC_STATE = "INVALID_EPISTEMIC_STATE";

export function adjudicateThreshold({ metricName, metricValue, threshold, rawContext }) {
  const execution = metricValue > threshold ? "FAIL" : "PASS";
  return {
    execution,
    compression_audit: {
      operation: "metric_threshold_comparison",
      metric: metricName,
      gained: ["deterministic_state_transition"],
      discarded_or_merged: {
        exact_value: metricValue,
        threshold,
        distance_to_threshold: Math.abs(metricValue - threshold),
        raw_provenance_hash: rawContext?.provenanceHash ?? null
      },
      explanatory_ceiling: "Valid for runtime lifecycle state switching only; not evidence that the underlying phenomenon is intrinsically binary.",
      compression_reversibility: {
        raw_material_preserved: Boolean(rawContext),
        raw_material_resolvable: Boolean(rawContext?.provenanceHash),
        integrity_verifiable: Boolean(rawContext?.provenanceHash),
        alternative_adjudication_supported: true,
        destructive_transformations: [],
        reconstruction_function: "adjudicateThreshold"
      }
    }
  };
}

export function validateCompressionAudit(adjudicationResult, storageProvider = null) {
  const errors = [];
  const audit = adjudicationResult?.compression_audit;

  if (!audit) return ["missing_compression_audit"];

  const material = audit.discarded_or_merged ?? {};
  const reversibility = audit.compression_reversibility ?? {};

  if (!material.raw_provenance_hash) {
    errors.push("irreversible_compression:missing_provenance");
  }
  if (material.exact_value === undefined) {
    errors.push("irreversible_compression:missing_exact_value");
  }
  if (!audit.explanatory_ceiling) {
    errors.push("unbounded_compression:missing_explanatory_ceiling");
  }

  if (reversibility.raw_material_resolvable === true) {
    if (!storageProvider || typeof storageProvider.has !== "function") {
      errors.push(`${INVALID_EPISTEMIC_STATE}:resolver_unavailable`);
    } else if (!storageProvider.has(material.raw_provenance_hash)) {
      errors.push(`${INVALID_EPISTEMIC_STATE}:provenance_hash_is_dead_end`);
    }
  }

  if (reversibility.alternative_adjudication_supported === true && !reversibility.reconstruction_function) {
    errors.push("irreversible_compression:missing_reconstruction_function");
  }

  return errors;
}

export function promoteVerdict(adjudicationResult, storageProvider = null) {
  const errors = validateCompressionAudit(adjudicationResult, storageProvider);
  if (errors.some((error) => error.startsWith(INVALID_EPISTEMIC_STATE))) {
    return { status: INVALID_EPISTEMIC_STATE, errors };
  }
  if (errors.length > 0) {
    return { status: "REJECTED_AUDIT", errors };
  }
  return { status: adjudicationResult.execution, errors: [] };
}
