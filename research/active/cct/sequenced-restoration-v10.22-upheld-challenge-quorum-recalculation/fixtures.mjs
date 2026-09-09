import { fullSetup as parentSetup, signedDecisions } from "../sequenced-restoration-v10.21-independent-challenge-adjudication/fixtures.mjs";

export function fullSetup(overrides = {}) {
  const setup = parentSetup();
  return { ...setup, adjudicationDecisions: signedDecisions(setup.controlChallenges[0], "challenge_upheld"), ...overrides };
}
