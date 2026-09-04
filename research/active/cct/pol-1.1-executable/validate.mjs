#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { validateSpec } from "./contract.mjs";

const candidateUrl = process.argv[2] ? new URL(process.argv[2]) : new URL("./candidate.json", import.meta.url);
const spec = JSON.parse(readFileSync(candidateUrl));
const errors = validateSpec(spec);

console.log(JSON.stringify({ version: spec.version, valid: errors.length === 0, lifecycleCeiling: spec.lifecycle?.state, errors }, null, 2));
process.exitCode = errors.length ? 1 : 0;
