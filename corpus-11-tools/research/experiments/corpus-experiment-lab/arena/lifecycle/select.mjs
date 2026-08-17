export function applyLifecycleRegistry(contenders, registry, { scope, includeQuarantined = false } = {}) {
  const active = [];
  const excluded = [];
  for (const contender of contenders) {
    const entry = registry?.entries?.[contender.manifest.id];
    const quarantinedHere = entry?.status === "quarantined_local" && entry.scope === scope;
    if (quarantinedHere && !includeQuarantined) {
      excluded.push({ contenderId: contender.manifest.id, ...structuredClone(entry) });
    } else {
      active.push(contender);
    }
  }
  return { active, excluded };
}
