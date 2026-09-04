#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { validateResourceVehicle } from "./contract.mjs";

const source = process.argv[2] ? new URL(process.argv[2]) : new URL("./resource-vehicle.json", import.meta.url);
const spec = JSON.parse(readFileSync(source));
const errors = validateResourceVehicle(spec);
console.log(JSON.stringify({ id: spec.id, valid: errors.length === 0, status: spec.status, errors }, null, 2));
process.exitCode = errors.length ? 1 : 0;
