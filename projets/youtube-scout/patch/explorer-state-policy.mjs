export function emptyActiveDig(now = new Date().toISOString()) {
  return {
    schemaVersion: 2,
    id: "",
    seed: null,
    front: null,
    dossier: null,
    derived: [],
    derivedIds: [],
    catalogueGroups: {},
    navigationStack: [],
    collaborationArtist: "",
    history: [],
    createdAt: "",
    updatedAt: now
  };
}

export function chooseMostRecentRecovery(values = []) {
  const timestamp = (value) =>
    Date.parse(
      value?.updatedAt ||
      value?.front?.updatedAt ||
      value?.createdAt ||
      0
    ) || 0;

  return (
    values
      .filter(Boolean)
      .sort((a, b) => timestamp(b) - timestamp(a))[0] ||
    null
  );
}

export function isValidRecovery(value) {
  return Boolean(
    value?.schemaVersion === 2 &&
    value?.front?.seed?.id &&
    Array.isArray(value?.front?.branches)
  );
}

export function recoveryFromBackup(activeDig) {
  if (!activeDig) return null;
  return { ...activeDig };
}

export function bootExplorerState({
  recovery = null,
  now = new Date().toISOString()
} = {}) {
  return {
    activeDig: emptyActiveDig(now),
    resumableDig: isValidRecovery(recovery) ? recovery : null,
    explorationSession: null
  };
}

export function resumeExplorerState(recovery) {
  if (!isValidRecovery(recovery)) {
    throw new TypeError("Invalid exploration recovery");
  }

  return {
    activeDig: { ...recovery },
    resumableDig: recovery,
    explorationSession: recovery.front
  };
}
