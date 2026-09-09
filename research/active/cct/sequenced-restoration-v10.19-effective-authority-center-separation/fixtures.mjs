import { fullSetup as parentSetup } from "../sequenced-restoration-v10.18-revocable-witness-authority-registry/fixtures.mjs";

export function independentControlProfiles(registry) {
  return registry.map((entry, index) => ({
    authorityDomain: entry.authorityDomain,
    effectiveOwnerId: `synthetic-owner-${index + 1}`,
    keyOperatorId: `synthetic-key-operator-${index + 1}`,
    decisiveFunderId: `synthetic-funder-${index + 1}`,
    vetoControllerId: `synthetic-veto-${index + 1}`,
  }));
}

export function fullSetup(overrides = {}) {
  const setup = parentSetup();
  return { ...setup, authorityControlProfiles: independentControlProfiles(setup.witnessAuthorityRegistry), ...overrides };
}
