from __future__ import annotations
import json
from collections import Counter
from pathlib import Path
from enriched_relation_graph import enrich

ROOT = Path(__file__).resolve().parents[4]
if __name__ == "__main__":
    graph = enrich(ROOT)
    print(json.dumps({"experiment": "enriched-observable-graph-v1.7", "snapshot": graph["base_snapshot_fingerprint"], "nodes": graph["node_count"], "base_edges": graph["base_edge_count"], "edges": graph["edge_count"], "added_explicit_references": graph["added_explicit_reference_count"], "edge_types": dict(Counter(edge["type"] for edge in graph["edges"])), "method_boundary": graph["method_boundary"], "interpretation_limit": "More extracted references are not more true relations, and do not establish learning or emergence."}, ensure_ascii=False, indent=2))
