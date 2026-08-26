"""Construit toutes les dérivations locales du laboratoire, sans API externe."""

from build_knowledge_graph import build_graph
from evaluate import evaluate
from kernel import build_snapshot
from train_neural_router import train
from audit_dependencies import audit
from benchmark_v1 import run as run_benchmark_v1
from pathlib import Path
import json


ROOT = Path(__file__).resolve().parents[4]
ARTIFACTS = Path(__file__).resolve().parents[1] / "artifacts"

ARTIFACTS.mkdir(exist_ok=True)
snapshot = build_snapshot(ROOT)
(ARTIFACTS / "corpus-snapshot.json").write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n")
graph = build_graph(ROOT)
(ARTIFACTS / "corpus-knowledge-graph.json").write_text(json.dumps(graph, ensure_ascii=False, indent=2) + "\n")
dependency_audit = audit(ROOT)
(ARTIFACTS / "dependency-audit.json").write_text(json.dumps(dependency_audit, ensure_ascii=False, indent=2) + "\n")
report = evaluate(ROOT)
(ARTIFACTS / "evaluation-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
benchmark = run_benchmark_v1(ROOT)
(ARTIFACTS / "benchmark-v1-report.json").write_text(json.dumps(benchmark, ensure_ascii=False, indent=2) + "\n")
model, metadata = train(ROOT)
(ARTIFACTS / "corpusnet-router-v0.json").write_text(json.dumps({"metadata": metadata, "network": model.to_dict()}, ensure_ascii=False))
print(json.dumps({"snapshot": snapshot["fingerprint"], "graph": {"nodes": graph["node_count"], "edges": graph["edge_count"]}, "test_cases": report["test_case_count"]}, ensure_ascii=False))
