export function findDominated(outcomesById, orientations) {
  const ids = Object.keys(outcomesById);
  const dimensions = Object.keys(orientations);
  return Object.fromEntries(ids.map((candidateId) => {
    const candidate = outcomesById[candidateId];
    const dominators = ids.filter((otherId) => {
      if (otherId === candidateId) return false;
      const other = outcomesById[otherId];
      const noWorse = dimensions.every((dimension) => orientations[dimension] === "min"
        ? other[dimension] <= candidate[dimension] : other[dimension] >= candidate[dimension]);
      const strictlyBetter = dimensions.some((dimension) => orientations[dimension] === "min"
        ? other[dimension] < candidate[dimension] : other[dimension] > candidate[dimension]);
      return noWorse && strictlyBetter;
    });
    return [candidateId, dominators];
  }).filter(([, dominators]) => dominators.length));
}

export function findOutcomeEquivalents(outcomesById) {
  const groups = new Map();
  for (const [id, outcomes] of Object.entries(outcomesById)) {
    const key = JSON.stringify(outcomes);
    groups.set(key, [...(groups.get(key) ?? []), id]);
  }
  return [...groups.values()].filter((ids) => ids.length > 1);
}
