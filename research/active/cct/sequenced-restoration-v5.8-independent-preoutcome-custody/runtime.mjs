import { createHash, createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";
import { assessContentAddressedLineage, CctContentAddressedLineageRuntime } from "../sequenced-restoration-v5.7-content-addressed-lineage/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));

export function custodyBundleDigest(validation) {
  const bundle = validation?.transportAudit?.targetContexts?.map((target) => ({
    context: [target.population, target.protocol, target.environment],
    artifacts: Object.fromEntries(Object.entries(target.lineageCommitments ?? {}).map(([kind, item]) => [kind, item.digest])),
    unitFingerprints: target.unitFingerprints
  }));
  return createHash("sha256").update(JSON.stringify(bundle)).digest("hex");
}

export function validateIndependentCustodySpec(candidate = SPEC) {
  return candidate?.schema === "cct-independent-preoutcome-custody/v1" && candidate?.version === "5.8-candidate"
    && candidate?.parentCandidate === "CCT-EXEC-5.7-CONTENT-ADDRESSED-LINEAGE-CANDIDATE-001"
    && candidate?.minimumIndependentCustodians === 2 && candidate?.signatureAlgorithm === "ed25519"
    && candidate?.digestAlgorithm === "sha256";
}

function producerControllers(validation) {
  const local = validation.observations.flatMap((item) => item.axisMembershipMeasurements.flatMap((record) => record.measurements.map((m) => m.controller)));
  const target = validation.transportAudit.targetContexts.flatMap((context) => context.axisCases.flatMap((packet) => packet.cases
    .flatMap((item) => item.referenceAdjudications.map((decision) => decision.controller))));
  return new Set([...local, ...target]);
}

export function assessIndependentPreoutcomeCustody(openDebtAxes, dependencyAudit, currentExercise, amendment, validation) {
  const prior = assessContentAddressedLineage(openDebtAxes, dependencyAudit, currentExercise, amendment, validation);
  if (prior.status !== "content_addressed_target_lineage_candidate") return prior;
  const custody = validation?.lineageCustody;
  const attestations = custody?.attestations;
  const digest = custodyBundleDigest(validation);
  const producers = producerControllers(validation);
  if (!validateIndependentCustodySpec() || custody?.schema !== "cct-lineage-custody-record/v1"
    || custody?.bundleDigest !== digest || !Array.isArray(attestations) || attestations.length < SPEC.minimumIndependentCustodians
    || new Set(attestations.map((item) => item?.custodianId)).size !== attestations.length
    || new Set(attestations.map((item) => item?.controller)).size !== attestations.length
    || new Set(attestations.map((item) => item?.failureDomain)).size !== attestations.length
    || attestations.some((item) => typeof item?.custodianId !== "string" || !item.custodianId
      || typeof item?.controller !== "string" || !item.controller || producers.has(item.controller)
      || typeof item?.failureDomain !== "string" || !item.failureDomain
      || item?.algorithm !== SPEC.signatureAlgorithm || !Number.isInteger(item?.recordedAtTick)
      || item.recordedAtTick >= validation.outcomesAccessedAtTick
      || typeof item?.publicKeyDer !== "string" || typeof item?.signature !== "string")) {
    return { status: "not_established", failures: ["independent_preoutcome_custody_invalid"] };
  }
  try {
    if (attestations.some((item) => !verify(null, Buffer.from(digest),
      createPublicKey({ key: Buffer.from(item.publicKeyDer, "base64"), format: "der", type: "spki" }), Buffer.from(item.signature, "base64")))) {
      return { status: "not_established", failures: ["custody_signature_invalid"] };
    }
  } catch {
    return { status: "not_established", failures: ["custody_signature_invalid"] };
  }
  return { status: SPEC.successStatus, custodianCount: attestations.length, bundleDigest: digest, failures: [] };
}

export class CctIndependentPreoutcomeCustodyRuntime extends CctContentAddressedLineageRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") return super.decide({ view, allowedActions, history, predictionKeys });
    const axes = this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis);
    const selected = allowedActions.find((action) => { const packet = view?.cct?.independentPreoutcomeCustodyExercises?.[action];
      return assessIndependentPreoutcomeCustody(axes, view?.cct?.dependencyAudits?.[action], packet?.currentExercise, packet?.amendment, packet?.validation).status === SPEC.successStatus; });
    if (!selected) this.terminal("CCT_INDEPENDENT_PREOUTCOME_CUSTODY_UNESTABLISHED", view?.cct?.tick ?? -1);
    return super.decide({ view, allowedActions: [selected], history, predictionKeys });
  }
}
