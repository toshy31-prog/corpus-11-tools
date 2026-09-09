import assert from "node:assert/strict";
import { assessContestableRepairAdequacy } from "../runtime.mjs";
import { adequacyReviews, fullSetup, repairLossLedger } from "../fixtures.mjs";
const s=fullSetup();
s.repairLossLedger=repairLossLedger(s.decision,"12".repeat(32),[{axis:"access",baselineLoss:1000,restoredCapacity:0,compensationValue:1,remainingLoss:999,recipientAcknowledgedRemainder:false,recourseOpen:true}]);
s.adequacyReviews=adequacyReviews(s.decision,s.repairLossLedger);
const r=assessContestableRepairAdequacy(s);
assert.deepEqual(r.failures,["repair_loss_ledger_invalid_or_unclosed"]);
console.log("held-out confrontation: a token transfer cannot close a large unacknowledged loss");
