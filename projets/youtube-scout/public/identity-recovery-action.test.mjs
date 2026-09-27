import test from 'node:test';
import assert from 'node:assert/strict';
import { revealIdentityChoice } from './scout-mixer-panel.mjs';

function fixture({ seed = 'current', hidden = false, choices = 2, searchable = true } = {}) {
  const events = [];
  const outer = { tagName: 'DETAILS', open: false, parentElement: null };
  const make = name => ({ options: { length: choices }, parentElement: outer,
    scrollIntoView: () => events.push(`scroll:${name}`), focus: () => events.push(`focus:${name}`) });
  const choice = make('choice'), search = make('search');
  const panel = { dataset: { seedId: seed }, closest: () => hidden ? {} : null,
    querySelectorAll: () => choices ? [choice] : [], querySelector: () => searchable ? search : null };
  return { panel, events, outer };
}
test('un clic rejoint les propositions et ouvre leurs détails sans les sélectionner', () => {
  const f = fixture();
  assert.equal(revealIdentityChoice({ querySelectorAll: () => [f.panel] }, 'current'), true);
  assert.deepEqual(f.events, ['scroll:choice', 'focus:choice']);
  assert.equal(f.outer.open, true);
});
test('sans proposition, rejoint la recherche, pas le menu vide', () => {
  const f = fixture({ choices: 1 });
  revealIdentityChoice({ querySelectorAll: () => [f.panel] }, 'current');
  assert.deepEqual(f.events, ['scroll:search', 'focus:search']);
});
test('ne rejoint jamais une ancienne identité ou un panneau caché', () => {
  const stale = fixture({ seed: 'previous' }), hidden = fixture({ hidden: true });
  assert.equal(revealIdentityChoice({ querySelectorAll: () => [stale.panel, hidden.panel] }, 'current'), false);
  assert.deepEqual([...stale.events, ...hidden.events], []);
});
test('aucun contrôle actif ne provoque aucune navigation', () => {
  const f = fixture({ choices: 0, searchable: false });
  assert.equal(revealIdentityChoice({ querySelectorAll: () => [f.panel] }, 'current'), false);
  assert.equal(f.outer.open, false);
});
