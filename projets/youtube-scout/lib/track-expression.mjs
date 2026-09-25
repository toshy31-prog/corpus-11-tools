const SPACE = /\s+/g;

function clean(value = "") {
  return String(value)
    .normalize("NFKC")
    .replace(/\u200e|\u200f|\ufeff/g, "")
    .replace(SPACE, " ")
    .trim();
}

function uniqueCredits(credits) {
  const seen = new Set();

  return credits.filter((credit) => {
    const key = `${credit.name.toLocaleLowerCase()}::${credit.role}`;
    if (!credit.name || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function credit(name, role, basis = "title_syntax") {
  return {
    name: clean(name),
    role,
    basis
  };
}

function splitNames(text, role, basis) {
  const source = clean(text);
  if (!source) return [];

  /*
   * Important :
   * cette fonction n'est appelée QUE sur une zone déjà reconnue
   * comme zone de crédits.
   *
   * On ne splitte donc jamais aveuglément tout le titre sur "&".
   */
  const pieces = source
    .split(/\s*(?:&|＆|\+|\/|\band\b)\s*/iu)
    .map(clean)
    .filter(Boolean);

  return pieces.map((name) => credit(name, role, basis));
}

export function parseArtistCredits(rawArtistBlock) {
  let block = clean(rawArtistBlock);
  if (!block) return [];

  const credits = [];

  /*
   * Featuring est prioritaire : on extrait la partie située après
   * feat/ft/featuring avant de traiter les collaborations principales.
   */
  const featureMatch = block.match(
    /^(.*?)(?:\s+(?:feat(?:uring)?\.?|ft\.?)\s+)(.+)$/iu
  );

  if (featureMatch) {
    block = clean(featureMatch[1]);

    credits.push(
      ...splitNames(
        featureMatch[2],
        "featuring",
        "explicit_feature_credit"
      )
    );
  }

  /*
   * "vs" porte une sémantique distincte.
   */
  const versus = block.match(/^(.*?)\s+\bvs\.?\b\s+(.+)$/iu);

  if (versus) {
    return uniqueCredits([
      ...splitNames(versus[1], "versus", "explicit_versus_credit"),
      ...splitNames(versus[2], "versus", "explicit_versus_credit"),
      ...credits
    ]);
  }

  /*
   * "presents" est conservé comme relation et non assimilé
   * à une collaboration ordinaire.
   */
  const presents = block.match(/^(.*?)\s+\bpresents\b\s+(.+)$/iu);

  if (presents) {
    return uniqueCredits([
      credit(presents[1], "presenter", "explicit_presents_credit"),
      credit(presents[2], "presented", "explicit_presents_credit"),
      ...credits
    ]);
  }

  /*
   * x / × : uniquement entouré d'espaces pour ne pas casser
   * un vrai nom contenant la lettre x.
   */
  const xParts = block
    .split(/\s+(?:x|×)\s+/iu)
    .map(clean)
    .filter(Boolean);

  if (xParts.length > 1) {
    return uniqueCredits([
      ...xParts.map((name) =>
        credit(name, "joint", "explicit_collaboration_credit")
      ),
      ...credits
    ]);
  }

  /*
   * &, +, "and" : collaboration dans la zone artiste seulement.
   */
  const jointParts = block
    .split(/\s*(?:&|＆|\+|\band\b)\s*/iu)
    .map(clean)
    .filter(Boolean);

  if (jointParts.length > 1) {
    return uniqueCredits([
      ...jointParts.map((name) =>
        credit(name, "joint", "explicit_collaboration_credit")
      ),
      ...credits
    ]);
  }

  return uniqueCredits([
    credit(block, "primary", "title_syntax"),
    ...credits
  ]);
}

function stripEditorialSuffixes(value) {
  let text = clean(value);
  const removed = [];

  /*
   * Bruit audiovisuel. On reste volontairement conservateur.
   */
  const editorial = [
    "official music video",
    "official video",
    "official audio",
    "official visualizer",
    "official visualiser",
    "official lyric video",
    "lyrics video",
    "lyric video",
    "clip officiel",
    "video officielle",
    "audio officiel",
    "visualizer",
    "visualiser"
  ];

  let changed = true;

  while (changed) {
    changed = false;

    for (const label of editorial) {
      const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(
        `\\s*[\\[(]\\s*${escaped}\\s*[\\])]\\s*$`,
        "iu"
      );

      if (re.test(text)) {
        removed.push(label);
        text = clean(text.replace(re, ""));
        changed = true;
      }
    }
  }

  return { text, removed };
}

function extractCatalogue(value) {
  let text = clean(value);
  let catalogueCode = null;

  /*
   * On ne traite comme catalogue qu'un crochet final ayant une
   * morphologie plausible de référence de label.
   */
  const match = text.match(/\s*\[([A-Z0-9][A-Z0-9._:/# -]{1,24})\]\s*$/u);

  if (match) {
    const candidate = clean(match[1]);

    const plausible =
      /[A-Z]/u.test(candidate) &&
      /\d/u.test(candidate) &&
      !/\b(?:remix|mix|edit|version|video|audio)\b/iu.test(candidate);

    if (plausible) {
      catalogueCode = candidate;
      text = clean(text.slice(0, match.index));
    }
  }

  return { text, catalogueCode };
}

function extractVersion(value) {
  let text = clean(value);
  let version = null;
  const extraCredits = [];

  /*
   * Parenthèses ou crochets :
   *   (Original Mix)
   *   (Thomas Schumacher Remix)
   *   [Fracture Remix]
   *   (Edit)
   *   (Dub)
   */
  const match = text.match(
    /\s*[\[(]([^()[\]]*(?:remix|rework|refix|edit|mix|dub|version|instrumental|radio edit|original)[^()[\]]*)[\])]\s*$/iu
  );

  if (!match) {
    return { text, version, extraCredits };
  }

  const label = clean(match[1]);
  text = clean(text.slice(0, match.index));

  let kind = "version";
  if (/\bremix\b/iu.test(label)) kind = "remix";
  else if (/\brework\b/iu.test(label)) kind = "rework";
  else if (/\bedit\b/iu.test(label)) kind = "edit";
  else if (/\bdub\b/iu.test(label)) kind = "dub";
  else if (/\bmix\b/iu.test(label)) kind = "mix";
  else if (/\binstrumental\b/iu.test(label)) kind = "instrumental";

  version = {
    kind,
    label
  };

  const remixerMatch = label.match(
    /^(.*?)\s+(?:remix|rework|refix)$/iu
  );

  if (remixerMatch) {
    const remixerBlock = clean(remixerMatch[1]);

    /*
     * "Original Remix" etc. ne désigne pas un artiste.
     */
    if (
      remixerBlock &&
      !/^(?:original|radio|extended|club|dub|instrumental)$/iu.test(
        remixerBlock
      )
    ) {
      extraCredits.push(
        ...splitNames(
          remixerBlock,
          "remixer",
          "explicit_remix_credit"
        )
      );

      version.artistText = remixerBlock;
    }
  }

  return { text, version, extraCredits };
}

function extractFeatureFromTitle(value) {
  const text = clean(value);

  /*
   * Exemple :
   * Smoking Mirror feat. Pezzotti
   * Experience (Original Mix) (feat. Øe)
   */
  const parenthetical = text.match(
    /^(.*?)\s*[\[(]\s*(?:feat(?:uring)?\.?|ft\.?)\s+(.+?)\s*[\])]\s*$/iu
  );

  if (parenthetical) {
    return {
      text: clean(parenthetical[1]),
      credits: splitNames(
        parenthetical[2],
        "featuring",
        "explicit_feature_credit"
      )
    };
  }

  const inline = text.match(
    /^(.*?)\s+(?:feat(?:uring)?\.?|ft\.?)\s+(.+)$/iu
  );

  if (inline) {
    return {
      text: clean(inline[1]),
      credits: splitNames(
        inline[2],
        "featuring",
        "explicit_feature_credit"
      )
    };
  }

  return { text, credits: [] };
}

function candidateBoundaries(source) {
  const candidates = [];

  /*
   * Priorité aux séparateurs typographiques explicitement entourés.
   */
  const separator =
    /\s+(--|---|–|—|−|-)\s+/gu;

  for (const match of source.matchAll(separator)) {
    const left = clean(source.slice(0, match.index));
    const right = clean(source.slice(match.index + match[0].length));

    if (!left || !right) continue;

    candidates.push({
      left,
      right,
      separator: match[1],
      index: match.index
    });
  }

  return candidates;
}

function scoreBoundary(candidate, source) {
  let score = 0.5;

  /*
   * Premier séparateur : format Artist - Title très fréquent.
   */
  if (candidate.index < source.length * 0.55) score += 0.12;

  if (candidate.left.length <= 80) score += 0.08;
  if (candidate.right.length >= 2) score += 0.05;

  /*
   * Crédits explicites côté gauche = signal fort.
   */
  if (
    /\b(?:feat(?:uring)?\.?|ft\.?|vs\.?|presents)\b/iu.test(
      candidate.left
    ) ||
    /\s(?:&|＆|\+|x|×)\s/iu.test(candidate.left)
  ) {
    score += 0.1;
  }

  /*
   * Préfixes typiques d'information de release côté gauche :
   * ils diminuent la confiance en une lecture Artist - Title.
   */
  if (
    /^(?:premiere|exclusive|track|release|official)\b/iu.test(
      candidate.left
    )
  ) {
    score -= 0.12;
  }

  return Math.max(0, Math.min(1, score));
}


export function parseTrackTitle(rawTitle) {
  const sourceTitle = clean(rawTitle);

  if (!sourceTitle) {
    return {
      title: "",
      version: null,
      catalogueCode: null,
      artists: [],
      editorial: []
    };
  }

  /*
   * Ici on sait déjà que la chaîne est un TITRE.
   * On n'essaie donc jamais de déduire une frontière Artist - Title.
   */
  const editorial = stripEditorialSuffixes(sourceTitle);

  let text = editorial.text;

  const catalogue = extractCatalogue(text);
  text = catalogue.text;

  /*
   * Featuring dans le titre :
   * "Nieuport Beach Ft. BEN PLG"
   */
  const feature1 = extractFeatureFromTitle(text);
  text = feature1.text;

  const versionResult = extractVersion(text);
  text = versionResult.text;

  /*
   * Gère aussi :
   * "Track (Original Mix) feat. X"
   */
  const feature2 = extractFeatureFromTitle(text);
  text = feature2.text;

  return {
    title: text,
    version: versionResult.version,
    catalogueCode: catalogue.catalogueCode,
    artists: uniqueCredits([
      ...feature1.credits,
      ...feature2.credits,
      ...versionResult.extraCredits
    ]),
    editorial: editorial.removed
  };
}

export function parseTrackExpression(rawTitle, options = {}) {
  const sourceTitle = clean(rawTitle);

  if (!sourceTitle) {
    return {
      status: "unparsed",
      sourceTitle,
      reason: "empty_title",
      candidates: []
    };
  }

  const editorial = stripEditorialSuffixes(sourceTitle);
  const source = editorial.text;

  const boundaries = candidateBoundaries(source);

  /*
   * Sans frontière artiste/titre, on n'invente PAS l'artiste.
   * On peut néanmoins analyser version et featuring du titre.
   */
  if (!boundaries.length) {
    let title = source;

    const feature = extractFeatureFromTitle(title);
    title = feature.text;

    const versionResult = extractVersion(title);
    title = versionResult.text;

    return {
      status: "partial",
      sourceTitle,
      title,
      artists: uniqueCredits([
        ...feature.credits,
        ...versionResult.extraCredits
      ]),
      version: versionResult.version,
      catalogueCode: null,
      editorial: editorial.removed,
      identityStatus: "unresolved",
      confidence: {
        boundary: 0
      },
      candidates: []
    };
  }

  const hypotheses = boundaries
    .map((boundary) => {
      let right = boundary.right;

      const catalogue = extractCatalogue(right);
      right = catalogue.text;

      /*
       * Le featuring doit être extrait avant la version externe,
       * et une deuxième passe après version gère :
       * Title (Original Mix) (feat X)
       */
      let feature1 = extractFeatureFromTitle(right);
      right = feature1.text;

      const versionResult = extractVersion(right);
      right = versionResult.text;

      const feature2 = extractFeatureFromTitle(right);
      right = feature2.text;

      const artists = uniqueCredits([
        ...parseArtistCredits(boundary.left),
        ...feature1.credits,
        ...feature2.credits,
        ...versionResult.extraCredits
      ]);

      return {
        artistText: boundary.left,
        title: right,
        artists,
        version: versionResult.version,
        catalogueCode: catalogue.catalogueCode,
        separator: boundary.separator,
        confidence: scoreBoundary(boundary, source)
      };
    })
    .sort((a, b) => b.confidence - a.confidence);

  const best = hypotheses[0];

  return {
    status: "parsed",
    sourceTitle,
    artistText: best.artistText,
    title: best.title,
    artists: best.artists,
    version: best.version,
    catalogueCode: best.catalogueCode,
    editorial: editorial.removed,
    identityStatus: "unresolved",
    confidence: {
      boundary: best.confidence
    },
    candidates: hypotheses
  };
}
