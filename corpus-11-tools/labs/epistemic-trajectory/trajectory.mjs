const REQUIRED = ['operation', 'claim', 'representation', 'gain', 'losses', 'counterchecks'];

export function auditEpistemicMove(move) {
  const missing = REQUIRED.filter((key) => !(key in move));
  if (missing.length) {
    return verdict('invalid_contract', [`missing:${missing.join(',')}`]);
  }

  const reasons = [];
  const losses = Array.isArray(move.losses) ? move.losses : [];
  const counterchecks = Array.isArray(move.counterchecks) ? move.counterchecks : [];

  if (move.claim === 'system_property' && !move.independentDiscriminant) {
    reasons.push('system_property_without_independent_discriminant');
  }

  if (['compress', 'merge', 'forget', 'quotient', 'coarsen'].includes(move.operation) && losses.length === 0) {
    reasons.push('destructive_operation_without_loss_ledger');
  }

  if (move.operation === 'invent_primitive') {
    if (!counterchecks.includes('dissolution_attempt')) reasons.push('primitive_without_dissolution_attempt');
    if (!counterchecks.includes('artifact_alternative')) reasons.push('primitive_without_artifact_alternative');
  }

  if (move.operation === 'merge' && !move.reopenCondition) {
    reasons.push('merge_without_reopen_condition');
  }

  if (move.operation === 'forget') {
    if (!move.reconstructible) reasons.push('forgetting_without_reconstructibility');
    if (!move.recoveryPath) reasons.push('forgetting_without_recovery_path');
  }

  if (move.irreversible && !move.reversalCondition && !move.justification) {
    reasons.push('irreversible_move_without_declared_justification');
  }

  if (move.selectionCriterion && move.claim === 'system_property' && move.selectionCriterion === move.evidence) {
    reasons.push('selection_criterion_reused_as_system_evidence');
  }

  if (reasons.length) return verdict('hold', reasons);

  const warnings = [];
  if (!move.reversalCondition && move.claim !== 'descriptive_convention') {
    warnings.push('no_reversal_condition');
  }
  if (!move.alternativeRepresentation) {
    warnings.push('single_representation_only');
  }

  return verdict(warnings.length ? 'admissible_with_warnings' : 'admissible', warnings);
}

export function auditTrajectory(moves) {
  if (!Array.isArray(moves) || moves.length === 0) {
    return { status: 'invalid_contract', moves: [], trajectoryWarnings: ['empty_trajectory'] };
  }

  const audited = moves.map((move) => ({ ...move, audit: auditEpistemicMove(move) }));
  const trajectoryWarnings = [];

  const representationClaims = new Map();
  for (const move of moves) {
    if (!move.representation) continue;
    const prior = representationClaims.get(move.representation);
    if (prior && prior !== move.claim) {
      trajectoryWarnings.push(`representation_role_changed:${move.representation}:${prior}->${move.claim}`);
    }
    representationClaims.set(move.representation, move.claim);
  }

  const statuses = audited.map((x) => x.audit.status);
  const status = statuses.includes('invalid_contract')
    ? 'invalid_contract'
    : statuses.includes('hold')
      ? 'hold'
      : statuses.includes('admissible_with_warnings') || trajectoryWarnings.length
        ? 'admissible_with_warnings'
        : 'admissible';

  return { status, moves: audited, trajectoryWarnings };
}

function verdict(status, reasons) {
  return { status, reasons };
}
