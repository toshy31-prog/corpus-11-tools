const fs = require('fs');
const assert = require('assert');

const source = fs.readFileSync(
  'projets/corpus-local-llm-migration/portal/app.js',
  'utf8'
);

const start = source.indexOf('function temporalMessageContext(createdAt){');
const end = source.indexOf('\nfunction nativeRender(', start);

assert.notStrictEqual(start, -1, 'temporalMessageContext absent');
assert.notStrictEqual(end, -1, 'fin de temporalMessageContext absente');

const fn = source.slice(start, end);

assert.match(fn, /Date du message/);
assert.match(fn, /Hors question temporelle/);
assert.match(fn, /ne prouve pas qu\\'une information est encore actuelle/);
assert.match(fn, /ne devine pas les dates manquantes/);

assert.doesNotMatch(
  fn,
  /Ce repère décrit le moment où ce message a été rédigé/
);

console.log(
  'Contexte temporel : repère conservé, mention spontanée bornée, actualité et dates manquantes protégées.'
);
