import { summarizeDiscoveryFrontier } from "./discovery-frontier.mjs";
const DIRECTION_DEFINITIONS = Object.freeze({
  alias: {
    label: "Alias et projets",
    description: "Suit les pseudonymes et groupes explicitement reliés par les catalogues.",
    relations: ["probable_artist", "embodies", "credited_on", "primary_artist", "credited_on_release", "alias_of", "member_of", "appears_on"],
    motif: ({ edge }) => ["alias_of", "member_of"].includes(edge.kind)
  },
  label: {
    label: "Même label",
    description: "Traverse sorties et éditions pour ressortir de l’autre côté du label.",
    relations: ["same_identity", "included_in", "probable_artist", "embodies", "credited_on", "appears_on", "candidate_edition", "primary_artist", "credited_on_release", "issued_by", "associated_label", "released_in_era"],
    motif: ({ entity }) => entity.type === "label"
  },
  remix: {
    label: "Remixeur / producteur",
    description: "Suit les crédits de remix et les artistes crédités sur un même recording.",
    relations: ["same_identity", "included_in", "probable_artist", "embodies", "credited_on", "remixed_by", "appears_on", "primary_artist", "credited_on_release"],
    motif: ({ edge }) => edge.kind === "remixed_by" || /remix|producer|production/i.test(edge.role || "")
  },
  featuring: {
    label: "Featuring",
    description: "Passe par un co-crédit explicite avant de repartir vers son catalogue.",
    relations: ["same_identity", "included_in", "probable_artist", "embodies", "credited_on", "featured_with", "appears_on", "primary_artist", "credited_on_release"],
    motif: ({ edge }) => edge.kind === "featured_with"
  },
  compilation: {
    label: "Compilation",
    description: "Traite compilations, apparitions et sorties partagées comme des carrefours.",
    relations: ["same_identity", "included_in", "probable_artist", "embodies", "credited_on", "appears_on", "candidate_edition", "primary_artist", "credited_on_release", "issued_by"],
    motif: ({ entity, edge }) => ["release", "release_group", "master"].includes(entity.type)
      && (/compilation|various|sampler/i.test(`${entity.releaseType || ""} ${entity.format || ""} ${entity.title || ""}`) || /appearance/i.test(edge.role || ""))
  },
  curator: {
    label: "Chaîne-curatrice",
    description: "Rebondit par la chaîne qui a publié la vidéo, sans la confondre avec l’artiste.",
    relations: ["included_in", "published_by"],
    motif: ({ entity }) => entity.type === "channel"
  },
  scene: {
    label: "Scène / territoire",
    description: "Relie les artistes par une scène explicitement sourcée ou un territoire documenté.",
    relations: ["same_identity", "included_in", "probable_artist", "embodies", "credited_on", "primary_artist", "credited_on_release", "associated_scene"],
    motif: ({ entity }) => entity.type === "scene" || entity.type === "territory"
  },
  era: {
    label: "Époque",
    description: "Filtre les pistes déjà reliées par leurs périodes de sortie. Une décennie commune ne crée pas un lien musical.",
    relations: ["same_identity", "released_in_era", "appears_on", "embodies", "probable_artist", "primary_artist", "credited_on"],
    motif: ({ entity }) => entity.type === "era"
  }
});

export const EXPLORATION_DIRECTIONS = Object.freeze(Object.entries(DIRECTION_DEFINITIONS).map(([id, value]) => ({ id, label: value.label, description: value.description })));

export const DIRECTION_SOURCE_REQUIREMENTS = Object.freeze({
  alias: ["musicbrainz", "discogs"],
  label: ["musicbrainz", "discogs"],
  remix: ["musicbrainz", "discogs"],
  featuring: ["musicbrainz", "discogs"],
  compilation: ["musicbrainz", "discogs"],
  curator: ["youtube_library"],
  scene: ["musicbrainz", "wikidata"],
  era: ["youtube_library", "musicbrainz", "discogs"]
});

