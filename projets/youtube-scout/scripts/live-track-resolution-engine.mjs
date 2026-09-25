import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildTrackSearchProjection
} from "../lib/track-search-projection.mjs";

import {
  adaptMusicBrainzResponse
} from "../lib/track-candidate-adapters.mjs";

import {
  adaptDiscogsReleaseTracks
} from "../lib/discogs-track-candidates.mjs";

import {
  textSimilarity
} from "../lib/track-candidate-score.mjs";

import {
  decideTrackCandidate
} from "../lib/track-candidate-score.mjs";

import {
  namesAreNonCompeting,
  summarizeExternalIdentitySupport,
  enforceKnownIdentityCorroboration
} from "../lib/evidence-algebra.mjs";

const ROOT = path.resolve(".");
const OUTPUT_DIR =
  path.join(ROOT, "validation-0.14");

const DISCOGS_TOKEN_FILE =
  path.join(ROOT, ".data", "discogs-token");

const USER_AGENT =
  "youtube-scout/0.14 read-only-resolution-audit";

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

function clean(value = "") {
  if (value == null) return "";

  return String(value)
    .normalize("NFKC")
    .replace(/\s+/gu, " ")
    .trim();
}

function uniqueBy(values, keyFn) {
  const seen = new Set();
  const result = [];

  for (const value of values) {
    const key = keyFn(value);

    if (!key || seen.has(key)) continue;

    seen.add(key);
    result.push(value);
  }

  return result;
}

export async function readDiscogsToken() {
  try {
    const raw = clean(
      await fs.readFile(
        DISCOGS_TOKEN_FILE,
        "utf8"
      )
    );

    /*
     * Supporte :
     *   token-brut
     *
     * ou un petit JSON éventuel :
     *   {"token":"..."}
     */
    if (raw.startsWith("{")) {
      const parsed = JSON.parse(raw);

      return clean(
        parsed.token ||
        parsed.accessToken ||
        parsed.access_token
      );
    }

    return raw;
  } catch {
    return "";
  }
}

