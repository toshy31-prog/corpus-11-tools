import { inferTrackStructure } from "./track-evidence.mjs";

import {
  relationBetweenNames,
  RELATIONS
} from "./evidence-algebra.mjs";

function clean(value = "") {
  return String(value).normalize("NFKC").trim();
}

function key(value = "") {
  return clean(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}
function looseNameKey(value = "") {
  return clean(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase()
    .replace(/[øØ]/gu, "o")
    .replace(/[æÆ]/gu, "ae")
    .replace(/[œŒ]/gu, "oe")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

function creditCoreKey(value = "") {
  return looseNameKey(value)
    .replace(/^(?:the|dj)\s+/u, "")
    .replace(/\s*\([^)]{1,40}\)\s*$/u, "")
    .trim();
}

function collaborationSet(candidates) {
  if (candidates.length < 2) return false;

  const joint = candidates.filter(
    ({ role }) => role === "joint"
  );

  const primary = candidates.filter(
    ({ role }) => role === "primary"
  );

  /*
   * Cas simple :
   * A & B apparaissent tous deux comme joint.
   */
  if (
    joint.length >= 2 &&
    primary.length === 0
  ) {
    return true;
  }

  /*
   * Cas Topic extrêmement fréquent :
   *
   * A joint
   * B joint
   * A primary
   *
   * La chaîne Topic est nommée d'après A,
   * mais le header documente bien A & B.
   *
   * Ce n'est pas une contradiction si chaque primary
   * correspond déjà à un membre du groupe joint.
   */
  if (joint.length >= 2 && primary.length) {
    const jointKeys = new Set(
      joint.map(({ name }) => looseNameKey(name))
    );

    return primary.every(
      ({ name }) =>
        jointKeys.has(looseNameKey(name))
    );
  }

  return false;
}


function hasExplicitSecondaryRole(candidates, name) {
  const target = looseNameKey(name);

  return candidates.some(
    ({ name: candidateName, role }) =>
      looseNameKey(candidateName) === target &&
      (
        role === "featuring" ||
        role === "remixer"
      )
  );
}

function collapsePrimaryCandidates(allArtists, primaryCandidates) {
  return primaryCandidates.filter(
    (candidate) =>
      !hasExplicitSecondaryRole(
        allArtists,
        candidate.name
      )
  );
}


function documentedMultiMain(candidates) {
  if (candidates.length < 2) return false;

  /*
   * YouTube peut déclarer plusieurs lignes :
   *
   * Main Artist: A
   * Main Artist: B
   *
   * C'est alors un crédit multi-artistes explicite,
   * et non une contradiction à résoudre.
   */
  return candidates.every(
    ({ sources = [] }) =>
      sources.includes(
        "description_explicit_field"
      )
  );
}


function classifyChannelHint(primaryCandidates, channelHints) {
  if (!primaryCandidates.length || !channelHints.length) {
    return [];
  }

  const issues = [];

  for (const hint of channelHints) {
    const relatedPrimary =
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

    /*
     * Le header décrit le morceau.
     * La chaîne Topic décrit un contexte de publication.
     *
     * On conserve le désaccord, mais ce n'est pas une contradiction
     * suffisante pour invalider le crédit du morceau.
     */
    issues.push({
      type: "topic_channel_disagreement",
      severity: "info",
      headerCandidates:
        primaryCandidates.map(({ name }) => name),
      channelCandidate: hint.name
    });
  }

  return issues;
}

function classifyPrimaryDisagreement(candidates) {
  if (candidates.length < 2) return null;

  if (documentedMultiMain(candidates)) {
    return {
      type: "documented_multi_main",
      severity: "info"
    };
  }

  if (collaborationSet(candidates)) {
    return {
      type: "documented_collaboration",
      severity: "info"
    };
  }

  const names = candidates.map(({ name }) => name);

  const relationsToFirst =
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

  return {
    type: "multiple_primary_candidates",
    severity: "review"
  };
}


function sourceWeight(source) {
  return {
    description_explicit_field: 1.00,
    youtube_topic_header: 0.94,
    youtube_topic_channel: 0.84,
    explicit_feature_credit: 0.90,
    explicit_remix_credit: 0.90,
    title_syntax: 0.72,
    youtube_title: 0.68
  }[source] ?? 0.50;
}

function classifyArtistEvidence(artist) {
  const sources = artist.sources || [];

  return {
    ...artist,
    evidenceWeight: Math.max(
      artist.confidence || 0,
      ...sources.map(sourceWeight)
    ),
    corroborated: sources.length >= 2
  };
}

function isGenericTopicChannel(channelTitle = "") {
  return /^(?:release|releases|various artists|compilation|music)\s*-\s*topic$/iu
    .test(clean(channelTitle));
}

export function resolveTrack(item = {}) {
  const inferred = inferTrackStructure(item);

  const artists = inferred.artists
    .map(classifyArtistEvidence);

  const primary = artists.filter(
    ({ role }) => role === "primary" || role === "joint"
  );

  const secondary = artists.filter(
    ({ role }) =>
      role === "featuring" ||
      role === "remixer" ||
      role === "credited" ||
      role === "channel_hint"
  );

  const strongPrimaryRaw = primary.filter(
    ({ evidenceWeight }) => evidenceWeight >= 0.82
  );

  /*
   * Si le même nom possède un rôle explicite plus précis
   * (featuring/remixer), on ne le garde pas en même temps
   * comme primary uniquement à cause d'une métadonnée plus vague.
   */
  const strongPrimary =
    collapsePrimaryCandidates(
      artists,
      strongPrimaryRaw
    );

  const primaryKeys = unique(
    strongPrimary.map(({ name }) => key(name))
  );

  const issues = [];

  /*
   * Plusieurs noms principaux ne constituent pas automatiquement
   * une contradiction : il peut s'agir d'une collaboration.
   */
  if (primaryKeys.length > 1) {
    const classification =
      classifyPrimaryDisagreement(strongPrimary);

    issues.push({
      ...classification,
      candidates: strongPrimary.map(
        ({ name, role, sources }) => ({
          name,
          role,
          sources
        })
      )
    });
  }

  const channelHints = artists.filter(
    ({ role }) => role === "channel_hint"
  );

  issues.push(
    ...classifyChannelHint(
      strongPrimary,
      channelHints
    )
  );


  /*
   * Si une source Topic structurée existe, une lecture provenant
   * seulement du motif "X - Y" ne doit pas gagner automatiquement.
   */
  const topicPrimary = primary.filter(
    ({ sources }) =>
      sources.includes("youtube_topic_header")
  );

  const titleOnlyPrimary = primary.filter(
    ({ sources }) =>
      sources.includes("title_syntax") &&
      !sources.includes("youtube_topic_header") &&
      !sources.includes("description_explicit_field")
  );

  if (topicPrimary.length && titleOnlyPrimary.length) {
    issues.push({
      type: "title_boundary_disagrees_with_topic_metadata",
      severity: "review",
      titleCandidates: titleOnlyPrimary.map(({ name }) => name),
      topicCandidates: topicPrimary.map(({ name }) => name)
    });
  }

  /*
   * Une chaîne Topic générique ne doit jamais être une identité.
   */
  if (isGenericTopicChannel(item.channelTitle)) {
    issues.push({
      type: "generic_topic_container",
      severity: "info"
    });
  }

  /*
   * On choisit un ensemble de candidats préférés, sans prétendre
   * avoir résolu leur identité canonique.
   *
   * Priorité :
   * 1. champs explicites + Topic header ;
   * 2. Topic header ;
   * 3. preuves corroborées ;
   * 4. meilleure preuve restante.
   */
  let preferredPrimary = primary.filter(
    ({ sources }) =>
      sources.includes("description_explicit_field") &&
      sources.includes("youtube_topic_header")
  );

  if (!preferredPrimary.length) {
    preferredPrimary = primary.filter(
      ({ sources }) =>
        sources.includes("youtube_topic_header")
    );
  }

  if (!preferredPrimary.length) {
    preferredPrimary = primary.filter(
      ({ corroborated }) => corroborated
    );
  }

  if (!preferredPrimary.length && primary.length) {
    const max = Math.max(
      ...primary.map(({ evidenceWeight }) => evidenceWeight)
    );

    preferredPrimary = primary.filter(
      ({ evidenceWeight }) => evidenceWeight === max
    );
  }

  return {
    status:
      inferred.title && preferredPrimary.length
        ? "resolved_structure"
        : inferred.title
          ? "partial_structure"
          : "unresolved",

    title: inferred.title,

    preferredArtists: preferredPrimary,

    secondaryCredits: secondary,

    allArtistCandidates: artists,

    version: inferred.version,

    catalogueCode: inferred.catalogueCode,

    /*
     * Toujours unresolved :
     * nous avons résolu la STRUCTURE du crédit,
     * pas l'identité MusicBrainz/Discogs.
     */
    identityStatus: "unresolved",

    issues,

    evidence: inferred.evidence
  };
}
