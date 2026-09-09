import { closeSync, fsyncSync, openSync, renameSync, writeSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";

export function atomicReplaceDurable(path, text, mode = 0o600) {
  const temporaryPath = `${path}.next-${process.pid}-${randomUUID()}`;
  const file = openSync(temporaryPath, "wx", mode);
  try {
    writeSync(file, text);
    fsyncSync(file);
  } finally {
    closeSync(file);
  }
  renameSync(temporaryPath, path);
  const directory = openSync(dirname(path), "r");
  try {
    fsyncSync(directory);
  } finally {
    closeSync(directory);
  }
}
