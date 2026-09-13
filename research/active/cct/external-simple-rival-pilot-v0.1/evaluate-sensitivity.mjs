import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluate } from './evaluate.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const registry = JSON.parse(fs.readFileSync(path.join(here, 'engine-profiles.json')));

export function aggregateSensitivity(results) {
  if (results.some((result) => result.status === 'inadmissible')) return { status: 'inadmissible', results };
  const statuses = new Set(results.map((result) => result.status));
  const opposite = statuses.has('cct_dominates_on_this_run') && statuses.has('simple_rival_dominates_on_this_run');
  if (opposite) return { status: 'contradiction_across_engines', results };
  if (statuses.size === 1 && statuses.has('inconclusive')) return { status: 'compatible_survivors_all_engines', results };
  if (statuses.size === 1) return { status: 'robust_within_registered_engines', result: [...statuses][0], results };
  return { status: 'model_dependent', results };
}

export function evaluateSensitivity(cct, rival, audit) {
  return aggregateSensitivity(registry.profiles.map((profile) => evaluate(cct, rival, audit, profile.id, false)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [cctPath, rivalPath, auditPath] = process.argv.slice(2);
  if (![cctPath, rivalPath, auditPath].every((value) => value && fs.existsSync(value))) {
    console.log(JSON.stringify({ status: 'awaiting_external_inputs' }));
    process.exitCode = 2;
  } else {
    const result = evaluateSensitivity(JSON.parse(fs.readFileSync(cctPath)), JSON.parse(fs.readFileSync(rivalPath)), JSON.parse(fs.readFileSync(auditPath)));
    console.log(JSON.stringify(result));
    if (result.status === 'inadmissible') process.exitCode = 1;
  }
}
