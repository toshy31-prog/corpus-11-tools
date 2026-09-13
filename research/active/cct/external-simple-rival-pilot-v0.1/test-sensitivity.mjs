import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateSensitivity, evaluateSensitivity } from './evaluate-sensitivity.mjs';

const result = (status, engineProfileId) => ({ status, engineProfileId });

test('requires the same dominance across every registered engine', () => {
  const aggregate = aggregateSensitivity([
    result('cct_dominates_on_this_run', 'a'),
    result('cct_dominates_on_this_run', 'b'),
    result('cct_dominates_on_this_run', 'c')
  ]);
  assert.equal(aggregate.status, 'robust_within_registered_engines');
});

test('reports dependence on the model instead of selecting a winner', () => {
  const aggregate = aggregateSensitivity([
    result('cct_dominates_on_this_run', 'a'),
    result('inconclusive', 'b')
  ]);
  assert.equal(aggregate.status, 'model_dependent');
});

test('exposes opposite winners as a contradiction across engines', () => {
  const aggregate = aggregateSensitivity([
    result('cct_dominates_on_this_run', 'a'),
    result('simple_rival_dominates_on_this_run', 'b')
  ]);
  assert.equal(aggregate.status, 'contradiction_across_engines');
});

test('fails closed when any engine rejects the packet', () => {
  const aggregate = aggregateSensitivity([
    result('inconclusive', 'a'),
    { status: 'inadmissible', reason: 'supply_budget_exceeded_under_uncertainty', engineProfileId: 'b' }
  ]);
  assert.equal(aggregate.status, 'inadmissible');
});

test('executes the same external packet through all frozen profiles', () => {
  const decisions = [
    { type: 'network_allocation', dailyGrossLitersByZone: Array.from({ length: 3 }, () => ({ north: 90000, central: 94000, south: 84000 })) },
    { type: 'offline_access', zoneIds: ['north', 'central', 'south'] },
    { type: 'appeal_channel', startHour: 0, durationHours: 72 }
  ];
  const packet = (candidateId, authorId) => ({
    candidateId, scenarioId: 'VITAL-WATER-DISTRIBUTION-72H-0.1', informationBudget: 12,
    actionBudget: 8, informationUsed: 8, fixture: false, decisions,
    provenance: {
      authorId, organizationId: `org-${authorId}`, collectionRoot: `collection-${authorId}`,
      fundingRoot: `funding-${authorId}`, implementationRoot: `implementation-${authorId}`,
      outsideRepository: true, protocolFrozenBeforeCollection: true
    }
  });
  const audit = {
    protocolId: 'CCT-EXTERNAL-SIMPLE-RIVAL-PILOT-0.1', status: 'verified',
    candidateAuthorIds: ['author-cct', 'author-rival'],
    reviewers: [
      { reviewerId: 'r1', organizationId: 'review-org-1', controlRoot: 'review-control-1', evidenceDigests: ['e1', 'e2'] },
      { reviewerId: 'r2', organizationId: 'review-org-2', controlRoot: 'review-control-2', evidenceDigests: ['e3', 'e4'] }
    ],
    findings: { sharedEmployment: false, sharedDecisiveFunding: false, sharedImplementation: false, sharedCollectionRoot: false, undisclosedAssistance: false }
  };
  const aggregate = evaluateSensitivity(packet('cct', 'author-cct'), packet('simple_rival', 'author-rival'), audit);
  assert.equal(aggregate.status, 'compatible_survivors_all_engines');
  assert.equal(aggregate.results.length, 3);
});
