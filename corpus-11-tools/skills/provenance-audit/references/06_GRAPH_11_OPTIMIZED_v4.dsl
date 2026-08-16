// DSL-11 Pass D — optimized capability topology
// Identity-preserving optimization. No semantic fusion performed.

@cap CAP.AUTONOMOUS_CAPACITY_GAIN {
  status.capability: candidate_unvalidated;
  passC.action: retain_specialization;
}

@cap CAP.CENTER_DETECTION {
  status.capability: candidate_unvalidated;
  passC.action: retain;
}

@cap CAP.CHAIN_TRACING {
  status.capability: candidate_unvalidated;
  passC.action: retain_general;
}

@cap CAP.CHANGE_VALIDATION {
  status.capability: candidate_unvalidated;
  passC.action: retain_composite;
}

@cap CAP.COERCIVE_CAPACITY_MAPPING {
  status.capability: candidate_unvalidated;
  passC.action: retain;
}

@cap CAP.CONSCIOUSNESS_EVIDENCE_ASSESSMENT {
  status.capability: candidate_unvalidated;
  passC.action: retain_composite;
}

@cap CAP.CONTINUITY_ASSESSMENT {
  status.capability: candidate_unvalidated;
  passC.action: retain;
}

@cap CAP.DETECTABILITY_ASSESSMENT {
  status.capability: candidate_unvalidated;
  passC.action: retain;
}

@cap CAP.DIFFERENCE_REMAINDER_ASSESSMENT {
  status.capability: candidate_unvalidated;
  passC.action: retain;
}

@cap CAP.DISTRIBUTED_MEMORY_ASSESSMENT {
  status.capability: candidate_unvalidated;
  passC.action: retain;
}

@cap CAP.EXTRACTION_MAPPING {
  status.capability: candidate_unvalidated;
  passC.action: retain;
}

@cap CAP.FICTION_MECHANISM_TRANSFORMATION {
  status.capability: candidate_unvalidated;
  passC.action: retain_composite;
}

@cap CAP.FIELD_CAPACITY_ASSESSMENT {
  status.capability: candidate_unvalidated;
  passC.action: retain;
}

@cap CAP.FRAMING_REGRESSION_DETECTION {
  status.capability: candidate_unvalidated;
  passC.action: retain;
}

@cap CAP.HIDDEN_COST_ASSESSMENT {
  status.capability: candidate_unvalidated;
  passC.action: retain;
}

@cap CAP.HISTORICAL_START_SELECTION {
  status.capability: candidate_unvalidated;
  passC.action: retain;
}

@cap CAP.IDENTIFY_REVERSAL_CONDITION {
  status.capability: candidate_unvalidated;
  passC.action: retain;
}

@cap CAP.MEDIA_POWER_ASSESSMENT {
  status.capability: candidate_unvalidated;
  passC.action: retain_specialization;
}

@cap CAP.METHOD_EFFECT_AUDIT {
  status.capability: candidate_unvalidated;
  passC.action: retain;
}

@cap CAP.NON_LOCAL_DEBT_ASSESSMENT {
  status.capability: candidate_unvalidated;
  passC.action: retain;
}

@cap CAP.OBSERVABLE_COMPILATION {
  status.capability: candidate_unvalidated;
  passC.action: retain;
}

@cap CAP.OCCUPATION_QUALIFICATION {
  status.capability: candidate_unvalidated;
  passC.action: retain_composite;
}

@cap CAP.PRIVILEGE_CONVERSION_ASSESSMENT {
  status.capability: candidate_unvalidated;
  passC.action: retain;
}

@cap CAP.PROTOCOL_ROBUSTNESS {
  status.capability: candidate_unvalidated;
  passC.action: retain;
}

@cap CAP.REAL_TRANSFORMATION_ASSESSMENT {
  status.capability: candidate_unvalidated;
  passC.action: retain_general;
}

@cap CAP.REFUSAL_ATTRIBUTION {
  status.capability: candidate_unvalidated;
  passC.action: retain_specialization;
}

@cap CAP.REPAIR_SUFFICIENCY {
  status.capability: candidate_unvalidated;
  passC.action: retain_composite;
}

@cap CAP.SOURCE_ENVIRONMENT_ASSESSMENT {
  status.capability: candidate_unvalidated;
  passC.action: retain_composite;
}

