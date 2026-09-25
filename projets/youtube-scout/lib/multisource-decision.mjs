import {
  summarizeIdentityPackets,
  decideIdentityFromSupport
} from "./evidence-algebra.mjs";

function clean(value = "") {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/\s+/gu, " ")
    .trim();
}

function key(value = "") {
  return clean(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function unique(values = []) {
  const seen = new Set();
  const out = [];

  for (const value of values) {
    const k = key(value);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(clean(value));
  }

  return out;
}

export function summarizeIdentitySupport(
  evidencePackets = []
) {
  return summarizeIdentityPackets(
    evidencePackets
  );
}


export function decideMultiSourceIdentity({
  expectedArtists = [],
  competingArtists = [],
  evidencePackets = [],
  minimumIndependentSources = 2,
  strongSingleSourceThreshold = 0.97
} = {}) {
  const support = summarizeIdentitySupport(evidencePackets);

  return decideIdentityFromSupport({
    support,
    preferredArtists: unique(expectedArtists),
    competingArtists: unique(competingArtists),
    minimumIndependentSources,
    strongSingleSourceThreshold
  });
}
