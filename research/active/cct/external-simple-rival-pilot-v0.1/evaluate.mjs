import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditIndependence } from './audit-independence.mjs';
import { compileOutcomes } from './outcome-engine.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const protocol = JSON.parse(fs.readFileSync(path.join(here, 'protocol.json')));

export function evaluate(cct, rival, audit, profileId = 'conservative_worst_case', requireDeclaredOutcomes = true) {
  const packets = [cct, rival];
  if (packets.some((packet) => !packet || packet.fixture === true)) {
    return { status: 'inadmissible', reason: 'missing_or_fixture_packet' };
  }
  if (cct.candidateId !== 'cct' || rival.candidateId !== 'simple_rival') {
    return { status: 'inadmissible', reason: 'candidate_identity_invalid' };
  }
  if (packets.some((packet) => packet.scenarioId !== protocol.scenarioId || packet.informationBudget !== protocol.informationBudget || packet.actionBudget !== protocol.actionBudget)) {
    return { status: 'inadmissible', reason: 'comparison_not_matched' };
  }
  if (!cct.provenance || !rival.provenance || cct.provenance.authorId === rival.provenance.authorId || cct.provenance.collectionRoot === rival.provenance.collectionRoot) {
    return { status: 'inadmissible', reason: 'external_independence_not_established' };
  }
  const separationFields = ['authorId', 'organizationId', 'collectionRoot', 'fundingRoot', 'implementationRoot'];
  if (separationFields.some((field) => !cct.provenance[field] || !rival.provenance[field] || cct.provenance[field] === rival.provenance[field])) {
    return { status: 'inadmissible', reason: 'external_independence_not_established' };
  }
  if (packets.some((packet) => packet.provenance.outsideRepository !== true || packet.provenance.protocolFrozenBeforeCollection !== true)) {
    return { status: 'inadmissible', reason: 'external_provenance_incomplete' };
  }
  const independence = auditIndependence(cct, rival, audit);
  if (!independence.admitted) return { status: 'inadmissible', reason: independence.reason };
  const compiledCct = compileOutcomes(cct, profileId);
  const compiledRival = compileOutcomes(rival, profileId);
  if (!compiledCct.admitted || !compiledRival.admitted) return { status: 'inadmissible', reason: compiledCct.reason ?? compiledRival.reason };
  for (const [packet, compiled] of [[cct, compiledCct], [rival, compiledRival]]) {
    if (requireDeclaredOutcomes && (!packet.outcomes || protocol.axes.some((axis) => packet.outcomes[axis] !== compiled.outcomes[axis]))) return { status: 'inadmissible', reason: 'declared_outcomes_do_not_match_frozen_engine' };
  }
  const cctNoWorse = protocol.axes.every((axis) => compiledCct.outcomes[axis] <= compiledRival.outcomes[axis]);
  const rivalNoWorse = protocol.axes.every((axis) => compiledRival.outcomes[axis] <= compiledCct.outcomes[axis]);
  const cctBetter = protocol.axes.some((axis) => compiledCct.outcomes[axis] < compiledRival.outcomes[axis]);
  const rivalBetter = protocol.axes.some((axis) => compiledRival.outcomes[axis] < compiledCct.outcomes[axis]);
  if (cctNoWorse && cctBetter) return { status: 'cct_dominates_on_this_run', engineProfileId: profileId };
  if (rivalNoWorse && rivalBetter) return { status: 'simple_rival_dominates_on_this_run', engineProfileId: profileId };
  return { status: 'inconclusive', engineProfileId: profileId };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [cctPath, rivalPath, auditPath] = process.argv.slice(2);
  if (!cctPath || !rivalPath || !auditPath || !fs.existsSync(cctPath) || !fs.existsSync(rivalPath) || !fs.existsSync(auditPath)) {
    console.log(JSON.stringify({ status: 'awaiting_external_inputs' }));
    process.exitCode = 2;
  } else {
    const result = evaluate(JSON.parse(fs.readFileSync(cctPath)), JSON.parse(fs.readFileSync(rivalPath)), JSON.parse(fs.readFileSync(auditPath)));
    console.log(JSON.stringify(result));
    if (result.status === 'inadmissible') process.exitCode = 1;
  }
}
