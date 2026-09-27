import test from 'node:test';
import assert from 'node:assert/strict';
import { routeIsSelected, nextRouteWeight } from './scout-mixer-panel.mjs';

test('une direction en attente reste sélectionnée et peut être désélectionnée', () => {
  const route = { weight: 1, enabled: false, state: 'confirmation' };
  assert.equal(routeIsSelected(route), true);
  assert.equal(nextRouteWeight(route), 0);
});
test('disponibilité et intention ne sont pas confondues', () => {
  for (const state of ['ready', 'pending', 'error', 'unavailable', 'confirmation']) {
    assert.equal(nextRouteWeight({ weight: 0.4, state, enabled: false }), 0);
    assert.equal(nextRouteWeight({ weight: 0, state, enabled: false }), 1);
  }
  assert.equal(nextRouteWeight({ weight: 1, state: 'paused' }), 1);
  assert.equal(nextRouteWeight(undefined), 1);
});
