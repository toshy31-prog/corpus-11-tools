from pathlib import Path
import unittest
import corpus_paths
import media_generation

HERE=Path(__file__).resolve().parent

class MediaTerritoryTests(unittest.TestCase):
    def test_media_jobs_are_primary_data(self):
        self.assertEqual(media_generation.JOBS,corpus_paths.MEDIA_JOBS_DATA_ROOT)
        self.assertNotEqual(media_generation.JOBS,corpus_paths.MEDIA_RUNTIME_ROOT/'jobs')

    def test_installers_use_download_cache(self):
        media=(HERE/'install_media.py').read_text()
        audio=(HERE/'install_audio.py').read_text()
        self.assertIn("MEDIA_DOWNLOAD_CACHE_ROOT/'runtime.zip'",media)
        self.assertIn("MEDIA_DOWNLOAD_CACHE_ROOT / 'audio-runtime.tar.gz'",audio)
        self.assertNotIn("RUNTIME_BASE/'runtime.zip'",media)
        self.assertNotIn("BASE / 'audio-runtime.tar.gz'",audio)

if __name__=='__main__': unittest.main()
