export function validateReceiptProvenance(spec, { actionActor, receipts }) {
  const errors = [];
  const require = (condition, label) => { if (!condition) errors.push(`missing:${label}`); };
  const rules = spec?.requirements ?? {};
  require(spec?.schema === "cct-receipt-provenance/v1" && spec?.version === "1.5-candidate", "candidate_schema");
  require(Number.isInteger(rules.minimumIndependentReceipts) && rules.minimumIndependentReceipts >= 2, "minimumIndependentReceipts");
  require(Array.isArray(receipts) && receipts.length >= rules.minimumIndependentReceipts, "receipt_count");
  const seenActors = new Set();
  const seenDomains = new Set();
  const seenArtifacts = new Set();
  const seenHashes = new Set();
  const seenRoots = new Set();
  for (const [index, receipt] of (receipts ?? []).entries()) {
    for (const field of ["id", "observerActor", "observerFailureDomain", "sourceArtifactId", "sourceHash", "sourceCollectionRoot", "collectionLimit"]) require(typeof receipt?.[field] === "string" && receipt[field].length > 0, `receipt.${index}.${field}`);
    if (rules.observerCannotBeActionActor && receipt?.observerActor === actionActor) errors.push(`not_independent:receipt.${index}.observerActor`);
    if (rules.distinctObserverActors && seenActors.has(receipt?.observerActor)) errors.push(`reused:observerActor:${receipt.observerActor}`);
    if (rules.distinctObserverFailureDomains && seenDomains.has(receipt?.observerFailureDomain)) errors.push(`reused:observerFailureDomain:${receipt.observerFailureDomain}`);
    if (rules.distinctSourceArtifacts && seenArtifacts.has(receipt?.sourceArtifactId)) errors.push(`reused:sourceArtifactId:${receipt.sourceArtifactId}`);
    if (rules.distinctSourceHashes && seenHashes.has(receipt?.sourceHash)) errors.push(`reused:sourceHash:${receipt.sourceHash}`);
    if (rules.distinctSourceCollectionRoots && seenRoots.has(receipt?.sourceCollectionRoot)) errors.push(`reused:sourceCollectionRoot:${receipt.sourceCollectionRoot}`);
    seenActors.add(receipt?.observerActor);
    seenDomains.add(receipt?.observerFailureDomain);
    seenArtifacts.add(receipt?.sourceArtifactId);
    seenHashes.add(receipt?.sourceHash);
    seenRoots.add(receipt?.sourceCollectionRoot);
  }
  return errors;
}
