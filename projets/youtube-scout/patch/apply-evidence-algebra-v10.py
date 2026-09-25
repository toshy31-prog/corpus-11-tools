from pathlib import Path
from datetime import datetime

TRACK = Path("lib/track-resolution.mjs")
if not TRACK.exists():
    raise SystemExit("lib/track-resolution.mjs introuvable — aucun changement.")

s = TRACK.read_text()
stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
backup = Path(f"/tmp/track-resolution.before-v10-{stamp}.mjs")
backup.write_text(s)

same_loose = '''function sameLooseName(a, b) {
  return looseNameKey(a) === looseNameKey(b);
}

'''
probable = '''function probableCreditVariant(a, b) {
  return (
    relationBetweenNames(a, b) ===
    RELATIONS.CREDIT_VARIANT
  );
}

'''

for block in (same_loose, probable):
    if block not in s:
        raise SystemExit("Helper attendu introuvable — aucun changement.")
    s = s.replace(block, "", 1)

old_channel = '''    const exactOrLoose = primaryCandidates.find(
      (candidate) =>
        sameLooseName(candidate.name, hint.name)
    );

    if (exactOrLoose) {
      /*
       * Même nom sous une autre graphie :
       * PØLI / POLI, Æmris / Aemris...
       */
      if (clean(exactOrLoose.name) !== clean(hint.name)) {
        issues.push({
          type: "orthographic_variant",
          severity: "info",
          candidates: [
            exactOrLoose.name,
            hint.name
          ],
          source: "topic_channel_hint"
        });
      }

      continue;
    }

    const creditVariant = primaryCandidates.find(
      (candidate) =>
        probableCreditVariant(
          candidate.name,
          hint.name
        )
    );

    if (creditVariant) {
      issues.push({
        type: "credit_name_variant",
        severity: "info",
        candidates: [
          creditVariant.name,
          hint.name
        ],
        source: "topic_channel_hint"
      });

      continue;
    }
'''

new_channel = '''    const relatedPrimary =
      primaryCandidates
        .map((candidate) => ({
          candidate,
          relation:
            relationBetweenNames(
              candidate.name,
              hint.name
            )
        }))
        .find(
          ({ relation }) =>
            relation === RELATIONS.SAME_IDENTITY ||
            relation === RELATIONS.ORTHOGRAPHIC_VARIANT ||
            relation === RELATIONS.CREDIT_VARIANT
        );

    if (relatedPrimary) {
      const { candidate, relation } =
        relatedPrimary;

      if (
        relation ===
          RELATIONS.ORTHOGRAPHIC_VARIANT
      ) {
        issues.push({
          type: "orthographic_variant",
          severity: "info",
          candidates: [
            candidate.name,
            hint.name
          ],
          source: "topic_channel_hint"
        });
      }

      if (
        relation ===
          RELATIONS.CREDIT_VARIANT
      ) {
        issues.push({
          type: "credit_name_variant",
          severity: "info",
          candidates: [
            candidate.name,
            hint.name
          ],
          source: "topic_channel_hint"
        });
      }

      continue;
    }
'''

if old_channel not in s:
    raise SystemExit("Bloc classifyChannelHint attendu introuvable — aucun changement.")
s = s.replace(old_channel, new_channel, 1)

old_primary = '''  const allLooseEquivalent = names.every(
    (name) => sameLooseName(name, names[0])
  );

  if (allLooseEquivalent) {
    return {
      type: "orthographic_variant",
      severity: "info"
    };
  }

  if (
    names.length === 2 &&
    probableCreditVariant(names[0], names[1])
  ) {
    return {
      type: "credit_name_variant",
      severity: "info"
    };
  }
'''

new_primary = '''  const relationsToFirst =
    names.map(
      (name) =>
        relationBetweenNames(
          name,
          names[0]
        )
    );

  const allOrthographicEquivalent =
    relationsToFirst.every(
      (relation) =>
        relation === RELATIONS.SAME_IDENTITY ||
        relation === RELATIONS.ORTHOGRAPHIC_VARIANT
    );

  if (allOrthographicEquivalent) {
    return {
      type: "orthographic_variant",
      severity: "info"
    };
  }

  if (
    names.length === 2 &&
    relationBetweenNames(
      names[0],
      names[1]
    ) === RELATIONS.CREDIT_VARIANT
  ) {
    return {
      type: "credit_name_variant",
      severity: "info"
    };
  }
'''

if old_primary not in s:
    raise SystemExit("Bloc classifyPrimaryDisagreement attendu introuvable — aucun changement.")
s = s.replace(old_primary, new_primary, 1)

TRACK.write_text(s)

print("===== EVIDENCE ALGEBRA V10 — TRACK RESOLUTION KERNEL =====")
print("Fichier :", TRACK)
print("Backup  :", backup)
print("sameLooseName supprimé.")
print("probableCreditVariant supprimé.")
print("relationBetweenNames devient l'autorité des variantes.")
print("Aucune mutation du graphe.")
