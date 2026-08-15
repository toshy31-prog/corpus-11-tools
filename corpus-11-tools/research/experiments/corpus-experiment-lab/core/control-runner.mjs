import { createEngine } from "./engine.mjs";
import { clone, stableHash } from "./reproducibility.mjs";

export function runControl(plugin, controlId, input = {}) {
  const control = plugin.controls?.[controlId];
  if (typeof control !== "function") throw new Error(`Unknown control: ${controlId}`);
  const result = control({
    input: clone(input),
    createEngine: (configuration) => createEngine(plugin, configuration),
  });
  return {
    plugin: plugin.manifest.id,
    pluginVersion: plugin.manifest.version,
    control: controlId,
    input: clone(input),
    result: clone(result),
    resultHash: stableHash({ control: controlId, input, result }),
  };
}

export function runControls(plugin, requests) {
  return requests.map(({ id, input }) => runControl(plugin, id, input ?? {}));
}
