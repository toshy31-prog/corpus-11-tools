import assert from 'node:assert/strict';
import { auditEpistemicMove, auditTrajectory } from '../trajectory.mjs';

const base = {
  operation: 'observe',
  claim: 'candidate',
  representation: 'r1',
  gain: 'discriminates two cases',
  losses: [],
  counterchecks: [],
  reversalCondition: 'independent observation contradicts the distinction',
  alternativeRepresentation: 'r2'
};

assert.equal(auditEpistemicMove(base).status, 'admissible');

assert.deepEqual(
  auditEpistemicMove({ ...base, operation: 'compress', losses: [] }).reasons,
  ['destructive_operation_without_loss_ledger']
);

assert.equal(
  auditEpistemicMove({
    ...base,
    operation: 'invent_primitive',
    counterchecks: ['dissolution_attempt', 'artifact_alternative'],
    independentDiscriminant: 'transport to an independently measured outcome'
  }).status,
  'admissible'
);

assert.equal(
  auditEpistemicMove({
    ...base,
    operation: 'merge',
    losses: ['distinction A/B is hidden in the merged view'],
    reopenCondition: 'new intervention separates A and B'
  }).status,
  'admissible'
);

assert.equal(
  auditEpistemicMove({
    ...base,
    operation: 'forget',
    losses: ['raw derivation path'],
    reconstructible: true,
    recoveryPath: 'content-addressed provenance archive'
  }).status,
  'admissible'
);

const t = auditTrajectory([
  base,
  { ...base, operation: 'reframe', claim: 'system_property', independentDiscriminant: 'external transport' }
]);
assert.equal(t.status, 'admissible_with_warnings');
assert.equal(t.trajectoryWarnings.length, 1);

console.log('epistemic-trajectory tests: ok');
