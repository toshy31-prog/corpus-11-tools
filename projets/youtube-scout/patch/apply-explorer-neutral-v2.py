from pathlib import Path
from datetime import datetime

APP = Path("public/app.js")
if not APP.exists():
    raise SystemExit("public/app.js introuvable — aucun changement.")

s = APP.read_text()
backup = Path(f"/tmp/app.before-explorer-neutral-v2-{datetime.now().strftime('%Y%m%d-%H%M%S')}.js")
backup.write_text(s)

active_decl = 'let activeDig = { schemaVersion: 2, id: "", seed: null, front: null, dossier: null, derived: [], derivedIds: [], collaborationArtist: "", history: [], createdAt: "", updatedAt: "" };'
if "let resumableDig = null;" not in s:
    if active_decl not in s:
        raise SystemExit("Déclaration activeDig exacte introuvable — aucun changement.")
    s = s.replace(active_decl, active_decl + '\nlet resumableDig = null;', 1)

start = s.find("async function restoreExplorationSession() {")
end = s.find("\nasync function useVideoAsSeed(video) {", start)
if start == -1 or end == -1:
    raise SystemExit("Bloc restoreExplorationSession() introuvable — aucun changement.")

old_restore = s[start:end]
for fragment in [
    'const response = await fetch("/api/exploration/session");',
    'const indexedRestored = await readSyncState("youtube-active-dig").catch(() => null);',
    'activeDig = { ...activeDig, ...restored };',
    'renderExplorationSession();'
]:
    if fragment not in old_restore:
        raise SystemExit(f"restoreExplorationSession() inattendu: {fragment}")

new_restore = '''async function restoreExplorationSession() {
  let serverRestored = null;
  let browserRestored = null;

  try {
    const response = await fetch("/api/exploration/session");
    if (response.ok) serverRestored = (await response.json()).session;
  } catch {}

  try {
    browserRestored = JSON.parse(localStorage.getItem(EXPLORATION_KEY) || "null");
  } catch {}

  const timestamp = (value) => Date.parse(
    value?.updatedAt ||
    value?.front?.updatedAt ||
    value?.createdAt ||
    0
  ) || 0;

  const indexedRestored =
    await readSyncState("youtube-active-dig").catch(() => null);

  let restored =
    [serverRestored, browserRestored, indexedRestored]
      .filter(Boolean)
      .sort((a, b) => timestamp(b) - timestamp(a))[0] || null;

  if (restored?.schemaVersion === 1 && restored.seed?.id) {
    const coverage = sourceCoverage({}, false);
    const migratedDepth =
      ({ 1: 3, 2: 6, 3: 9 })[Number(restored.depth)] || 6;

    const front = createExplorationSession({
      state: explorationGraph,
      seed: restored.seed,
      directions: restored.directions || [],
      depth: migratedDepth,
      coverage,
      previous: restored,
      now: restored.updatedAt || new Date().toISOString(),
      rerollKey: "schema-1-migration"
    });

    restored = {
      schemaVersion: 2,
      id: restored.id || "",
      seed: restored.seed,
      front,
      dossier: {
        state: "ready",
        sourceStates: {},
        message: "Front migré et conservé comme reprise disponible."
      },
      derived: restored.derived || [],
      derivedIds: restored.derivedIds || [],
      catalogueGroups: restored.catalogueGroups || {},
      navigationStack: restored.navigationStack || [],
      collaborationArtist: restored.collaborationArtist || "",
      history: restored.history || [],
      discoveryFocus: restored.discoveryFocus || "breadth",
      createdAt: restored.createdAt || "",
      updatedAt:
        restored.updatedAt ||
        front.updatedAt ||
        front.createdAt ||
        ""
    };
  }

  if (
    restored?.schemaVersion === 2 &&
    restored.front?.seed?.id &&
    ![3, 6, 9].includes(Number(restored.front.depth))
  ) {
    const migratedDepth =
      ({ 1: 3, 2: 6, 3: 9 })[Number(restored.front.depth)] || 6;

    const migratedFront = createExplorationSession({
      state: explorationGraph,
      seed: restored.front.seed,
      directions: restored.front.directions || [],
      depth: migratedDepth,
      coverage:
        restored.front.coverage ||
        sourceCoverage({}, false),
      previous: restored.front,
      now:
        restored.front.updatedAt ||
        restored.updatedAt ||
        new Date().toISOString(),
      rerollKey: "depth-migration"
    });

    restored = {
      ...restored,
      front: migratedFront,
      updatedAt:
        restored.updatedAt ||
        migratedFront.updatedAt ||
        migratedFront.createdAt ||
        ""
    };
  }

  const validRecovery =
    restored?.schemaVersion === 2 &&
    restored.front?.seed?.id &&
    Array.isArray(restored.front.branches);

  resumableDig = validRecovery ? restored : null;

  explorationSession = null;

  activeDig = {
    schemaVersion: 2,
    id: "",
    seed: null,
    front: null,
    dossier: null,
    derived: [],
    derivedIds: [],
    catalogueGroups: {},
    navigationStack: [],
    collaborationArtist: "",
    history: [],
    createdAt: "",
    updatedAt: new Date().toISOString()
  };

  currentDerivedIds = [];
  derivedPool.clear();

  renderDerived();
  renderExplorationSession();
  renderActiveSeed();

  return resumableDig;
}
'''

