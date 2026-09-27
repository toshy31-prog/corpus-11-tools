import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PersistentStore, writeStoreSnapshot } from "./persistent-store.mjs";

test("durabilité : ordre write/sync/close/rename/directory-sync et mode privé", async t => {
  const directory = await fs.mkdtemp(join(tmpdir(), "scout-durability-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const pathname = join(directory, "synthetic.json"), trace = [];
  const operations = {
    mkdir: fs.mkdir,
    rename: async (...args) => { trace.push("rename"); return fs.rename(...args); },
    open: async (path, ...args) => {
      const handle = await fs.open(path, ...args), kind = path === directory ? "dir" : "file";
      return {
        chmod: mode => handle.chmod(mode),
        writeFile: async value => { trace.push("write"); return handle.writeFile(value); },
        sync: async () => { trace.push(`${kind}-sync`); return handle.sync(); },
        close: async () => { trace.push(`${kind}-close`); return handle.close(); }
      };
    }
  };
  await fs.writeFile(`${pathname}.tmp`, "leftover", { mode: 0o666 });
  await fs.chmod(`${pathname}.tmp`, 0o666);
  await writeStoreSnapshot(pathname, '{"synthetic":true}', operations);
  assert.deepEqual(trace, ["write", "file-sync", "file-close", "rename", "dir-sync", "dir-close"]);
  assert.deepEqual(JSON.parse(await fs.readFile(pathname, "utf8")), { synthetic: true });
  if (process.platform !== "win32") assert.equal((await fs.stat(pathname)).mode & 0o777, 0o600);
});

test("durabilité : échecs avant publication préservent les anciens octets et permettent reprise", async t => {
  const directory = await fs.mkdtemp(join(tmpdir(), "scout-durability-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const pathname = join(directory, "synthetic.json");
  for (const stage of ["chmod", "write", "sync", "close", "rename"]) {
    await fs.writeFile(pathname, "old");
    let closed = false;
    const fail = () => { throw new Error(`injected-${stage}`); };
    const operations = {
      mkdir: fs.mkdir,
      rename: stage === "rename" ? fail : fs.rename,
      open: async (...args) => {
        const handle = await fs.open(...args);
        return {
          chmod: stage === "chmod" ? fail : mode => handle.chmod(mode),
          writeFile: stage === "write" ? fail : value => handle.writeFile(value),
          sync: stage === "sync" ? fail : () => handle.sync(),
          close: async () => { await handle.close(); closed = true; if (stage === "close") fail(); }
        };
      }
    };
    await assert.rejects(writeStoreSnapshot(pathname, "new", operations), new RegExp(`injected-${stage}`));
    assert.equal(await fs.readFile(pathname, "utf8"), "old");
    assert.equal(closed, true);
    await writeStoreSnapshot(pathname, "recovered");
    assert.equal(await fs.readFile(pathname, "utf8"), "recovered");
  }
});

test("durabilité : après rename une erreur est explicitement publiée, pas un rollback fictif", async t => {
  const directory = await fs.mkdtemp(join(tmpdir(), "scout-durability-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const pathname = join(directory, "synthetic.json");
  await fs.writeFile(pathname, "old");
  for (const stage of ["open", "sync"]) {
    const operations = { mkdir: fs.mkdir, rename: fs.rename, open: async (path, ...args) => {
      if (path === directory && stage === "open") throw new Error("injected-directory-open");
      const handle = await fs.open(path, ...args);
      return path !== directory ? handle : {
        sync: async () => { throw new Error("injected-directory-sync"); },
        close: () => handle.close()
      };
    } };
    await assert.rejects(writeStoreSnapshot(pathname, `new-${stage}`, operations), error =>
      error.code === "STORE_DURABILITY_UNCERTAIN" && error.storePublished === true);
    assert.equal(await fs.readFile(pathname, "utf8"), `new-${stage}`);
  }
  const store = new PersistentStore(pathname);
  store.loaded = true;
  store.persist = async () => { throw Object.assign(new Error("uncertain"), { storePublished: true }); };
  await assert.rejects(store.commitPersonalGraph({ entities: [{ id: "synthetic", type: "artist" }] }), /uncertain/);
  assert.equal(store.state.entities.synthetic.type, "artist");
});
