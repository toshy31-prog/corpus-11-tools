import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { normalizeFilters } from './search.mjs';
const source = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
const start = source.indexOf('function durationSummary(');
const end = source.indexOf('function updateUnderstanding(', start);
const summarize = vm.runInNewContext(source.slice(start, end) + '; durationSummary');
for (const [timeBudget, maxRuntime] of [['standard', 90], ['standard', 150], ['short', 120], ['ample', 175], ['unlimited', 600], ['unlimited', 90], ['standard', undefined], ['short', 20]]) {
  test(`display follows effective server duration: ${timeBudget}/${maxRuntime}`, () => {
    const filters = { timeBudget, maxRuntime };
    const effective = normalizeFilters(filters);
    const expected = timeBudget === 'unlimited' && effective.maxRuntime === 600
      ? 'catalogue sans filtre de durée' : `${effective.maxRuntime} minutes maximum`;
    assert.equal(summarize(filters), expected);
  });
}
