const PRESET_BASE = Object.freeze({
  minYear: "1900",
  effect: "open",
  timeBudget: "ample",
  detour: "adventurous",
  genres: []
});

export function buildQuickPreset(kind, currentYear = new Date().getFullYear()) {
  const maxYear = String(currentYear);
  if (kind === "oblique") {
    return {
      ...PRESET_BASE,
      maxYear,
      wish: "",
      lenses: ["oblique"]
    };
  }
  if (kind === "surprise") {
    return {
      ...PRESET_BASE,
      maxYear,
      wish: "Surprends-moi",
      lenses: []
    };
  }
  throw new TypeError(`Préréglage inconnu : ${kind}`);
}
