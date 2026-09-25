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
        f"/tmp/{p.name}.before-v13-{stamp}.mjs"
    ).write_text(p.read_text())

# ------------------------------------------------------------
# 1. Ajouter le helper central de support externe.
# ------------------------------------------------------------

s = ALG.read_text()

insert_at = s.find(
    "export function summarizeIdentityCandidateGroups("
)

if insert_at == -1:
    raise SystemExit(
        "Noyau v12 introuvable dans evidence-algebra.mjs."
    )

kernel = r'''
export function candidateSupportsIdentity(
  candidate = {},
  artistName = "",
  {
    normalizeName = null,
    similarity = null,
    minimumSimilarity = 0.92
  } = {}
) {
  const normalize =
    typeof normalizeName === "function"
      ? normalizeName
      : looseKey;

  const target =
    normalize(artistName);

  if (!target) return false;

  return (
    candidate.artists || []
  ).some((name) => {
    const actual =
      normalize(name);

    if (!actual) return false;

    if (actual === target) {
      return true;
    }

    if (
      typeof similarity === "function"
    ) {
      return (
        similarity(
          actual,
          target
        ) >= minimumSimilarity
      );
    }

    return false;
  });
}

export function summarizeExternalIdentitySupport({
  candidates = [],
  expectedArtists = [],
  competingArtists = [],
  expectedTitle = "",
  normalizeName = null,
  similarity = null,
  minimumArtistSimilarity = 0.92,
  minimumTitleSimilarity = 0.92
} = {}) {
  const names = [
    ...expectedArtists,
    ...competingArtists
  ];

  return summarizeIdentityCandidateGroups(
    names.map((name) => {
      const supporting =
        candidates.filter(
          (candidate) => {
            const artistOk =
              candidateSupportsIdentity(
                candidate,
                name,
                {
                  normalizeName,
                  similarity,
                  minimumSimilarity:
                    minimumArtistSimilarity
                }
              );

            if (!artistOk) {
              return false;
            }

            if (
              typeof similarity ===
                "function"
            ) {
              return (
                similarity(
                  expectedTitle,
                  candidate.title
                ) >=
                minimumTitleSimilarity
              );
            }

            return (
              looseKey(
                expectedTitle
              ) ===
              looseKey(
                candidate.title
              )
            );
          }
        );

      return {
        artist: name,
        candidates: supporting
      };
    })
  );
}


'''

if "export function summarizeExternalIdentitySupport(" not in s:
    s = s[:insert_at] + kernel + s[insert_at:]

ALG.write_text(s)

# ------------------------------------------------------------
# 2. Importer le helper central dans le live engine.
# ------------------------------------------------------------

s = LIVE.read_text()

if 'summarizeExternalIdentitySupport' not in s:
    old_import = '''import {
  namesAreNonCompeting
} from "../lib/evidence-algebra.mjs";
'''

    new_import = '''import {
  namesAreNonCompeting,
  summarizeExternalIdentitySupport
} from "../lib/evidence-algebra.mjs";
'''

    if old_import not in s:
        raise SystemExit(
            "Import evidence-algebra attendu introuvable dans live engine."
        )

    s = s.replace(
        old_import,
        new_import,
        1
    )

# ------------------------------------------------------------
# 3. Supprimer les deux helpers locaux.
# ------------------------------------------------------------

start = s.find("function candidateSupportsArtist(")
end = s.find("function applyLiveEvidenceGate(", start)

if start == -1 or end == -1 or end <= start:
    raise SystemExit(
        "Bloc candidateSupportsArtist/externalSupportSummary introuvable."
    )

replacement = r'''function externalSupportSummary(
  candidates,
  expected
) {
  return summarizeExternalIdentitySupport({
    candidates,
    expectedArtists:
      expected.artists || [],
    competingArtists:
      expected.competingArtists || [],
    expectedTitle:
      expected.title || "",
    normalizeName:
      normalizedName,
    similarity:
      textSimilarity,
    minimumArtistSimilarity:
      0.92,
    minimumTitleSimilarity:
      0.92
  });
}


'''

s = s[:start] + replacement + s[end:]
LIVE.write_text(s)

print("===== EVIDENCE ALGEBRA V13 — LIVE EVIDENCE GATE =====")
print("Algèbre :", ALG)
print("Live    :", LIVE)
print("Backups /tmp suffixe :", stamp)
print()
print("candidateSupportsArtist supprimé du live engine.")
print("externalSupportSummary délègue à l'algèbre.")
print("Politique applyLiveEvidenceGate inchangée.")
print("Aucune mutation du graphe.")
