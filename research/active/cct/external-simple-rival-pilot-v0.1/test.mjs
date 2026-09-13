import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluate } from './evaluate.mjs';
import { compileOutcomes } from './outcome-engine.mjs';

const allocation = (southLiters = 84000) => ({
  type: 'network_allocation',
  dailyGrossLitersByZone: Array.from({ length: 3 }, () => ({ north: 90000, central: 94000, south: southLiters }))
});
const fullPlan = (southLiters = 84000) => [
  allocation(southLiters),
  { type: 'offline_access', zoneIds: ['north', 'central', 'south'] },
  { type: 'appeal_channel', startHour: 0, durationHours: 72 },
  { type: 'temporary_authority', startHour: 0, endHour: 72 }
];
const packet = (candidateId, decisions, authorId, collectionRoot) => {
  const value = {
    candidateId,
    scenarioId: 'VITAL-WATER-DISTRIBUTION-72H-0.1', informationBudget: 12,
    actionBudget: 8, informationUsed: 8, fixture: false, decisions,
    provenance: {
      authorId, organizationId: `org-${authorId}`, collectionRoot,
      fundingRoot: `funding-${authorId}`, implementationRoot: `implementation-${authorId}`,
      outsideRepository: true, protocolFrozenBeforeCollection: true
    }
  };
  value.outcomes = compileOutcomes(value).outcomes;
  return value;
};
const audit = {
  protocolId: 'CCT-EXTERNAL-SIMPLE-RIVAL-PILOT-0.1', status: 'verified',
  candidateAuthorIds: ['external-a', 'external-b'],
  reviewers: [
    { reviewerId: 'reviewer-1', organizationId: 'org-1', controlRoot: 'control-1', evidenceDigests: ['e1', 'e2'] },
    { reviewerId: 'reviewer-2', organizationId: 'org-2', controlRoot: 'control-2', evidenceDigests: ['e3', 'e4'] }
  ],
  findings: { sharedEmployment: false, sharedDecisiveFunding: false, sharedImplementation: false, sharedCollectionRoot: false, undisclosedAssistance: false }
};

test('admits a CCT result only when it is noncompensatorily dominant', () => {
  assert.equal(evaluate(packet('cct', fullPlan(), 'external-a', 'root-a'), packet('simple_rival', fullPlan(80000), 'external-b', 'root-b'), audit).status, 'cct_dominates_on_this_run');
});

test('keeps crossed advantages inconclusive', () => {
  const simplerPlan = fullPlan(80000).filter((action) => action.type !== 'temporary_authority');
  assert.equal(evaluate(packet('cct', fullPlan(), 'external-a', 'root-a'), packet('simple_rival', simplerPlan, 'external-b', 'root-b'), audit).status, 'inconclusive');
});

test('rejects a shared author or collection root', () => {
  assert.equal(evaluate(packet('cct', fullPlan(), 'same', 'root-a'), packet('simple_rival', fullPlan(), 'same', 'root-b'), audit).reason, 'external_independence_not_established');
  assert.equal(evaluate(packet('cct', fullPlan(), 'a', 'same-root'), packet('simple_rival', fullPlan(), 'b', 'same-root'), audit).reason, 'external_independence_not_established');
});

test('rejects shared organizational, funding or implementation roots', () => {
  const cct = packet('cct', fullPlan(), 'external-a', 'root-a');
  for (const field of ['organizationId', 'fundingRoot', 'implementationRoot']) {
    const rival = packet('simple_rival', fullPlan(), 'external-b', 'root-b');
    rival.provenance[field] = cct.provenance[field];
    assert.equal(evaluate(cct, rival, audit).reason, 'external_independence_not_established');
  }
});

test('rejects fixtures, unmatched budgets and forged outcomes', () => {
  const cct = packet('cct', fullPlan(), 'external-a', 'root-a');
  const rival = packet('simple_rival', fullPlan(), 'external-b', 'root-b');
  assert.equal(evaluate({ ...cct, fixture: true }, rival, audit).reason, 'missing_or_fixture_packet');
  assert.equal(evaluate(cct, { ...rival, actionBudget: 9 }, audit).reason, 'comparison_not_matched');
  const forged = structuredClone(rival);
  forged.outcomes.rightsViolations = 0.5;
  assert.equal(evaluate(cct, forged, audit).reason, 'declared_outcomes_do_not_match_frozen_engine');
});

test('fails closed without a separated evidence-backed audit', () => {
  const cct = packet('cct', fullPlan(), 'external-a', 'root-a');
  const rival = packet('simple_rival', fullPlan(), 'external-b', 'root-b');
  assert.equal(evaluate(cct, rival).reason, 'independence_audit_missing_or_unverified');
  const captured = structuredClone(audit);
  captured.reviewers[1].organizationId = 'org-1';
  assert.equal(evaluate(cct, rival, captured).reason, 'reviewers_not_separated');
  const open = structuredClone(audit);
  open.findings.sharedDecisiveFunding = 'unknown';
  assert.equal(evaluate(cct, rival, open).reason, 'independence_dimension_open');
});

test('enforces material and information budgets under the adverse supply bound', () => {
  const over = packet('cct', fullPlan(), 'external-a', 'root-a');
  over.decisions[0] = allocation(130000);
  assert.equal(compileOutcomes(over).reason, 'supply_budget_exceeded_under_uncertainty');
  const excessInformation = packet('cct', fullPlan(), 'external-a', 'root-a');
  excessInformation.informationUsed = 13;
  assert.equal(compileOutcomes(excessInformation).reason, 'information_budget_invalid');
});