s = s[:start] + new_restore + s[end:]

old_restored_dig = 'const restoredDig = { ...(payload.local.activeDig || {}), updatedAt: new Date().toISOString() };'
if old_restored_dig not in s:
    raise SystemExit("Construction exacte de restoredDig introuvable — aucun changement.")
s = s.replace(old_restored_dig, '''const restoredDig = {
      ...(payload.local.activeDig || {})
    };''', 1)

old_activate = '''    activeDig = { schemaVersion: 2, id: "", seed: null, front: null, dossier: null, derived: [], derivedIds: [], catalogueGroups: {}, collaborationArtist: "", history: [], ...dig };
    explorationSession = activeDig.front;'''
new_activate = '''    resumableDig =
      dig?.schemaVersion === 2 &&
      dig?.front?.seed?.id &&
      Array.isArray(dig.front.branches)
        ? dig
        : null;

    activeDig = {
      schemaVersion: 2,
      id: "",
      seed: null,
      front: null,
      dossier: null,
      derived: [],
      derivedIds: [],
      catalogueGroups: {},
      navigationStack: [],
      collaborationArtist: "",
      history: [],
      createdAt: "",
      updatedAt: new Date().toISOString()
    };

    explorationSession = null;'''
if old_activate not in s:
    raise SystemExit("Activation directe post-backup introuvable — aucun changement.")
s = s.replace(old_activate, new_activate, 1)

old_status = '''    backupStatus(`${library.length} vidéos et ${notebook.length} pistes restaurées.${warnings.length ? ` ${[...new Set(warnings)].join(". ")}. Le fichier peut être réimporté pour compléter la copie serveur.` : " Parcours repris, connexions conservées."}`, warnings.length > 0);'''
new_status = '''    backupStatus(
      `${library.length} vidéos et ${notebook.length} pistes restaurées.${
        warnings.length
          ? ` ${[...new Set(warnings)].join(". ")}. Le fichier peut être réimporté pour compléter la copie serveur.`
          : " Connexions conservées. Explorer est prêt pour un nouveau départ."
      }`,
      warnings.length > 0
    );'''
if old_status not in s:
    raise SystemExit("Message final restoreBackup introuvable — aucun changement.")
s = s.replace(old_status, new_status, 1)

APP.write_text(s)

print("===== EXPLORER NEUTRAL V2 EXACT =====")
print("Fichier :", APP)
print("Backup  :", backup)
print("Aucune mutation du graphe Scout.")
