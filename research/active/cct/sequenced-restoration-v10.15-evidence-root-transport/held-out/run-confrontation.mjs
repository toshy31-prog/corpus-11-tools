import assert from "node:assert/strict";
import { assessEvidenceRootTransport } from "../runtime.mjs";
import { fullSetup, independentManifest } from "../fixtures.mjs";

const manifest = independentManifest();
manifest[4].outcomeHash = "sha256:similar-name-different-measure";
const result = assessEvidenceRootTransport(fullSetup({ evidenceRootManifest: manifest, requestedTransportStatus: "evidence_justified_transport" }));
assert.deepEqual(result.failures, ["dependent_or_untransportable_effect_evidence"]);
assert.ok(result.entryAudits[4].failures.includes("outcome_transport_mismatch"));
console.log(JSON.stringify({ ok: true, failure: result.failures[0], transportFailure: result.entryAudits[4].failures[0] }));
