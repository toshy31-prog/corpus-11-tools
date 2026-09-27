import json
import sqlite3
import tempfile
import unittest
from pathlib import Path

from cache_latency import summarize


class CacheLatencyTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.db = Path(self.tmp.name) / 'history.db'
        with sqlite3.connect(self.db) as connection:
            connection.execute('create table message(id text,time_created integer,data text)')
            def row(identifier, created, completed, read=None):
                tokens = {'cache': {'read': read}} if read is not None else {}
                data = {'role': 'assistant', 'private_text': 'ne jamais retourner', 'tokens': tokens,
                        'time': {'completed': completed}}
                connection.execute('insert into message values(?,?,?)', (identifier, created, json.dumps(data)))
            row('cold-a', 1_000, 5_000)
            row('cold-b', 10_000, 20_000)
            row('warm-a', 30_000, 32_000, 100)
            row('warm-b', 40_000, 46_000, 250)
            row('unfinished', 50_000, None)
            connection.execute('insert into message values(?,?,?)', ('user', 60_000, json.dumps({'role': 'user'})))

    def tearDown(self):
        self.tmp.cleanup()

    def test_groups_durations_without_returning_message_content(self):
        result = summarize(self.db, 0, 70_000)
        self.assertTrue(result['available'])
        self.assertEqual(result['groups']['without_reported_cache_read'], {'steps': 2, 'median_duration_seconds': 7.0})
        self.assertEqual(result['groups']['with_reported_cache_read'], {'steps': 2, 'median_duration_seconds': 4.0})
        self.assertNotIn('ne jamais retourner', json.dumps(result))

    def test_absent_database_remains_unavailable(self):
        result = summarize(Path(self.tmp.name) / 'absent.db', 0, 1)
        self.assertEqual(result, {'available': False})


if __name__ == '__main__':
    unittest.main()
