import {
  decideMultiSourceIdentity
} from "./multisource-decision.mjs";

function clean(value = "") {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/\s+/gu, " ")
    .trim();
}

function normalizePacket(
  source,
  packet
) {
  return {
    source: clean(
      packet?.source ||
      source.id
    ),
    observations:
      Array.isArray(packet?.observations)
        ? packet.observations
        : [],
    candidates:
      Array.isArray(packet?.candidates)
        ? packet.candidates
        : [],
    diagnostics:
      packet?.diagnostics || {},
    ok:
      packet?.ok !== false,
    error:
      packet?.error || null
  };
}

export async function resolveWithSources({
  input,
  registry,
  expectedArtists = [],
  competingArtists = [],
  context = {},
  stop = {}
} = {}) {
  if (!registry || typeof registry.list !== "function") {
    throw new TypeError(
      "registry with list() is required"
    );
  }

  const packets = [];
  const sourceRuns = [];

  const policy = {
    minimumIndependentSources:
      stop.minimumIndependentSources ?? 2,
    strongSingleSourceThreshold:
      stop.strongSingleSourceThreshold ?? 0.97,
    allowEarlyAccepted:
      stop.allowEarlyAccepted !== false
  };

  let decision =
    decideMultiSourceIdentity({
      expectedArtists,
      competingArtists,
      evidencePackets: packets,
      ...policy
    });

  for (const source of registry.list()) {
    const startedAt =
      Date.now();

    try {
      const packet =
        normalizePacket(
          source,
          await source.resolve({
            input,
            context,
            evidencePackets: packets,
            expectedArtists,
            competingArtists
          })
        );

      packets.push(packet);

      sourceRuns.push({
        source: source.id,
        ok: packet.ok,
        durationMs:
          Date.now() - startedAt,
        error:
          packet.error
      });
    } catch (error) {
      const packet = {
        source: source.id,
        observations: [],
        candidates: [],
        diagnostics: {},
        ok: false,
        error:
          String(
            error?.message ||
            error
          )
      };

      packets.push(packet);

      sourceRuns.push({
        source: source.id,
        ok: false,
        durationMs:
          Date.now() - startedAt,
        error:
          packet.error
      });
    }

    decision =
      decideMultiSourceIdentity({
        expectedArtists,
        competingArtists,
        evidencePackets: packets,
        ...policy
      });

    if (
      policy.allowEarlyAccepted &&
      decision.decision === "accepted"
    ) {
      break;
    }
  }

  return {
    mode: "multi_source",
    mutation: false,
    decision,
    evidencePackets: packets,
    sourceRuns
  };
}
