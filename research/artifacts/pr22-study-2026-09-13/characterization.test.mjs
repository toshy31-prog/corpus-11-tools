// Tests de caractérisation : leur succès reproduit les défauts de la PR,
// il ne signifie PAS que son contrat de réversibilité est satisfait.
import test from 'node:test';
import assert from 'node:assert/strict';
import { adjudicateThreshold, promoteVerdict } from './source/adjudication.mjs';

const raw = () => ({ provenanceHash: 'sha256:fixture', metric: 'mean', value: 0.4,
  uncertainty: 0.2, observations: [{ observer: 'A', value: 0.2 }, { observer: 'B', value: 0.6 }] });
const make = (overrides = {}) => adjudicateThreshold({ metricName: 'mean',
  metricValue: 0.4, threshold: 0.5, rawContext: raw(), ...overrides });
const live = { has: () => true };

test('H1: index présent, octets absents : PASS sans lecture', () => {
  let reads = 0;
  const store = { has: () => true, get: () => { reads++; return undefined; } };
  assert.equal(promoteVerdict(make(), store).status, 'PASS');
  assert.equal(reads, 0);
});
test('H2: octets présents, décodeur absent : PASS', () => {
  const store = { has: () => true, get: () => Buffer.from([0xff, 0xfe]), decoder: null };
  assert.equal(promoteVerdict(make(), store).status, 'PASS');
});
test('H3: paquet réduit sans incertitude ni observations : PASS', () => {
  const reduced = { provenanceHash: 'sha256:reduced', metric: 'mean', value: 0.4 };
  const r = make({ rawContext: reduced });
  assert.equal(promoteVerdict(r, { has: () => true, get: () => reduced }).status, 'PASS');
  assert.equal(r.compression_audit.compression_reversibility.alternative_adjudication_supported, true);
});
test('H4: changement de seuil possible à partir de la valeur gardée', () => {
  const r = make();
  const replay = make({ metricValue: r.compression_audit.discarded_or_merged.exact_value, threshold: 0.3 });
  assert.equal(r.execution, 'PASS');
  assert.equal(replay.execution, 'FAIL');
});
test('H5: une moyenne identique ne permet pas de reconstruire le maximum', () => {
  const a = [0.2, 0.6], b = [0.4, 0.4];
  assert.equal(a.reduce((x, y) => x + y) / a.length, b.reduce((x, y) => x + y) / b.length);
  assert.notEqual(Math.max(...a) > 0.5, Math.max(...b) > 0.5);
  // Même représentation réduite honnêtement hachée, deux sources possibles.
  // Le champ alternative_adjudication_supported n'indique aucune restriction.
  assert.equal(make().compression_audit.compression_reversibility.alternative_adjudication_supported, true);
});
test('H6: désaccord des observateurs absent du résultat conservé', () => {
  const r = make();
  assert.equal(JSON.stringify(r).includes('observations'), false);
  assert.equal(JSON.stringify(r).includes('uncertainty'), false);
  assert.equal(r.compression_audit.compression_reversibility.raw_material_preserved, true);
});
test('H7: source perdue après promotion : ancien PASS inchangé', () => {
  let available = true;
  const store = { has: () => available };
  const r = make();
  const old = promoteVerdict(r, store);
  available = false;
  assert.equal(old.status, 'PASS');
  assert.equal(promoteVerdict(r, store).status, 'INVALID_EPISTEMIC_STATE');
  assert.deepEqual(Object.keys(old).sort(), ['errors', 'status']);
});
test('H8: irréversibilité bornée sans provenance : rejet inconditionnel', () => {
  const r = make({ rawContext: null });
  Object.assign(r.compression_audit.compression_reversibility, {
    raw_material_resolvable: false, alternative_adjudication_supported: false,
    scope: 'comparaison historique de la seule valeur conservée',
    destructive_transformations: ['observations supprimées'],
    cost: 'aucun recalcul de métrique possible'
  });
  assert.equal(promoteVerdict(r).status, 'REJECTED_AUDIT');
});
test('A1: hash ne correspondant pas aux octets : PASS', () => {
  assert.equal(promoteVerdict(make(), { has: () => true, get: () => Buffer.from('corrupt') }).status, 'PASS');
});
test('A2: verdict falsifié après calcul FAIL : promu PASS', () => {
  const r = make({ metricValue: 0.9 });
  assert.equal(r.execution, 'FAIL');
  r.execution = 'PASS';
  assert.equal(promoteVerdict(r, live).status, 'PASS');
});
test('A3: valeur fournie contradictoire avec le paquet : PASS', () => {
  const packet = { ...raw(), value: 0.9 };
  assert.equal(promoteVerdict(make({ rawContext: packet, metricValue: 0.1 }), live).status, 'PASS');
});
for (const [name, overrides] of [
  ['NaN', { metricValue: NaN }], ['null', { metricValue: null }],
  ['texte', { metricValue: 'inconnue' }], ['seuil absent', { threshold: undefined }]
]) test(`A4: entrée ${name} invalide : PASS`, () => {
  assert.equal(promoteVerdict(make(overrides), live).status, 'PASS');
});
test('A5: suppression du bloc de réversibilité contourne le résolveur', () => {
  const r = make();
  delete r.compression_audit.compression_reversibility;
  assert.equal(promoteVerdict(r, null).status, 'PASS');
});
test('A6: résolveur asynchrone retournant false accepté comme vrai', () => {
  assert.equal(promoteVerdict(make(), { has: async () => false }).status, 'PASS');
});
test('A7: exception du résolveur non convertie en statut', () => {
  assert.throws(() => promoteVerdict(make(), { has: () => { throw new Error('offline'); } }), /offline/);
});
