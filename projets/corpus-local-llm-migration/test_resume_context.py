import copy
import json
import tempfile
import unittest
from pathlib import Path

from project_resume import build


class ResumeContextTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.text = ''.join(f'Ligne {i} — contenu exact à conserver.\n' for i in range(1, 201))
        (self.root / 'notes.md').write_text(self.text)
        self.record = {'schema_version': 1, 'objective': 'Continuer', 'next_step': 'Lire',
                       'memory': [{'path': 'notes.md'}], 'tools': ['read']}
        self.catalog = {'tools': {'read': {}}}

    def packet(self, record=None):
        return build(record or self.record, self.root, self.catalog)

    def test_exact_excerpt_reduces_context_preserves_provenance_and_roundtrips(self):
        full = self.packet()
        self.record['memory'][0].update(start_line=10, end_line=25)
        part = self.packet()
        content = json.loads(part['message']['parts'][0]['text'].split('\n', 1)[1])
        note = content['memory'][0]
        self.assertEqual(note['text'], ''.join(self.text.splitlines(keepends=True)[9:25]))
        self.assertTrue(note['excerpt'])
        self.assertEqual(note['source_lines'], 200)
        self.assertEqual(note['sha256'], full['checkpoint']['memory'][0]['sha256'])
        self.assertLess(part['context_budget']['prompt_chars'], full['context_budget']['prompt_chars'])
        self.assertEqual(self.packet(part['checkpoint'])['message'], part['message'])

    def test_full_notes_remain_exact_and_duplicates_are_not_injected_twice(self):
        self.record['memory'].append({'path': './notes.md'})
        packet = self.packet()
        notes = json.loads(packet['message']['parts'][0]['text'].split('\n', 1)[1])['memory']
        self.assertEqual(len(notes), 1)
        self.assertEqual(notes[0]['text'], self.text)
        self.assertFalse(notes[0]['excerpt'])
        self.assertEqual(packet['context_budget']['duplicate_entries_skipped'], 1)

    def test_changed_source_outside_excerpt_still_requires_review(self):
        self.record['memory'][0].update(start_line=10, end_line=25)
        checkpoint = self.packet()['checkpoint']
        (self.root / 'notes.md').write_text(self.text + 'Modification ailleurs\n')
        with self.assertRaisesRegex(ValueError, 'Memory changed'):
            self.packet(checkpoint)

    def test_invalid_or_stale_ranges_are_rejected_without_silent_truncation(self):
        for fields in ({'start_line': 0, 'end_line': 2}, {'start_line': 3, 'end_line': 2},
                       {'start_line': 1, 'end_line': 201}, {'start_line': True, 'end_line': 2},
                       {'start_line': 1}, {'end_line': 2}, {'start_line': '1', 'end_line': 2}):
            record = copy.deepcopy(self.record)
            record['memory'][0].update(fields)
            with self.subTest(fields=fields), self.assertRaisesRegex(ValueError, 'line range'):
                self.packet(record)


if __name__ == '__main__':
    unittest.main()
