import { createHash, createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";

const [decisionId, repairsPath, actorRegistryPath, effectReceiptsPath] = process.argv.slice(2);
if (!effectReceiptsPath) { process.stderr.write("usage: node verify-repair-effect.mjs DECISION_ID REPAIRS ACTOR_REGISTRY EFFECT_RECEIPTS\n"); process.exit(2); }
const repairs = JSON.parse(readFileSync(repairsPath, "utf8")).filter(item => item.decisionId === decisionId);
const registry = JSON.parse(readFileSync(actorRegistryPath, "utf8"));
const receipts = JSON.parse(readFileSync(effectReceiptsPath, "utf8"));
const actors = new Map(registry.actors?.map(actor => [actor.actorId, actor]) ?? []);
const digest = value => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
const repairDigest = digest(repairs.map(({ signatureBase64, ...body }) => ({ ...body, signatureBase64 })).sort((a, b) => a.repairId.localeCompare(b.repairId)));
const valid = receipts.map(receipt => {
  const actor = actors.get(receipt.actorId);
  const body = { schema: receipt.schema, receiptId: receipt.receiptId, actorId: receipt.actorId, role: receipt.role, decisionId: receipt.decisionId, repairDigest: receipt.repairDigest, action: receipt.action, deliveredAtTick: receipt.deliveredAtTick, accessedAtTick: receipt.accessedAtTick, executedAtTick: receipt.executedAtTick, stateBeforeDigest: receipt.stateBeforeDigest, stateAfterDigest: receipt.stateAfterDigest, recourseOpenUntilTick: receipt.recourseOpenUntilTick };
  const signatureValid = Boolean(actor) && verify(null, Buffer.from(JSON.stringify(body)), createPublicKey(actor.publicKeyPem), Buffer.from(receipt.signatureBase64, "base64"));
  return { ...receipt, actor, valid: receipt.schema === "cct-repair-effect-receipt/v1" && receipt.decisionId === decisionId && receipt.repairDigest === repairDigest && signatureValid };
});
const byRole = role => valid.filter(item => item.valid && item.role === role);
const delivery = byRole("notice-channel");
const execution = byRole("remedy-executor");
const observation = byRole("effect-observer");
const checks = {
  repairPresent: repairs.length >= 2,
  noticeDeliveredAndAccessed: delivery.some(item => Number.isSafeInteger(item.deliveredAtTick) && Number.isSafeInteger(item.accessedAtTick) && item.accessedAtTick >= item.deliveredAtTick),
  remedyStateChanged: execution.some(item => Number.isSafeInteger(item.executedAtTick) && item.stateBeforeDigest && item.stateAfterDigest && item.stateBeforeDigest !== item.stateAfterDigest),
  recourseUsable: delivery.some(item => Number.isSafeInteger(item.accessedAtTick) && Number.isSafeInteger(item.recourseOpenUntilTick) && item.recourseOpenUntilTick > item.accessedAtTick),
  observerQuorum: observation.length >= 2 && new Set(observation.map(item => item.actorId)).size >= 2 && new Set(observation.map(item => item.actor?.controller)).size >= 2 && new Set(observation.map(item => item.actor?.failureDomain)).size >= 2,
  receiptsValid: receipts.length === valid.length && valid.every(item => item.valid),
};
const ok = Object.values(checks).every(Boolean);
process.stdout.write(`${JSON.stringify({ ok, checks, repairDigest, operationalRepairEffectObserved: ok, subjectiveSufficiencyEstablished: false })}\n`);
if (!ok) process.exitCode = 1;
