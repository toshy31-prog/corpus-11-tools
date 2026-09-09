import { createHash, createPublicKey, verify } from "node:crypto";

const digest = value => `sha256:${createHash("sha256").update(value).digest("hex")}`;
export const historyAnchorBody = value => ({ schema: value.schema, witnessId: value.witnessId, historyDigest: value.historyDigest, historyGeneration: value.historyGeneration, networkEvidenceDigest: value.networkEvidenceDigest, challengeDigest: value.challengeDigest, signedAtMs: value.signedAtMs });
export const anchorLedgerBody = value => ({ schema: value.schema, sourceRegistryDigest: value.sourceRegistryDigest, generation: value.generation, anchors: value.anchors });
export const ledgerReceiptBody = value => ({ schema: value.schema, witnessId: value.witnessId, ledgerDigest: value.ledgerDigest, ledgerGeneration: value.ledgerGeneration, sourceRegistryDigest: value.sourceRegistryDigest, signedAtMs: value.signedAtMs });

export const verifyNetworkHistoryAnchorLedger = (ledger, anchors, sourceRegistryDigest, receipts, policy) => {
  const entries = ledger?.anchors ?? [], keys = entries.map(value => `${value.witnessId}\u0000${value.historyGeneration}`), equivocations = [...new Set(keys)].flatMap(key => { const matches = entries.filter((_, index) => keys[index] === key), digests = new Set(matches.map(value => value.historyDigest)); return digests.size > 1 ? [{ key, historyDigests: [...digests].sort() }] : []; });
  const currentDigests = (anchors ?? []).map(value => digest(`${JSON.stringify(value)}\n`));
  const checks = {
    ledgerIntegrity: ledger?.schema === "cct-network-history-anchor-ledger/v1" && ledger.sourceRegistryDigest === sourceRegistryDigest && ledger.generation === entries.length && ledger.generation >= 2 && ledger.stateDigest === digest(JSON.stringify(anchorLedgerBody(ledger))),
    currentAnchorsRecorded: currentDigests.length === 2 && currentDigests.every(value => entries.some(entry => entry.anchorDigest === value)),
    noWitnessEquivocation: equivocations.length === 0,
    crossWitnessConvergence: (receipts ?? []).length === 2 && new Set(receipts.map(value => value.witnessId)).size === 2 && JSON.stringify(receipts.map(value => value.witnessId).sort()) === JSON.stringify((policy?.timeWitnesses ?? []).map(value => value.id).sort()) && receipts.every(value => { const witness = policy.timeWitnesses.find(candidate => candidate.id === value.witnessId); try { return value.schema === "cct-network-history-anchor-ledger-receipt/v1" && value.ledgerDigest === digest(`${JSON.stringify(ledger)}\n`) && value.ledgerGeneration === ledger.generation && value.sourceRegistryDigest === sourceRegistryDigest && Number.isSafeInteger(value.signedAtMs) && verify(null, Buffer.from(JSON.stringify(ledgerReceiptBody(value))), createPublicKey(witness.publicKeyPem), Buffer.from(value.signatureBase64 ?? "", "base64")); } catch { return false; } }),
    convergenceFresh: (receipts ?? []).length === 2 && (anchors ?? []).length === 2 && Number.isSafeInteger(policy?.maxLedgerReceiptDelayMs) && policy.maxLedgerReceiptDelayMs > 0 && Math.min(...receipts.map(value => value.signedAtMs)) >= Math.max(...anchors.map(value => value.signedAtMs)) && Math.max(...receipts.map(value => value.signedAtMs)) - Math.max(...anchors.map(value => value.signedAtMs)) <= policy.maxLedgerReceiptDelayMs && Math.max(...receipts.map(value => value.signedAtMs)) - Math.min(...receipts.map(value => value.signedAtMs)) <= policy.maxClockSkewMs
  };
  return { ok: Object.values(checks).every(Boolean), checks, equivocations };
};

export const verifyNetworkSeparationHistoryAnchors = (anchors, history, networkEvidence, policy, ledger, ledgerReceipts) => {
  const values = anchors ?? [], latest = history?.records?.at(-1), challenge = networkEvidence?.challenge;
  const expectedHistoryDigest = digest(`${JSON.stringify(history)}\n`), expectedEvidenceDigest = digest(`${JSON.stringify(networkEvidence)}\n`);
  const checks = {
    exactWitnessSet: values.length === 2 && new Set(values.map(value => value.witnessId)).size === 2 && JSON.stringify(values.map(value => value.witnessId).sort()) === JSON.stringify((policy?.timeWitnesses ?? []).map(value => value.id).sort()),
    signedCurrentGeneration: values.every(value => {
      const witness = policy?.timeWitnesses?.find(candidate => candidate.id === value.witnessId);
      try { return witness && value.schema === "cct-network-separation-history-anchor/v1" && value.historyDigest === expectedHistoryDigest && value.historyGeneration === history.generation && value.networkEvidenceDigest === expectedEvidenceDigest && value.challengeDigest === networkEvidence.challengeDigest && value.signedAtMs >= latest.admittedAtMs && value.signedAtMs <= challenge.expiresAtMs && verify(null, Buffer.from(JSON.stringify(historyAnchorBody(value))), createPublicKey(witness.publicKeyPem), Buffer.from(value.signatureBase64 ?? "", "base64")); } catch { return false; }
    })
  };
  const ledgerResult = verifyNetworkHistoryAnchorLedger(ledger, values, history?.sourceRegistryDigest, ledgerReceipts, policy);
  checks.anchorLedger = ledgerResult.ok;
  return { ok: Object.values(checks).every(Boolean), checks, equivocations: ledgerResult.equivocations };
};
