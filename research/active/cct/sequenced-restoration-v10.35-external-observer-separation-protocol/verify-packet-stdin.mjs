import { assessExternalObserverSeparationProtocol } from "./runtime.mjs";
let input = "";
for await (const chunk of process.stdin) input += chunk;
const result = assessExternalObserverSeparationProtocol(JSON.parse(input));
process.stdout.write(`${JSON.stringify({ status: result.status, eligible: result.externalSeparationProtocolEligible === true, actualProcessSeparationEstablished: result.actualProcessSeparationEstablished })}\n`);
if (result.status !== "external_observer_separation_protocol_candidate") process.exitCode = 1;
