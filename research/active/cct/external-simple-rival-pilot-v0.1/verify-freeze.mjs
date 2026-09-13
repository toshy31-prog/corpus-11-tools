import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const freeze = JSON.parse(fs.readFileSync(path.join(here, 'freeze.json')));
const mismatches = Object.entries(freeze.files).filter(([name, expected]) => {
  const actual = crypto.createHash('sha256').update(fs.readFileSync(path.join(here, name))).digest('hex');
  return actual !== expected;
});
console.log(JSON.stringify({ status: mismatches.length ? 'freeze_invalid' : 'freeze_valid', mismatches: mismatches.map(([name]) => name) }));
if (mismatches.length) process.exitCode = 1;
