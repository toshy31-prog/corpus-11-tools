import { fullSetup as parentSetup } from "../sequenced-restoration-v10.19-effective-authority-center-separation/fixtures.mjs";

export function corroborationRegister(profiles) {
  return profiles.flatMap((profile) => ["effectiveOwnerId", "keyOperatorId", "decisiveFunderId", "vetoControllerId"].map((dimension) => ({
    authorityDomain: profile.authorityDomain,
    dimension,
    claimedValue: profile[dimension],
    evidenceRoots: [
      `sha256:synthetic-${profile.authorityDomain}-${dimension}-root-a`,
      `sha256:synthetic-${profile.authorityDomain}-${dimension}-root-b`,
    ],
  })));
}

export function fullSetup(overrides = {}) {
  const setup = parentSetup();
  return {
    ...setup,
    controlCorroborationRegister: corroborationRegister(setup.authorityControlProfiles),
    controlChallenges: [],
    ...overrides,
  };
}