@cap CAP.TRANSLATION_RISK_ASSESSMENT {
  status.capability: candidate_unvalidated;
  passC.action: retain;
}

@cap CAP.USER_AGENCY_PRESERVATION {
  status.capability: candidate_unvalidated;
  passC.action: retain_candidate;
}

@cap CAP.VISUAL_SCENE_COMPILATION {
  status.capability: candidate_unvalidated;
  passC.action: retain_composite;
}

// Descriptive families (not capabilities)
// FAM.DISCRIMINANT_COMPARISON: Groups capabilities involving discriminant comparison without asserting one executable mechanism.
// FAM.ATTRIBUTION_GROUNDING: Groups attribution-related capabilities while preserving distinct constitutive criteria.
// FAM.INDIRECT_POWER_ANALYSIS: Groups indirect power capabilities without collapsing distinct material mechanisms.
// FAM.REVERSAL_ASYMMETRY: Groups direct/inverse capacity comparisons without asserting a universal reversal mechanism.

// Optimized relations
FAM.DISCRIMINANT_COMPARISON related_specialization -> CAP.IDENTIFY_REVERSAL_CONDITION { criticality: contextual; };
FAM.DISCRIMINANT_COMPARISON related_specialization -> CAP.DETECTABILITY_ASSESSMENT { criticality: contextual; };
FAM.ATTRIBUTION_GROUNDING specialization -> CAP.REFUSAL_ATTRIBUTION { criticality: contextual; };
FAM.ATTRIBUTION_GROUNDING specialization -> CAP.CONSCIOUSNESS_EVIDENCE_ASSESSMENT { criticality: contextual; };
FAM.INDIRECT_POWER_ANALYSIS specialization -> CAP.CENTER_DETECTION { criticality: contextual; };
FAM.INDIRECT_POWER_ANALYSIS specialization -> CAP.MEDIA_POWER_ASSESSMENT { criticality: contextual; };
FAM.INDIRECT_POWER_ANALYSIS specialization -> CAP.EXTRACTION_MAPPING { criticality: contextual; };
FAM.REVERSAL_ASYMMETRY related_specialization -> CAP.FIELD_CAPACITY_ASSESSMENT { criticality: contextual; };
FAM.REVERSAL_ASYMMETRY related_specialization -> CAP.DISTRIBUTED_MEMORY_ASSESSMENT { criticality: contextual; };
FAM.REVERSAL_ASYMMETRY related_specialization -> CAP.DIFFERENCE_REMAINDER_ASSESSMENT { criticality: contextual; };
FAM.REVERSAL_ASYMMETRY related_specialization -> CAP.HIDDEN_COST_ASSESSMENT { criticality: contextual; };
FAM.REVERSAL_ASYMMETRY related_specialization -> CAP.REPAIR_SUFFICIENCY { criticality: contextual; };
CAP.REAL_TRANSFORMATION_ASSESSMENT supports_specialization -> CAP.AUTONOMOUS_CAPACITY_GAIN { criticality: contextual; };
CAP.CHAIN_TRACING supports -> CAP.SOURCE_ENVIRONMENT_ASSESSMENT { criticality: contextual; };
CAP.DISTRIBUTED_MEMORY_ASSESSMENT supports -> CAP.CONTINUITY_ASSESSMENT { criticality: contextual; };
CAP.FRAMING_REGRESSION_DETECTION related_but_distinct -> CAP.HISTORICAL_START_SELECTION { criticality: contextual; };
CAP.PROTOCOL_ROBUSTNESS supports -> CAP.DETECTABILITY_ASSESSMENT { criticality: optional; };
CAP.HIDDEN_COST_ASSESSMENT supports -> CAP.FIELD_CAPACITY_ASSESSMENT { criticality: optional; };
CAP.REAL_TRANSFORMATION_ASSESSMENT uses -> CAP.HIDDEN_COST_ASSESSMENT { criticality: contextual; };
CAP.REAL_TRANSFORMATION_ASSESSMENT has_specialization -> CAP.AUTONOMOUS_CAPACITY_GAIN { criticality: structural; };
CAP.REPAIR_SUFFICIENCY uses -> CAP.REAL_TRANSFORMATION_ASSESSMENT { criticality: critical; };
CAP.REPAIR_SUFFICIENCY uses -> CAP.NON_LOCAL_DEBT_ASSESSMENT { criticality: contextual; };
CAP.SOURCE_ENVIRONMENT_ASSESSMENT requires -> CAP.CHAIN_TRACING { criticality: critical; };
CAP.SOURCE_ENVIRONMENT_ASSESSMENT uses -> CAP.TRANSLATION_RISK_ASSESSMENT { criticality: contextual; };
CAP.MEDIA_POWER_ASSESSMENT uses -> CAP.SOURCE_ENVIRONMENT_ASSESSMENT { criticality: contextual; };
CAP.CONSCIOUSNESS_EVIDENCE_ASSESSMENT requires -> CAP.DETECTABILITY_ASSESSMENT { criticality: critical; };
CAP.CONSCIOUSNESS_EVIDENCE_ASSESSMENT uses -> CAP.PROTOCOL_ROBUSTNESS { criticality: critical; };
CAP.REFUSAL_ATTRIBUTION uses -> CAP.DETECTABILITY_ASSESSMENT { criticality: contextual; };
CAP.CONTINUITY_ASSESSMENT uses -> CAP.DISTRIBUTED_MEMORY_ASSESSMENT { criticality: contextual; };
CAP.HISTORICAL_START_SELECTION uses -> CAP.FRAMING_REGRESSION_DETECTION { criticality: contextual; };
CAP.OCCUPATION_QUALIFICATION requires -> CAP.HISTORICAL_START_SELECTION { criticality: critical; };
CAP.OCCUPATION_QUALIFICATION uses -> CAP.FIELD_CAPACITY_ASSESSMENT { criticality: critical; };
CAP.OBSERVABLE_COMPILATION uses -> CAP.DETECTABILITY_ASSESSMENT { criticality: contextual; };
CAP.VISUAL_SCENE_COMPILATION requires -> CAP.OBSERVABLE_COMPILATION { criticality: critical; };
CAP.VISUAL_SCENE_COMPILATION uses -> CAP.SOURCE_ENVIRONMENT_ASSESSMENT { criticality: contextual; };
CAP.CHANGE_VALIDATION requires -> CAP.METHOD_EFFECT_AUDIT { criticality: critical; };
CAP.CHANGE_VALIDATION uses -> CAP.PROTOCOL_ROBUSTNESS { criticality: critical; };
CAP.FICTION_MECHANISM_TRANSFORMATION requires -> CAP.DIFFERENCE_REMAINDER_ASSESSMENT { criticality: critical; };
CAP.FICTION_MECHANISM_TRANSFORMATION uses -> CAP.METHOD_EFFECT_AUDIT { criticality: contextual; };
CAP.FICTION_MECHANISM_TRANSFORMATION uses -> CAP.FRAMING_REGRESSION_DETECTION { criticality: contextual; };
CAP.EXTRACTION_MAPPING uses -> CAP.CHAIN_TRACING { criticality: contextual; };
CAP.PRIVILEGE_CONVERSION_ASSESSMENT uses -> CAP.REAL_TRANSFORMATION_ASSESSMENT { criticality: contextual; };
CAP.COERCIVE_CAPACITY_MAPPING uses -> CAP.FIELD_CAPACITY_ASSESSMENT { criticality: critical; };
CAP.CENTER_DETECTION uses -> CAP.CHAIN_TRACING { criticality: contextual; };
CAP.USER_AGENCY_PRESERVATION uses -> CAP.METHOD_EFFECT_AUDIT { criticality: contextual; };