function normalized(value = "") {
  return String(value).toLocaleLowerCase("fr-FR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120);
}

function entityLabel(entity = {}) {
  return entity.name || entity.title || entity.label || entity.id || "Entité sans nom";
}

function decade(value) {
  const year = Number(String(value || "").match(/(?:19|20)\d{2}/)?.[0]);
  return year >= 1900 && year <= 2100 ? `${Math.floor(year / 10) * 10}s` : "";
}

function edgeKey(edge) {
  return edge.id || `${edge.from}:${edge.kind}:${edge.to}`;
}

export function collaborationGraph(index = []) {
  const entities = [];
  const edges = [];
  const entityIds = new Set();
  const addArtist = (name) => {
    const id = `artist:local:${normalized(name)}`;
    if (!entityIds.has(id)) {
      entities.push({ id, type: "artist", name, status: "local_credit_identity" });
      entityIds.add(id);
    }
    return id;
  };
  for (const connection of index || []) {
    const [left, right] = connection.artists || [];
    if (!left || !right) continue;
    const leftId = addArtist(left);
    const rightId = addArtist(right);
    // The observation count carries the full weight. Keeping a bounded sample of
    // provenance avoids turning a large local library into an oversized request.
    const evidence = (connection.videoIds || []).slice(0, 50).map((id) => `video:youtube:${id}`);
    if (Number(connection.kinds?.featuring || 0)) edges.push({
      from: leftId,
      to: rightId,
      kind: "featured_with",
      status: "title_credit",
      observations: Number(connection.kinds.featuring || 0),
      evidence
    });
    if (Number(connection.kinds?.remix || 0)) edges.push({
      from: leftId,
      to: rightId,
      kind: "remixed_by",
      status: "title_credit",
      observations: Number(connection.kinds.remix || 0),
      evidence
    });
  }
  return { entities, edges };
}

import { departureRoutingGraph } from "./departure-integrity.mjs";
export function sanitizeExplorationGraph(state = {}) {
  state = departureRoutingGraph(state);
  const entities = Object.fromEntries(Object.entries(state.entities || {}).map(([id, entity]) => {
    if (entity.type === "scene" && entity.basis === "musicbrainz_country") return [id, { ...entity, type: "territory" }];
    return [id, entity];
  }));
  const safeStatuses = new Set(["confirmed_cross_id", "confirmed_user", "corroborated"]);
  const safeArtists = new Set();
  const unsafeArtists = new Set();
  for (const edge of Object.values(state.edges || {})) {
    if (edge.kind !== "probable_artist") continue;
    (safeStatuses.has(edge.status) ? safeArtists : unsafeArtists).add(edge.to);
  }
  const safeDiscogsTargets = new Set(Object.values(state.edges || {})
    .filter((edge) => edge.kind === "credited_on_release" && safeArtists.has(edge.from))
    .map((edge) => edge.to));
  const blockedDiscogsTargets = new Set(Object.values(state.edges || {})
    .filter((edge) => edge.kind === "credited_on_release" && unsafeArtists.has(edge.from) && !safeArtists.has(edge.from) && !safeDiscogsTargets.has(edge.to))
    .map((edge) => edge.to));
  const usableEntities = Object.fromEntries(Object.entries(entities).filter(([id]) => !blockedDiscogsTargets.has(id)));
  const edges = Object.fromEntries(Object.entries(state.edges || {}).filter(([, edge]) => {
    if (!usableEntities[edge.from] || !usableEntities[edge.to]) return false;
    if (edge.kind === "same_identity" && !safeStatuses.has(edge.status)) return false;
    if (edge.kind === "credited_on_release" && unsafeArtists.has(edge.from) && !safeArtists.has(edge.from)) return false;
    return true;
  }));
  return { ...state, entities: usableEntities, edges };
}

export function augmentExplorationGraph(state = {}, library = [], collaborations = []) {
  const entities = { ...(state.entities || {}) };
  const edges = { ...(state.edges || {}) };
  const addEntity = (entity) => { if (entity?.id) entities[entity.id] = { ...(entities[entity.id] || {}), ...entity }; };
  const addEdge = (edge) => { if (edge?.from && edge?.to && edge?.kind) edges[edgeKey(edge)] = edge; };

  for (const video of library || []) {
    if (!video?.id) continue;
    const videoId = `video:youtube:${video.id}`;
    addEntity({ id: videoId, type: "video", title: video.title || "Vidéo sans titre", channelTitle: video.channelTitle || "", publishedAt: video.publishedAt || "", url: `https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}`,
      ...Object.fromEntries(["categoryId", "channelId", "tags", "durationSeconds", "thumbnail"].filter(key => video[key] !== undefined).map(key => [key, video[key]])) });
    const explicitArtist = String(video.artist || "").trim();
    const inferredArtist =
      video.artistInference &&
      Number(video.artistInference.confidence || 0) >= 0.8
        ? String(video.artistInference.name || "").trim()
        : "";
    const probableArtist =
      explicitArtist ||
      inferredArtist ||
      String(video.resolvedArtist || video.probableArtist || "").trim();

    if (probableArtist) {
      const artistId = `artist:local:${normalized(probableArtist)}`;
      const seedEligible = Boolean(explicitArtist || inferredArtist);
      addEntity({
        id: artistId,
        type: "artist",
        name: probableArtist,
        status: seedEligible ? "local_supported" : "local_hypothesis",
        seedEligible
      });
      addEdge({
        from: videoId,
        to: artistId,
        kind: "probable_artist",
        status: seedEligible ? "local_supported" : "local_hypothesis",
        evidence: [videoId]
      });
      // A name-scoped local node may contain homonyms. Never bridge a catalogue
      // artist to every library credit with that spelling.
    }
    if (video.channelTitle) {
      const exactChannel = /^UC[A-Za-z0-9_-]{22}$/.test(video.channelId || "");
      const channelId = exactChannel ? `channel:youtube:${video.channelId}` : `channel:unresolved-video:${video.id}`;
      addEntity({ id: channelId, type: "channel", name: video.channelTitle, ...(exactChannel ? { externalIds: { youtube: video.channelId }, url: `https://www.youtube.com/channel/${video.channelId}` } : { basis: "channel_name_only" }) });
      addEdge({ from: videoId, to: channelId, kind: "published_by", status: exactChannel ? "observed" : "unresolved", evidence: [videoId] });
    }
    const era = decade(video.publishedAt);
    if (era) {
      const eraId = `era:derived:${era}`;
      addEntity({ id: eraId, type: "era", name: era, status: "derived_from_date" });
      addEdge({ from: videoId, to: eraId, kind: "published_in_era", status: "derived", evidence: [videoId] });
    }
    const playlistIds = video.playlistIds || [];
    const playlistNames = video.playlistNames || [];
    for (const [index, playlistId] of playlistIds.entries()) {
      if (!playlistId) continue;
      const id = `playlist:youtube:${playlistId}`;
      addEntity({ id, type: "playlist", name: playlistNames[index] || playlistNames[0] || `Playlist ${playlistId}` });
      addEdge({ from: videoId, to: id, kind: "included_in", status: "observed", evidence: [videoId] });
    }
  }
  const localCollaborations = collaborationGraph(collaborations);
  for (const entity of localCollaborations.entities) addEntity(entity);
  for (const edge of localCollaborations.edges) addEdge(edge);
  return { ...state, entities, edges };
}

function seedIdentityClusters(graph = {}) {
  const entities = Object.values(graph.entities || {});
  const parent = new Map();

  const find = (id) => {
    if (!parent.has(id)) parent.set(id, id);
    const current = parent.get(id);
    if (current === id) return id;
    const root = find(current);
    parent.set(id, root);
    return root;
  };

  const union = (a, b) => {
    if (!a || !b) return;
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) return;
    const ordered = [ra, rb].sort((x, y) => String(x).localeCompare(String(y), "en"));
    parent.set(ordered[1], ordered[0]);
  };

  const typeOf = (entity) =>
    entity?.type === "video" || entity?.type === "recording"
      ? "track"
      : entity?.type;

  const byExternalId = new Map();

  for (const entity of entities) {
    if (!entity?.id) continue;
    find(entity.id);

    for (const [namespace, rawValue] of Object.entries(entity.externalIds || {})) {
      const value = String(rawValue || "").trim();
      if (!value) continue;
      const key = `${typeOf(entity)}::${namespace}::${value}`;
      if (!byExternalId.has(key)) byExternalId.set(key, entity.id);
      else union(byExternalId.get(key), entity.id);
    }
  }

  /*
   * Une relation d'identité n'a le droit de modifier les clusters que si sa
   * frontière de preuve est explicitement suffisante.
   *
   * Le simple nom, une hypothèse locale, un candidat ou une ancienne arête
   * same_identity faible restent observables dans le graphe mais ne deviennent
   * jamais une identité canonique par accident.
   */
  const identityMergeStatuses = new Set([
    "confirmed_cross_id",
    "confirmed_user",
    "corroborated"
  ]);

  for (const edge of Object.values(graph.edges || {})) {
    if (!["same_identity", "same_entity", "canonical_identity"].includes(edge?.kind)) {
      continue;
    }

    if (
      edge.kind === "same_identity" &&
      !identityMergeStatuses.has(edge.status)
    ) {
      continue;
    }

    const left = graph.entities?.[edge.from];
    const right = graph.entities?.[edge.to];

    if (!left || !right) continue;
    if (typeOf(left) !== typeOf(right)) continue;

    union(edge.from, edge.to);
  }

  /*
   * Réconciliation prudente des placeholders de label Discogs.
   *
   * Un label `label:discogs-name:*` n'est jamais fusionné au seul motif
   * qu'il porte le même nom qu'un `label:discogs:<id>`.
   *
   * En revanche, si les deux labels sont tous deux reliés par `issued_by`
   * à une même release Discogs, ils désignent ici la même identité de label
   * observée sous deux représentations techniques différentes.
   */
  const issuedByTargetsByRelease = new Map();

  for (const edge of Object.values(graph.edges || {})) {
    if (edge?.kind !== "issued_by") continue;

    const release = graph.entities?.[edge.from];
    const label = graph.entities?.[edge.to];

    if (!release || !label) continue;
    if (release.type !== "release") continue;
    if (label.type !== "label") continue;
    if (!String(release.id || "").startsWith("release:discogs:")) continue;

    if (!issuedByTargetsByRelease.has(release.id)) {
      issuedByTargetsByRelease.set(release.id, []);
    }

    issuedByTargetsByRelease.get(release.id).push(label.id);
  }

  for (const labelIds of issuedByTargetsByRelease.values()) {
    const namePlaceholders = labelIds.filter((id) =>
      String(id).startsWith("label:discogs-name:")
    );
    const structured = labelIds.filter((id) =>
      /^label:discogs:\d+$/.test(String(id))
    );

    for (const placeholderId of namePlaceholders) {
      for (const structuredId of structured) {
        const placeholder = graph.entities?.[placeholderId];
        const canonical = graph.entities?.[structuredId];

        /*
         * Une release Discogs peut référencer plusieurs labels.
         * La release commune apporte le contexte structurel, mais ne suffit
         * donc pas à établir l'identité.
         *
         * On exige aussi que les noms observés concordent après
         * normalisation. Cette comparaison ne sert qu'à valider une
         * correspondance déjà co-présente sur la même release ; elle ne
         * constitue jamais une fusion globale "par nom".
         */
        if (
          placeholder &&
          canonical &&
          normalized(entityLabel(placeholder)) &&
          normalized(entityLabel(placeholder)) ===
            normalized(entityLabel(canonical))
        ) {
          union(placeholderId, structuredId);
        }
      }
    }
  }


  /*
   * Réconciliation des placeholders de labels MusicBrainz.
   *
   * Deux représentations d'un même label peuvent coexister :
   *
   *   label:musicbrainz-name:foo
   *   label:musicbrainz:<MBID>
   *
   * La première vient notamment des release-groups déjà collectés ; la
   * seconde d'une release MusicBrainz détaillée.
   *
   * Le nom seul n'est jamais une preuve d'identité suffisante.
   * On ne les regroupe que lorsqu'ils portent le même nom normalisé ET que
   * leurs contextes MusicBrainz décrivent manifestement la même sortie :
   *
   *   - même titre normalisé ;
   *   - même date connue ;
   *   - au moins un artiste primaire commun.
   *
   * Cela permet par exemple de rapprocher un release-group de sa release
   * détaillée sans exiger une arête release-group -> release qui n'existe
   * pas actuellement dans le graphe.
   */
  {
    const allEntities = Object.values(graph.entities || {});
    const allEdges = Object.values(graph.edges || {});

    const normalizeIdentityText = (value = "") =>
      String(value)
        .toLocaleLowerCase("fr-FR")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();

    const normalizedDate = (entity = {}) =>
      String(
        entity.date ||
        entity.dates?.releaseDate ||
        entity.dates?.firstReleaseDate ||
        ""
      ).slice(0, 10);

    const labelIssuerIds = (labelId) =>
      allEdges
        .filter((edge) =>
          edge.kind === "issued_by" &&
          edge.to === labelId &&
          String(edge.from || "").includes("musicbrainz")
        )
        .map((edge) => edge.from);

    const artistKeysFor = (entityId) => {
      const keys = new Set();

      for (const edge of allEdges) {
        if (
          edge.to === entityId &&
          ["primary_artist", "credited_on_release"].includes(edge.kind)
        ) {
          const artist = graph.entities?.[edge.from];
          const external =
            String(artist?.externalIds?.musicbrainz || "").trim();

          /*
           * Les anciennes entités mbid:<uuid> et les entités structurées
           * artist:musicbrainz:<uuid> doivent être comparables.
           */
          const idMatch = String(edge.from || "").match(
            /(?:^mbid:|^artist:musicbrainz:)([0-9a-f-]{36})$/i
          );

          if (external) keys.add(`mbid:${external.toLowerCase()}`);
          else if (idMatch) keys.add(`mbid:${idMatch[1].toLowerCase()}`);
          else if (artist?.name) {
            keys.add(`name:${normalizeIdentityText(artist.name)}`);
          }
        }
      }

      /*
       * Une release détaillée conserve également son tableau artists.
       * On l'utilise comme représentation structurée équivalente des mêmes
       * crédits MusicBrainz, jamais comme rapprochement par nom isolé.
       */
      const entity = graph.entities?.[entityId];
      for (const artist of entity?.artists || []) {
        const idMatch = String(artist?.id || "").match(
          /(?:^mbid:|^artist:musicbrainz:)([0-9a-f-]{36})$/i
        );
        if (idMatch) keys.add(`mbid:${idMatch[1].toLowerCase()}`);
        else if (artist?.name) {
          keys.add(`name:${normalizeIdentityText(artist.name)}`);
        }
      }

      return keys;
    };

    const sameReleaseContext = (leftId, rightId) => {
      const left = graph.entities?.[leftId];
      const right = graph.entities?.[rightId];
      if (!left || !right) return false;

      if (
        !["release", "release_group"].includes(left.type) ||
        !["release", "release_group"].includes(right.type)
      ) return false;

      const leftTitle = normalizeIdentityText(left.title || left.name || "");
      const rightTitle = normalizeIdentityText(right.title || right.name || "");

      if (!leftTitle || leftTitle !== rightTitle) return false;

      const leftDate = normalizedDate(left);
      const rightDate = normalizedDate(right);

      /*
       * Pour franchir cette frontière, la date doit être connue des deux
       * côtés. Une absence de date n'est pas une corroboration.
       */
      if (!leftDate || !rightDate || leftDate !== rightDate) return false;

      const leftArtists = artistKeysFor(leftId);
      const rightArtists = artistKeysFor(rightId);

      if (!leftArtists.size || !rightArtists.size) return false;

      for (const key of leftArtists) {
        if (rightArtists.has(key)) return true;
      }

      return false;
    };

    const placeholders = allEntities.filter((entity) =>
      entity?.type === "label" &&
      /^label:musicbrainz-name:/.test(entity.id || "")
    );

    const structuredLabels = allEntities.filter((entity) =>
      entity?.type === "label" &&
      /^label:musicbrainz:[0-9a-f-]{36}$/i.test(entity.id || "") &&
      Boolean(entity.externalIds?.musicbrainz)
    );

    for (const placeholder of placeholders) {
      const placeholderName = normalizeIdentityText(
        placeholder.name || placeholder.label || ""
      );
      if (!placeholderName) continue;

      const placeholderContexts = labelIssuerIds(placeholder.id);
      if (!placeholderContexts.length) continue;

      for (const structured of structuredLabels) {
        const structuredName = normalizeIdentityText(
          structured.name || structured.label || ""
        );

        /*
         * Même fournisseur + même nom restent nécessaires, mais ne sont
         * jamais suffisants seuls.
         */
        if (!structuredName || structuredName !== placeholderName) continue;

        const structuredContexts = labelIssuerIds(structured.id);
        if (!structuredContexts.length) continue;

        const corroborated = placeholderContexts.some((leftId) =>
          structuredContexts.some((rightId) =>
            sameReleaseContext(leftId, rightId)
          )
        );

        if (corroborated) {
          union(placeholder.id, structured.id);
        }
      }
    }
  }


  /*
   * Réconciliation inter-fournisseurs des labels.
   *
   * Discogs et MusicBrainz peuvent chacun représenter le même label dans
   * leur propre sous-graphe. Le nom partagé n'est jamais suffisant pour
   * déclarer une identité commune.
   *
   * On autorise ici un pont uniquement lorsqu'une sortie des deux côtés
   * porte :
   *
   *   - le même nom de label normalisé ;
   *   - un numéro de catalogue non vide strictement équivalent ;
   *   - un titre de sortie compatible ;
   *   - et, si les deux dates sont connues, une année compatible.
   *
   * Le numéro de catalogue est donc la preuve structurante du pont ;
   * titre/date servent de garde-fous contre une collision accidentelle.
   */
  {
    const allEntities = Object.values(graph.entities || {});
    const allEdges = Object.values(graph.edges || {});

    const normText = (value = "") =>
      String(value)
        .toLocaleLowerCase("fr-FR")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();

    const normCatalogue = (value = "") =>
      String(value)
        .toLocaleUpperCase("en-US")
        .replace(/[^A-Z0-9]/g, "");

    const releaseYear = (entity = {}) => {
      const raw = String(
        entity.date ||
        entity.dates?.releaseDate ||
        entity.dates?.firstReleaseDate ||
        ""
      );
      const match = raw.match(/^(\d{4})/);
      return match ? match[1] : "";
    };

    const labelName = (entity = {}) =>
      normText(entity.name || entity.label || "");

    const providerOfLabel = (entity = {}) => {
      const id = String(entity.id || "");
      if (/^label:discogs(?::|-name:)/.test(id)) return "discogs";
      if (/^label:musicbrainz(?::|-name:)/.test(id)) return "musicbrainz";
      return "";
    };

    const issuedContexts = (labelId) =>
      allEdges
        .filter((edge) =>
          edge.kind === "issued_by" &&
          edge.to === labelId
        )
        .map((edge) => {
          const release = graph.entities?.[edge.from];
          if (!release) return null;

          return {
            releaseId: edge.from,
            release,
            catalogueNumber:
              edge.catalogueNumber ||
              release.catalogueNumber ||
              ""
          };
        })
        .filter(Boolean);

    /*
     * Un cluster peut déjà contenir plusieurs représentations d'un label
     * d'un même fournisseur. Pour raisonner proprement, on travaille donc
     * sur la racine union-find courante et on agrège ses membres.
     */
    const labelClusters = new Map();

    for (const entity of allEntities) {
      if (entity?.type !== "label") continue;

      const provider = providerOfLabel(entity);
      if (!provider) continue;

      const root = find(entity.id);

      if (!labelClusters.has(root)) {
        labelClusters.set(root, {
          root,
          members: [],
          providers: new Set(),
          names: new Set(),
          contexts: []
        });
      }

      const cluster = labelClusters.get(root);
      cluster.members.push(entity.id);
      cluster.providers.add(provider);

      const name = labelName(entity);
      if (name) cluster.names.add(name);

      for (const context of issuedContexts(entity.id)) {
        cluster.contexts.push({
          ...context,
          provider
        });
      }
    }

    const clusters = [...labelClusters.values()];

    /*
     * Les titres de release Discogs peuvent utiliser la forme éditoriale :
     *
     *   "Artist / Credit - Release Title"
     *
     * alors que MusicBrainz conserve simplement :
     *
     *   "Release Title"
     *
     * On ne transforme jamais cela en équivalence générale de chaînes.
     * Seul un contexte Discogs peut exposer cette seconde variante, et les
     * autres garde-fous du fingerprint (label, catalogue, année) restent
     * obligatoires.
     */
    const releaseTitleVariants = (context = {}) => {
      const raw = String(
        context.release?.title ||
        context.release?.name ||
        ""
      ).trim();

      const variants = new Set();
      const full = normText(raw);

      if (full) variants.add(full);

      if (context.provider === "discogs") {
        const separator = raw.match(/\s[-–—]\s/);

        if (separator && separator.index > 0) {
          const suffix = raw.slice(
            separator.index + separator[0].length
          ).trim();

          const normalizedSuffix = normText(suffix);

          if (normalizedSuffix) variants.add(normalizedSuffix);
        }
      }

      return variants;
    };

    /*
     * Retourne les racines d'identité des artistes structurellement crédités
     * sur une sortie.
     *
     * Aucun rapprochement par nom n'est autorisé ici.
     * `find()` exploite uniquement les identités déjà établies dans le
     * union-find : externalIds communs ou relations explicites
     * same_identity / same_entity / canonical_identity.
     */
    const artistIdentityRootsForRelease = (context = {}) => {
      const artistIds = new Set();
      const releaseId = context.releaseId;
      const release = context.release;

      for (const edge of allEdges) {
        if (
          edge.to === releaseId &&
          ["primary_artist", "credited_on_release"].includes(edge.kind)
        ) {
          const artist = graph.entities?.[edge.from];

          if (artist?.type === "artist" && artist.id) {
            artistIds.add(artist.id);
          }
        }
      }

      /*
       * Certaines releases détaillées conservent aussi directement leurs
       * crédits artistes.
       *
       * Là encore, seul l'ID est accepté et uniquement s'il correspond à une
       * entité artiste existante. Le nom n'est jamais un fallback.
       */
      for (const credit of release?.artists || []) {
        const artistId = String(credit?.id || "").trim();
        if (!artistId) continue;

        const artist = graph.entities?.[artistId];

        if (artist?.type === "artist") {
          artistIds.add(artistId);
        }
      }

      return new Set(
        [...artistIds].map((artistId) => find(artistId))
      );
    };

    const sameReleaseFingerprint = (left, right) => {
      const leftCatalogue = normCatalogue(left.catalogueNumber);
      const rightCatalogue = normCatalogue(right.catalogueNumber);

      const sameCatalogue =
        Boolean(leftCatalogue) &&
        Boolean(rightCatalogue) &&
        leftCatalogue === rightCatalogue;

      /*
       * Deux catalogues explicites différents constituent une contradiction.
       * Le chemin sans catalogue n'a pas le droit de la contourner.
       */
      if (
        leftCatalogue &&
        rightCatalogue &&
        leftCatalogue !== rightCatalogue
      ) {
        return false;
      }

      const leftTitle = normText(
        left.release?.title || left.release?.name || ""
      );
      const rightTitle = normText(
        right.release?.title || right.release?.name || ""
      );

      const leftYear = releaseYear(left.release);
      const rightYear = releaseYear(right.release);

      /*
       * CHEMIN A — preuve par numéro de catalogue.
       *
       * On conserve la règle éditoriale Discogs déjà en place :
       *
       *   "Artist - Release Title"
       *
       * peut correspondre à :
       *
       *   "Release Title"
       *
       * mais seulement avec le même numéro de catalogue.
       */
      if (sameCatalogue) {
        const leftTitles = releaseTitleVariants(left);
        const rightTitles = releaseTitleVariants(right);

        const compatibleTitle =
          [...leftTitles].some((title) =>
            rightTitles.has(title)
          );

        if (!compatibleTitle) {
          return false;
        }

        /*
         * Date inconnue = inconnue, pas contradictoire.
         * Deux années connues différentes bloquent.
         */
        if (leftYear && rightYear && leftYear !== rightYear) {
          return false;
        }

        return true;
      }

      /*
       * CHEMIN B — pas de numéro de catalogue commun exploitable.
       *
       * La barre est volontairement plus haute :
       *
       *   - titre strictement identique après normalisation ;
       *   - année connue des deux côtés et identique ;
       *   - au moins un artiste déjà reconnu comme la même identité.
       *
       * La variante éditoriale Discogs n'est volontairement PAS utilisée ici.
       */
      if (
        !leftTitle ||
        !rightTitle ||
        leftTitle !== rightTitle ||
        !leftYear ||
        !rightYear ||
        leftYear !== rightYear
      ) {
        return false;
      }

      const leftArtistRoots =
        artistIdentityRootsForRelease(left);

      const rightArtistRoots =
        artistIdentityRootsForRelease(right);

      if (
        !leftArtistRoots.size ||
        !rightArtistRoots.size
      ) {
        return false;
      }

      for (const root of leftArtistRoots) {
        if (rightArtistRoots.has(root)) {
          return true;
        }
      }

      return false;
    };

    for (let i = 0; i < clusters.length; i += 1) {
      for (let j = i + 1; j < clusters.length; j += 1) {
        const left = clusters[i];
        const right = clusters[j];

        /*
         * Ce bloc ne sert qu'à créer des ponts Discogs ↔ MusicBrainz.
         */
        const crossProvider =
          (
            left.providers.has("discogs") &&
            right.providers.has("musicbrainz")
          ) ||
          (
            left.providers.has("musicbrainz") &&
            right.providers.has("discogs")
          );

        if (!crossProvider) continue;

        /*
         * Un même nom normalisé reste une condition nécessaire mais
         * jamais suffisante.
         */
        const sharedName = [...left.names].some((name) =>
          right.names.has(name)
        );

        if (!sharedName) continue;

        const corroborated = left.contexts.some((leftContext) =>
          right.contexts.some((rightContext) =>
            leftContext.provider !== rightContext.provider &&
            sameReleaseFingerprint(leftContext, rightContext)
          )
        );

        if (!corroborated) continue;

        /*
         * Une seule union des racines suffit : tous les membres déjà
         * regroupés dans chacun des clusters suivent automatiquement.
         */
        union(left.root, right.root);
      }
    }
  }

  return { rootOf: find };
}

