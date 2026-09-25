
import {
  FACT_KINDS,
  ROLES,
  makeFact,
  relationBetweenNames,
  RELATIONS
} from "./evidence-algebra.mjs";

function clean(value = "") {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/\s+/gu, " ")
    .trim();
}

function role(value = "") {
  const v = clean(value);

  if (
    Object.values(ROLES)
      .includes(v)
  ) {
    return v;
  }

  return ROLES.UNKNOWN;
}

export function factsFromTrackResolution(
  resolution = {}
) {
  const facts = [];

  for (const artist of resolution.preferredArtists || []) {
    const name =
      clean(
        artist?.name ||
        artist
      );

    if (!name) continue;

    facts.push(
      makeFact({
        kind:
          FACT_KINDS.IDENTITY_CLAIM,
        subject: name,
        role:
          role(
            artist?.role ||
            ROLES.PRIMARY
          ),
        source:
          (artist?.sources || [])[0] ||
          "track_resolution",
        sourceFamily:
          (artist?.sources || [])[0] ||
          "track_resolution",
        strength:
          artist?.confidence ??
          artist?.evidenceWeight ??
          0.8,
        provenance: {
          layer:
            "track_resolution",
          original: artist
        }
      })
    );
  }

  for (const credit of resolution.secondaryCredits || []) {
    const name =
      clean(
        credit?.name ||
        credit
      );

    if (!name) continue;

    facts.push(
      makeFact({
        kind:
          FACT_KINDS.CREDIT_CLAIM,
        subject: name,
        role:
          role(
            credit?.role ||
            ROLES.CREDITED
          ),
        source:
          (credit?.sources || [])[0] ||
          "track_resolution",
        sourceFamily:
          (credit?.sources || [])[0] ||
          "track_resolution",
        strength:
          credit?.confidence ??
          credit?.evidenceWeight ??
          0.6,
        provenance: {
          layer:
            "track_resolution",
          original: credit
        }
      })
    );
  }

  for (const issue of resolution.issues || []) {
    if (
      issue.type ===
      "orthographic_variant"
    ) {
      const candidates =
        issue.candidates ||
        issue.values ||
        [];

      for (const candidate of candidates) {
        const name =
          clean(
            candidate?.name ||
            candidate
          );

        if (!name) continue;

        facts.push(
          makeFact({
            kind:
              FACT_KINDS.VARIANT_CLAIM,
            subject: name,
            role:
              ROLES.UNKNOWN,
            source:
              issue.source ||
              "track_resolution_issue",
            sourceFamily:
              issue.source ||
              "track_resolution_issue",
            strength: 0.6,
            provenance: {
              issueType:
                issue.type,
              original:
                issue
            }
          })
        );
      }
    }

    if (
      issue.type ===
      "credit_name_variant"
    ) {
      const candidates =
        issue.candidates ||
        issue.values ||
        [];

      for (const candidate of candidates) {
        const name =
          clean(
            candidate?.name ||
            candidate
          );

        if (!name) continue;

        facts.push(
          makeFact({
            kind:
              FACT_KINDS.VARIANT_CLAIM,
            subject: name,
            role:
              ROLES.CREDITED,
            source:
              issue.source ||
              "track_resolution_issue",
            sourceFamily:
              issue.source ||
              "track_resolution_issue",
            strength: 0.55,
            provenance: {
              issueType:
                issue.type,
              original:
                issue
            }
          })
        );
      }
    }
  }

  return facts;
}

export function classifyPair(a, b) {
  return relationBetweenNames(
    a,
    b
  );
}

export function isNonCompetingPair(a, b) {
  const relation =
    classifyPair(
      a,
      b
    );

  return (
    relation ===
      RELATIONS.SAME_IDENTITY ||
    relation ===
      RELATIONS.ORTHOGRAPHIC_VARIANT ||
    relation ===
      RELATIONS.CREDIT_VARIANT ||
    relation ===
      RELATIONS.DOCUMENTED_ALIAS
  );
}
