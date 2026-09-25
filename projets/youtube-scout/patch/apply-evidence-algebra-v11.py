from pathlib import Path
from datetime import datetime

ALG = Path("lib/evidence-algebra.mjs")
MULTI = Path("lib/multisource-decision.mjs")

for p in (ALG, MULTI):
    if not p.exists():
        raise SystemExit(f"{p} introuvable — aucun changement.")

stamp = datetime.now().strftime("%Y%m%d-%H%M%S")

for p in (ALG, MULTI):
    Path(
        f"/tmp/{p.name}.before-v11-{stamp}.mjs"
    ).write_text(p.read_text())

s = ALG.read_text()

marker = "export function collapseDuplicateFacts(facts = []) {"

if marker not in s:
    raise SystemExit(
        "Point d'insertion de l'algèbre introuvable — aucun changement."
    )

kernel = r'''
export function summarizeIdentityObservations(
  observations = []
) {
  const byArtist = new Map();

  for (const observation of observations) {
    const artist =
      clean(
        observation.artist ||
        observation.subject ||
        observation.value
      );

    if (!artist) continue;

    const k =
      looseKey(artist);

    if (!k) continue;

    const source =
      clean(
        observation.source ||
        "unknown"
      ) || "unknown";

    const sourceFamily =
      clean(
        observation.sourceFamily ||
        source
      ) || "unknown";

    const strength =
      clamp01(
        observation.strength
      );

    if (!byArtist.has(k)) {
      byArtist.set(k, {
        artist,
        sources: new Set(),
        sourceFamilies: new Set(),
        strongest: 0,
        observations: []
      });
    }

    const bucket =
      byArtist.get(k);

    bucket.sources.add(source);
    bucket.sourceFamilies.add(
      sourceFamily
    );

    bucket.strongest =
      Math.max(
        bucket.strongest,
        strength
      );

    bucket.observations.push({
      source,
      sourceFamily,
      role:
        clean(
          observation.role
        ),
      strength
    });
  }

  return [
    ...byArtist.values()
  ]
    .map((entry) => ({
      artist:
        entry.artist,

      sources:
        [...entry.sources].sort(),

      sourceFamilies:
        [...entry.sourceFamilies]
          .sort(),

      independentSources:
        entry.sourceFamilies.size,

      strongest:
        Number(
          entry.strongest.toFixed(4)
        ),

      observations:
        entry.observations
    }))
    .sort(
      (a, b) =>
        b.independentSources -
          a.independentSources ||
        b.strongest -
          a.strongest ||
        a.artist.localeCompare(
          b.artist
        )
    );
}

export function evidencePacketsToIdentityObservations(
  evidencePackets = []
) {
  const observations = [];

  for (const packet of evidencePackets) {
    const packetSource =
      clean(
        packet.source ||
        "unknown"
      ) || "unknown";

    const packetSourceFamily =
      clean(
        packet.sourceFamily ||
        packetSource
      ) || "unknown";

    for (
      const observation of
      packet.observations || []
    ) {
      if (
        observation.kind !== "artist"
      ) {
        continue;
      }

      const artist =
        clean(
          observation.value
        );

      if (!artist) continue;

      observations.push({
        artist,
        source:
          clean(
            observation.source ||
            packetSource
          ) || packetSource,

        sourceFamily:
          clean(
            observation.sourceFamily ||
            packetSourceFamily
          ) || packetSourceFamily,

        role:
          clean(
            observation.role
          ),

        strength:
          clamp01(
            observation.strength
          )
      });
    }
  }

  return observations;
}

export function summarizeIdentityPackets(
  evidencePackets = []
) {
  return summarizeIdentityObservations(
    evidencePacketsToIdentityObservations(
      evidencePackets
    )
  );
}


'''

if "export function summarizeIdentityPackets(" not in s:
    s = s.replace(
        marker,
        kernel + marker,
        1
    )

ALG.write_text(s)

s = MULTI.read_text()

import_block = '''import {
  summarizeIdentityPackets
} from "./evidence-algebra.mjs";

'''

if 'from "./evidence-algebra.mjs"' not in s:
    s = import_block + s

start_marker = "export function summarizeIdentitySupport("
end_marker = "export function decideMultiSourceIdentity("

start = s.find(start_marker)
end = s.find(end_marker, start)

if start == -1 or end == -1 or end <= start:
    raise SystemExit(
        "Bloc summarizeIdentitySupport introuvable — aucun changement multisource."
    )

replacement = r'''export function summarizeIdentitySupport(
  evidencePackets = []
) {
  return summarizeIdentityPackets(
    evidencePackets
  );
}


'''

s = (
    s[:start] +
    replacement +
    s[end:]
)

MULTI.write_text(s)

print("===== EVIDENCE ALGEBRA V11 — SUPPORT KERNEL =====")
print("Algèbre    :", ALG)
print("Multisource:", MULTI)
print("Backups /tmp suffixe :", stamp)
print()
print("Support par identité centralisé.")
print("Indépendance comptée par sourceFamily.")
print("API summarizeIdentitySupport conservée.")
print("resolution-evidence et live gate non migrés à ce stade.")
print("Aucune mutation du graphe.")
