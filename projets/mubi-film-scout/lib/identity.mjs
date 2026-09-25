import { createHash } from "node:crypto";
import { resolve } from "node:path";
export const APP_VERSION = "0.16.3";
export function instanceId(root) { return createHash("sha256").update(resolve(root)).digest("hex").slice(0, 16); }
