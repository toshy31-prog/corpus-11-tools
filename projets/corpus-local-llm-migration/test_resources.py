import tempfile
import unittest
from pathlib import Path
import local_resources as r

class ResourcesTests(unittest.TestCase):
    def test_snapshot_real_units_and_totals(self):
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'meminfo'
            path.write_text('MemTotal: 1000 kB\nMemAvailable: 250 kB\n')
            stats=lambda _: {'metrics':{'tokens':{'a':[2,3]},'turns':{'a':[1,1]}},'counters':{'tokens_missing':1},'sessions':4}
            result=r.snapshot(Path(directory),path,stats)
            self.assertEqual(result['memory'],{'total':1024000,'available':256000})
            self.assertEqual(result['activity']['tokens'],5)
            self.assertEqual(result['activity']['turns'],2)
            self.assertGreater(result['disk']['total'],0)
    def test_missing_sources_are_not_zero_measurements(self):
        def unavailable(_):raise OSError()
        result=r.snapshot(Path('/does-not-exist-corpus'),Path('/does-not-exist-corpus'),unavailable)
        self.assertIsNone(result['memory'])
        self.assertIsNone(result['disk'])
        self.assertIsNone(result['activity'])
        self.assertEqual(len(result['errors']),3)
    def test_mutations_not_allowed(self):
        self.assertIn(b'405 Method Not Allowed',r.response('POST',b'{}'))
