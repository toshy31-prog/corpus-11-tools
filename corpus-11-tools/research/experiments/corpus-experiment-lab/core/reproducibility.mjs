export function canonicalize(value) {
  if (value === null || typeof value !== "object") {
    if (typeof value === "bigint") return value.toString();
    return value;
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
  );
}

export function canonicalStringify(value) {
  return JSON.stringify(canonicalize(value));
}

export function stableHash(value) {
  const text = canonicalStringify(value);
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (const character of text) {
    hash ^= BigInt(character.codePointAt(0));
    hash = BigInt.asUintN(64, hash * prime);
  }
  return `fnv1a64:${hash.toString(16).padStart(16, "0")}`;
}

export function clone(value) {
  return structuredClone(value);
}

export function resultEnvelope(engineSnapshot, extra = {}) {
  const deterministic = {
    contract: engineSnapshot.contract,
    plugin: engineSnapshot.plugin,
    configuration: engineSnapshot.configuration,
    state: engineSnapshot.state,
    journal: engineSnapshot.journal,
    ...extra,
  };
  return { ...deterministic, resultHash: stableHash(deterministic) };
}
