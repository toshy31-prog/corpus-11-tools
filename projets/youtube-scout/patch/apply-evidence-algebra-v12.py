from pathlib import Path
from datetime import datetime

ALG = Path("lib/evidence-algebra.mjs")
RES = Path("lib/resolution-evidence.mjs")

for p in (ALG, RES):
    if not p.exists():
        raise SystemExit(f"{p} introuvable — aucun changement.")

stamp = datetime.now().strftime("%Y%m%d-%H%M%S")

for p in (ALG, RES):
    Path(
        f"/tmp/{p.name}.before-v12-{stamp}.mjs"
    ).write_text(p.read_text())

# ------------------------------------------------------------
# 1. Ajouter un helper de synthèse des groupes de candidats.
# ------------------------------------------------------------

s = ALG.read_text()

marker = "export function summarizeIdentityPackets("

if marker not in s:
    raise SystemExit(
        "Noyau v11 introuvable dans evidence-algebra.mjs."
    )

insert_at = s.find(
    "export function collapseDuplicateFacts(facts = []) {"
)

if insert_at == -1:
    raise SystemExit(
        "Point d'insertion v12 introuvable."
    )

kernel = r'''
export function summarizeIdentityCandidateGroups(
  groups = []
) {
  return groups.map((group) => {
    const artist =
      clean(group.artist);

    const candidates =
      Array.isArray(group.candidates)
        ? group.candidates
        : [];

    const sources =
      uniqueBy(
        candidates
          .map(
            (candidate) =>
              clean(
                candidate.source ||
                "unknown"
              ) || "unknown"
          ),
        (value) => value
      ).sort();

    const sourceFamilies =
      uniqueBy(
        candidates
          .map(
            (candidate) =>
              clean(
                candidate.sourceFamily ||
                candidate.source ||
                "unknown"
              ) || "unknown"
          ),
        (value) => value
      ).sort();

    return {
      artist,
      sources,
      sourceFamilies,
      independentSources:
        sourceFamilies.length,
      candidates
    };
  });
}

export function countIndependentSourceFamilies(
  support = []
) {
  const families =
    uniqueBy(
      support.flatMap(
        (entry) =>
          entry.sourceFamilies ||
          entry.sources ||
          []
      ),
      (value) =>
        clean(value)
    );

  return families.length;
}


'''

if "export function summarizeIdentityCandidateGroups(" not in s:
    s = s[:insert_at] + kernel + s[insert_at:]

ALG.write_text(s)

# ------------------------------------------------------------
# 2. resolution-evidence délègue l'agrégation.
# ------------------------------------------------------------

s = RES.read_text()

import_block = '''import {
  summarizeIdentityCandidateGroups,
  countIndependentSourceFamilies
} from "./evidence-algebra.mjs";

'''

if 'from "./evidence-algebra.mjs"' not in s:
    s = import_block + s

source_set = '''function sourceSet(candidates = []) {
  return unique(
    candidates.map(
      ({ source }) => source
    )
  );
}

'''

if source_set not in s:
    raise SystemExit(
        "sourceSet() attendu introuvable — aucun patch resolution-evidence."
    )

s = s.replace(source_set, "", 1)

old_pref = '''  const preferredSupport =
    preferredArtists.map((artist) => {
      const matches =
        candidates.filter(
          (candidate) =>
            artistMatches(
              candidate,
              artist
            ) &&
            titleMatches(
              candidate,
              expected.title
            )
        );

      return {
        artist,
        sources:
          sourceSet(matches),
        candidates:
          matches
      };
    });

  const competingSupport =
    competingArtists.map((artist) => {
      const matches =
        candidates.filter(
          (candidate) =>
            artistMatches(
              candidate,
              artist
            ) &&
            titleMatches(
              candidate,
              expected.title
            )
        );

      return {
        artist,
        sources:
          sourceSet(matches),
        candidates:
          matches
      };
    });
'''

new_pref = '''  const preferredSupport =
    summarizeIdentityCandidateGroups(
      preferredArtists.map(
        (artist) => ({
          artist,
          candidates:
            candidates.filter(
              (candidate) =>
                artistMatches(
                  candidate,
                  artist
                ) &&
                titleMatches(
                  candidate,
                  expected.title
                )
            )
        })
      )
    );

  const competingSupport =
    summarizeIdentityCandidateGroups(
      competingArtists.map(
        (artist) => ({
          artist,
          candidates:
            candidates.filter(
              (candidate) =>
                artistMatches(
                  candidate,
                  artist
                ) &&
                titleMatches(
                  candidate,
                  expected.title
                )
            )
        })
      )
    );
'''

if old_pref not in s:
    raise SystemExit(
        "Blocs preferredSupport/competingSupport attendus introuvables."
    )

s = s.replace(old_pref, new_pref, 1)

old_counts = '''      preferredIndependentSources:
        unique(
          positive.flatMap(
            ({ sources }) =>
              sources
          )
        ).length,

      competingIndependentSources:
        unique(
          contradictory.flatMap(
            ({ sources }) =>
              sources
          )
        ).length,
'''

new_counts = '''      preferredIndependentSources:
        countIndependentSourceFamilies(
          preferredSupport.filter(
            ({ candidates }) =>
              candidates.length > 0
          )
        ),

      competingIndependentSources:
        countIndependentSourceFamilies(
          competingSupport.filter(
            ({ candidates }) =>
              candidates.length > 0
          )
        ),
'''

if old_counts not in s:
    raise SystemExit(
        "Comptage des sources indépendantes attendu introuvable."
    )

s = s.replace(old_counts, new_counts, 1)

RES.write_text(s)

print("===== EVIDENCE ALGEBRA V12 — RESOLUTION EVIDENCE KERNEL =====")
print("Algèbre :", ALG)
print("Evidence:", RES)
print("Backups /tmp suffixe :", stamp)
print()
print("sourceSet() supprimé de resolution-evidence.")
print("Agrégation des supports centralisée.")
print("Indépendance comptée par sourceFamily.")
print("Live evidence gate non migré à ce stade.")
print("Aucune mutation du graphe.")
