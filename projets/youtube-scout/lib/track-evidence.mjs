import {
  parseTrackExpression,
  parseTrackTitle,
  parseArtistCredits
} from "./track-expression.mjs";

function clean(value = "") {
  return String(value)
    .normalize("NFKC")
    .replace(/\u200e|\u200f|\ufeff/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function linesOf(value = "") {
  return String(value)
    .split(/\r?\n/u)
    .map(clean)
    .filter(Boolean);
}

function comparisonKey(value = "") {
  return clean(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function observation({
  kind,
  value,
  role = null,
  source,
  confidence,
  raw = null
}) {
  return {
    kind,
    value: clean(value),
    role,
    source,
    confidence,
    raw: raw == null ? null : clean(raw)
  };
}

function addObservation(list, entry) {
  if (!entry?.value) return;

  const key = [
    entry.kind,
    entry.role || "",
    comparisonKey(entry.value)
  ].join("::");

  const existing = list.find((item) => item._key === key);

  if (existing) {
    existing.confidence = Math.max(
      existing.confidence,
      entry.confidence
    );

    if (!existing.sources.includes(entry.source)) {
      existing.sources.push(entry.source);
    }

    return;
  }

  list.push({
    ...entry,
    sources: [entry.source],
    _key: key
  });
}

function cleanResult(observations) {
  return observations.map(({ _key, ...item }) => item);
}

function metadataCredits(text, defaultRole = "primary") {
  const source = clean(text);
  if (!source) return [];

  /*
   * La virgule est fréquemment un séparateur d'artistes dans
   * les métadonnées Topic. Cette règle reste confinée ici.
   */
  const blocks = source
    .split(/\s*,\s*/u)
    .map(clean)
    .filter(Boolean);

  const credits = [];

  for (const block of blocks) {
    const parsed = parseArtistCredits(block);

    for (const item of parsed) {
      credits.push({
        ...item,
        role:
          item.role === "primary" && blocks.length > 1
            ? "joint"
            : item.role === "primary"
              ? defaultRole
              : item.role
      });
    }
  }

  return credits;
}

function parseExplicitDescriptionFields(description) {
  const observations = [];

  /*
   * IMPORTANT :
   * Main Artist / Featured Artist / Remixer ont une sémantique forte.
   *
   * "Artist:" est plus ambigu : certaines descriptions YouTube
   * répètent plusieurs lignes Artist: pour plusieurs contributeurs.
   * On le conserve donc comme "credited", pas "primary".
   */
  const rules = [
    {
      re: /^(?:main artist|primary artist)\s*:\s*(.+)$/iu,
      role: "primary",
      confidence: 0.98
    },
    {
      re: /^(?:featured artist|featuring artist)\s*:\s*(.+)$/iu,
      role: "featuring",
      confidence: 0.98
    },
    {
      re: /^remixer\s*:\s*(.+)$/iu,
      role: "remixer",
      confidence: 0.98
    },
    {
      re: /^artist\s*:\s*(.+)$/iu,
      role: "credited",
      confidence: 0.90
    }
  ];

  for (const line of linesOf(description)) {
    for (const rule of rules) {
      const match = line.match(rule.re);
      if (!match) continue;

      for (
        const artist of
        metadataCredits(match[1], rule.role)
      ) {
        observations.push(
          observation({
            kind: "artist",
            value: artist.name,
            role:
              rule.role === "credited"
                ? "credited"
                : artist.role === "primary"
                  ? rule.role
                  : artist.role,
            source: "description_explicit_field",
            confidence: rule.confidence,
            raw: line
          })
        );
      }

      break;
    }
  }

  return observations;
}

function parseTopicHeader(description) {
  for (const line of linesOf(description).slice(0, 8)) {
    if (!line.includes("·")) continue;

    const parts = line
      .split("·")
      .map(clean)
      .filter(Boolean);

    if (parts.length < 2) continue;

    return {
      title: parts[0],
      artistBlock: parts[1],
      additionalCredits: parts.slice(2)
    };
  }

  return null;
}

function topicCreditsFromChannel(channelTitle = "") {
  const match = clean(channelTitle).match(
    /^(.*?)\s*-\s*Topic$/iu
  );

  if (!match) return [];

  const artistText = clean(match[1]);

  /*
   * Ces chaînes sont des conteneurs/distributeurs génériques,
   * pas des preuves d'identité artistique.
   */
  if (
    /^(?:release|releases|various artists|compilation|music)$/iu.test(
      artistText
    )
  ) {
    return [];
  }

  return metadataCredits(artistText);
}

function addSyntaxEvidence(
  observations,
  syntax,
  {
    titleSource,
    artistSource,
    confidenceTitle = 0.76,
    confidenceArtist = 0.76,
    raw
  }
) {
  if (syntax.title) {
    addObservation(
      observations,
      observation({
        kind: "title",
        value: syntax.title,
        source: titleSource,
        confidence: confidenceTitle,
        raw
      })
    );
  }

  for (const artist of syntax.artists || []) {
    addObservation(
      observations,
      observation({
        kind: "artist",
        value: artist.name,
        role: artist.role,
        source: artistSource,
        confidence:
          artist.role === "remixer" ||
          artist.role === "featuring"
            ? Math.max(confidenceArtist, 0.88)
            : confidenceArtist,
        raw
      })
    );
  }

  if (syntax.version?.label) {
    addObservation(
      observations,
      observation({
        kind: "version",
        value: syntax.version.label,
        source: titleSource,
        confidence: Math.max(confidenceTitle, 0.88),
        raw
      })
    );
  }

  if (syntax.catalogueCode) {
    addObservation(
      observations,
      observation({
        kind: "catalogue_code",
        value: syntax.catalogueCode,
        source: titleSource,
        confidence: 0.80,
        raw
      })
    );
  }
}

export function collectTrackEvidence(item = {}) {
  const sourceTitle = clean(item.title);
  const description = String(item.description || "");
  const channelTitle = clean(item.channelTitle);

  /*
   * Une vidéo Topic dispose déjà d'un canal de métadonnées dédié.
   * Son champ `title` est donc traité comme un TITRE littéral :
   * "BOYÉ - Skefre, Ismayyyel" ne signifie pas
   * Artist=BOYÉ / Title=Skefre, Ismayyyel.
   */
  const topicHeader = parseTopicHeader(description);
  const isTopicContext =
    Boolean(topicHeader) ||
    /\s-\sTopic$/iu.test(channelTitle);

  const syntax = isTopicContext
    ? {
        ...parseTrackTitle(sourceTitle),
        status: "partial",
        sourceTitle,
        identityStatus: "unresolved",
        confidence: { boundary: 0 },
        candidates: []
      }
    : parseTrackExpression(sourceTitle);

  const observations = [];

  /*
   * 1. Titre YouTube brut.
   */
  addSyntaxEvidence(
    observations,
    syntax,
    {
      titleSource: "youtube_title",
      artistSource: "title_syntax",
      confidenceTitle:
        syntax.status === "parsed"
          ? Math.max(
              0.70,
              syntax.confidence?.boundary || 0
            )
          : 0.58,
      confidenceArtist: 0.76,
      raw: sourceTitle
    }
  );

  /*
   * 2. Champs explicites de description.
   */
  for (
    const entry of
    parseExplicitDescriptionFields(description)
  ) {
    addObservation(observations, entry);
  }

  /*
   * 3. Header Topic.
   *
   * Le titre du header repasse par parseTrackExpression :
   *
   * Freeze (Thomas Schumacher Remix)
   * -> Freeze
   * -> Thomas Schumacher = remixer
   */
  if (topicHeader) {
    const topicSyntax =
      parseTrackTitle(topicHeader.title);

    addSyntaxEvidence(
      observations,
      topicSyntax,
      {
        titleSource: "youtube_topic_header",
        artistSource: "youtube_topic_header",
        confidenceTitle: 0.92,
        confidenceArtist: 0.92,
        raw: topicHeader.title
      }
    );

    /*
     * Le deuxième segment du header Topic est généralement
     * le bloc d'artistes.
     */
    for (
      const artist of
      metadataCredits(topicHeader.artistBlock)
    ) {
      addObservation(
        observations,
        observation({
          kind: "artist",
          value: artist.name,
          role: artist.role,
          source: "youtube_topic_header",
          confidence: 0.87,
          raw: topicHeader.artistBlock
        })
      );
    }

    /*
     * Les segments suivants du header Topic sont aussi des crédits.
     *
     * Ex:
     *   Day Off · Blasé · Fergy53 · Jwles
     *
     * Leur rôle précis n'est pas toujours explicite. On les conserve
     * donc comme "credited", et les champs Main Artist / Featured /
     * Remixer peuvent ensuite préciser leur rôle.
     */
    for (const extra of topicHeader.additionalCredits || []) {
      for (const artist of metadataCredits(extra, "credited")) {
        addObservation(
          observations,
          observation({
            kind: "artist",
            value: artist.name,
            role: "credited",
            source: "youtube_topic_header_credit",
            confidence: 0.78,
            raw: extra
          })
        );
      }
    }
  }

  /*
   * 4. Chaîne Topic.
   *
   * Le nom de chaîne est une preuve contextuelle, pas nécessairement
   * le crédit de CE morceau.
   *
   * Si le header Topic fournit déjà un bloc artiste, on conserve
   * donc la chaîne comme "channel_hint". Cela permet par exemple :
   *
   *   Disco Science · Mirwais
   *   channel: David Gravell - Topic
   *
   * sans fabriquer deux artistes principaux.
   *
   * En revanche, si aucun header exploitable n'existe, le nom de
   * chaîne reste un candidat primary utile.
   */
  for (
    const artist of
    topicCreditsFromChannel(channelTitle)
  ) {
    addObservation(
      observations,
      observation({
        kind: "artist",
        value: artist.name,
        role:
          topicHeader?.artistBlock
            ? "channel_hint"
            : artist.role,
        source: "youtube_topic_channel",
        confidence:
          topicHeader?.artistBlock
            ? 0.68
            : 0.82,
        raw: channelTitle
      })
    );
  }

  return {
    source: {
      id: item.id || null,
      title: sourceTitle,
      channelTitle
    },

    syntax,

    observations: cleanResult(observations),

    identityStatus: "unresolved"
  };
}

function groupArtistObservations(observations) {
  const groups = new Map();

  for (const obs of observations) {
    if (obs.kind !== "artist") continue;

    const key = [
      comparisonKey(obs.value),
      obs.role || ""
    ].join("::");

    const current = groups.get(key) || {
      name: obs.value,
      role: obs.role,
      confidence: 0,
      sources: []
    };

    /*
     * On conserve la graphie provenant de la preuve
     * la plus forte.
     */
    if (obs.confidence > current.confidence) {
      current.name = obs.value;
    }

    current.confidence = Math.max(
      current.confidence,
      obs.confidence
    );

    for (const source of obs.sources || [obs.source]) {
      if (!current.sources.includes(source)) {
        current.sources.push(source);
      }
    }

    groups.set(key, current);
  }

  return [...groups.values()]
    .sort((a, b) => {
      if (b.confidence !== a.confidence) {
        return b.confidence - a.confidence;
      }

      return a.name.localeCompare(b.name);
    });
}

function bestObservation(observations, kind) {
  return (
    observations
      .filter((obs) => obs.kind === kind)
      .sort((a, b) => b.confidence - a.confidence)[0] ||
    null
  );
}

export function inferTrackStructure(item = {}) {
  const evidence = collectTrackEvidence(item);

  const title = bestObservation(
    evidence.observations,
    "title"
  );

  const version = bestObservation(
    evidence.observations,
    "version"
  );

  const catalogueCode = bestObservation(
    evidence.observations,
    "catalogue_code"
  );

  const artists = groupArtistObservations(
    evidence.observations
  );

  const hasPrimary = artists.some(
    ({ role }) =>
      role === "primary" ||
      role === "joint"
  );

  return {
    status:
      title && hasPrimary
        ? "structured"
        : title
          ? "partial"
          : "unresolved",

    title: title?.value || "",

    artists,

    version: version?.value || null,

    catalogueCode: catalogueCode?.value || null,

    identityStatus: "unresolved",

    evidence
  };
}
