import copy
import unittest

from model_routing import ModelRoutingError, decide, load_registry, validate_registry


def request(**overrides):
    value = {'mode': 'auto', 'input_modality': 'text', 'requires_tool_call': False, 'context_tokens': 4096,
             'budget': {'allow_cold_restore': False, 'allow_unmeasured_reasoning': False}}
    value.update(overrides)
    return value


class ModelRoutingTests(unittest.TestCase):
    def test_direct_hot_profile_is_default_without_claiming_performance(self):
        result = decide(request())
        self.assertEqual(result['decision'], 'select_configured_profile')
        self.assertEqual(result['selected']['id'], 'qwen3.6-direct-local')
        self.assertEqual(result['execution'], 'not_started')
        self.assertEqual(result['runtime_change'], 'none')
        self.assertIn('latency_unmeasured_for_new_task', result['selected']['limits'])

    def test_reflexion_requires_explicit_unmeasured_budget(self):
        deferred = decide(request(mode='reflexion'))
        self.assertEqual(deferred['decision'], 'defer_no_eligible_profile')
        accepted = decide(request(mode='reflexion', budget={'allow_cold_restore': False, 'allow_unmeasured_reasoning': True}))
        self.assertEqual(accepted['selected']['id'], 'qwen3.6-reflexion-local')

    def test_cold_candidate_is_never_activated_by_decision(self):
        result = decide(request(mode='direct', budget={'allow_cold_restore': True, 'allow_unmeasured_reasoning': False}))
        self.assertEqual(result['selected']['id'], 'qwen3.6-direct-local')
        cold = next(item for item in result['deferred'] if item['id'] == 'qwen3.8-cold-comparator')
        self.assertIn('profil_froid_non_actif', cold['reasons'])
        self.assertIn('restauration_froide_permise_mais_non_exécutée', cold['reasons'])

    def test_context_and_tool_boundary_are_checked_without_permissions(self):
        result = decide(request(requires_tool_call=True, context_tokens=16385))
        self.assertEqual(result['decision'], 'defer_no_eligible_profile')
        self.assertIn('n’autorise ni n’exécute aucun outil', result['tool_boundary'])

    def test_registry_must_match_locked_model_tier(self):
        profiles = load_registry()
        bad = copy.deepcopy(profiles)
        bad[0]['tier'] = 'cold'
        # Load raw lock rows only to exercise registry validation directly.
        import json
        from model_routing import DEFAULT_LOCK
        with self.assertRaisesRegex(ModelRoutingError, 'Tier'):
            validate_registry({'schema_version': 1, 'profiles': bad}, json.loads(DEFAULT_LOCK.read_text()))


if __name__ == '__main__':
    unittest.main()
