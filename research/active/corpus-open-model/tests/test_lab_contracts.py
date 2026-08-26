from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from build_knowledge_graph import build_graph  # noqa: E402
from dataset import partitioned_examples  # noqa: E402
from neural_router import Example, NeuralRouter, vocabulary  # noqa: E402
from audit_dependencies import audit  # noqa: E402
from benchmark_v1 import cases  # noqa: E402
from graph_neural_router import GraphNeuralRouter, graph_adjacency  # noqa: E402
from lint_candidate_data import lint  # noqa: E402
from candidate_dataset import manifest, partitioned  # noqa: E402
from select_candidate_v1 import select  # noqa: E402
from doctrine_corpus import compile_corpus, manifest as doctrine_manifest  # noqa: E402
from doctrine_embeddings import DoctrineEmbeddings  # noqa: E402
from doctrine_diagnostics import diagnostics, prototype_diagnostics  # noqa: E402
from contrastive_pairs import build as build_contrastive_pairs, manifest as contrastive_manifest  # noqa: E402
from contrastive_router import ContrastiveRouter  # noqa: E402
from compute_profile import TinyDoctrineProfile, parameter_estimate  # noqa: E402
from doctrine_split import split_documents, manifest as split_manifest  # noqa: E402
from organism_environment import observe  # noqa: E402
from metabolic_cycle import probes  # noqa: E402
from ecological_corpus import compile_ecological_corpus, manifest as ecological_manifest  # noqa: E402
from ecological_split import split_documents as ecological_split, manifest as ecological_split_manifest  # noqa: E402
from relation_stratified_split import split_documents as relation_split, manifest as relation_split_manifest  # noqa: E402


ROOT = Path(__file__).resolve().parents[4]


