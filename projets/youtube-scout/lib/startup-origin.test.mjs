import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const script = await readFile(new URL('../public/bootstrap.js', import.meta.url), 'utf8');
const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');

for (const url of ['http://localhost:4181/', 'http://localhost:4287/#source-panel', 'https://scout.example.test:8443/']) {
  test(`Google setup displays the current origin: ${url}`, () => {
    const location = new URL(url);
    location.replace = () => assert.fail('Unexpected redirect');
    const node = { textContent: '' };
    let ready;
    const document = {
      addEventListener(event, callback) { assert.equal(event, 'DOMContentLoaded'); ready = callback; },
      getElementById(id) { assert.match(html, new RegExp(`id="${id}"`)); return node; }
    };
    vm.runInNewContext(script, { location, document });
    ready();
    assert.equal(node.textContent, new URL(url).origin);
  });
}

test('Opening the HTML file still redirects to the standard local service', () => {
  let destination;
  vm.runInNewContext(script, { location: { protocol: 'file:', replace(url) { destination = url; } } });
  assert.equal(destination, 'http://localhost:4181/');
});