// Direct/inverse capacity comparison (routing-only composition)
@schema SCHEMA.REVERSAL_ASYMMETRY_PROFILE {
  fields: [direct_goal, inverse_goal, scope, intervention_class, direct_profile, inverse_profile, carriers, channels, field_dependencies, costs, residual_traces, reactivation, recourse, remainder, reversal_condition];
  validity_literal: "same(scope, intervention_class) OR declare_differences(scope, intervention_class)";
}

@rule RULE.DIRECT_CAPACITY_NOT_INVERSE {
  mode: prohibition;
  scope: comparison;
  when_literal: "direct_capacity_established AND inverse_capacity_not_independently_assessed";
  then_literal: "forbid(infer_inverse_capacity_from_direct_capacity)";
  note: "Access, recovery or intervention does not establish erasure, restitution, neutralization or restoration at comparable cost.";
}

// Fiction runtime direction constraint
@rule RULE.FICTION_AUDIT_DIRECTION {
  mode: prohibition;
  scope: generation;
  when_literal: "request_is_inédit AND audit_capability_active_as_content_source";
  then_literal: "forbid(audit_to_generation_content)";
  note: "Audit may reject/regenerate; it must not provide replacement theme, metaphor, moral or mechanism.";
}

// Runtime annotations
CAP.FICTION_MECHANISM_TRANSFORMATION runtime_role -> &ROLE.AUDIT_ONLY_FOR_INEDIT;
CAP.DIFFERENCE_REMAINDER_ASSESSMENT runtime_role -> &ROLE.AUDIT_ONLY_FOR_INEDIT;
CAP.METHOD_EFFECT_AUDIT runtime_role -> &ROLE.AUDIT_ONLY_FOR_INEDIT;