class LabContractsTests(unittest.TestCase):
    def test_evaluation_prompts_do_not_cross_partitions(self):
        partitions = partitioned_examples(ROOT)
        origins = [{example.origin for example in examples if example.origin.startswith("eval:")} for examples in partitions.values()]
        self.assertFalse(origins[0] & origins[1])
        self.assertFalse(origins[0] & origins[2])
        self.assertFalse(origins[1] & origins[2])
        self.assertTrue(partitions["test"])

    def test_graph_preserves_product_research_and_transfer_statuses(self):
        graph = build_graph(ROOT)
        statuses = {node["status"] for node in graph["nodes"] if node["kind"] == "material"}
        self.assertIn("product_material_declared", statuses)
        self.assertIn("research_bounded", statuses)
        self.assertIn("transfer_candidate", statuses)
        self.assertTrue(any(edge["type"] == "expects_route_to" for edge in graph["edges"]))
        self.assertTrue(any(edge["type"].startswith(("requires_", "uses_")) for edge in graph["edges"]))

    def test_unknown_vocabulary_can_abstain(self):
        examples = [Example("effet causal confondeur", ["causal-identification"], "fixture")]
        model = NeuralRouter(vocabulary(examples), ["causal-identification"], hidden=4)
        model.train(examples, epochs=10)
        result = model.predict_or_abstain("qzxv blorpt", minimum_coverage=0.5)
        self.assertEqual(result["decision"], "abstain")

    def test_external_runtime_is_not_required(self):
        result = audit(ROOT)
        self.assertEqual(result["runtime"]["codex"], "not_required")
        self.assertEqual(result["runtime"]["gpt_or_external_api"], "not_required")

    def test_benchmark_is_not_a_training_source_and_has_negatives(self):
        benchmark_cases = cases()
        training_texts = {example.text for examples in partitioned_examples(ROOT).values() for example in examples}
        self.assertFalse({case["prompt"] for case in benchmark_cases} & training_texts)
        self.assertTrue(any(not case["expect"] for case in benchmark_cases))

    def test_graph_neural_router_learns_and_uses_declared_edge(self):
        examples = [Example("cause confusee", ["causal-identification"], "fixture:a"), Example("tester le protocole", ["protocol-robustness"], "fixture:b")]
        graph = {"edges": [{"from": "capability:causal-identification", "type": "uses_critical", "to": "capability:protocol-robustness"}]}
        model = GraphNeuralRouter(vocabulary(examples), ["causal-identification", "protocol-robustness"], graph_adjacency(graph), embedding=6, hidden=8)
        history = model.train(examples, epochs=40)
        self.assertLess(history[-1], history[0])
        self.assertIn("protocol-robustness", graph_adjacency(graph)["causal-identification"])

    def test_candidate_data_is_isolated_and_well_formed(self):
        result = lint()
        self.assertEqual(result["status"], "valid")
        self.assertGreater(result["negative_count"], 0)

    def test_candidate_partitions_keep_scenario_families_together(self):
        result = manifest()
        partitions = partitioned()
        family_sets = [{row["scenario_family"] for row in rows} for rows in partitions.values()]
        self.assertFalse(family_sets[0] & family_sets[1])
        self.assertFalse(family_sets[0] & family_sets[2])
        self.assertFalse(family_sets[1] & family_sets[2])
        self.assertTrue(all(result["counts"].values()))

    def test_candidate_selection_does_not_load_candidate_test(self):
        # The selection report is exercised once; its scope contract prevents
        # silent use of the final candidate-v1 test partition.
        report = select(ROOT)
        self.assertIn("test was not loaded", report["scope"])

    def test_doctrine_compiler_excludes_its_own_project_and_preserves_surfaces(self):
        documents = compile_corpus(ROOT)
        summary = doctrine_manifest(documents)
        self.assertTrue(documents)
        self.assertTrue(all("corpus-open-model" not in document.path for document in documents))
        self.assertIn("product", summary["documents_by_surface"])
        self.assertIn("research", summary["documents_by_surface"])

    def test_doctrine_compiler_excludes_virtual_environments(self):
        documents = compile_corpus(ROOT)
        self.assertTrue(all(not any(part.startswith(".venv") for part in document.path.split("/")) for document in documents))

    def test_doctrine_embeddings_train_on_a_small_document_set(self):
        documents = compile_corpus(ROOT)[:2]
        model = DoctrineEmbeddings(DoctrineEmbeddings.vocabulary_from(documents, limit=40), dimension=6)
        report = model.train(documents, per_document=4, negatives=1)
        self.assertGreater(report["updates"], 0)
        self.assertEqual(len(model.vector(documents[0].tokens[:4])), 6)
        self.assertIn("status", diagnostics(model))
        self.assertIn("status", prototype_diagnostics(model, ROOT))

    def test_contrastive_pairs_preserve_product_boundary_and_train(self):
        partitions = build_contrastive_pairs(ROOT)
        summary = contrastive_manifest(partitions)
        self.assertTrue(all(row["surface"] == "product" for rows in partitions.values() for row in rows))
        self.assertTrue(all(summary["counts"].values()))
        labels = sorted({row["label"] for rows in partitions.values() for row in rows})
        vocabulary = {word: index for index, word in enumerate(dict.fromkeys(partitions["train"][0]["tokens"]))}
        vectors = [[0.01] * 4 for _ in vocabulary]
        model = ContrastiveRouter(vocabulary, vectors, labels, seed=1)
        report = model.train(partitions["train"][:2], epochs=1, negatives=1)
        self.assertGreater(report["updates"], 0)

    def test_compact_transformer_profile_fits_the_stated_project_scale(self):
        profile = TinyDoctrineProfile()
        self.assertLess(parameter_estimate(profile), 35_000_000)
        self.assertEqual(profile.micro_batch_size * profile.gradient_accumulation, 32)

    def test_doctrine_documents_have_a_stable_non_overlapping_split(self):
        result = split_manifest(split_documents(compile_corpus(ROOT)))
        self.assertTrue(result["no_overlap"])
        self.assertTrue(all(result["counts"].values()))
        self.assertEqual(result["test_status"], "reserved_unobserved")

    def test_organism_environment_observes_without_attributing_agency(self):
        state = observe(ROOT)
        self.assertTrue(state["snapshot_fingerprint"])
        self.assertFalse(state["observer_boundary"]["writes_product"])
        self.assertEqual(state["observer_boundary"]["claim"], "state observation only")

    def test_metabolic_cycle_probes_are_addressable_product_materials(self):
        result = probes(ROOT)
        self.assertTrue(result)
        self.assertTrue(all(item["path"].startswith("corpus-11-tools/") for item in result))

    def test_ecological_feed_preserves_document_status_and_excludes_self_training(self):
        documents = compile_ecological_corpus(ROOT)
        summary = ecological_manifest(documents)
        self.assertTrue(documents)
        self.assertTrue(all("corpus-open-model" not in document.path for document in documents))
        self.assertIn("product_material_declared", summary["documents_by_status"])
        self.assertIn("research_bounded", summary["documents_by_status"])
        self.assertTrue(all(document.status_id >= 0 for document in documents))

    def test_ecological_split_is_new_and_excludes_observed_v1_3_test(self):
        partitions = ecological_split(compile_ecological_corpus(ROOT))
        summary = ecological_split_manifest(partitions)
        self.assertTrue(summary["no_overlap"])
        self.assertEqual(summary["v1_3_test_reuse"], "excluded_from_all_v1_4_partitions")
        self.assertEqual(summary["test_status"], "reserved_unobserved")
        self.assertTrue(partitions["excluded_v1_3_observed_test"])

    def test_relation_ablation_split_reserves_relations_and_old_tests(self):
        partitions = relation_split(compile_ecological_corpus(ROOT))
        summary = relation_split_manifest(partitions)
        self.assertTrue(summary["no_overlap"])
        self.assertEqual(summary["observed_test_reuse"], "v1_3_and_v1_4_tests_excluded_from_all_v1_5_partitions")
        self.assertGreaterEqual(summary["strata"]["validation"]["has_declared_relation"], 5)
        self.assertGreaterEqual(summary["strata"]["test"]["has_declared_relation"], 5)



if __name__ == "__main__":
    unittest.main()
