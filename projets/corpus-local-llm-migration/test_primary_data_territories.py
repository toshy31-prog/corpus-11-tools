from pathlib import Path
import unittest
import corpus_paths

HERE=Path(__file__).resolve().parent

class PrimaryDataTerritoryTests(unittest.TestCase):
    def test_producers_use_data_roots(self):
        imported=(HERE/'file_import.py').read_text()
        documents=(HERE/'document_generation.py').read_text()
        self.assertIn('ATTACHMENTS_DATA_ROOT',imported)
        self.assertIn('DOCUMENTS_DATA_ROOT',documents)
        self.assertNotIn("BASE=RUNTIME_ROOT/'corpus-attachments'",imported.splitlines())
        self.assertNotIn("BASE=RUNTIME_ROOT/'corpus-documents'",documents.splitlines())

    def test_attachment_public_paths_keep_compatibility_alias(self):
        imported=(HERE/'file_import.py').read_text()
        self.assertIn("COMPAT_BASE=RUNTIME_ROOT/'corpus-attachments'",imported)

    def test_sandbox_exposes_primary_data(self):
        local=(HERE/'corpus_local.py').read_text()
        self.assertIn('DATA_ROOT',local)
        self.assertIn("['--bind', str(DATA_ROOT), str(DATA_ROOT)]",local)

if __name__=='__main__': unittest.main()