function neutralSeedOrder(a, b) {
  return (
    a.label.localeCompare(b.label, "fr", { sensitivity: "base", numeric: true }) ||
    a.id.localeCompare(b.id, "en")
  );
}

export function rankSeedChoices(choices = [], query = "") {
  const needle = normalized(query);

  const rank = (seed) => {
    if (!needle) return 3;
    const label = normalized(seed.label);
    if (label === needle) return 0;
    if (label.startsWith(needle)) return 1;
    if (label.includes(needle)) return 2;
    return 3;
  };

  return [...choices].sort(
    (a, b) => rank(a) - rank(b) || neutralSeedOrder(a, b)
  );
}


export function projectActiveCollectionGraph(state = {}, library = []) {
  const graph = augmentExplorationGraph(state, library, []);

  const activeVideoIds = new Set(
    library
      .filter((video) => video?.id)
      .map((video) => `video:youtube:${video.id}`)
  );

  const activePlaylistIds = new Set(
    library.flatMap((video) =>
      Array.isArray(video.playlistIds)
        ? video.playlistIds.map((id) => `playlist:youtube:${id}`)
        : []
    )
  );

  /*
   * V2.7R2 — ACTIVE PROVENANCE PROJECTION
   *
   * La frontière du picker reste la collection active. Elle ne devient pas
   * une promenade libre dans le graphe historique.
   *
   * En plus des voisins directs des vidéos actives, on conserve toutefois
   * les labels réellement documentés par le morceau lui-même :
   *
   *   vidéo active
   *     -> recording exact (embodies)
   *     -> édition exacte/documentée (appears_on ou candidate_edition corroborée)
   *     -> label observé (issued_by)
   *
   * On ne suit jamais artiste -> discographie -> labels ici : posséder un
   * morceau d'un artiste ne signifie pas posséder tout son catalogue.
   */
  const keep = new Set([...activeVideoIds, ...activePlaylistIds]);
  const entities = graph.entities || {};
  const edges = Object.values(graph.edges || {});

  for (const edge of edges) {
    if (activeVideoIds.has(edge.from)) keep.add(edge.to);
    if (activeVideoIds.has(edge.to)) keep.add(edge.from);
  }

  const strongIdentity = new Set([
    "confirmed_cross_id",
    "confirmed_user",
    "corroborated"
  ]);

  const observedProvenance = new Set([
    "observed",
    "resolved",
    "corroborated",
    "confirmed_user",
    "confirmed_cross_id",
    "user_supplied"
  ]);

  const releaseTypes = new Set([
    "release",
    "release_group",
    "master"
  ]);

  const provenance = new Set(activeVideoIds);

  let provenanceChanged = true;
  while (provenanceChanged) {
    provenanceChanged = false;

    const retain = (id) => {
      if (!id || !entities[id]) return false;
      const fresh = !provenance.has(id);
      provenance.add(id);
      keep.add(id);
      if (fresh) provenanceChanged = true;
      return fresh;
    };

    for (const edge of edges) {
      const from = entities[edge.from];
      const to = entities[edge.to];

      if (!from || !to || !provenance.has(edge.from)) continue;

      if (
        edge.kind === "same_identity" &&
        strongIdentity.has(String(edge.status || "")) &&
        from.type === to.type &&
        from.type !== "video" &&
        from.type !== "artist"
      ) {
        retain(edge.to);
        continue;
      }

      if (
        edge.kind === "embodies" &&
        from.type === "video" &&
        ["recording", "track"].includes(to.type) &&
        observedProvenance.has(String(edge.status || ""))
      ) {
        retain(edge.to);
        continue;
      }

      if (
        ["recording", "track"].includes(from.type) &&
        releaseTypes.has(to.type) &&
        (
          (
            edge.kind === "appears_on" &&
            observedProvenance.has(String(edge.status || ""))
          ) ||
          (
            edge.kind === "candidate_edition" &&
            edge.status === "corroborated"
          )
        )
      ) {
        retain(edge.to);
        continue;
      }

      if (
        releaseTypes.has(from.type) &&
        to.type === "label" &&
        edge.kind === "issued_by" &&
        observedProvenance.has(String(edge.status || ""))
      ) {
        retain(edge.to);
      }
    }
  }

  let identityChanged = true;
  while (identityChanged) {
    identityChanged = false;

    for (const edge of edges) {
      if (
        edge.kind !== "same_identity" ||
        !strongIdentity.has(String(edge.status || ""))
      ) continue;

      if (keep.has(edge.from) && !keep.has(edge.to)) {
        keep.add(edge.to);
        identityChanged = true;
      }

      if (keep.has(edge.to) && !keep.has(edge.from)) {
        keep.add(edge.from);
        identityChanged = true;
      }
    }
  }

  const projectedEntities = Object.fromEntries(
    Object.entries(entities).filter(([id]) => keep.has(id))
  );

  const projectedEdges = Object.fromEntries(
    Object.entries(graph.edges || {}).filter(([, edge]) =>
      keep.has(edge.from) &&
      keep.has(edge.to)
    )
  );

  return {
    ...graph,
    entities: projectedEntities,
    edges: projectedEdges
  };
}


