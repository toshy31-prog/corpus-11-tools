import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  decideIdentityFromSupport,
  decideRankedResolutionFromEvidence
} from "../lib/evidence-algebra.mjs";

import {
  decideMultiSourceIdentity
} from "../lib/multisource-decision.mjs";

import {
  decideFromResolutionEvidence
} from "../lib/resolution-evidence.mjs";

test("deux sources indépendantes acceptent l'identité préférée", () => {
  const out = decideIdentityFromSupport({
    support: [{ artist: "A", independentSources: 2, strongest: 1 }],
    preferredArtists: ["A"]
  });
  assert.equal(out.decision, "accepted");
});

test("une identité préférée mono-source avec concurrent reste ambiguë", () => {
  const out = decideIdentityFromSupport({
    support: [{ artist: "A", independentSources: 1, strongest: 1 }],
    preferredArtists: ["A"],
    competingArtists: ["B"]
  });
  assert.equal(out.decision, "ambiguous");
});

test("la décision ranked conserve la règle de corroboration connue", () => {
  const out = decideRankedResolutionFromEvidence({
    evidence: {
      summary: {
        hasKnownContradiction: true,
        preferredIndependentSources: 1,
        competingIndependentSources: 0
      }
    },
    ranking: { best: { score: 1 }, gap: 1 }
  });
  assert.equal(out.decision, "ambiguous");
  assert.equal(out.reason, "known_identity_disagreement_requires_corroboration");
});

test("les wrappers publics délèguent sans changer leurs signatures", () => {
  const multi = decideMultiSourceIdentity({
    expectedArtists: ["A"],
    evidencePackets: [
      { source: "youtube", observations: [{ kind: "artist", value: "A", strength: 1 }] },
      { source: "musicbrainz", observations: [{ kind: "artist", value: "A", strength: 1 }] }
    ]
  });
  assert.equal(multi.decision, "accepted");

  const ranked = decideFromResolutionEvidence({
    evidence: {
      summary: {
        hasKnownContradiction: false,
        preferredIndependentSources: 2,
        competingIndependentSources: 0
      }
    },
    ranking: { best: { score: 0.95 }, gap: 0.2 }
  });
  assert.equal(ranked.decision, "auto_accept");
});

test("les anciens arbres de décision locaux ont disparu", () => {
  const multi = fs.readFileSync(new URL("../lib/multisource-decision.mjs", import.meta.url), "utf8");
  const resolution = fs.readFileSync(new URL("../lib/resolution-evidence.mjs", import.meta.url), "utf8");

  assert.equal(multi.includes('"multiple_supported_identities"'), false);
  assert.equal(resolution.includes("best.score < 0.55"), false);
  assert.equal(multi.includes("decideIdentityFromSupport({"), true);
  assert.equal(resolution.includes("decideRankedResolutionFromEvidence({"), true);
});
