import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { SERVICE_ID } from "./server-readiness.mjs";

const source = (await readFile(new URL("../scripts/doctor.mjs", import.meta.url), "utf8"))
  .replace('import { SERVICE_ID } from "../lib/server-readiness.mjs";', "");

async function run(status, { live = true, unavailable = false } = {}) {
  const calls = [], errors = [], output = [];
  const process = { env: {}, argv: live ? ["--live"] : [], exitCode: undefined };
  const context = vm.createContext({ SERVICE_ID, process, AbortSignal,
    console: { log: (text) => output.push(text), error: (text) => errors.push(text) },
    fetch: async (url, options) => {
      calls.push({ url, options });
      if (unavailable) throw new Error("offline");
      return { ok: true, json: async () => options.method === "POST" ? { diagnostics: {} } : status };
    },
  });
  await vm.runInContext(`(async () => {${source}\n})()`, context);
  return { calls, errors, output, process };
}

test("foreign or incompatible services are rejected before live diagnostics", async () => {
  for (const payload of [null, {}, { service: "other", connections: {} }, { service: SERVICE_ID }]) {
    const result = await run(payload);
    assert.equal(result.process.exitCode, 2);
    assert.equal(result.calls.length, 1);
    assert.equal(result.calls[0].options.redirect, "error");
    assert.match(result.errors[0], /pas identifié/);
    assert.equal(result.output.length, 0);
  }
});

test("identified service supports passive and live diagnostics", async () => {
  for (const live of [false, true]) {
    const result = await run({ service: SERVICE_ID, connections: { tmdb: { configured: true } } }, { live });
    assert.equal(result.calls.length, live ? 2 : 1);
    if (live) assert.equal(result.calls[1].options.method, "POST");
    assert.equal(result.errors.length, 0);
    assert.equal(result.process.exitCode, undefined);
  }
});

test("unavailable service never receives a live diagnostic request", async () => {
  const result = await run(null, { unavailable: true });
  assert.equal(result.calls.length, 1);
  assert.equal(result.process.exitCode, 2);
});
