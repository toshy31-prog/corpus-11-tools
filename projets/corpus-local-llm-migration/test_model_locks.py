import json
from pathlib import Path
import unittest
import media_generation

HERE = Path(__file__).resolve().parent

class ModelLockTests(unittest.TestCase):
    def load(self, name):
        return json.loads((HERE / name).read_text())

    def test_media_audio_locks_equal_active_profiles(self):
        active = {f for profile in media_generation.MODELS.values() for f in profile.get('files', [])}
        locked = {row['file'] for name in ('MEDIA_MODELS_LOCK.json', 'AUDIO_MODELS_LOCK.json') for row in self.load(name)}
        self.assertEqual(active, locked)
        self.assertNotIn('wan-5b.gguf', locked)
        self.assertNotIn('wan-vae.safetensors', locked)

    def test_core_lock_has_hot_and_cold_semantics(self):
        rows = self.load('CORE_MODELS_LOCK.json')
        by_id = {row['id']: row for row in rows}
        self.assertEqual(by_id['qwen3.6-35b-a3b-ud-q4-k-m']['tier'], 'hot')
        self.assertEqual(by_id['qwen3.6-mmproj-f16']['sha256'], '8971ee4f331ff0a4c609374f32984b3d4e6dc086c0aa35f1d637fad1829e887f')
        self.assertEqual(by_id['faster-whisper-small']['revision'], '536b0662742c02347bc0e980a01041f333bce120')
        self.assertEqual(by_id['qwen3.8-27b-ud-q5-k-m']['tier'], 'cold')
        self.assertIsNone(by_id['qwen3.8-27b-ud-q5-k-m']['relative'])

if __name__ == '__main__': unittest.main()
