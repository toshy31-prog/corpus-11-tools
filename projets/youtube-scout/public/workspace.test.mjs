import test from 'node:test';
import assert from 'node:assert/strict';
import { directionState, workspaceView, WORKSPACE_DIRECTIONS } from './workspace.mjs';
test('les trois espaces conservent les anciens liens directs', () => {
  assert.equal(workspaceView('#notebook'), 'notebook');
  assert.equal(workspaceView('#source-panel'), 'sources');
  assert.equal(workspaceView('#backup-settings'), 'sources');
  assert.equal(workspaceView('#discover-label'), 'explore');
  assert.equal(new Set(WORKSPACE_DIRECTIONS.map(([id]) => id)).size, 8);
});
test('les états visibles distinguent inconnu, recherche, panne, parcours terminé et pause', () => {
  const state = group => ({ groups: { label: group } });
  assert.equal(directionState('label').kind, 'unknown');
  assert.equal(directionState('label', state({ loading: true })).kind, 'loading');
  assert.equal(directionState('label', state({ error: 'quota' })).kind, 'error');
  assert.equal(directionState('label', state({ coverage: { hasMore: true } })).kind, 'pending');
  assert.equal(directionState('label', state({ coverage: { complete: true } })).kind, 'empty');
  assert.equal(directionState('label', { ...state({ items: [{ id: 'a' }] }), front: { branches: [{ direction: 'label', status: 'paused' }] } }).kind, 'paused');
  assert.equal(directionState('label', state({ items: [{ id: 'a' }] })).count, 1);
});
