import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  enforceKnownIdentityCorroboration
} from "../lib/evidence-algebra.mjs";

test(
  "une contradiction connue avec une seule famille rétrograde auto_accept en ambiguous",
  () => {
    const out =
      enforceKnownIdentityCorroboration({
        decision: {
          decision: "auto_accept",
          reason: "high_score_and_clear_gap"
        },
        support: [
          {
            artist: "DA Uzi",
            sourceFamilies: [
              "musicbrainz"
            ],
            independentSources: 1
          }
        ],
        preferredArtists: ["DA Uzi"],
        competingArtists: ["DA"],
        minimumIndependentSources: 2
      });

    assert.equal(
      out.decision,
      "ambiguous"
    );

    assert.equal(
      out.reason,
      "known_identity_disagreement_requires_corroboration"
    );

    assert.equal(
      out.evidenceGate
        .observedIndependentSources,
      1
    );
  }
);

test(
  "deux familles indépendantes conservent auto_accept malgré un concurrent connu",
  () => {
    const out =
      enforceKnownIdentityCorroboration({
        decision: {
          decision: "auto_accept",
          reason: "high_score_and_clear_gap"
        },
        support: [
          {
            artist: "DA Uzi",
            sourceFamilies: [
              "musicbrainz",
              "discogs"
            ],
            independentSources: 2
          }
        ],
        preferredArtists: ["DA Uzi"],
        competingArtists: ["DA"],
        minimumIndependentSources: 2
      });

    assert.equal(
      out.decision,
      "auto_accept"
    );

    assert.equal(
      out.evidenceGate
        .observedIndependentSources,
      2
    );
  }
);

test(
  "sans concurrent connu la décision n'est pas durcie",
  () => {
    const out =
      enforceKnownIdentityCorroboration({
        decision: {
          decision: "auto_accept",
          reason: "high_score_and_clear_gap"
        },
        support: [
          {
            artist: "A",
            sourceFamilies: [
              "musicbrainz"
            ],
            independentSources: 1
          }
        ],
        preferredArtists: ["A"],
        competingArtists: []
      });

    assert.equal(
      out.decision,
      "auto_accept"
    );
  }
);

test(
  "l'absence de support rival ne devient jamais une preuve négative",
  () => {
    const out =
      enforceKnownIdentityCorroboration({
        decision: {
          decision: "auto_accept"
        },
        support: [
          {
            artist: "A",
            sourceFamilies: [
              "musicbrainz"
            ],
            independentSources: 1
          },
          {
            artist: "B",
            sourceFamilies: [],
            independentSources: 0,
            candidates: []
          }
        ],
        preferredArtists: ["A"],
        competingArtists: ["B"]
      });

    assert.equal(
      out.decision,
      "ambiguous"
    );
  }
);

test(
  "le live gate délègue la politique à l'algèbre",
  () => {
    const source =
      fs.readFileSync(
        new URL(
          "../scripts/live-track-resolution-engine.mjs",
          import.meta.url
        ),
        "utf8"
      );

    assert.equal(
      source.includes(
        "enforceKnownIdentityCorroboration({"
      ),
      true
    );

    assert.equal(
      source.includes(
        "preferredSources.length < 2"
      ),
      false
    );

    assert.equal(
      source.includes(
        "function applyLiveEvidenceGate("
      ),
      true
    );
  }
);
