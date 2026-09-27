import json
import os
from pathlib import Path
import tempfile
import time
import unittest
from unittest.mock import patch
import organizer as o

class OrganizerTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name);self.source=self.root/'source';self.source.mkdir()
        rules={key:(self.source if key=='legacy-captures' else self.root/'empty',label,names) for key,(_,label,names) in o.RULES.items()}
        for key,value in [('BASE',self.root/'state/organizer'),('CONFIG',self.root/'config/organizer.json'),('RULES',rules)]:
            p=patch.object(o,key,value);p.start();self.addCleanup(p.stop)
        self.file=self.source/'payload-capture-raw.json';self.file.write_text('{"local":"proof"}')
        os.utime(self.file,(time.time()-600,)*2)

    def test_preview_is_read_only(self):
        r=o.operate({'action':'preview'});self.assertEqual(r['rows'][0]['status'],'ready')
        self.assertFalse(o.BASE.exists());self.assertFalse(o.CONFIG.exists())

    def test_copy_is_verified_original_preserved_and_idempotent(self):
        original=self.file.read_bytes();r=o.run();self.assertEqual(r['copied'],1)
        self.assertEqual(Path(r['rows'][0]['destination']).read_bytes(),original)
        self.assertEqual(self.file.read_bytes(),original)
        os.utime(self.file,(time.time()-90000,)*2)
        self.assertEqual(o.run()['copied'],0)
        self.file.write_text('{"changed":true}');os.utime(self.file,(time.time()-600,)*2)
        self.assertEqual(o.run()['copied'],1)
        self.assertEqual(Path(r['rows'][0]['destination']).read_bytes(),original)

    def test_recent_file_and_symbolic_link_are_excluded(self):
        self.file.touch();self.assertEqual(o.run()['copied'],0)
        self.file.unlink();self.file.symlink_to(self.root/'outside')
        self.assertEqual(o.run()['rows'][0]['status'],'skipped')

    def test_quota_never_removes_originals(self):
        self.file.write_bytes(b'x'*(1024*1024+1));os.utime(self.file,(time.time()-600,)*2)
        c=o.settings();c['quota_mib']=1;o.operate({'action':'settings','settings':c})
        r=o.run();self.assertEqual(r['copied'],0);self.assertEqual(r['rows'][0]['status'],'quota');self.assertTrue(self.file.exists())

    def test_pause_frequency_and_disabled_rules(self):
        c=o.settings();c['enabled']=False;o.operate({'action':'settings','settings':c})
        self.assertEqual(o.run(automatic=True)['state'],'paused')
        c['enabled']=True;o.operate({'action':'settings','settings':c})
        self.assertEqual(o.run(automatic=True)['copied'],1)
        self.assertEqual(o.run(automatic=True)['state'],'not_due')
        c['rules']['legacy-captures']=False;o.operate({'action':'settings','settings':c})
        self.assertEqual(o.operate({'action':'preview'})['rows'][0]['status'],'disabled')

    def test_invalid_settings_preserve_previous_configuration(self):
        c=o.settings();o.operate({'action':'settings','settings':c});before=o.CONFIG.read_bytes()
        for key,value in [('interval_minutes',0),('quota_mib',False),('rules',{'arbitrary_path':True})]:
            bad={**c,key:value}
            with self.assertRaises(ValueError):o.operate({'action':'settings','settings':bad})
            self.assertEqual(o.CONFIG.read_bytes(),before)

    def test_corrupt_archive_not_overwritten(self):
        r=o.run();target=Path(r['rows'][0]['destination']);target.write_text('corrupt')
        self.assertEqual(o.run()['rows'][0]['status'],'skipped');self.assertEqual(target.read_text(),'corrupt')

    def test_http_status_and_error(self):
        self.assertTrue(o.response('GET',b'').startswith(b'HTTP/1.1 200'))
        self.assertTrue(o.response('POST',b'{"action":"delete"}').startswith(b'HTTP/1.1 400'))

if __name__=='__main__':unittest.main()
