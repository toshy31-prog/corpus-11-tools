import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { dirname } from "node:path";
import { createHash } from "node:crypto";

// Keys are hashed: URLs and credentials must never be written into the cache.
export function createPersistentCache(path, { now = Date.now, limit = 1000 } = {}) {
  const entries = new Map();
  let loaded;
  let writes = Promise.resolve();
  const keyOf = (key) => createHash("sha256").update(key).digest("hex");
  async function load() {
    loaded ||= readFile(path, "utf8").then((text) => {
      for (const [key, value] of JSON.parse(text).entries || []) {
        if (value.expiresAt > now()) entries.set(key, value);
      }
    }).catch(() => {});
    await loaded;
  }
  return {
    async get(key) {
      await load();
      const item = entries.get(keyOf(key));
      return item?.expiresAt > now() ? item : null;
    },
    async set(key, data, ttl) {
      await load();
      entries.set(keyOf(key), { data, savedAt: now(), expiresAt: now() + ttl });
      for (const [id, item] of entries) if (item.expiresAt <= now()) entries.delete(id);
      while (entries.size > limit) entries.delete(entries.keys().next().value);
      const snapshot = JSON.stringify({ version: 1, entries: [...entries] });
      writes = writes.catch(() => {}).then(async () => {
        await mkdir(dirname(path), { recursive: true, mode: 0o700 });
        await writeFile(`${path}.tmp`, snapshot, { mode: 0o600 });
        await rename(`${path}.tmp`, path);
      });
      await writes;
    }
  };
}
