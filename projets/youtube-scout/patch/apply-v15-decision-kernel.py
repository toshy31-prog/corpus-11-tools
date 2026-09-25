from pathlib import Path
from datetime import datetime

ALG = Path("lib/evidence-algebra.mjs")
MULTI = Path("lib/multisource-decision.mjs")
RES = Path("lib/resolution-evidence.mjs")

for p in (ALG, MULTI, RES):
    if not p.exists():
        raise SystemExit(f"{p} introuvable — aucun changement.")

stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
for p in (ALG, MULTI, RES):
    Path(f"/tmp/{p.name}.before-v15-{stamp}.mjs").write_text(p.read_text())

s = ALG.read_text()
insert_at = s.find("export function enforceKnownIdentityCorroboration(")
if insert_at == -1:
    raise SystemExit("Primitive v14 introuvable dans evidence-algebra.mjs.")

kernel = r'''export function decideIdentityFromSupport({
  support = [],
  preferredArtists = [],
  competingArtists = [],
  minimumIndependentSources = 2,
  strongSingleSourceThreshold = 0.97
} = {}) {
  const preferredKeys =
    new Set(
      preferredArtists
        .map(looseKey)
        .filter(Boolean)
    );

  const competingKeys =
    new Set(
      competingArtists
        .map(looseKey)
        .filter(Boolean)
    );

  const preferredSupport =
    support.filter(
      ({ artist }) =>
        preferredKeys.has(
          looseKey(artist)
        )
    );

  const competingSupport =
    support.filter(
      ({ artist }) =>
        competingKeys.has(
          looseKey(artist)
        )
    );

  const bestPreferred =
    preferredSupport[0] || null;

  const bestCompeting =
    competingSupport[0] || null;

  if (
    bestPreferred &&
    bestPreferred.independentSources >= minimumIndependentSources &&
    !(
      bestCompeting &&
      bestCompeting.independentSources >= minimumIndependentSources
    )
  ) {
    return {
      decision: "accepted",
      reason: "preferred_identity_corroborated",
      support,
      preferred: bestPreferred,
      competing: bestCompeting
    };
  }

  if (
    bestPreferred &&
    bestPreferred.strongest >= strongSingleSourceThreshold &&
    competingKeys.size === 0
  ) {
    return {
      decision: "accepted",
      reason: "strong_single_source_without_known_competitor",
      support,
      preferred: bestPreferred,
      competing: null
    };
  }

  if (bestPreferred && bestCompeting) {
    return {
      decision: "ambiguous",
      reason: "multiple_supported_identities",
      support,
      preferred: bestPreferred,
      competing: bestCompeting
    };
  }

  if (bestPreferred && competingKeys.size) {
    return {
      decision: "ambiguous",
      reason: "known_competitor_not_independently_resolved",
      support,
      preferred: bestPreferred,
      competing: bestCompeting
    };
  }

  if (support.length) {
    return {
      decision: "deferred",
      reason: "evidence_exists_but_identity_not_grounded",
      support,
      preferred: bestPreferred,
      competing: bestCompeting
    };
  }

  return {
    decision: "rejected",
    reason: "no_identity_evidence",
    support: [],
    preferred: null,
    competing: null
  };
}

export function decideRankedResolutionFromEvidence({
  evidence = {},
  ranking = {}
} = {}) {
  const best = ranking?.best || null;

  if (!best) {
    return { decision: "rejected", reason: "no_candidates" };
  }

  if (best.score < 0.55) {
    return {
      decision: "rejected",
      reason: "no_plausible_identity_match"
    };
  }

  const summary = evidence.summary || {};

  if (
    summary.hasKnownContradiction &&
    Number(summary.preferredIndependentSources || 0) < 2
  ) {
    return {
      decision: "ambiguous",
      reason: "known_identity_disagreement_requires_corroboration"
    };
  }

  if (
    Number(summary.preferredIndependentSources || 0) > 0 &&
    Number(summary.competingIndependentSources || 0) > 0
  ) {
    return {
      decision: "ambiguous",
      reason: "competing_identities_have_external_support"
    };
  }

  if (
    best.score >= 0.90 &&
    (
      ranking.gap >= 0.12 ||
      Number(summary.preferredIndependentSources || 0) >= 2
    )
  ) {
    return {
      decision: "auto_accept",
      reason: "strong_identity_evidence"
    };
  }

  return {
    decision: "ambiguous",
    reason: "insufficient_resolution_evidence"
  };
}


'''

if "export function decideIdentityFromSupport(" not in s:
    s = s[:insert_at] + kernel + s[insert_at:]
ALG.write_text(s)

s = MULTI.read_text()
old_import = '''import {
  summarizeIdentityPackets
} from "./evidence-algebra.mjs";
'''
new_import = '''import {
  summarizeIdentityPackets,
  decideIdentityFromSupport
} from "./evidence-algebra.mjs";
'''
if old_import in s:
    s = s.replace(old_import, new_import, 1)
elif "decideIdentityFromSupport" not in s:
    raise SystemExit("Import v11 attendu introuvable dans multisource-decision.")

start = s.find("export function decideMultiSourceIdentity(")
if start == -1:
    raise SystemExit("decideMultiSourceIdentity introuvable.")
replacement = r'''export function decideMultiSourceIdentity({
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
'''
s = s[:start] + replacement + "\n"
MULTI.write_text(s)

s = RES.read_text()
old_import = '''import {
  summarizeIdentityCandidateGroups,
  countIndependentSourceFamilies
} from "./evidence-algebra.mjs";
'''
new_import = '''import {
  summarizeIdentityCandidateGroups,
  countIndependentSourceFamilies,
  decideRankedResolutionFromEvidence
} from "./evidence-algebra.mjs";
'''
if old_import in s:
    s = s.replace(old_import, new_import, 1)
elif "decideRankedResolutionFromEvidence" not in s:
    raise SystemExit("Import v12 attendu introuvable dans resolution-evidence.")

start = s.find("export function decideFromResolutionEvidence(")
if start == -1:
    raise SystemExit("decideFromResolutionEvidence introuvable.")
replacement = r'''export function decideFromResolutionEvidence({
  evidence,
  ranking
} = {}) {
  return decideRankedResolutionFromEvidence({
    evidence,
    ranking
  });
}
'''
s = s[:start] + replacement + "\n"
RES.write_text(s)

print("===== V15 — CENTRAL DECISION KERNEL =====")
print("Algèbre :", ALG)
print("Multi   :", MULTI)
print("Evidence:", RES)
print("Backups /tmp suffixe :", stamp)
print("multisource-decision délègue.")
print("resolution-evidence délègue.")
print("APIs publiques conservées.")
print("Aucune mutation du graphe.")
