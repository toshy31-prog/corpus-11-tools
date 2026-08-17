const SOURCE_REGIMES = new Set(["internal_synthetic", "external_supplied", "mixed"]);

function requireFunction(value, label, errors) {
  if (typeof value !== "function") errors.push(`${label} must be a function`);
}

export function validateScenario(scenario, { claimExternal = false } = {}) {
  const errors = [];
  const manifest = scenario?.manifest;
  if (!manifest?.id) errors.push("scenario.manifest.id is required");
  if (!manifest?.version) errors.push("scenario.manifest.version is required");
  if (!manifest?.title) errors.push("scenario.manifest.title is required");
  if (!Number.isInteger(manifest?.rounds) || manifest.rounds < 1) {
    errors.push("scenario.manifest.rounds must be a positive integer");
  }
  if (!Array.isArray(manifest?.dimensions) || manifest.dimensions.length < 2
      || manifest.dimensions.some((item) => typeof item !== "string" || !item)) {
    errors.push("scenario.manifest.dimensions must contain at least two named outcomes");
  }
  if (!Array.isArray(manifest?.reversalConditions) || manifest.reversalConditions.length === 0) {
    errors.push("scenario.manifest.reversalConditions must be non-empty");
  }

  const source = manifest?.source;
  if (!SOURCE_REGIMES.has(source?.regime)) {
    errors.push("scenario.manifest.source.regime is invalid");
  }
  if (!source?.authorId || !source?.authorRelationToCorpus) {
    errors.push("scenario source must declare authorId and authorRelationToCorpus");
  }
  if (source?.regime === "external_supplied") {
    if (source.authorRelationToCorpus !== "independent") {
      errors.push("external_supplied scenario requires an independent author relation");
    }
    if (source.frozenBeforeContenders !== true) {
      errors.push("external_supplied scenario must be frozen before contenders are inspected");
    }
    if (typeof source.authorshipTrace !== "string" || source.authorshipTrace.length < 8) {
      errors.push("external_supplied scenario requires an authorship trace");
    }
    if (source.freezeVerified !== true || typeof source.freezeHash !== "string"
        || !source.freezeHash.startsWith("sha256:")) {
      errors.push("external_supplied scenario requires a machine-verified SHA-256 freeze");
    }
  }
  if (claimExternal && source?.regime !== "external_supplied") {
    errors.push("the arena cannot claim externality for this source regime");
  }

  for (const name of ["createTrial", "project", "admissibleActions", "act", "observe", "scorePredictions", "close"]) {
    requireFunction(scenario?.[name], `scenario.${name}`, errors);
  }
  if (errors.length) throw new Error(`Invalid open-arena scenario:\n- ${errors.join("\n- ")}`);
  return true;
}

export function validateContender(contender) {
  const errors = [];
  if (!contender?.manifest?.id) errors.push("contender.manifest.id is required");
  if (!contender?.manifest?.version) errors.push("contender.manifest.version is required");
  if (!contender?.manifest?.title) errors.push("contender.manifest.title is required");
  if (!contender?.manifest?.family) errors.push("contender.manifest.family is required");
  requireFunction(contender?.decide, "contender.decide", errors);
  if (errors.length) throw new Error(`Invalid arena contender:\n- ${errors.join("\n- ")}`);
  return true;
}

export const OPEN_ARENA_CONTRACT_VERSION = "corpus-open-experiment-arena/v1";
