import { clone } from "./reproducibility.mjs";

export function classify(plugin, classifierId, evidence) {
  const classifier = plugin.classifiers?.[classifierId];
  if (typeof classifier !== "function") throw new Error(`Unknown classifier: ${classifierId}`);
  return clone(classifier({ evidence: clone(evidence), manifest: clone(plugin.manifest) }));
}
