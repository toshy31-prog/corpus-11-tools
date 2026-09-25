"""Le prompt principal exclut seulement les consignes de délégation."""

import unittest

import corpus_local


class PrimaryContextTests(unittest.TestCase):
    def test_only_delegation_section_is_removed(self):
        context = corpus_local.primary_context()

        self.assertNotIn("## Sous-tâches déléguées", context)
        self.assertNotIn("subagent_type=corpus-worker", context)

        self.assertIn(
            "## Génération locale d’images et de vidéos",
            context,
        )
        self.assertIn("media_generate", context)

        self.assertIn("## Génération de voix et musique", context)
        self.assertIn("qwen-tts", context)

        self.assertIn("## Documents libres locaux", context)
        self.assertIn("document_extract", context)

    def test_primary_context_is_full_context_minus_delegation_block(self):
        text = (corpus_local.HERE / "CONTEXTE_LOCAL.md").read_text()
        start = "\n## Sous-tâches déléguées\n"
        end = "\n## Génération locale d’images et de vidéos\n"

        before, sep1, remainder = text.partition(start)
        _, sep2, after = remainder.partition(end)

        self.assertTrue(sep1)
        self.assertTrue(sep2)

        expected = before.rstrip() + "\n" + end + after
        self.assertEqual(corpus_local.primary_context(), expected)


if __name__ == "__main__":
    unittest.main()
