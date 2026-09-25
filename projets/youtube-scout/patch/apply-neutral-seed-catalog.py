from pathlib import Path
from datetime import datetime

TARGET = Path("lib/exploration.mjs")
APP = Path("public/app.js")

if not TARGET.exists():
    raise SystemExit("lib/exploration.mjs introuvable — aucun changement.")

source = TARGET.read_text()
stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
backup = Path(f"/tmp/exploration.before-neutral-seed-catalog-{stamp}.mjs")
backup.write_text(source)

start = source.find("export function buildSeedCatalog(state = {}, library = [], collaborations = []) {")
end = source.find("\nfunction adjacency(state) {", start)
if start == -1 or end == -1:
    raise SystemExit("Bloc buildSeedCatalog introuvable — aucun changement.")

old = source[start:end]
for fragment in [
    "const degrees = {};",
    "values.sort((a, b) => b.relationCount - a.relationCount",
    "const key = `${seed.type}:${normalized(seed.label)}`"
]:
    if fragment not in old:
        raise SystemExit(f"Bloc buildSeedCatalog inattendu: {fragment}")

new = r'''function seedIdentityClusters(graph = {}) {
  const entities = Object.values(graph.entities || {});
  const parent = new Map();

  const find = (id) => {
    if (!parent.has(id)) parent.set(id, id);
    const current = parent.get(id);
    if (current === id) return id;
    const root = find(current);
    parent.set(id, root);
    return root;
  };

  const union = (a, b) => {
    if (!a || !b) return;
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) return;
    const ordered = [ra, rb].sort((x, y) => String(x).localeCompare(String(y), "en"));
    parent.set(ordered[1], ordered[0]);
  };

  const typeOf = (entity) =>
    entity?.type === "video" || entity?.type === "recording"
      ? "track"
      : entity?.type;

  const byExternalId = new Map();

  for (const entity of entities) {
    if (!entity?.id) continue;
    find(entity.id);

    for (const [namespace, rawValue] of Object.entries(entity.externalIds || {})) {
      const value = String(rawValue || "").trim();
      if (!value) continue;
      const key = `${typeOf(entity)}::${namespace}::${value}`;
      if (!byExternalId.has(key)) byExternalId.set(key, entity.id);
      else union(byExternalId.get(key), entity.id);
    }
  }

  for (const edge of Object.values(graph.edges || {})) {
    if (!["same_identity", "same_entity", "canonical_identity"].includes(edge?.kind)) continue;
    const left = graph.entities?.[edge.from];
    const right = graph.entities?.[edge.to];
    if (!left || !right) continue;
    if (typeOf(left) !== typeOf(right)) continue;
    union(edge.from, edge.to);
  }

  return { rootOf: find };
}

function neutralSeedOrder(a, b) {
  return (
    a.label.localeCompare(b.label, "fr", { sensitivity: "base", numeric: true }) ||
    a.id.localeCompare(b.id, "en")
  );
}

export function rankSeedChoices(choices = [], query = "") {
  const needle = normalized(query);

  const rank = (seed) => {
    if (!needle) return 3;
    const label = normalized(seed.label);
    if (label === needle) return 0;
    if (label.startsWith(needle)) return 1;
    if (label.includes(needle)) return 2;
    return 3;
  };

  return [...choices].sort(
    (a, b) => rank(a) - rank(b) || neutralSeedOrder(a, b)
  );
}

export function buildSeedCatalog(state = {}, library = [], collaborations = []) {
  const graph = augmentExplorationGraph(state, library, collaborations);
  const groups = { track: [], artist: [], label: [], playlist: [] };
  const degrees = {};

  for (const edge of Object.values(graph.edges || {})) {
    degrees[edge.from] = Number(degrees[edge.from] || 0) + 1;
    degrees[edge.to] = Number(degrees[edge.to] || 0) + 1;
  }

  const identity = seedIdentityClusters(graph);
  const seenClusters = new Set();

  for (const entity of Object.values(graph.entities || {})) {
    const type =
      entity.type === "video" || entity.type === "recording"
        ? "track"
        : entity.type;

    if (!groups[type]) continue;

    const relationCount = Number(degrees[entity.id] || 0);
    if (!relationCount) continue;

    const clusterId = identity.rootOf(entity.id);
    const dedupeKey = `${type}:${clusterId}`;

    if (seenClusters.has(dedupeKey)) {
      const existing = groups[type].find((seed) => seed.identityClusterId === clusterId);
      if (existing) {
        existing.relationCount += relationCount;
        existing.memberIds.push(entity.id);
      }
      continue;
    }

    seenClusters.add(dedupeKey);

    groups[type].push({
      id: entity.id,
      type,
      label: entityLabel(entity),
      sourceType: entity.type,
      url: entity.url || "",
      relationCount,
      identityClusterId: clusterId,
      memberIds: [entity.id]
    });
  }

  for (const values of Object.values(groups)) {
    values.sort(neutralSeedOrder);
  }

  return groups;
}
'''

source = source[:start] + new + source[end:]
TARGET.write_text(source)

if not APP.exists():
    raise SystemExit("public/app.js introuvable après patch lib.")

app_source = APP.read_text()
app_backup = Path(f"/tmp/app.before-neutral-seed-catalog-{stamp}.js")
app_backup.write_text(app_source)

if "  rankSeedChoices," not in app_source:
    marker = "  buildSeedCatalog,"
    if marker not in app_source:
        raise SystemExit("Import buildSeedCatalog introuvable dans public/app.js")
    app_source = app_source.replace(marker, marker + "\n  rankSeedChoices,", 1)

old_line = '  const choices = (seedCatalog[nodes.seedType.value] || []).filter((seed) => seed.label.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLocaleLowerCase().includes(query));'
if old_line not in app_source:
    raise SystemExit("Ligne renderSeedOptions exacte introuvable dans public/app.js")

new_line = '''  const choices = rankSeedChoices(
    (seedCatalog[nodes.seedType.value] || []).filter((seed) =>
      seed.label
        .normalize("NFD")
        .replace(/[\\u0300-\\u036f]/g, "")
        .toLocaleLowerCase()
        .includes(query)
    ),
    query
  );'''

app_source = app_source.replace(old_line, new_line, 1)
APP.write_text(app_source)

print("===== NEUTRAL SEED CATALOG V1 =====")
print("Exploration backup :", backup)
print("App backup         :", app_backup)
print("Patch appliqué.")
print("Aucune mutation du graphe Scout.")
