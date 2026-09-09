import { createHash } from "node:crypto";

const digest = value => `sha256:${createHash("sha256").update(value).digest("hex")}`;

export const replayKeys = evidence => ({
  challengeDigest: evidence?.challengeDigest,
  commitmentDigests: (evidence?.entropyCommitments ?? []).map(value => digest(`${JSON.stringify(value)}\n`)).sort(),
  entropyDigests: (evidence?.entropyReveals ?? []).map(value => digest(value.entropyHex ?? "")).sort()
});

export const assessNetworkSeparationReplay = (evidence, history) => {
  const candidate = replayKeys(evidence), records = history?.records ?? [];
  const usedCommitments = new Set(records.flatMap(value => value.commitmentDigests ?? []));
  const usedEntropies = new Set(records.flatMap(value => value.entropyDigests ?? []));
  const checks = {
    challengeNotReused: Boolean(candidate.challengeDigest) && !records.some(value => value.challengeDigest === candidate.challengeDigest),
    commitmentsNotReused: candidate.commitmentDigests.length === 4 && candidate.commitmentDigests.every(value => !usedCommitments.has(value)),
    entropyNotReused: candidate.entropyDigests.length === 4 && new Set(candidate.entropyDigests).size === 4 && candidate.entropyDigests.every(value => !usedEntropies.has(value))
  };
  return { ok: Object.values(checks).every(Boolean), checks, candidate };
};

export const historyBody = value => ({ schema: value.schema, sourceRegistryDigest: value.sourceRegistryDigest, generation: value.generation, records: value.records });

export const verifyRecordedNetworkSeparationEvidence = (evidence, history, sourceRegistryDigest) => {
  const records = history?.records ?? [], candidate = replayKeys(evidence), latest = records.at(-1);
  const allChallenges = records.map(value => value.challengeDigest), allCommitments = records.flatMap(value => value.commitmentDigests ?? []), allEntropies = records.flatMap(value => value.entropyDigests ?? []);
  const checks = {
    historyIntegrity: history?.schema === "cct-network-separation-history/v1" && history.sourceRegistryDigest === sourceRegistryDigest && Number.isSafeInteger(history.generation) && history.generation === records.length && history.generation > 0 && history.stateDigest === digest(JSON.stringify(historyBody(history))),
    exactLatestEvidence: latest?.evidenceDigest === digest(`${JSON.stringify(evidence)}\n`) && latest.challengeDigest === candidate.challengeDigest && JSON.stringify(latest.commitmentDigests) === JSON.stringify(candidate.commitmentDigests) && JSON.stringify(latest.entropyDigests) === JSON.stringify(candidate.entropyDigests),
    noHistoricalReuse: new Set(allChallenges).size === allChallenges.length && new Set(allCommitments).size === allCommitments.length && new Set(allEntropies).size === allEntropies.length
  };
  return { ok: Object.values(checks).every(Boolean), checks };
};
export { digest };
