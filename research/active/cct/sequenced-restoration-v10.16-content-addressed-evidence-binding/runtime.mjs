import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { assessEvidenceRootTransport } from "../sequenced-restoration-v10.15-evidence-root-transport/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));
const hash = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;

export function assessContentAddressedEvidenceBinding(args) {
  const prior = assessEvidenceRootTransport(args);
  if (prior.status !== "evidence_root_transport_candidate") return prior;
  const bindingAudits = args.evidenceRootManifest.map((entry) => {
    const content = args.evidenceArtifactContents?.[entry.sourceId];
    if (!content) return { sourceId: entry.sourceId, failures: ["missing_evidence_artifact_content"] };
    const failures = [];
    SPEC.contentFields.forEach((field, index) => {
      if (typeof content[field] !== "string") failures.push(`missing_content_${field}`);
      else if (entry.contentHashes?.[field] !== hash(content[field])) failures.push(`content_hash_mismatch_${SPEC.manifestHashFields[index]}`);
    });
    if (entry.artifactHash !== hash(JSON.stringify(content))) failures.push("artifact_bundle_hash_mismatch");
    return { sourceId: entry.sourceId, failures };
  });
  const allContentsBound = bindingAudits.every((entry) => entry.failures.length === 0);
  if (!allContentsBound) return { status: "not_established", failures: ["evidence_content_binding_failed"], bindingAudits };
  return {
    ...prior,
    status: SPEC.successStatus,
    evidenceLevel: "recomputed_sha256_content_binding",
    bindingAudits,
    allContentsBound,
    authenticityEstablished: false,
    notEstablished: SPEC.notEstablished,
  };
}
