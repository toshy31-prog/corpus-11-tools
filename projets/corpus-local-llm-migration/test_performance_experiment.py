import unittest

from performance_experiment import evaluate


class PerformanceExperimentTests(unittest.TestCase):
    def manifest(self):
        environment = {
            'engine': 'llama-server', 'engine_version': 'observed-version',
            'model': 'qwen', 'model_sha256': 'model', 'quantization': 'Q4',
            'context_tokens': 16384, 'prompt_sha256': 'prompt',
            'tool_profile_sha256': 'tools', 'fixture_sha256': 'fixture',
        }
        def run(value, wall):
            return {
                'configuration': {'reasoning_budget': value, 'n_gpu_layers': 99, 'cpu_moe': 'all'},
                'environment': dict(environment),
                'timing': {'wall_seconds_from_transcript': wall},
                'verification': {'execution_chain_verified': True},
                'runtime': {'terminal': 'completed', 'service_health_after': 'ready', 'cuda_errors': []},
            }
        return {
            'experiment': 'reasoning-budget',
            'variation': {'key': 'reasoning_budget', 'baseline': 512, 'candidate': 0},
            'baseline': run(512, 100), 'candidate': run(0, 80),
        }

    def test_accepts_one_faster_healthy_variation_for_review(self):
        verdict = evaluate(self.manifest())
        self.assertEqual(verdict['outcome'], 'eligible_for_human_review')
        self.assertEqual(verdict['wall_reduction_pct'], 20.0)

    def test_recommends_rollback_when_second_configuration_changes(self):
        manifest = self.manifest()
        manifest['candidate']['configuration']['cpu_moe'] = 30
        verdict = evaluate(manifest)
        self.assertEqual(verdict['outcome'], 'rollback_recommended')
        self.assertIn('multiple_configuration_changes:cpu_moe', verdict['blocking_reasons'])

    def test_recommends_rollback_on_cuda_error_even_if_faster(self):
        manifest = self.manifest()
        manifest['candidate']['runtime']['cuda_errors'] = ['illegal memory access']
        verdict = evaluate(manifest)
        self.assertEqual(verdict['outcome'], 'rollback_recommended')
        self.assertIn('cuda_error_observed', verdict['blocking_reasons'])

    def test_rejects_a_baseline_that_was_already_unhealthy(self):
        manifest = self.manifest()
        manifest['baseline']['runtime']['service_health_after'] = 'unavailable'
        verdict = evaluate(manifest)
        self.assertEqual(verdict['outcome'], 'rollback_recommended')
        self.assertIn('baseline_service_not_ready_after', verdict['blocking_reasons'])

    def test_recommends_rollback_when_an_immutable_is_unrecorded(self):
        manifest = self.manifest()
        del manifest['candidate']['environment']['prompt_sha256']
        verdict = evaluate(manifest)
        self.assertEqual(verdict['outcome'], 'rollback_recommended')
        self.assertIn('environment_changed:prompt_sha256', verdict['blocking_reasons'])

    def test_is_inconclusive_without_threshold_gain(self):
        manifest = self.manifest()
        manifest['candidate']['timing']['wall_seconds_from_transcript'] = 96
        verdict = evaluate(manifest)
        self.assertEqual(verdict['outcome'], 'inconclusive')

    def test_rejects_wrong_variation_value(self):
        manifest = self.manifest()
        manifest['candidate']['configuration']['reasoning_budget'] = 128
        with self.assertRaisesRegex(ValueError, 'candidate'):
            evaluate(manifest)


if __name__ == '__main__':
    unittest.main()
