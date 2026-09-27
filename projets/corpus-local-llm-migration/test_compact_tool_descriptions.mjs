import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import plugin from './compact_tool_descriptions.mjs';
const hook = (await plugin())['tool.definition'];
const catalog = JSON.parse(readFileSync(new URL('./compact_tool_descriptions.json', import.meta.url)));
const parameters = {type:'object',properties:{command:{type:'string'}}};
for (const toolID of Object.keys(catalog.tools)) {
  const output={description:'Unknown upstream revision',parameters,jsonSchema:parameters};
  await hook({toolID}, output);
  assert.equal(output.description,'Unknown upstream revision');
  assert.equal(output.parameters,parameters);
  assert.equal(output.jsonSchema,parameters);
}
const unknown={description:'Untouched custom tool',parameters};
await hook({toolID:'custom'},unknown);
assert.equal(unknown.description,'Untouched custom tool');
// Optional real capture fixture verifies successful matches without shipping private payloads.
if (process.argv[2]) {
  const capture=JSON.parse(readFileSync(process.argv[2]));
  for (const {function:f} of capture.tools) {
    if (!catalog.tools[f.name]) continue;
    assert.equal(createHash('sha256').update(f.description).digest('hex'),catalog.tools[f.name].source_sha256);
    const output={description:f.description,parameters:f.parameters,jsonSchema:f.parameters};
    await hook({toolID:f.name},output);
    assert.equal(output.description,catalog.tools[f.name].description);
    assert.ok(output.description.length < f.description.length);
    assert.equal(output.parameters,f.parameters);
    assert.equal(output.jsonSchema,f.parameters);
  }
}
console.log('COMPACT_DESCRIPTIONS_GUARDS_PASS');
