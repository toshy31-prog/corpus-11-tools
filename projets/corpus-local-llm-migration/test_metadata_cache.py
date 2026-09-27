import json
import os
from pathlib import Path
from tempfile import TemporaryDirectory
from concurrent.futures import ThreadPoolExecutor
import unittest
from unittest.mock import patch

from metadata_cache import JsonMetadataCache


class MetadataCacheTests(unittest.TestCase):
    def test_repeated_reads_and_callers_cannot_mutate_cache(self):
        with TemporaryDirectory() as directory:
            path = Path(directory) / 'profiles.json'
            path.write_text('{"tools": ["read"]}')
            cache = JsonMetadataCache()
            cache.read(path)['tools'].append('edit')
            with patch.object(Path, 'read_text', side_effect=AssertionError('read twice')):
                with ThreadPoolExecutor(max_workers=4) as pool:
                    results = list(pool.map(cache.read, [path] * 12))
            self.assertTrue(all(row == {'tools': ['read']} for row in results))

    def test_atomic_replacement_same_size_and_mtime_invalidates(self):
        with TemporaryDirectory() as directory:
            path = Path(directory) / 'profiles.json'
            path.write_text('{"n":1}')
            cache = JsonMetadataCache()
            self.assertEqual(cache.read(path), {'n': 1})
            old = path.stat()
            replacement = path.with_suffix('.tmp')
            replacement.write_text('{"n":2}')
            os.utime(replacement, ns=(old.st_atime_ns, old.st_mtime_ns))
            replacement.replace(path)
            self.assertEqual(cache.read(path), {'n': 2})
            path.write_text('{"n":3}')
            self.assertEqual(cache.read(path), {'n': 3})

    def test_corruption_or_deletion_never_returns_cached_policy(self):
        with TemporaryDirectory() as directory:
            path = Path(directory) / 'profiles.json'
            path.write_text('{"n":1}')
            cache = JsonMetadataCache()
            cache.read(path)
            path.write_text('broken')
            with self.assertRaises(json.JSONDecodeError):
                cache.read(path)
            path.unlink()
            with self.assertRaises(FileNotFoundError):
                cache.read(path)


if __name__ == '__main__':
    unittest.main()
