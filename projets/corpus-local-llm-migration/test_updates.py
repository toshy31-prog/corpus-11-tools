import json
import tempfile
import unittest
from contextlib import ExitStack
from pathlib import Path
from unittest.mock import patch
import update_manager as u

class Updates(unittest.TestCase):
    def test_off_by_default(self):
        with tempfile.TemporaryDirectory() as d, patch.object(u,'STATE',Path(d)/'state.json'):
            self.assertFalse(u.read()['automatic'])
            u.save({'automatic':True});self.assertTrue(u.read()['automatic'])
    def test_equal_hash_does_not_report_new_model(self):
        row={'file':'test','installed':True,'repository':'test/model','source_file':'test.gguf','sha256':'abc'}
        with tempfile.TemporaryDirectory() as d, patch.object(u,'STATE',Path(d)/'state.json'), patch.object(u,'inventory',return_value=[row]), patch.object(u,'component_inventory',return_value=[]), patch.object(u,'metadata',return_value={'sha':'newrevision','siblings':[{'rfilename':'test.gguf','lfs':{'sha256':'abc'}}]}), patch.object(u.subprocess,'run',return_value=type('Result',(),{'stdout':'Listing...\n'})()):
            u.scan();self.assertIn('inchangé',u.read()['models'][0]['status'])
    def test_metadata_failure_is_not_up_to_date(self):
        row={'file':'test','installed':True,'repository':'test/model','source_file':'test.gguf','sha256':'abc'}
        with tempfile.TemporaryDirectory() as d, patch.object(u,'STATE',Path(d)/'state.json'), patch.object(u,'inventory',return_value=[row]), patch.object(u,'component_inventory',return_value=[]), patch.object(u,'metadata',side_effect=OSError('offline')), patch.object(u.subprocess,'run',return_value=type('Result',(),{'stdout':'Listing...\n'})()):
            u.scan();self.assertIn('Échec',u.read()['models'][0]['status'])