export function buildSeedCatalog(state = {}, library = [], collaborations = []) {
  const graph = augmentExplorationGraph(state, library, collaborations);
  const groups = { track: [], artist: [], label: [], playlist: [] };

  /*
   * Frontière de collection active :
   *
   * Le graphe serveur peut conserver des playlists historiquement observées,
   * même lorsqu'elles ne font plus partie de la bibliothèque actuellement
   * chargée dans ce navigateur.
   *
   * Elles restent dans le graphe pour la provenance et l'historique, mais ne
   * doivent pas réapparaître comme départs du picker.
   */
  const activePlaylistIds = new Set(
    library.flatMap((video) =>
      Array.isArray(video.playlistIds)
        ? video.playlistIds
        : []
    )
  );

  const degrees = {};

  for (const edge of Object.values(graph.edges || {})) {
    degrees[edge.from] = Number(degrees[edge.from] || 0) + 1;
    degrees[edge.to] = Number(degrees[edge.to] || 0) + 1;
  }

  const identity = seedIdentityClusters(graph);
  const seenClusters = new Set();

  for (const entity of Object.values(graph.entities || {})) {
    const type =
      entity.type === "video" || entity.type === "recording"
        ? "track"
        : entity.type;

    if (!groups[type]) continue;

    /*
     * Une playlist historique peut rester dans le graphe serveur sans être
     * actuellement présente dans la bibliothèque locale.
     *
     * Son identifiant de graphe est playlist:youtube:<playlistId>.
     */
    if (type === "playlist") {
      const playlistId =
        String(entity.id || "")
          .replace(/^playlist:youtube:/, "");

      if (
        !playlistId ||
        !activePlaylistIds.has(playlistId)
      ) {
        continue;
      }
    }

    /*
     * Une relation n'est pas, à elle seule, une preuve d'identité artiste.
     * Les hypothèses locales faibles et les noms issus d'un crédit local
     * restent dans le graphe mais ne deviennent pas automatiquement des
     * départs du picker.
     */
    if (
      type === "artist" &&
      ["local_hypothesis", "local_credit_identity"].includes(entity.status) &&
      entity.seedEligible !== true
    ) continue;

    const relationCount = Number(degrees[entity.id] || 0);
    if (!relationCount) continue;

    /*
     * Frontière du picker :
     *
     * Le graphe peut conserver des hypothèses, candidats de résolution,
     * placeholders locaux et autres observations faibles. Le picker, lui,
     * ne doit proposer que des points de départ suffisamment établis.
     *
     * Important : cette frontière ne fusionne jamais deux entités au nom.
     */
    if (type === "artist") {
      const memberEdges = Object.values(graph.edges || {}).filter(
        (edge) => edge.from === entity.id || edge.to === entity.id
      );

      const weakStatuses = new Set([
        "candidate",
        "unresolved",
        "local_hypothesis",
        "local_credit_identity",
        "inferred"
      ]);

      const strongStatuses = new Set([
        "observed",
        "resolved",
        "confirmed",
        "confirmed_user",
        "confirmed_cross_id",
        "local_supported"
      ]);

      const hasStructuredIdentity =
        Object.keys(entity.externalIds || {}).length > 0 ||
        /^(?:mbid:|artist:(?:musicbrainz|discogs):)/.test(entity.id);

      /*
       * Une same_identity n'est forte que si sa frontière de preuve l'est.
       * Une ancienne relation same_name/candidate reste visible dans le graphe
       * mais ne peut pas promouvoir une hypothèse au picker.
       */
      const hasStrongIdentityRelation = memberEdges.some((edge) =>
        (
          edge.kind === "same_identity" &&
          [
            "confirmed_cross_id",
            "confirmed_user",
            "corroborated"
          ].includes(String(edge.status || ""))
        ) ||
        (
          edge.kind !== "same_identity" &&
          strongStatuses.has(String(edge.status || "")) &&
          !["probable_artist"].includes(edge.kind)
        )
      );

      /*
       * Une entité explicitement marquée seedEligible a déjà franchi la
       * frontière de preuve en amont (par exemple un artiste explicitement
       * fourni par la bibliothèque).
       *
       * Sa relation vidéo → artiste reste techniquement un probable_artist,
       * mais ne doit donc pas être requalifiée ici comme "preuve faible".
       *
       * Les hypothèses locales non éligibles, candidats de recherche et
       * autres relations faibles continuent en revanche de subir ce filtre.
       */
      const onlyWeakCandidateEvidence =
        entity.seedEligible !== true &&
        memberEdges.length > 0 &&
        memberEdges.every((edge) =>
          edge.kind === "probable_artist" ||
          weakStatuses.has(String(edge.status || ""))
        );

      /*
       * Une identité structurée n'est pas suffisante si elle n'est ici
       * qu'un résultat candidat d'une recherche d'homonyme.
       *
       * Exemple : les Kosh Discogs concurrents doivent rester dans le
       * graphe mais ne pas devenir chacun un départ du picker.
       */
      const onlyCandidateProbableArtist =
        memberEdges.length > 0 &&
        memberEdges.every((edge) =>
          edge.kind === "probable_artist" &&
          ["candidate", "unresolved", "local_hypothesis", "inferred", ""]
            .includes(String(edge.status || ""))
        );

      if (
        onlyCandidateProbableArtist ||
        (
          !hasStructuredIdentity &&
          !hasStrongIdentityRelation &&
          onlyWeakCandidateEvidence
        )
      ) {
        continue;
      }
    }

    if (type === "label") {
      const label = entityLabel(entity).trim();

      /*
       * MusicBrainz utilise [no label] comme valeur technique : ce n'est
       * pas une maison de disques exploitable comme départ.
       */
      if (/^\[?no label\]?$/i.test(label)) continue;
    }

    const clusterId = identity.rootOf(entity.id);
    const dedupeKey = `${type}:${clusterId}`;

    if (seenClusters.has(dedupeKey)) {
      const existing = groups[type].find((seed) => seed.identityClusterId === clusterId);
      if (existing) {
        existing.relationCount += relationCount;
        existing.memberIds.push(entity.id);
      }
      continue;
    }

    seenClusters.add(dedupeKey);

    groups[type].push({
      id: entity.id,
      type,
      label: entityLabel(entity),
      sourceType: entity.type,
      url: entity.url || "",
      relationCount,
      identityClusterId: clusterId,
      memberIds: [entity.id]
    });
  }

  for (const values of Object.values(groups)) {
    values.sort(neutralSeedOrder);
  }

  return groups;
}

