import unittest

from cache_envelope import build_envelope, canonical_json, same_cache_prefix


class CacheEnvelopeTests(unittest.TestCase):
    def envelope(self, **changes):
        values = {
            'model': 'qwen-local',
            'tool_profile': {'id': 'edit', 'tools': ['read', 'edit', 'bash']},
            'permissions': {'bash': 'ask', 'edit': 'allow', 'network': 'deny'},
            'invariant_context': 'Corpus demeure local. Les actions sensibles demandent confirmation.',
            'variable_context': {'user': 'Lis ce fichier.', 'tool_result': None},
        }
        values.update(changes)
        return build_envelope(**values)

    def test_dynamic_turns_never_change_the_prefix_identity(self):
        first = self.envelope(variable_context={'user': 'Lis A.', 'tool_result': None})
        second = self.envelope(variable_context={'tool_result': 'A existe.', 'user': 'Puis résume.'})
        self.assertEqual(first.cache_key, second.cache_key)
        self.assertEqual(first.prefix, second.prefix)
        self.assertNotEqual(first.suffix, second.suffix)
        self.assertTrue(same_cache_prefix(first, second))
        self.assertNotIn('Lis A.', first.prefix)
        self.assertIn('Lis A.', first.suffix)

    def test_identity_includes_model_profile_permissions_and_context(self):
        baseline = self.envelope()
        variants = [
            self.envelope(model='autre-modele-local'),
            self.envelope(tool_profile={'id': 'read', 'tools': ['read']}),
            self.envelope(permissions={'bash': 'deny', 'edit': 'allow', 'network': 'deny'}),
            self.envelope(invariant_context='Autre règle stable.'),
        ]
        for variant in variants:
            self.assertNotEqual(baseline.cache_key, variant.cache_key)
            self.assertFalse(same_cache_prefix(baseline, variant))

    def test_mapping_order_cannot_change_a_deterministic_key(self):
        first = self.envelope(
            tool_profile={'tools': ['read', 'edit'], 'id': 'edit'},
            permissions={'edit': 'allow', 'network': 'deny'},
        )
        second = self.envelope(
            tool_profile={'id': 'edit', 'tools': ['read', 'edit']},
            permissions={'network': 'deny', 'edit': 'allow'},
        )
        self.assertEqual(first.cache_key, second.cache_key)
        self.assertEqual(first.prefix, second.prefix)
        self.assertEqual(canonical_json({'b': 1, 'a': 2}), '{"a":2,"b":1}')

    def test_metadata_contains_no_variable_content(self):
        envelope = self.envelope(variable_context={'user': 'secret de travail', 'tool_result': 'résultat privé'})
        metadata = envelope.cache_metadata()
        self.assertEqual(set(metadata), {'format_version', 'model', 'cache_key', 'invariant_context_sha256'})
        self.assertNotIn('secret de travail', str(metadata))
        self.assertNotIn('résultat privé', str(metadata))

    def test_invalid_or_nondeterministic_inputs_are_rejected(self):
        with self.assertRaises(ValueError):
            self.envelope(model='')
        with self.assertRaises(ValueError):
            self.envelope(invariant_context=None)
        with self.assertRaises(ValueError):
            self.envelope(permissions={'limit': 0.5})
        with self.assertRaises(ValueError):
            canonical_json({1: 'clé non textuelle'})


if __name__ == '__main__':
    unittest.main()
