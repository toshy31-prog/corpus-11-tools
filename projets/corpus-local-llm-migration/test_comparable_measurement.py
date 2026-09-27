import copy
import unittest

from comparable_measurement import SCHEMA, compare_identities, validate

H = 'a' * 64
J = 'b' * 64


def measurement(*, wall=100, cache='warm'):
    return {
        'schema': SCHEMA,
        'model': {'provider_id': 'corpus-local', 'model_id': 'qwen3.6', 'quantization': 'q4_k_m', 'model_sha256': H},
        'runtime': {'engine': 'llama-server', 'engine_version': 'b10964', 'context_tokens': 16384, 'configuration_sha256': H},
        'gpu': {'backend': 'cuda', 'accelerator_fingerprint_sha256': H, 'vram_mib': 8188},
        'cache': {'state_before': cache, 'prefix_identity_sha256': H, 'reported_read_tokens': 8904},
        'task': {'prompt_sha256': H, 'fixture_sha256': H, 'tool_profile_sha256': H, 'verifier_contract_sha256': H},
        'outcome': {'terminal': 'completed', 'verification': 'receipt_chain_verified', 'wall_seconds': wall,
                    'tool_sequence': [{'tool': 'read', 'status': 'completed'}, {'tool': 'edit', 'status': 'completed'}, {'tool': 'bash', 'status': 'completed'}]},
    }


class ComparableMeasurementTests(unittest.TestCase):
    def test_accepts_content_free_minimum_envelope(self):
        value = validate(measurement())
        self.assertEqual(value['schema'], SCHEMA)
        self.assertEqual(value['outcome']['wall_seconds'], 100.0)

    def test_rejects_unlisted_content_or_session_fields(self):
        for section, key in [('task', 'prompt_text'), ('outcome', 'session_id'), ('outcome', 'command')]:
            value = measurement(); value[section][key] = 'secret'
            with self.assertRaises(ValueError):
                validate(value)

    def test_requires_hashes_not_raw_prompt_or_fixture_paths(self):
        for section, field, value in [('task', 'prompt_sha256', 'write this'), ('task', 'fixture_sha256', '/tmp/fixture.py')]:
            envelope = measurement(); envelope[section][field] = value
            with self.assertRaisesRegex(ValueError, 'SHA-256'):
                validate(envelope)

    def test_rejects_missing_gpu_and_invalid_tool_status(self):
        envelope = measurement(); del envelope['gpu']['vram_mib']
        with self.assertRaises(ValueError): validate(envelope)
        envelope = measurement(); envelope['outcome']['tool_sequence'][0]['status'] = 'ok'
        with self.assertRaises(ValueError): validate(envelope)

    def test_comparison_requires_cache_state_and_all_identities(self):
        baseline, candidate = measurement(wall=100), measurement(wall=80)
        result = compare_identities(baseline, candidate)
        self.assertEqual(result['comparability_state'], 'declared_comparable_not_causally_attributed')
        self.assertEqual(result['wall_seconds']['candidate_minus_baseline'], -20.0)
        changed = copy.deepcopy(candidate); changed['cache']['state_before'] = 'cold'
        result = compare_identities(baseline, changed)
        self.assertIn('cache.state_before', result['identity_mismatches'])
        self.assertEqual(result['comparability_state'], 'insufficient_for_attribution')

    def test_failed_or_unverified_run_never_becomes_comparable(self):
        candidate = measurement(wall=80); candidate['outcome']['verification'] = 'not_verified'
        result = compare_identities(measurement(), candidate)
        self.assertFalse(result['terminal_invariants_met'])
        self.assertEqual(result['comparability_state'], 'insufficient_for_attribution')


if __name__ == '__main__':
    unittest.main()
