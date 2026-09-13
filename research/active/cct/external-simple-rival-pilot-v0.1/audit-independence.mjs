const dimensions = ['sharedEmployment', 'sharedDecisiveFunding', 'sharedImplementation', 'sharedCollectionRoot', 'undisclosedAssistance'];

export function auditIndependence(cct, rival, audit) {
  if (!audit || audit.status !== 'verified') return { admitted: false, reason: 'independence_audit_missing_or_unverified' };
  if (audit.protocolId !== 'CCT-EXTERNAL-SIMPLE-RIVAL-PILOT-0.1') return { admitted: false, reason: 'audit_protocol_mismatch' };
  const authorIds = [cct?.provenance?.authorId, rival?.provenance?.authorId];
  if (authorIds.some((id) => !id) || new Set(authorIds).size !== 2) return { admitted: false, reason: 'candidate_authors_not_distinct' };
  if (JSON.stringify(audit.candidateAuthorIds) !== JSON.stringify(authorIds)) return { admitted: false, reason: 'audit_target_mismatch' };
  if (!Array.isArray(audit.reviewers) || audit.reviewers.length < 2) return { admitted: false, reason: 'reviewer_quorum_missing' };
  const reviewerIds = audit.reviewers.map((x) => x.reviewerId);
  const organizations = audit.reviewers.map((x) => x.organizationId);
  const controls = audit.reviewers.map((x) => x.controlRoot);
  if ([reviewerIds, organizations, controls].some((values) => values.some((x) => !x) || new Set(values).size !== values.length)) return { admitted: false, reason: 'reviewers_not_separated' };
  if (reviewerIds.some((id) => authorIds.includes(id))) return { admitted: false, reason: 'reviewer_is_candidate_author' };
  if (audit.reviewers.some((x) => !Array.isArray(x.evidenceDigests) || new Set(x.evidenceDigests.filter(Boolean)).size < 2)) return { admitted: false, reason: 'reviewer_evidence_insufficient' };
  if (dimensions.some((key) => audit.findings?.[key] !== false)) return { admitted: false, reason: 'independence_dimension_open' };
  return { admitted: true, declaredMaterialIndependence: true, realIndependenceEstablished: false };
}
