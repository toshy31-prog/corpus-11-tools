
import {
  FACT_KINDS,
  ROLES,
  makeFact
} from "./evidence-algebra.mjs";

function clean(value = "") {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/\s+/gu, " ")
    .trim();
}

function roleOf(value = "") {
  const role = clean(value);

  if (
    [
      ROLES.PRIMARY,
      ROLES.JOINT,
      ROLES.FEATURING,
      ROLES.REMIXER,
      ROLES.CREDITED,
      ROLES.CHANNEL_HINT
    ].includes(role)
  ) {
    return role;
  }

  return ROLES.UNKNOWN;
}

export function factsFromResolutionEvidence(
  evidence = {}
) {
  const facts = [];

  for (
    const artist of
    evidence.preferredArtists || []
  ) {
    facts.push(
      makeFact({
        kind:
          FACT_KINDS.IDENTITY_CLAIM,
        subject:
          artist.name || artist,
        role:
          roleOf(
            artist.role ||
            ROLES.PRIMARY
          ),
        source:
          (artist.sources || [])[0] ||
          "resolution_evidence",
        sourceFamily:
          (artist.sources || [])[0] ||
          "resolution_evidence",
        strength:
          artist.evidenceWeight ??
          artist.confidence ??
          0.8,
        provenance: {
          original: artist
        }
      })
    );
  }

  for (
    const artist of
    evidence.secondaryCredits || []
  ) {
    facts.push(
      makeFact({
        kind:
          FACT_KINDS.CREDIT_CLAIM,
        subject:
          artist.name || artist,
        role:
          roleOf(
            artist.role ||
            ROLES.CREDITED
          ),
        source:
          (artist.sources || [])[0] ||
          "resolution_evidence",
        sourceFamily:
          (artist.sources || [])[0] ||
          "resolution_evidence",
        strength:
          artist.evidenceWeight ??
          artist.confidence ??
          0.6,
        provenance: {
          original: artist
        }
      })
    );
  }

  return facts;
}

export function factsFromPacket(
  packet = {}
) {
  const source =
    clean(
      packet.source ||
      "unknown"
    );

  return (
    packet.observations || []
  )
    .filter(
      (observation) =>
        observation.kind === "artist"
    )
    .map(
      (observation) =>
        makeFact({
          kind:
            observation.role === "channel_hint"
              ? FACT_KINDS.CREDIT_CLAIM
              : FACT_KINDS.IDENTITY_CLAIM,
          subject:
            observation.value,
          role:
            roleOf(
              observation.role ===
                "topic_header_credit"
                ? ROLES.PRIMARY
                : observation.role
            ),
          source,
          sourceFamily: source,
          strength:
            observation.strength,
          provenance: {
            original:
              observation
          }
        })
    );
}
