export const SOURCE_CHARACTER_SCHEMA_VERSION = 1;

function object(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function sameSet(left = [], right = []) {
  const a = [...new Set(left)].sort();
  const b = [...new Set(right)].sort();
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

export function sourceCharacterPresetMatch(state, presets = {}) {
  for (const [name, preset] of Object.entries(presets || {})) {
    if (
      Number(preset?.temperature) === Number(state?.temperature) &&
      sameSet(preset?.lenses || [], state?.lenses || [])
    ) return name;
  }
  return "";
}

export function createSourceCharacterPatch(input = {}, {
  lensIds = [],
  presets = {},
  defaultPreset = "archive"
} = {}) {
  const previous = object(input) ? input : {};
  const allowed = new Set(lensIds);
  const requestedPreset =
    typeof previous.preset === "string" && presets[previous.preset]
      ? previous.preset
      : typeof previous.mission === "string" && presets[previous.mission]
        ? previous.mission
        : defaultPreset;
  const fallback = presets[requestedPreset] || presets[defaultPreset] || { lenses: [], temperature: 0 };

  const rawLenses = Array.isArray(previous.lenses) ? previous.lenses : fallback.lenses || [];
  const lenses = [...new Set(rawLenses.filter(id => typeof id === "string" && allowed.has(id)))];

  const rawTemperature = Number(previous.temperature);
  const fallbackTemperature = Number(fallback.temperature);
  const temperature = Math.max(
    0,
    Math.min(100, Math.round(Number.isFinite(rawTemperature) ? rawTemperature : (Number.isFinite(fallbackTemperature) ? fallbackTemperature : 0)))
  );

  const patch = {
    schemaVersion: SOURCE_CHARACTER_SCHEMA_VERSION,
    preset: "",
    lenses,
    temperature
  };
  patch.preset = sourceCharacterPresetMatch(patch, presets);
  return patch;
}
