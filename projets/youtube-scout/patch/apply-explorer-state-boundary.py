from pathlib import Path
from datetime import datetime

APP = Path("public/app.js")

if not APP.exists():
    raise SystemExit("public/app.js introuvable — aucun changement.")

s = APP.read_text()
stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
backup = Path(f"/tmp/app.before-explorer-state-boundary-{stamp}.js")
backup.write_text(s)

needle = (
    'let activeDig = { schemaVersion: 2, id: "", seed: null, '
    'front: null, dossier: null, derived: [], derivedIds: [], '
    'collaborationArtist: "", history: [], createdAt: "", updatedAt: "" };'
)

if "let resumableDig = null;" not in s:
    if needle not in s:
        raise SystemExit("Anchor activeDig introuvable — patch annulé.")
    s = s.replace(
        needle,
        needle + "\nlet resumableDig = null;",
        1
    )

start = s.find("async function restoreExplorationSession() {")
if start == -1:
    start = s.find("async function restoreExplorationSession({")

if start == -1:
    raise SystemExit("restoreExplorationSession introuvable — patch annulé.")

end = s.find("\nasync function useVideoAsSeed(", start)
if end == -1:
    raise SystemExit("Fin restoreExplorationSession introuvable — patch annulé.")

block = s[start:end]

if "resumableDig =" not in block:
    marker = "renderActiveSeed();"
    pos = block.rfind(marker)
    if pos == -1:
        raise SystemExit("renderActiveSeed() introuvable — patch annulé.")

    injection = '''
  /*
   * Explorer State Boundary:
   * une session persistée est une possibilité de reprise,
   * pas l'intention active de l'utilisateur.
   */
  resumableDig =
    activeDig?.front?.seed?.id
      ? { ...activeDig }
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
    updatedAt:
      new Date().toISOString()
  };

  explorationSession = null;
  currentDerivedIds = [];
'''
    block = block[:pos] + injection + block[pos:]
    s = s[:start] + block + s[end:]

bad = (
    'const restoredDig = { ...(payload.local.activeDig || {}), '
    'updatedAt: new Date().toISOString() };'
)

if bad in s:
    s = s.replace(
        bad,
        '''const restoredDig = {
      ...(payload.local.activeDig || {})
    };''',
        1
    )

APP.write_text(s)

print("===== EXPLORER STATE BOUNDARY PATCH =====")
print("Fichier :", APP)
print("Backup  :", backup)
print("resumableDig séparé de activeDig.")
print("Pas de timestamp laundering sur backup.")
print("Aucune mutation du graphe Scout.")
