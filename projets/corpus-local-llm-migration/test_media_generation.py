import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import media_generation as m

class MediaGenerationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.base = patch.object(m, 'BASE', Path(self.tmp.name)); self.base.start()
    def tearDown(self):
        self.base.stop(); self.tmp.cleanup()
    def test_reject_paths_and_unbounded_work(self):
        for identifier in ['../../secret', '/etc/passwd', '', None]:
            with self.assertRaises(ValueError): m.folder(identifier)
        for values in [{'model':'arbitrary'}, {'width':4096}, {'frames':10000}, {'width':512,'height':512,'model':'wan-5b'}, {'seed':-1}, {'prompt':''}]:
            with self.assertRaises(ValueError): m.validate(dict({'prompt':'test'}, **values))
    def test_no_shell_or_arbitrary_model(self):
        j=dict(m.validate({'prompt':'$(touch /tmp/nope); hello'}),id='a'*32,has_reference=False)
        cmd=m.command(j)
        self.assertNotIn(j['prompt'],cmd)
        self.assertIn('--prompt-file',cmd)
        self.assertIn('--unshare-net',m.sandbox(cmd,m.folder(j['id'])))
    def test_assets_only_completed_output(self):
        j=dict(m.validate({'prompt':'test'}),id='a'*32,created=1,state='running')
        m.folder(j['id']).mkdir(parents=True);m.save(j)
        self.assertIn(b'404',m.asset('/corpus/generated/'+j['id']+'/image.png'))
        j.update(state='completed',output='image.png');m.save(j)
        (m.folder(j['id'])/'image.png').write_bytes(b'PNG')
        self.assertIn(b'200 OK',m.asset('/corpus/generated/'+j['id']+'/image.png'))
        self.assertIn(b'404',m.asset('/corpus/generated/'+j['id']+'/../../job.json'))
    def test_cancel_queued_and_preserve_terminal(self):
        j=dict(m.validate({'prompt':'test'}),id='b'*32,created=1,state='queued')
        m.folder(j['id']).mkdir(parents=True);m.save(j)
        with patch.object(m,'start'):
            self.assertEqual(m.operate({'action':'cancel','id':j['id']})['state'],'cancelled')
            self.assertEqual(m.operate({'action':'cancel','id':j['id']})['state'],'cancelled')
    def test_malformed_request(self):
        with patch.object(m, 'start'):
            self.assertIn(b'400 Bad Request', m.response('POST', b'[]'))
            self.assertIn(b'400 Bad Request', m.response('POST', b'{'))
    def test_video_profile_is_validated_fastwan(self):
        j=dict(m.validate({'prompt':'test','model':'wan-5b'}),id='d'*32,has_reference=False)
        cmd=m.command(j)
        self.assertEqual((j['width'],j['height'],j['steps'],j['fps']),(832,480,3,24))
        self.assertIn(str(m.BASE/'models/fastwan-5b.gguf'),cmd)
        self.assertIn('--tae',cmd)
        self.assertEqual(cmd[cmd.index('--scheduler')+1],'lcm')
    def test_reference_validation(self):
        for value in ['file:///etc/passwd','data:image/png;base64,bm90YW5pbWFnZQ==','data:image/png;base64,***']:
            with self.assertRaises(ValueError):m.reference({'reference':value})
    def test_restart_marks_running_interrupted(self):
        j=dict(m.validate({'prompt':'test'}),id='c'*32,created=1,state='running')
        m.folder(j['id']).mkdir(parents=True);m.save(j)
        with patch.object(m,'STARTED',False),patch.object(m.threading,'Thread'):
            m.start()
        self.assertEqual(m.read(j['id'])['state'],'failed')
    def test_queue_is_bounded(self):
        (m.BASE/'runtime').mkdir();(m.BASE/'runtime/sd-cli').touch();(m.BASE/'models').mkdir()
        for file in m.MODELS['flux-klein']['files']:(m.BASE/'models'/file).touch()
        with patch.object(m,'start'),patch.object(m.shutil,'disk_usage') as usage:
            usage.return_value.free=3*1024**3
            for _ in range(4):m.create({'prompt':'test'})
            with self.assertRaises(ValueError):m.create({'prompt':'fifth'})

if __name__=='__main__':unittest.main()
