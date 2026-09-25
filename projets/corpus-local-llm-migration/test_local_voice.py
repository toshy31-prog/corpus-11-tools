import unittest
from unittest.mock import patch
import local_voice

class VoiceTests(unittest.TestCase):
    def test_invalid_audio(self):
        for data in [{}, {'audio':''}, {'audio':'!bad'}]:
            with self.assertRaises(ValueError): local_voice.transcribe(data)
    def test_transcribe_passes_canonical_path_contract(self):
        fake = type('Result', (), {'stdout': b'{\"text\":\"\",\"language\":\"fr\"}'})()
        with patch.object(local_voice.subprocess, 'run', return_value=fake) as proc:
            local_voice.transcribe({'audio':'YWJj'})
        env = proc.call_args.kwargs['env']
        for key in ('CORPUS_HOST_HOME','CORPUS_RUNTIME_ROOT','CORPUS_MODELS_ROOT'):
            self.assertIn(key, env)

    def test_method(self):
        self.assertIn(b'405',local_voice.response('DELETE',b''))
    def test_invalid_json(self):
        self.assertIn(b'400',local_voice.response('POST',b'no'))
    def test_concurrent_request(self):
        local_voice.LOCK.acquire()
        try:
            with self.assertRaises(ValueError):local_voice.transcribe({'audio':'YWJj'})
        finally:local_voice.LOCK.release()
    def test_api(self):
        with patch.object(local_voice,'transcribe',return_value={'text':'Bonjour','language':'fr'}):
            result=local_voice.response('POST',b'{"audio":"YWJj"}')
            self.assertIn(b'200 OK',result);self.assertIn(b'Bonjour',result)
    def test_invalid_speech(self):
        for text in [None,'',123,'a'*4001]:
            with self.assertRaises(ValueError):local_voice.synthesize({'text':text})
    def test_speech_api(self):
        with patch.object(local_voice,'synthesize',return_value={'audio':'YQ==','mime':'audio/wav'}):
            self.assertIn(b'audio/wav',local_voice.response('POST',b'{"operation":"speak","text":"Bonjour"}'))