class LocalInventory(unittest.TestCase):
    def setUp(self):
        self.stack = ExitStack()
        self.addCleanup(self.stack.close)
        self.root = Path(self.stack.enter_context(tempfile.TemporaryDirectory()))
        self.project = self.root / 'project'
        self.project.mkdir()
        for name in ('MEDIA_MODELS_LOCK.json', 'AUDIO_MODELS_LOCK.json'):
            (self.project / name).write_text('[]')
        for key, value in {'ROOT': self.root, 'PROJECT': self.project, 'STATE': self.root / 'state.json',
                           'SYSTEM_STATUS': self.root / 'dpkg-status', 'NVIDIA_VERSION': self.root / 'nvidia-version',
                           'SYSTEM_BIN': self.root / 'bin'}.items():
            self.stack.enter_context(patch.object(u, key, value))
        self.stack.enter_context(patch.object(u, 'start'))
        self.network = self.stack.enter_context(patch.object(u, 'metadata', side_effect=AssertionError('Network forbidden')))
        self.process = self.stack.enter_context(patch.object(u.subprocess, 'run', side_effect=AssertionError('Execution forbidden')))

    def write(self, path, text='fixture'):
        target = self.root / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(text)
        return target

    def get(self):
        response = u.response('GET', b'')
        self.assertTrue(response.startswith(b'HTTP/1.1 200 OK'), response)
        return json.loads(response.split(b'\r\n\r\n', 1)[1])

    def llm(self):
        path = self.write('.dev-local/corpus-local/downloads/qwen.gguf')
        self.write('.dev-local/corpus-local/installation.json', json.dumps({'artifacts': {
            path.name: {'url': 'https://huggingface.co/test/qwen/resolve/rev-1/qwen.gguf',
                        'sha256': 'a' * 64, 'bytes': path.stat().st_size}}}))
        return path

    def test_first_get_includes_installed_llm_vision_and_asr_without_network_or_execution(self):
        self.llm()
        self.write('.dev-local/corpus-local/downloads/mmproj-Qwen3.6-F16.gguf')
        self.write('.dev-local/corpus-local/voice-model-small/model.bin')
        self.write('.dev-local/corpus-local/voice-model-small/.cache/huggingface/download/model.bin.metadata',
                   'b' * 40 + '\n' + 'c' * 64 + '\n1234\n')
        self.write('.dev-local/corpus-local/voice-model/model.bin')
        state = self.get()
        rows = {row['file']: row for row in state['models']}
        self.assertEqual(set(rows), {'qwen.gguf', 'mmproj-Qwen3.6-F16.gguf', 'voice-model-small/model.bin', 'voice-model/model.bin'})
        self.assertEqual(rows['qwen.gguf']['repository'], 'test/qwen')
        self.assertEqual(rows['qwen.gguf']['revision'], 'rev-1')
        self.assertTrue(rows['qwen.gguf']['verifiable'])
        self.assertEqual(rows['mmproj-Qwen3.6-F16.gguf']['kind'], 'vision')
        asr = rows['voice-model-small/model.bin']
        self.assertEqual(asr['kind'], 'asr')
        self.assertEqual(asr['revision'], 'b' * 40)
        self.assertEqual(asr['sha256'], 'c' * 64)
        for name in ('mmproj-Qwen3.6-F16.gguf', 'voice-model-small/model.bin', 'voice-model/model.bin'):
            self.assertFalse(rows[name]['verifiable'])
            self.assertIn('Non vérifiable', rows[name]['status'])
            self.assertNotIn('repository', rows[name])
        self.network.assert_not_called()
        self.process.assert_not_called()
        self.assertFalse(u.STATE.exists(), 'A read-only inventory must not persist settings')

    def test_existing_media_inventory_keeps_missing_and_present_models(self):
        lock = [{'file': 'image.gguf', 'repository': 'test/image', 'source_file': 'image.gguf', 'sha256': 'a'},
                {'file': 'missing.gguf', 'repository': 'test/other', 'source_file': 'missing.gguf', 'sha256': 'b'}]
        (self.project / 'MEDIA_MODELS_LOCK.json').write_text(json.dumps(lock))
        self.write('.dev-local/corpus-media/models/image.gguf')
        rows = self.get()['models']
        self.assertEqual(len(rows), 2)
        self.assertTrue(rows[0]['installed'])
        self.assertFalse(rows[1]['installed'])
        self.assertEqual(rows[1]['status'], 'Absent localement')

    def test_components_exist_before_check_and_report_actual_local_presence(self):
        self.write('.dev-local/corpus-media/runtime/sd-cli')
        self.write('.dev-local/corpus-media/audio-runtime/audiocpp_cli')
        self.write('.dev-local/corpus-local/versions/opencode-v1.18.32/opencode')
        self.write('.dev-local/corpus-local/versions/llama-b10964-vulkan/llama-b10964/llama-server')
        self.write('.dev-local/corpus-office/root/libreoffice/program/soffice.bin')
        self.write('bin/pandoc')
        self.write('dpkg-status', 'Package: ffmpeg\nStatus: install ok installed\nVersion: 7.0\n\n'
                   'Package: mesa-vulkan-drivers\nStatus: install ok installed\nVersion: 24.2\n\n'
                   'Package: libreoffice-writer\nStatus: deinstall ok config-files\nVersion: old\n')
        self.write('nvidia-version', 'NVRM version: NVIDIA UNIX Open Kernel Module for x86_64  580.173.02  Release Build\n')
        rows = {row['name']: row for row in self.get()['components']}
        for name in ('stable-diffusion.cpp', 'audio.cpp', 'OpenCode', 'llama.cpp (Vulkan)', 'LibreOffice (Corpus)', 'pandoc'):
            self.assertTrue(rows[name]['installed'], name)
        self.assertFalse(rows['llama.cpp (CPU)']['installed'])
        self.assertEqual(rows['ffmpeg']['version'], '7.0')
        self.assertEqual(rows['Pilote NVIDIA chargé']['version'], '580.173.02')
        self.assertIn('mesa-vulkan-drivers', rows)
        self.assertNotIn('libreoffice-writer', rows)
        self.assertIn('non vérifiables', rows['audio.cpp']['status'])
        self.process.assert_not_called()

    def test_get_retains_checks_and_opt_in_but_invalidates_changed_model(self):
        path = self.llm()
        row = u.inventory()[0]
        row.update(status='Contenu inchangé · aucun téléchargement', remoteRevision='rev-2', remoteSha256='a' * 64)
        u.save({'automatic': True, 'checked': 123, 'models': [row], 'components': []})
        before = self.get()
        self.assertTrue(before['automatic'])
        self.assertEqual(before['checked'], 123)
        self.assertEqual(before['models'][0]['remoteRevision'], 'rev-2')
        self.assertIn('inchangé', before['models'][0]['status'])
        path.write_text('a replacement with another size')
        changed = self.get()['models'][0]
        self.assertEqual(changed['status'], 'Non vérifié')
        self.assertNotIn('remoteSha256', changed)
        path.unlink()
        self.assertEqual(self.get()['models'], [])

    def test_get_retains_package_cache_result_without_duplicate_rows(self):
        self.write('dpkg-status', 'Package: ffmpeg\nStatus: install ok installed\nVersion: 7.0\n')
        rows = u.component_inventory()
        next(row for row in rows if row['name'] == 'ffmpeg').update(status='ffmpeg new according to local cache', cachedUpgrade='ffmpeg/new')
        u.save({'components': rows, 'models': []})
        result = [row for row in self.get()['components'] if row['name'] == 'ffmpeg']
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['cachedUpgrade'], 'ffmpeg/new')
        self.write('dpkg-status', 'Package: ffmpeg\nStatus: install ok installed\nVersion: 8.0\n')
        refreshed = next(row for row in self.get()['components'] if row['name'] == 'ffmpeg')
        self.assertEqual(refreshed['version'], '8.0')
        self.assertNotIn('cachedUpgrade', refreshed)

    def test_missing_or_malformed_receipt_never_invents_model_provenance(self):
        self.llm()
        self.write('.dev-local/corpus-local/installation.json', '{invalid')
        row = self.get()['models'][0]
        self.assertFalse(row['verifiable'])
        self.assertIn('Non vérifiable', row['status'])
        self.assertEqual(u.huggingface_source('https://example.org/test/qwen/resolve/rev/qwen.gguf'), {})

    def test_scan_unknown_models_does_not_request_fake_repository(self):
        self.write('.dev-local/corpus-local/downloads/mmproj-Qwen3.6-F16.gguf')
        self.write('.dev-local/corpus-local/voice-model-small/model.bin')
        self.process.side_effect = None
        self.process.return_value = type('Result', (), {'stdout': 'Listing...\n'})()
        u.scan()
        self.network.assert_not_called()
        self.assertTrue(all('Non vérifiable' in row['status'] for row in u.read()['models']))
        self.assertTrue(u.read()['components'])
        self.assertEqual(self.process.call_args.args[0], ['apt', 'list', '--upgradable'])
if __name__=='__main__':unittest.main()
