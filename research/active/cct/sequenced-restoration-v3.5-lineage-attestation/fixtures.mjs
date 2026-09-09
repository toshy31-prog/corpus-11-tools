import { completeExercise as portfolioExercise, audit, axes } from "../sequenced-restoration-v3.4-portfolio-lineage/fixtures.mjs";
import { computeLineageAttestationProtocolDigest } from "./runtime.mjs";

export { audit, axes };

function attachAttestations(cluster) {
  const boundRoots = {
    samplingUnitRoot: cluster.samplingUnitRoot,
    eventRoot: cluster.eventRoot,
    generatorRoot: cluster.generatorRoot
  };
  cluster.lineageAttestations = ["a", "b"].map((suffix) => ({
    schema: "cluster-lineage-attestation/v1",
    evidenceRoot: `${cluster.clusterId}-lineage-evidence-${suffix}`,
    controller: `lineage-attestor-${suffix}`,
    failureDomain: `lineage-attestation-domain-${suffix}`,
    attestedAtTick: 13,
    blindChallengePassed: true,
    boundRoots
  }));
}

export function completeExercise() {
  const exercise = portfolioExercise();
  for (const record of exercise.transportEvidence.pairMargins) {
    for (const trial of record.trials) for (const cluster of trial.clusters) attachAttestations(cluster);
  }
  for (const record of exercise.transportEvidence.classRisks) {
    for (const trial of record.trials) for (const cluster of trial.clusters) attachAttestations(cluster);
  }
  exercise.lineageAttestationCommitment = { algorithm: "sha256", committedAtTick: 14, digest: "" };
  exercise.lineageAttestationCommitment.digest = computeLineageAttestationProtocolDigest(exercise);
  return exercise;
}