// Fiction inédit — isolation générative
@proc PROC.FICTION_EXTERNAL_GENERATION_GATE {
  purpose: fiction_generation;
  steps: [
    CANDIDATE_GENERATION,
    PRE_DRAFT_DISTANCE_TEST,
    DRAFT,
    POST_DRAFT_AUDIT
  ];
  stop_conditions: [PASS];
  retry_on: [REGENERATE];
}

@rule RULE.FICTION_MIN_TWO_CANDIDATES {
  mode: obligation;
  scope: CANDIDATE_GENERATION;
  then_literal: "generate_at_least_two_independent_mechanisms";
}

@rule RULE.FICTION_PRE_DRAFT_CORPUS_BLIND {
  mode: prohibition;
  scope: CANDIDATE_GENERATION;
  then_literal: "forbid(corpus_derived_nodes_as_generative_seed)";
}

@schema SCHEMA.FICTION_DISTANCE_SUMMARY {
  role: pre_draft_distance_test;
  fields: [
    causal_summary_without_names,
    causal_summary_without_setting,
    dominant_mechanism,
    corpus_gravity_match,
    verdict
  ];
}

@rule RULE.FICTION_DISTANCE_REJECT {
  mode: classification;
  scope: PRE_DRAFT_DISTANCE_TEST;
  when_literal: "dominant_mechanism matches familiar_corpus_gravity";
  then_literal: "verdict = REJECT_CANDIDATE";
}

@rule RULE.FICTION_AUDIT_NO_REPLACEMENT {
  mode: prohibition;
  scope: POST_DRAFT_AUDIT;
  then_literal: "audit_may_pass_or_regenerate_but_must_not_supply_replacement_content";
}


// Transversal EXPLORE_FIRST gate
@proc PROC.EXPLORE_AUDIT_SELECT {
  purpose: conditional_exploration;
  steps: [SCENE, CANDIDATE_GENERATION, AUDIT, SELECT, CONCLUDE];
}

@rule RULE.EXPLORE_FIRST_TRIGGER {
  mode: decision;
  condition_literal: "multiple_plausible_mechanisms OR structuring_variable_underspecified OR corpus_attractor_risk OR user_requests_unknown_external_alternative OR premature_selection_erases_real_difference";
  effect_literal: "activate(PROC.EXPLORE_AUDIT_SELECT)";
}

@rule RULE.EXPLORE_DIRECT_OTHERWISE {
  mode: decision;
  condition_literal: "NOT EXPLORE_FIRST_TRIGGER";
  effect_literal: "use(direct_routing)";
}

@rule RULE.AUDIT_NO_CANDIDATE_SEEDING {
  mode: prohibition;
  scope: AUDIT;
  effect_literal: "forbid(audit_criteria_as_candidate_generation_source)";
}

@rule RULE.AUDIT_NO_MANUFACTURED_WINNER {
  mode: prohibition;
  scope: SELECT;
  effect_literal: "forbid(unique_winner_without_discriminating_support)";
}

@schema SCHEMA.EXPLORE_CANDIDATE_SET {
  role: exploration_candidates;
  fields: [candidate_id, causal_or_structural_summary, user_scene_fit, audit_verdict, discriminating_support, remaining_uncertainty];
}