async function fetchJson(
  url,
  {
    headers = {},
    timeoutMs = 15000,
    attempts = 3
  } = {}
) {
  let last = null;

  for (
    let attempt = 1;
    attempt <= attempts;
    attempt++
  ) {
    const controller =
      new AbortController();

    const timeout =
      setTimeout(
        () => controller.abort(),
        timeoutMs
      );

    try {
      const response =
        await fetch(url, {
          method: "GET",
          headers: {
            accept:
              "application/json",
            ...headers
          },
          signal:
            controller.signal
        });

      const text =
        await response.text();

      let body = null;

      try {
        body = text
          ? JSON.parse(text)
          : null;
      } catch {
        body = {
          parseError: true,
          text:
            text.slice(0, 500)
        };
      }

      last = {
        ok: response.ok,
        status:
          response.status,
        body,
        attemptsUsed:
          attempt
      };

      if (response.ok) {
        return last;
      }

      const retryable =
        [
          429,
          502,
          503,
          504
        ].includes(
          response.status
        );

      if (
        !retryable ||
        attempt >= attempts
      ) {
        return last;
      }

      const retryAfter =
        Number(
          response.headers.get(
            "retry-after"
          )
        );

      const delay =
        Number.isFinite(
          retryAfter
        ) &&
        retryAfter > 0
          ? retryAfter * 1000
          : 1200 * attempt;

      await sleep(delay);
    } catch (error) {
      last = {
        ok: false,
        status: 0,
        error:
          error?.name ===
          "AbortError"
            ? "timeout"
            : String(
                error?.message ||
                error
              ),
        attemptsUsed:
          attempt
      };

      if (attempt >= attempts) {
        return last;
      }

      await sleep(
        1200 * attempt
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  return last;
}

function mbEscape(value = "") {
  return clean(value)
    .replace(/\\/gu, "\\\\")
    .replace(/"/gu, '\\"');
}

async function searchMusicBrainz({
  artist,
  title
}) {
  const clauses = [];

  if (title) {
    clauses.push(
      `recording:"${mbEscape(title)}"`
    );
  }

  if (artist) {
    clauses.push(
      `artist:"${mbEscape(artist)}"`
    );
  }

  const query =
    clauses.join(" AND ");

  const url =
    new URL(
      "https://musicbrainz.org/ws/2/recording/"
    );

  url.searchParams.set(
    "query",
    query
  );

  url.searchParams.set(
    "fmt",
    "json"
  );

  url.searchParams.set(
    "limit",
    "10"
  );

  const result =
    await fetchJson(
      url.toString(),
      {
        headers: {
          "user-agent": USER_AGENT
        }
      }
    );

  /*
   * MusicBrainz demande une utilisation raisonnable.
   * Audit volontairement lent.
   */
  await sleep(1100);

  return {
    provider: "musicbrainz",
    query: {
      artist,
      title
    },
    url:
      url.toString()
        .replace(
          /([?&])query=[^&]+/u,
          "$1query=<redacted>"
        ),
    ...result
  };
}


const discogsReleaseCache =
  new Map();

async function fetchDiscogsRelease(
  releaseId,
  token
) {
  const key =
    String(releaseId);

  if (
    discogsReleaseCache.has(key)
  ) {
    return discogsReleaseCache.get(
      key
    );
  }

  const url =
    `https://api.discogs.com/releases/${encodeURIComponent(key)}`;

  const promise =
    fetchJson(
      url,
      {
        headers: {
          "user-agent":
            USER_AGENT,
          authorization:
            `Discogs token=${token}`
        }
      }
    );

  discogsReleaseCache.set(
    key,
    promise
  );

  const result =
    await promise;

  await sleep(350);

  return result;
}

async function searchDiscogs({
  artist,
  title,
  catalogueCode,
  token
}) {
  if (!token) {
    return {
      provider: "discogs",
      skipped: true,
      reason:
        "discogs_token_not_available",
      query: {
        artist,
        title,
        catalogueCode
      }
    };
  }

  const url =
    new URL(
      "https://api.discogs.com/database/search"
    );

  url.searchParams.set(
    "type",
    "release"
  );

  url.searchParams.set(
    "per_page",
    "10"
  );

  if (artist) {
    url.searchParams.set(
      "artist",
      artist
    );
  }

  if (title) {
    url.searchParams.set(
      "track",
      title
    );
  }

  if (catalogueCode) {
    url.searchParams.set(
      "catno",
      catalogueCode
    );
  }

  const result =
    await fetchJson(
      url.toString(),
      {
        headers: {
          "user-agent": USER_AGENT,
          authorization:
            `Discogs token=${token}`
        }
      }
    );

  await sleep(350);

  return {
    provider: "discogs",
    query: {
      artist,
      title,
      catalogueCode
    },

    /*
     * Ne jamais écrire token ou Authorization
     * dans le rapport.
     */
    url: (() => {
      const safe =
        new URL(url);

      return safe.toString();
    })(),

    ...result
  };
}

const CASES = [
  {
    id: "ignition-key",
    raw: {
      title:
        "Ignition Key (Original Mix)",
      channelTitle:
        "Kei Hayakawa - Topic",
      description: `
Ignition Key (Original Mix) · Ken Hayakawa
Artist: Ken Hayakawa
Auto-generated by YouTube.
`
    }
  },

  {
    id: "metal-works",
    raw: {
      title:
        "Metal Works (Original Mix)",
      channelTitle:
        "POLI - Topic",
      description: `
Metal Works (Original Mix) · PØLI
Auto-generated by YouTube.
`
    }
  },

  {
    id: "disco-science",
    raw: {
      title: "Disco Science",
      channelTitle:
        "David Gravell - Topic",
      description: `
Disco Science · Mirwais
Composer: Mirwais Ahmadzai
Composer: Kim Deal
Auto-generated by YouTube.
`
    }
  },

  {
    id: "medusa",
    raw: {
      title: "Medusa",
      channelTitle:
        "Kaiser (K S R) - Topic",
      description: `
Medusa · Kaiser (Italy)
Composer: Kaiser (Italy)
Music Publisher: n/a
Auto-generated by YouTube.
`
    }
  }
];

function competingArtistsFromProjection(
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


function searchArtistVariantsFromProjection(
  projection
) {
  const values = [];

  for (
    const issue of
    projection.interpreted
      .issues || []
  ) {
    if (
      issue.type ===
        "orthographic_variant" ||
      issue.type ===
        "credit_name_variant"
    ) {
      for (
        const value of
        issue.candidates || []
      ) {
        values.push(value);
      }
    }
  }

  return uniqueBy(
    values.filter(Boolean),
    (value) =>
      clean(value)
        .toLocaleLowerCase()
  );
}

function scorerExpected(
  projection
) {
  return {
    artists:
      (
        projection.interpreted
          .preferredArtists || []
      )
        .map(({ name }) => name),

    competingArtists:
      competingArtistsFromProjection(
        projection
      ),

    identityStatus:
      projection.interpreted
        .identityStatus,

    title:
      projection.interpreted.title,

    version:
      projection.interpreted.version,

    catalogueCode:
      projection.interpreted
        .catalogueCode,

    durationMs:
      projection.interpreted
        .durationMs || null
  };
}

function queryKey(query) {
  return [
    clean(query.artist)
      .toLocaleLowerCase(),
    clean(query.title)
      .toLocaleLowerCase(),
    clean(query.catalogueCode)
      .toLocaleLowerCase()
  ].join("::");
}

function selectLiveQueries(
  projection,
  limit = 8
) {
  const interpreted =
    projection.interpreted;

  const competing =
    competingArtistsFromProjection(
      projection
    );

  const searchVariants =
    searchArtistVariantsFromProjection(
      projection
    );

  const preferred =
    (
      interpreted.preferredArtists || []
    ).map(({ name }) => name);

  const baseTitle =
    interpreted.title;

  const version =
    interpreted.version;

  const catalogueCode =
    interpreted.catalogueCode || "";

  const explicit = [];

  /*
   * 1. Toutes les projections déjà construites.
   */
  for (const query of projection.queries) {
    if (!query.artist || !query.title) {
      continue;
    }

    explicit.push(query);
  }

  /*
   * 2. Hypothèses rivales : elles doivent être interrogées
   *    symétriquement.
   */
  for (const artist of competing) {
    explicit.push({
      kind: "competing_identity_exact",
      artist,
      title: baseTitle,
      version: version || "",
      catalogueCode,
      weight: 0.90,
      transformations: [
        "query_known_competing_identity"
      ],
      basis: [
        "known_identity_disagreement"
      ]
    });

    if (version) {
      explicit.push({
        kind: "competing_identity_version",
        artist,
        title: `${baseTitle} ${version}`,
        version,
        catalogueCode,
        weight: 0.84,
        transformations: [
          "query_known_competing_identity",
          "append_version"
        ],
        basis: [
          "known_identity_disagreement"
        ]
      });
    }
  }

  /*
   * 2b. Variantes orthographiques/crédit.
   *     Elles élargissent la recherche mais ne créent
   *     aucune identité concurrente.
   */
  for (const artist of searchVariants) {
    explicit.push({
      kind: "artist_variant_exact",
      artist,
      title: baseTitle,
      version: version || "",
      catalogueCode,
      weight: 0.88,
      transformations: [
        "query_known_artist_variant"
      ],
      basis: [
        "orthographic_or_credit_variant"
      ]
    });
  }

  /*
   * 3. Fallback titre seul.
   *    Il sert à découvrir une graphie d'artiste inconnue,
   *    mais reste derrière les requêtes structurées.
   */
  if (baseTitle) {
    explicit.push({
      kind: "live_title_fallback",
      artist: "",
      title: baseTitle,
      version: version || "",
      catalogueCode,
      weight: 0.50,
      transformations: [
        "drop_artist_constraint_for_live_audit"
      ],
      basis: [
        "live_audit_fallback"
      ]
    });
  }

  return uniqueBy(
    explicit.sort(
      (a, b) =>
        (b.weight || 0) -
        (a.weight || 0)
    ),
    queryKey
  ).slice(0, limit);
}


function identityHypothesisKey(
  candidate = {}
) {
  const artistKey =
    (candidate.artists || [])
      .map((name) =>
        clean(name)
          .normalize("NFKD")
          .replace(
            /[\u0300-\u036f]/gu,
            ""
          )
          .toLocaleLowerCase()
          .replace(
            /[^\p{L}\p{N}]+/gu,
            " "
          )
          .trim()
      )
      .sort()
      .join("|");

  const titleKey =
    clean(candidate.title)
      .normalize("NFKD")
      .replace(
        /[\u0300-\u036f]/gu,
        ""
      )
      .toLocaleLowerCase()
      .replace(
        /[^\p{L}\p{N}]+/gu,
        " "
      )
      .trim();

  return [
    artistKey,
    titleKey
  ].join("::");
}

function versionHypothesisKey(
  candidate = {}
) {
  const versionKey =
    clean(candidate.version)
      .normalize("NFKD")
      .replace(
        /[\u0300-\u036f]/gu,
        ""
      )
      .toLocaleLowerCase()
      .replace(
        /[^\p{L}\p{N}]+/gu,
        " "
      )
      .trim();

  return [
    identityHypothesisKey(
      candidate
    ),
    versionKey
  ].join("::");
}

function clusterEquivalentCandidates(
  candidates = []
) {
  const clusters = new Map();

  for (const candidate of candidates) {
    const key =
      identityHypothesisKey(
        candidate
      );

    if (!clusters.has(key)) {
      clusters.set(key, []);
    }

    clusters.get(key).push(candidate);
  }

  return [...clusters.values()];
}

async function normalizeProviderCandidates(
  searches,
  {
    discogsToken,
    expectedTitle
  }
) {
  const candidates = [];

  /*
   * MusicBrainz fournit déjà des recordings :
   * directement scorables.
   */
  for (const search of searches) {
    if (
      search.provider !==
        "musicbrainz" ||
      !search.ok ||
      !search.body
    ) {
      continue;
    }

    candidates.push(
      ...adaptMusicBrainzResponse(
        search.body
      )
    );
  }

  /*
   * Discogs database/search renvoie des RELEASES.
   *
   * On n'utilise donc jamais search.results[].title
   * comme titre de piste.
   *
   * Les résultats servent uniquement à trouver
   * des IDs de releases, puis on hydrate la tracklist.
   */
  const discogsSearches =
    searches.filter(
      (search) =>
        search.provider ===
          "discogs" &&
        search.ok &&
        search.body &&
        Array.isArray(
          search.body.results
        )
    );

  const releaseIds =
    uniqueBy(
      discogsSearches.flatMap(
        (search) =>
          search.body.results
            .slice(0, 4)
            .map((result) => ({
              id:
                result.id,
              query:
                search.query
            }))
            .filter(({ id }) =>
              id != null
            )
      ),
      ({ id }) =>
        String(id)
    );

  for (
    const { id } of
    releaseIds
  ) {
    const hydrated =
      await fetchDiscogsRelease(
        id,
        discogsToken
      );

    if (
      !hydrated?.ok ||
      !hydrated.body
    ) {
      continue;
    }

    const tracks =
      adaptDiscogsReleaseTracks(
        hydrated.body
      );

    /*
     * Le search Discogs a pu retrouver une release
     * grâce à son index de tracks.
     *
     * Après hydratation, on ne garde que les vraies pistes
     * raisonnablement proches du titre attendu.
     */
    for (const track of tracks) {
      const similarity =
        textSimilarity(
          expectedTitle,
          track.title
        );

      if (similarity < 0.70) {
        continue;
      }

      candidates.push({
        ...track,

        evidence: {
          ...track.evidence,
          retrievalTitleSimilarity:
            Number(
              similarity.toFixed(4)
            )
        }
      });
    }
  }

  /*
   * Pas de fusion inter-source.
   * Seulement suppression des duplications dues
   * à plusieurs requêtes vers le même provider.
   */
  return uniqueBy(
    candidates,
    (candidate) =>
      [
        candidate.source,
        candidate.sourceId,
        clean(candidate.title)
          .toLocaleLowerCase(),
        (
          candidate.artists ||
          []
        )
          .join("|")
          .toLocaleLowerCase()
      ].join("::")
  );
}


function normalizedName(value = "") {
  return clean(value)
    .normalize("NFKD")
    .replace(
      /[\u0300-\u036f]/gu,
      ""
    )
    .toLocaleLowerCase()
    .replace(
      /[^\p{L}\p{N}]+/gu,
      " "
    )
    .trim();
}

function externalSupportSummary(
  candidates,
  expected
) {
  return summarizeExternalIdentitySupport({
    candidates,
    expectedArtists:
      expected.artists || [],
    competingArtists:
      expected.competingArtists || [],
    expectedTitle:
      expected.title || "",
    normalizeName:
      normalizedName,
    similarity:
      textSimilarity,
    minimumArtistSimilarity:
      0.92,
    minimumTitleSimilarity:
      0.92
  });
}


function applyLiveEvidenceGate({
  decision,
  candidates,
  expected
}) {
  const support =
    externalSupportSummary(
      candidates,
      expected
    );

  return enforceKnownIdentityCorroboration({
    decision,
    support,
    preferredArtists:
      expected.artists || [],
    competingArtists:
      expected.competingArtists || [],
    minimumIndependentSources: 2
  });
}


export async function auditCase(
  testCase,
  discogsToken
) {
  console.log("");
  console.log(
    `===== ${testCase.id} =====`
  );

  const projection =
    testCase.projection ||
    buildTrackSearchProjection(
      testCase.raw
    );

  const liveQueries =
    selectLiveQueries(
      projection
    );

  console.log(
    `queries: ${liveQueries.length}`
  );

  const searches = [];

  for (const query of liveQueries) {
    console.log(
      `  MB: ${query.artist} — ${query.title}`
    );

    searches.push(
      await searchMusicBrainz({
        artist: query.artist,
        title: query.title
      })
    );

    console.log(
      `  Discogs: ${query.artist} — ${query.title}`
    );

    searches.push(
      await searchDiscogs({
        artist: query.artist,
        title: query.title,
        catalogueCode:
          query.catalogueCode,
        token: discogsToken
      })
    );
  }

  const candidates =
    await normalizeProviderCandidates(
      searches,
      {
        discogsToken,
        expectedTitle:
          projection.interpreted.title
      }
    );

  const expected =
    scorerExpected(projection);

  /*
   * Plusieurs recordings/releases peuvent représenter
   * exactement la même hypothèse artistique.
   *
   * Pour la décision, on garde le meilleur représentant
   * de chaque cluster. Les autres restent dans le rapport.
   */
  const clusters =
    clusterEquivalentCandidates(
      candidates
    );

  const representatives =
    clusters.map((cluster) => {
      const ranked =
        decideTrackCandidate(
          expected,
          cluster,
          {
            thresholds: {
              autoAcceptScore: 2,
              suggestedScore: 0
            }
          }
        ).ranked;

      return ranked[0]?.candidate;
    }).filter(Boolean);

  let decision =
    decideTrackCandidate(
      expected,
      representatives
    );

  decision =
    applyLiveEvidenceGate({
      decision,
      candidates,
      expected
    });

  console.log(
    `candidates: ${candidates.length}`
  );

  console.log(
    `decision: ${decision.decision}`
  );

  console.log(
    `reason: ${decision.reason}`
  );

  if (decision.best) {
    console.log(
      `best: ${decision.best.candidate.source}:${decision.best.candidate.sourceId} score=${decision.best.score}`
    );
  }

  if (decision.second) {
    console.log(
      `second: ${decision.second.candidate.source}:${decision.second.candidate.sourceId} score=${decision.second.score}`
    );
  }

  console.log(
    `gap: ${decision.gap}`
  );

  return {
    id: testCase.id,

    raw:
      testCase.raw,

    projection: {
      interpreted:
        projection.interpreted,

      competingArtists:
        expected.competingArtists,

      selectedQueries:
        liveQueries
    },

    providerSearches:
      searches.map(
        ({
          provider,
          query,
          ok,
          skipped,
          reason,
          status,
          error
        }) => ({
          provider,
          query,
          ok:
            Boolean(ok),
          skipped:
            Boolean(skipped),
          reason:
            reason || null,
          status:
            status || null,
          error:
            error || null
        })
      ),

    candidates:
      candidates.map(
        ({
          raw,
          ...candidate
        }) => candidate
      ),

    hypothesisClusters:
      clusters.map((cluster) => ({
        key:
          identityHypothesisKey(
            cluster[0]
          ),

        versions:
          uniqueBy(
            cluster.map(
              (candidate) =>
                versionHypothesisKey(
                  candidate
                )
            ),
            (value) => value
          ),

        members:
          cluster.map(
            ({
              source,
              sourceId,
              artists,
              title,
              version,
              durationMs
            }) => ({
              source,
              sourceId,
              artists,
              title,
              version,
              durationMs
            })
          )
      })),

    decision: {
      decision:
        decision.decision,

      reason:
        decision.reason,

      gap:
        decision.gap,

      knownAlternatives:
        decision.knownAlternatives ||
        [],

      evidenceGate:
        decision.evidenceGate ||
        null,

      ranked:
        decision.ranked
          .slice(0, 15)
          .map(
            ({
              candidate,
              score,
              rawScore,
              components,
              penalties
            }) => ({
              source:
                candidate.source,

              sourceId:
                candidate.sourceId,

              artists:
                candidate.artists,

              title:
                candidate.title,

              version:
                candidate.version,

              catalogueCode:
                candidate.catalogueCode,

              durationMs:
                candidate.durationMs,

              score,
              rawScore,
              components,
              penalties
            })
          )
    }
  };
}
