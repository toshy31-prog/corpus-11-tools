from pathlib import Path
from datetime import datetime

LIVE = Path("scripts/live-track-resolution-engine.mjs")

if not LIVE.exists():
    raise SystemExit("scripts/live-track-resolution-engine.mjs introuvable — aucun changement.")

s = LIVE.read_text()
stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
backup = Path(f"/tmp/live-track-resolution-engine.before-v9-{stamp}.mjs")
backup.write_text(s)

start_marker = "function competingArtistsFromProjection("
end_marker = "function searchArtistVariantsFromProjection("

start = s.find(start_marker)
end = s.find(end_marker, start)

if start == -1 or end == -1 or end <= start:
    raise SystemExit("Bloc competingArtistsFromProjection introuvable — aucun changement.")

new_block = r'''function competingArtistsFromProjection(
  projection
) {
  const preferredNames =
    (
      projection.interpreted
        .preferredArtists || []
    )
      .map(
        ({ name }) =>
          clean(name)
      )
      .filter(Boolean);

  const preferredKeys =
    new Set(
      preferredNames.map(
        (name) =>
          name.toLocaleLowerCase()
      )
    );

  /*
   * Autorité unique pour la rivalité de noms :
   * l'algèbre centrale.
   *
   * Les issues orthographic_variant / credit_name_variant
   * restent des faits explicatifs et alimentent encore
   * searchArtistVariantsFromProjection(), mais elles ne
   * décident plus ici si un nom est concurrent.
   */
  function isCompetingCandidate(
    rawName
  ) {
    const name =
      clean(rawName);

    if (!name) {
      return false;
    }

    const k =
      name.toLocaleLowerCase();

    if (
      preferredKeys.has(k)
    ) {
      return false;
    }

    return !preferredNames.some(
      (preferredName) =>
        namesAreNonCompeting(
          preferredName,
          name
        )
    );
  }

  const alternatives = [];

  for (
    const credit of
    projection.interpreted
      .secondaryCredits || []
  ) {
    const name =
      clean(credit.name);

    if (
      credit.role ===
        "channel_hint" &&
      isCompetingCandidate(name)
    ) {
      alternatives.push(name);
    }
  }

  for (
    const issue of
    projection.interpreted.issues || []
  ) {
    if (
      issue.type ===
        "topic_channel_disagreement"
    ) {
      const name =
        clean(
          issue.channelCandidate
        );

      if (
        isCompetingCandidate(name)
      ) {
        alternatives.push(name);
      }
    }

    if (
      issue.type ===
        "multiple_primary_candidates"
    ) {
      for (
        const candidate of
        issue.candidates || []
      ) {
        const name =
          clean(
            typeof candidate ===
              "string"
              ? candidate
              : candidate?.name
          );

        if (
          isCompetingCandidate(name)
        ) {
          alternatives.push(name);
        }
      }
    }
  }

  return uniqueBy(
    alternatives,
    (value) =>
      clean(value)
        .toLocaleLowerCase()
  );
}


'''

s = s[:start] + new_block + s[end:]
LIVE.write_text(s)

print("===== EVIDENCE ALGEBRA V9 — LIVE DEDUP =====")
print("Fichier :", LIVE)
print("Backup  :", backup)
print("Autorité rivalité : namesAreNonCompeting()")
print("nonCompetingVariants supprimé comme seconde autorité.")
print("Aucune mutation du graphe.")
