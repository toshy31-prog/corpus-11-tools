// Optional native OpenCode hook. Unknown/changed definitions retain upstream text.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

export default async function compactToolDescriptions() {
  const catalog = JSON.parse(readFileSync(new URL('./compact_tool_descriptions.json', import.meta.url), 'utf8'));
  if (catalog.schema_version !== 1) throw new Error('Unsupported compact tool description catalog');
  return {
    'tool.definition': async ({toolID}, output) => {
      const rule = catalog.tools[toolID];
      if (!rule || typeof output.description !== 'string') return;
      const digest = createHash('sha256').update(output.description).digest('hex');
      if (digest !== rule.source_sha256) return;
      // Parameters, schema and execution handler remain entirely upstream-owned.
      output.description = rule.description;
    },
  };
}
