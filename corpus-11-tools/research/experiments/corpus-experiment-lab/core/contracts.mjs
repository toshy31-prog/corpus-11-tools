const REGISTRIES = ["operations", "observers", "perturbations", "criteria", "controls", "classifiers"];

export function validatePlugin(plugin) {
  const errors = [];
  if (!plugin || typeof plugin !== "object") errors.push("plugin must be an object");
  if (!plugin?.manifest?.id) errors.push("manifest.id is required");
  if (!plugin?.manifest?.version) errors.push("manifest.version is required");
  if (!plugin?.manifest?.title) errors.push("manifest.title is required");
  if (typeof plugin?.createState !== "function") errors.push("createState(config) is required");

  for (const registry of REGISTRIES) {
    const entries = plugin?.[registry] ?? {};
    if (typeof entries !== "object" || Array.isArray(entries)) {
      errors.push(`${registry} must be an object registry`);
      continue;
    }
    for (const [id, handler] of Object.entries(entries)) {
      if (!id || typeof handler !== "function") errors.push(`${registry}.${id || "<empty>"} must be a function`);
    }
  }

  try {
    validateObserver(plugin?.manifest?.observer, "manifest.observer");
  } catch (error) {
    errors.push(error.message);
  }
  if (!Array.isArray(plugin?.manifest?.reversalConditions) || plugin.manifest.reversalConditions.length === 0) {
    errors.push("manifest.reversalConditions must be a non-empty array");
  }

  if (errors.length) throw new Error(`Invalid experiment plugin:\n- ${errors.join("\n- ")}`);
  return true;
}

export function validateObserver(observer, label = "observer") {
  const errors = [];
  if (!observer || !Array.isArray(observer.allowedOperations)) {
    errors.push(`${label}.allowedOperations is required`);
  } else if (observer.allowedOperations.length === 0 || observer.allowedOperations.some((item) => typeof item !== "string" || !item)) {
    errors.push(`${label}.allowedOperations must contain non-empty strings`);
  }
  if (!Number.isInteger(observer?.maxSteps) || observer.maxSteps < 0) {
    errors.push(`${label}.maxSteps must be a non-negative integer`);
  }
  if (!Number.isFinite(observer?.successThreshold)) {
    errors.push(`${label}.successThreshold must be numeric`);
  }
  if (errors.length) throw new Error(errors.join("; "));
  return true;
}

export function registryIds(plugin) {
  return Object.fromEntries(REGISTRIES.map((name) => [name, Object.keys(plugin[name] ?? {}).sort()]));
}

export const PLUGIN_CONTRACT_VERSION = "corpus-experiment-plugin/v1";
