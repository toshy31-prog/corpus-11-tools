"""Compile un graphe de carriers Corpus sans changer leur statut."""

from __future__ import annotations

import json
from pathlib import Path
import re

from dataset import evaluation_rows
from kernel import build_snapshot


ROOT = Path(__file__).resolve().parents[4]
OUTPUT = Path(__file__).resolve().parents[1] / "artifacts/corpus-knowledge-graph.json"


def material_status(surface: str, path: str) -> str:
    if surface == "product":
        return "product_material_declared"
    if surface == "research":
        return "research_bounded"
    if surface == "transfer":
        return "transfer_" + ("accepted" if "/accepted/" in path else "rejected" if "/rejected/" in path else "candidate")
    if surface == "archive":
        return "historical_memory_non_executable"
    return "workspace_context"


def skill_metadata(skill_file: Path) -> dict:
    sections = skill_file.read_text().split("---", 2)
    return dict(line.split(": ", 1) for line in sections[1].splitlines() if ": " in line) if len(sections) > 2 else {}


def build_graph(root: Path = ROOT) -> dict:
    snapshot = build_snapshot(root)
    nodes = [{"id": f"material:{row['path']}", "kind": "material", "path": row["path"], "surface": row["surface"], "status": material_status(row["surface"], row["path"]), "sha256": row["sha256"]} for row in snapshot["materials"]]
    edges = []
    inventory = json.loads((root / "corpus-11-tools/docs/inventory.json").read_text())
    for name in inventory["skills"]:
        path = root / "corpus-11-tools/skills" / name / "SKILL.md"
        metadata = skill_metadata(path)
        capability_id = f"capability:{name}"
        nodes.append({"id": capability_id, "kind": "capability", "name": name, "description": metadata.get("description", ""), "status": "declared_product_capability_not_established", "source": path.relative_to(root).as_posix()})
        edges.append({"from": f"material:{path.relative_to(root).as_posix()}", "type": "declares", "to": capability_id})
        reference = path.parent / "references/capability.md"
        if reference.exists():
            for relation, criticality, target in re.findall(r"--(requires|uses)\[([^\]]+)\]--> CAP\.([A-Z_]+)", reference.read_text()):
                target_name = target.casefold().replace("_", "-")
                if target_name in inventory["skills"]:
                    edges.append({"from": capability_id, "type": f"{relation}_{criticality}", "to": f"capability:{target_name}", "source": reference.relative_to(root).as_posix()})
    for identifier, example, partition in evaluation_rows(root):
        node_id = f"evaluation:{identifier}"
        nodes.append({"id": node_id, "kind": "evaluation", "prompt": example.text, "partition": partition, "status": "internal_evaluation_not_external_evidence", "source": "corpus-11-tools/evals/routing-and-nonregression.jsonl"})
        for label in example.labels:
            edges.append({"from": node_id, "type": "expects_route_to", "to": f"capability:{label}"})
    return {"schema_version": 1, "snapshot_fingerprint": snapshot["fingerprint"], "node_count": len(nodes), "edge_count": len(edges), "nodes": nodes, "edges": edges}


if __name__ == "__main__":
    graph = build_graph()
    OUTPUT.parent.mkdir(exist_ok=True)
    OUTPUT.write_text(json.dumps(graph, ensure_ascii=False, indent=2) + "\n")
    print(f"nodes={graph['node_count']} edges={graph['edge_count']} snapshot={graph['snapshot_fingerprint']}")
