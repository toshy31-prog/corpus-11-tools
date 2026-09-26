import unittest
from pathlib import Path
import tempfile
from unittest.mock import patch
import audio_generation as a
import media_generation as m


class AudioGenerationTests(unittest.TestCase):
    def test_voice_text_and_style_preserved(self):
        j = a.validate({'model': 'qwen-tts', 'prompt': 'Bonjour, été !', 'voice_style': 'Warm voice', 'seed': 42})
        cmd = a.command(j, Path('/models'), Path('/output'))
        self.assertEqual(cmd[cmd.index('--text') + 1], 'Bonjour, été !')
        self.assertEqual(cmd[cmd.index('--instruct') + 1], 'Warm voice')
        self.assertEqual(cmd[cmd.index('--language') + 1], 'French')
        self.assertIn('--max-tokens', cmd)

    def test_music_lyrics_and_duration(self):
        j = a.validate({'model': 'ace-step', 'prompt': 'piano', 'lyrics': '[Verse]\nUne lune claire', 'duration': 20})
        cmd = a.command(j, Path('/models'), Path('/output'))
        self.assertEqual(cmd[cmd.index('--lyrics') + 1], '[Verse]\nUne lune claire')
        self.assertEqual(cmd[cmd.index('--duration-seconds') + 1], '20')

    def test_invalid_or_unbounded_inputs(self):
        for override in [{'prompt': 'x'*1201}, {'language':'file:///etc/passwd'}, {'reference_job':'a'*32},
                         {'duration':121}, {'duration':True}, {'lyrics':['not','text']},
                         {'voice_style':'x'*501}, {'seed':-1}]:
            with self.assertRaises(ValueError):
                m.validate(dict({'model':'qwen-tts','prompt':'Bonjour'}, **override))

    def test_audio_uses_shared_queue_and_sandbox(self):
        j = dict(m.validate({'model':'ace-step','prompt':'$(touch /tmp/never)'}), id='a'*32)
        cmd = m.command(j)
        self.assertIn(j['prompt'],cmd)  # An argv value, never shell code.
        self.assertIn('--unshare-net',m.sandbox(cmd,m.folder(j['id'])))
        self.assertEqual(m.MODELS['ace-step']['kind'],'music')

    def test_audio_asset_requires_completed_exact_output(self):
        with tempfile.TemporaryDirectory() as root, patch.object(m,'BASE',Path(root)), patch.object(m,'JOBS',Path(root)/'jobs'):
            j = dict(m.validate({'model':'qwen-tts','prompt':'Bonjour'}), id='a'*32, created=1,state='running')
            m.folder(j['id']).mkdir(parents=True);m.save(j)
            path='/corpus/generated/'+j['id']+'/audio.wav'
            (m.folder(j['id'])/'audio.wav').write_bytes(b'RIFF')
            self.assertIn(b'404',m.asset(path))
            j.update(state='completed',output='audio.wav');m.save(j)
            self.assertIn(b'Content-Type: audio/wav',m.asset(path))
            self.assertIn(b'404',m.asset(path.replace('audio.wav','job.json')))

    def test_missing_runtime_is_not_ready(self):
        with tempfile.TemporaryDirectory() as root, patch.object(m,'BASE',Path(root)), patch.object(m,'MODEL_BASE',Path(root)/'models'):
            m.MODEL_BASE.mkdir();(m.MODEL_BASE/'qwen-tts-design.gguf').touch()
            self.assertFalse(m.ready('qwen-tts'))


if __name__ == '__main__':
    unittest.main()
