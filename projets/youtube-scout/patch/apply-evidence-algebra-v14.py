from pathlib import Path
from datetime import datetime

ALG = Path("lib/evidence-algebra.mjs")
LIVE = Path("scripts/live-track-resolution-engine.mjs")

for p in (ALG, LIVE):
    if not p.exists():
        raise SystemExit(f"{p} introuvable — aucun changement.")

stamp = datetime.now().strftime("%Y%m%d-%H%M%S")

for p in (ALG, LIVE):
    Path(
        f"/tmp/{p.name}.before-v14-{stamp}.mjs"
    ).write_text(p.read_text())

# ------------------------------------------------------------
# 1. Ajouter une primitive centrale de politique de corroboration.
# ------------------------------------------------------------

s = ALG.read_text()

insert_at = s.find(
    "export function summarizeIdentityCandidateGroups("
)

if insert_at == -1:
    raise SystemExit(
        "Noyau de support v13 introuvable dans evidence-algebra.mjs."
    )

kernel = r'''
export function enforceKnownIdentityCorroboration({
  decision = {},
  support = [],
  preferredArtists = [],
  competingArtists = [],
  minimumIndependentSources = 2
} = {}) {
  const preferredKeys =
    new Set(
      preferredArtists
        .map(looseKey)
        .filter(Boolean)
    );

  const hasKnownCompetition =
    competingArtists
      .map(looseKey)
      .filter(Boolean)
      .length > 0;

  if (
    !hasKnownCompetition ||
    decision.decision !== "auto_accept"
  ) {
    return {
      ...decision,
      evidenceGate: {
        support
      }
    };
  }

  const preferred =
    support.find(
      ({ artist }) =>
        preferredKeys.has(
          looseKey(artist)
        )
    ) || null;

  const observedFamilies =
    preferred?.sourceFamilies ||
    preferred?.sources ||
    [];

  const observedIndependentSources =
    Number(
      preferred?.independentSources ??
      observedFamilies.length ??
      0
    );

  if (
    observedIndependentSources <
      minimumIndependentSources
  ) {
    return {
      ...decision,

      decision: "ambiguous",

      reason:
        "known_identity_disagreement_requires_corroboration",

      evidenceGate: {
        requiredIndependentSources:
          minimumIndependentSources,

        observedIndependentSources,

        observedPreferredSourceFamilies:
          observedFamilies,

        support
      }
    };
  }

  return {
    ...decision,
    evidenceGate: {
      requiredIndependentSources:
        minimumIndependentSources,

      observedIndependentSources,

      observedPreferredSourceFamilies:
        observedFamilies,

      support
    }
  };
}


'''

if "export function enforceKnownIdentityCorroboration(" not in s:
    s = s[:insert_at] + kernel + s[insert_at:]

ALG.write_text(s)

# ------------------------------------------------------------
# 2. Import live.
# ------------------------------------------------------------

s = LIVE.read_text()

old_import = '''import {
  namesAreNonCompeting,
  summarizeExternalIdentitySupport
} from "../lib/evidence-algebra.mjs";
'''

new_import = '''import {
  namesAreNonCompeting,
  summarizeExternalIdentitySupport,
  enforceKnownIdentityCorroboration
} from "../lib/evidence-algebra.mjs";
'''

if old_import in s:
    s = s.replace(old_import, new_import, 1)
elif "enforceKnownIdentityCorroboration" not in s:
    raise SystemExit(
        "Import evidence-algebra v13 attendu introuvable dans live engine."
    )

# ------------------------------------------------------------
# 3. Remplacer le corps de applyLiveEvidenceGate()
#    par une délégation au noyau central.
# ------------------------------------------------------------

start = s.find("function applyLiveEvidenceGate({")
end = s.find("export async function auditCase(", start)

if start == -1 or end == -1 or end <= start:
    raise SystemExit(
        "Bloc applyLiveEvidenceGate introuvable."
    )

new_gate = r'''function applyLiveEvidenceGate({
  decision,
  candidates,
  expected
}) {
  const support =
    externalSupportSummary(
      candidates,
      expected
    );

  return enforceKnownIdentityCorroboration({
    decision,
    support,
    preferredArtists:
      expected.artists || [],
    competingArtists:
      expected.competingArtists || [],
    minimumIndependentSources: 2
  });
}


'''

s = s[:start] + new_gate + s[end:]
LIVE.write_text(s)

print("===== EVIDENCE ALGEBRA V14 — LIVE DECISION POLICY =====")
print("Algèbre :", ALG)
print("Live    :", LIVE)
print("Backups /tmp suffixe :", stamp)
print()
print("Politique de corroboration déplacée dans l'algèbre.")
print("applyLiveEvidenceGate devient un adaptateur mince.")
print("Aucune mutation du graphe.")
