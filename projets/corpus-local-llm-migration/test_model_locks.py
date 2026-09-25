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

    def test_producers_target_canonical_model_roots(self):
        install_local = (HERE/'install_local.py').read_text()
        install_media = (HERE/'install_media.py').read_text()
        install_audio = (HERE/'install_audio.py').read_text()
        updater = (HERE/'update_manager.py').read_text()
        self.assertIn('LLM_MODELS_ROOT', install_local)
        self.assertIn('mmproj-Qwen3.6-F16.gguf', install_local)
        self.assertNotIn('Qwen3.8-27B-UD-Q5_K_M.gguf', install_local)
        self.assertIn('MEDIA_MODELS_ROOT', install_media)
        self.assertIn('MEDIA_MODELS_ROOT', install_audio)
        self.assertIn("PROJECT / 'CORE_MODELS_LOCK.json'", updater)
        self.assertIn('MEDIA_MODELS_ROOT', updater)

    def test_core_lock_has_hot_and_cold_semantics(self):
        rows = self.load('CORE_MODELS_LOCK.json')
        by_id = {row['id']: row for row in rows}
        self.assertEqual(by_id['qwen3.6-35b-a3b-ud-q4-k-m']['tier'], 'hot')
        self.assertEqual(by_id['qwen3.6-mmproj-f16']['sha256'], '8971ee4f331ff0a4c609374f32984b3d4e6dc086c0aa35f1d637fad1829e887f')
        self.assertEqual(by_id['faster-whisper-small']['revision'], '536b0662742c02347bc0e980a01041f333bce120')
        self.assertEqual(by_id['qwen3.8-27b-ud-q5-k-m']['tier'], 'cold')
        self.assertIsNone(by_id['qwen3.8-27b-ud-q5-k-m']['relative'])

if __name__ == '__main__': unittest.main()
