import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
function functionSource(name) {
  const match = new RegExp(`^(?:async )?function ${name}\\(`, 'm').exec(source);
  assert.ok(match, name);
  const tail = source.slice(match.index);
  const next = tail.slice(1).search(/\n(?:async )?function /);
  return next < 0 ? tail : tail.slice(0, next + 1);
}

for (const failure of ['snapshot', 'database', 'quota', null]) {
  test(`restore preserves discoveries until local commit: ${failure || 'success'}`, async () => {
    const previousLibrary = [{ id: 'old' }];
    const previousIndexed = { entities: [], events: [], sync: [] };
    const local = new Map([['seen', '["old"]'], ['notebook', '[]']]);
    const writes = [], messages = [];
    let quotaFailed = false, aborted = 0, cleared = 0;
    const payload = { library: [{ id: 'new' }], notebook: [], local: { seen: ['new'] },
      indexed: { entities: [], events: [], sync: [] } };
    // Stop after the persistence boundary; server/UI hydration is outside this probe.
    Object.defineProperty(payload, 'graph', { get() { throw Error('end of local probe'); } });
    const context = vm.createContext({
      compositionGeneration: 0,
      catalogueRequests: new Map([['pending', { abort() { aborted++; } }]]),
      derivedPool: new Map([['kept', { title: 'Visible discovery' }]]),
      currentDerivedIds: ['kept'], searchedLabels: new Set(['label']), searchedCollaborators: new Set(),
      nodes: { discoveries: { hidden: false }, derivedVideos: { replaceChildren() { cleared++; } } },
      libraryImportInProgress: false, confirm: () => true, explorationSaveQueue: Promise.resolve(),
      validateBackup: () => payload, personalBackup: value => value,
      explorationTransport: { start: async () => {} },
      backupLocalKeys: () => ({ seen: 'seen' }), NOTEBOOK_KEY: 'notebook',
      readCachedLibrary: async () => previousLibrary,
      readBackupStores: async () => { if (failure === 'snapshot') throw Error('snapshot failure'); return previousIndexed; },
      writeBackupStores: async (library, indexed) => {
        if (failure === 'database') throw Error('database failure');
        writes.push({ library, indexed });
      },
      localStorage: { getItem: key => local.get(key) ?? null,
        setItem(key, value) { if (failure === 'quota' && !quotaFailed) { quotaFailed = true; throw Error('quota'); } local.set(key, value); },
        removeItem: key => local.delete(key) },
      backupStatus: (...args) => messages.push(args),
      event: { target: { files: [{ size: 2, text: async () => '{}' }], disabled: false, value: 'file' } },
    });
    vm.runInContext(['cancelDiscoveryRequests', 'resetDiscoveries', 'restoreBackup'].map(functionSource).join('\n'), context);
    await vm.runInContext('restoreBackup(event)', context);
    assert.equal(aborted, 1);
    assert.equal(context.catalogueRequests.size, 0);
    assert.equal(context.event.target.disabled, false);
    if (failure) {
      assert.equal(context.derivedPool.size, 1);
      assert.deepEqual(context.currentDerivedIds, ['kept']);
      assert.equal(context.nodes.discoveries.hidden, false);
      assert.equal(cleared, 0);
      assert.equal(local.get('seen'), '["old"]');
      if (failure === 'quota') {
        assert.equal(writes.length, 2);
        assert.deepEqual(writes[1].library, previousLibrary);
        assert.match(messages.at(-1)[0], /état précédent rétabli/);
      }
    } else {
      assert.equal(context.derivedPool.size, 0);
      assert.equal(context.nodes.discoveries.hidden, true);
      assert.equal(cleared, 1);
      assert.equal(local.get('seen'), '["new"]');
      assert.deepEqual(writes[0].library, payload.library);
    }
  });
}