function adjacency(state) {
  const map = new Map();
  for (const edge of Object.values(state.edges || {})) {
    if (!state.entities?.[edge.from] || !state.entities?.[edge.to]) continue;
    if (!map.has(edge.from)) map.set(edge.from, []);
    if (!map.has(edge.to)) map.set(edge.to, []);
    map.get(edge.from).push({ entityId: edge.to, edge, orientation: "forward" });
    map.get(edge.to).push({ entityId: edge.from, edge, orientation: "reverse" });
  }
  return map;
}

function stableNoise(value) {
  let hash = 2166136261;
  for (const character of String(value)) { hash ^= character.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return (hash >>> 0) / 4294967295;
}

function pathSignature(candidate) {
  return `${candidate.target.id}:${candidate.steps.map(({ relation, to }) => `${relation}:${to.id}`).join("|")}`;
}

function copy(value) {
  return typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

import { catalogueCandidates } from "./catalogue-graph.mjs";

export function traceDirection(state = {}, seedId, direction, { depth = 3, excludeIds = [], rerollKey = "initial", limit = 12 } = {}) {
  // Front cards and catalogue cards must be proved by the same traversal.
  // In particular, playlists are permitted only as explicit starting seeds.
  const maximumEdges = Math.min(9, Math.max(1, Number(depth || 3)));
  const excluded = new Set(excludeIds || []);
  const results = catalogueCandidates(state, seedId, direction)
    .filter(item => !excluded.has(item.id) && item.path.length <= maximumEdges)
    .map(item => {
      const steps = item.path.map(step => ({ ...step, relationStatus: step.status || "observed" }));
      const candidate = {
        target: { id: item.id, type: item.type, label: item.title, url: item.sourceUrl || "" },
        steps, direction, motifAt: steps.findIndex(step => step.to.id === item.anchor.id)
      };
      candidate.signature = pathSignature(candidate);
      return candidate;
    });
  return results.sort((left, right) => {
    const depthDelta = left.steps.length - right.steps.length;
    const noiseDelta = stableNoise(`${right.signature}:${rerollKey}`) - stableNoise(`${left.signature}:${rerollKey}`);
    return depthDelta || noiseDelta || left.target.label.localeCompare(right.target.label, "fr");
  }).slice(0, limit);
}

export function seedCoverage(state = {}, seedId, directions = [], depth = 3) {
  const selected = [...new Set(directions)].filter((direction) => DIRECTION_DEFINITIONS[direction]);
  const targets = new Set();
  const byDirection = {};
  for (const direction of selected) {
    const candidates = traceDirection(state, seedId, direction, { depth, limit: 60 });
    byDirection[direction] = candidates.length;
    for (const candidate of candidates) targets.add(candidate.target.id);
  }
  return {
    documentedRelations: (adjacency(state).get(seedId) || []).length,
    practicableBranches: Object.values(byDirection).filter((count) => count > 0).length,
    reachableTargets: targets.size,
    byDirection
  };
}

function emptyBranchStatus(direction, coverage = {}) {
  const state = coverage?.[direction]?.state || "not_checked";
  if (state === "complete") return "exhausted";
  if (state === "unavailable") return "source_unavailable";
  if (state === "not_checked") return "unexplored";
  return "needs_enrichment";
}

export function createExplorationSession({ state = {}, seed, directions = [], depth = 3, coverage = {}, previous = null, now = new Date().toISOString(), rerollKey = "initial" } = {}) {
  const selectedDirections = [...new Set(directions)].filter((direction) => DIRECTION_DEFINITIONS[direction]);
  const branches = selectedDirections.map((direction) => {
    const prior = previous?.seed?.id === seed.id ? previous.branches?.find(branch => branch.direction === direction) : null;
    const candidates = traceDirection(state, seed.id, direction, { depth, rerollKey, excludeIds: prior?.exploredTargets || [] });
    const seen = new Set(prior?.seenSignatures || []);
    const current = candidates.find(candidate => candidate.signature === prior?.current?.signature) || candidates.find(candidate => !seen.has(candidate.signature)) || null;
    if (current) seen.add(current.signature);
    return {
      id: `${direction}:${normalized(seed.id)}`,
      direction,
      label: DIRECTION_DEFINITIONS[direction].label,
      status: prior && ["paused", "explored", "dismissed"].includes(prior.status) ? prior.status : current ? "active" : emptyBranchStatus(direction, coverage),
      current,
      candidates,
      seenSignatures: [...seen],
      exploredTargets: [...(prior?.exploredTargets || [])],
      updatedAt: now
    };
  });
  return {
    schemaVersion: 2,
    id: previous?.seed?.id === seed.id ? previous.id : globalThis.crypto?.randomUUID?.() || `${Date.now()}-${normalized(seed.id)}`,
    seed,
    directions: selectedDirections,
    depth: Math.min(9, Math.max(1, Number(depth || 3))),
    coverage,
    branches,
    frontier: summarizeDiscoveryFrontier(branches, { depth }),
    lineage: previous?.lineage || [],
    createdAt: previous?.seed?.id === seed.id ? previous.createdAt : now,
    updatedAt: now
  };
}

export function rerollExplorationBranch(session, branchId, now = new Date().toISOString(), { state = null, rerollKey = String(Date.now()) } = {}) {
  const next = copy(session);
  const branch = next.branches.find(({ id }) => id === branchId);
  if (!branch || branch.status === "dismissed") return next;
  const seen = new Set(branch.seenSignatures || []);
  if (state) {
    const valid = new Map(traceDirection(state, next.seed.id, branch.direction, { depth: next.depth, limit: 25000 }).map(item => [item.signature, item]));
    branch.candidates = (branch.candidates || []).filter(item => valid.has(item.signature)).map(item => valid.get(item.signature));
    const knownTargets = new Set((branch.candidates || []).map(({ target }) => target.id));
    const additional = traceDirection(state, next.seed.id, branch.direction, {
      depth: next.depth,
      excludeIds: [...knownTargets],
      rerollKey,
      limit: 12
    });
    branch.candidates = [...(branch.candidates || []), ...additional];
  }
  const candidate = (branch.candidates || []).find(({ signature }) => !seen.has(signature));
  if (!candidate) {
    branch.current = null;
    branch.status = emptyBranchStatus(branch.direction, next.coverage || {});
    branch.updatedAt = now;
    next.updatedAt = now;
    return next;
  }
  branch.current = candidate;
  branch.seenSignatures = [...seen, candidate.signature];
  branch.status = "active";
  branch.updatedAt = now;
  next.updatedAt = now;
  return next;
}

export function setExplorationBranchStatus(session, branchId, status, now = new Date().toISOString()) {
  const allowed = new Set(["active", "paused", "explored", "dismissed", "unexplored", "needs_enrichment", "source_unavailable", "exhausted"]);
  const next = copy(session);
  const branch = next.branches.find(({ id }) => id === branchId);
  if (!branch || !allowed.has(status)) return next;
  branch.status = status;
  if (status === "explored" && branch.current?.target?.id && !branch.exploredTargets.includes(branch.current.target.id)) branch.exploredTargets.push(branch.current.target.id);
  branch.updatedAt = now;
  next.updatedAt = now;
  return next;
}

export function continueFromBranch({ state, session, branchId, now = new Date().toISOString(), rerollKey = "continuation" } = {}) {
  const branch = session?.branches?.find(({ id }) => id === branchId);
  if (!branch?.current?.target) return session;
  const lineageStep = {
    fromSeed: session.seed,
    direction: branch.direction,
    path: branch.current.steps,
    chosen: branch.current.target,
    at: now
  };
  const next = createExplorationSession({ state, seed: branch.current.target, directions: session.directions, depth: session.depth, now, rerollKey });
  next.lineage = [...(session.lineage || []), lineageStep].slice(-20);
  return next;
}
