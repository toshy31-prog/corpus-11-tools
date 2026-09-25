import test from "node:test";
import assert from "node:assert/strict";

import {
  fetchYouTubeOEmbed
} from "../lib/remote-youtube-evidence.mjs";

test(
  "une absence d'identifiant est refusée sans réseau",
  async () => {
    const result =
      await fetchYouTubeOEmbed("");

    assert.equal(
      result.ok,
      false
    );

    assert.equal(
      result.diagnostics.reason,
      "missing_video_id"
    );
  }
);
