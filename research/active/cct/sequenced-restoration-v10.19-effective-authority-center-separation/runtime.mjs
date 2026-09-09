import { readFileSync } from "node:fs";
import { assessRevocableWitnessAuthorityRegistry } from "../sequenced-restoration-v10.18-revocable-witness-authority-registry/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));

export function assessEffectiveAuthorityCenterSeparation(args) {
  const prior = assessRevocableWitnessAuthorityRegistry(args);
  if (prior.status !== "revocable_witness_authority_registry_candidate") return prior;
  const expectedDomains = [...new Set(args.witnessAuthorityRegistry.map((entry) => entry.authorityDomain))];
  const profiles = args.authorityControlProfiles ?? [];
  if (JSON.stringify(profiles.map((item) => item.authorityDomain)) !== JSON.stringify(expectedDomains)) return { status: "not_established", failures: ["authority_control_profile_mismatch"] };
  const missing = profiles.flatMap((profile) => SPEC.controlDimensions.filter((field) => !profile[field]).map((field) => `${profile.authorityDomain}:missing_${field}`));
  if (missing.length) return { status: "not_established", failures: ["authority_control_lineage_unknown"], details: missing };

  const parent = profiles.map((_, index) => index);
  const find = (x) => parent[x] === x ? x : (parent[x] = find(parent[x]));
  const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent[rb] = ra; };
  const sharedControls = [];
  for (let i = 0; i < profiles.length; i++) for (let j = i + 1; j < profiles.length; j++) {
    const shared = SPEC.controlDimensions.filter((field) => profiles[i][field] === profiles[j][field]);
    if (shared.length) { union(i, j); sharedControls.push({ domains: [profiles[i].authorityDomain, profiles[j].authorityDomain], dimensions: shared }); }
  }
  const effectiveCenters = new Set(profiles.map((_, index) => find(index))).size;
  if (effectiveCenters < SPEC.minimumEffectiveCenters) return { status: "not_established", failures: ["nominal_domains_share_effective_control_center"], effectiveCenters, sharedControls };
  return {
    ...prior,
    status: SPEC.successStatus,
    evidenceLevel: "declared_multidimensional_control_center_separation",
    effectiveCenters,
    sharedControls,
    effectiveCenterSeparationEligible: true,
    realWorldIndependenceEstablished: false,
    notEstablished: SPEC.notEstablished,
  };
}
