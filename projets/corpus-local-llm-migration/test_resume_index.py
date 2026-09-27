import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from resume_index import list_records, _CACHE


class ResumeIndexTests(unittest.TestCase):
    def test_search_before_pagination_and_stable_sort(self):
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            for i in range(55):
                item = {'project': '/Corpus', 'created_at': i,
                        'checkpoint': {'objective': 'Mémoire ancienne' if i == 0 else 'Projet', 'next_step': 'Lire'}}
                (base / (f'{i:032x}.json')).write_text(json.dumps(item))
            self.assertEqual(list_records(base, {'query': 'memoire lire'})['total'], 1)
            result = list_records(base, {'offset': 25, 'limit': 25})
            self.assertEqual(result['total'], 55)
            self.assertTrue(result['has_more'])
            self.assertEqual(result['records'][0]['created_at'], 29)
            self.assertEqual(list_records(base, {'sort': 'oldest'})['records'][0]['created_at'], 0)

    def test_cache_refresh_and_malformed_isolation(self):
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            path = base / ('a' * 32 + '.json')
            item = {'project': '/Corpus', 'created_at': 1, 'checkpoint': {'objective': 'Avant'}}
            path.write_text(json.dumps(item))
            list_records(base)
            with patch('resume_index.json.loads', side_effect=AssertionError('unchanged packet decoded')):
                self.assertEqual(list_records(base)['total'], 1)
            item['checkpoint']['objective'] = 'Après modification'
            path.write_text(json.dumps(item))
            (base / ('b' * 32 + '.json')).write_text('{')
            result = list_records(base)
            self.assertEqual(result['records'][0]['objective'], 'Après modification')
            self.assertEqual(result['skipped'], 1)
            path.unlink()
            self.assertEqual(list_records(base)['total'], 0)

    def test_invalid_options(self):
        for options in ({'limit': 101}, {'offset': -1}, {'limit': True}, {'sort': 'anything'}):
            with self.assertRaises(ValueError):
                list_records('/does-not-exist', options)


if __name__ == '__main__':
    unittest.main()
