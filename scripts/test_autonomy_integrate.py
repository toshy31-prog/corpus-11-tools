"""Exercise delivery in independent temporary directories, never the real repo."""
import json
from contextlib import redirect_stdout
import io
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

import autonomy_integrate as delivery


class DeliveryTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.source, self.target = self.root / 'source', self.root / 'target'
        for root in (self.source, self.target):
            root.mkdir()
            (root / 'code.txt').write_text('before')
            (root / 'dependency.txt').write_text('dependency')
            (root / 'unrelated.txt').write_text('keep concurrent work')

    def prepare(self, files=None, watch=None, checks=None):
        return delivery.prepare(self.source, self.target, files or ['code.txt'], watch or [],
                                checks or [[sys.executable, '-c', 'pass']], 'A useful tested change')

    def change(self):
        (self.source / 'code.txt').write_text('after')

    def test_deliver_test_in_both_roots_and_restore(self):
        command = [sys.executable, '-c',
                   "from pathlib import Path; assert Path('code.txt').read_text() == 'after'"]
        batch = self.prepare(checks=[command])
        self.change()
        receipt, result = delivery.apply(batch)
        self.assertEqual(result['status'], 'integrated')
        self.assertEqual((self.target / 'code.txt').read_text(), 'after')
        self.assertEqual(result['target_checks'][0]['returncode'], 0)
        self.assertEqual(result['candidate_checks'][0]['returncode'], 0)
        self.assertEqual((self.target / 'unrelated.txt').read_text(), 'keep concurrent work')
        self.assertEqual(delivery.recover(receipt)['status'], 'rolled_back')
        self.assertEqual((self.target / 'code.txt').read_text(), 'before')

    def test_unrelated_target_edits_are_preserved(self):
        batch = self.prepare(); self.change()
        (self.target / 'unrelated.txt').write_text('new parallel work')
        delivery.apply(batch)
        self.assertEqual((self.target / 'unrelated.txt').read_text(), 'new parallel work')

    def test_stale_copy_rejected_before_prepare(self):
        self.change()
        with self.assertRaisesRegex(delivery.Blocked, 'Synchronize'):
            self.prepare()

    def test_changed_target_refuses_whole_batch(self):
        batch = self.prepare(); self.change()
        (self.target / 'code.txt').write_text('other task')
        with self.assertRaises(delivery.Blocked):
            delivery.apply(batch)
        self.assertEqual((self.target / 'code.txt').read_text(), 'other task')

    def test_watched_dependency_changes_block_delivery(self):
        for root in (self.source, self.target):
            with self.subTest(root=root):
                batch = self.prepare(watch=['dependency.txt']); self.change()
                (root / 'dependency.txt').write_text('changed')
                with self.assertRaises(delivery.Blocked):
                    delivery.apply(batch)
                self.assertEqual((self.target / 'code.txt').read_text(), 'before')
                (root / 'dependency.txt').write_text('dependency')
                (self.source / 'code.txt').write_text('before')

    def test_failed_candidate_never_writes_target(self):
        batch = self.prepare(checks=[[sys.executable, '-c', 'raise SystemExit(1)']]); self.change()
        _, result = delivery.apply(batch)
        self.assertEqual(result['status'], 'candidate_failed')
        self.assertEqual((self.target / 'code.txt').read_text(), 'before')

    def test_failed_target_rolls_back_new_and_existing_files(self):
        command = [sys.executable, '-c',
                   "from pathlib import Path; raise SystemExit(Path.cwd().name == 'target')"]
        batch = self.prepare(files=['code.txt', 'new.txt'], checks=[command])
        self.change(); (self.source / 'new.txt').write_text('new')
        _, result = delivery.apply(batch)
        self.assertEqual(result['status'], 'rolled_back')
        self.assertEqual((self.target / 'code.txt').read_text(), 'before')
        self.assertFalse((self.target / 'new.txt').exists())

    def test_cli_failed_delivery_returns_failure_even_when_rollback_succeeds(self):
        command = [sys.executable, '-c',
                   "from pathlib import Path; raise SystemExit(Path.cwd().name == 'target')"]
        batch = self.prepare(checks=[command]); self.change()
        with patch.object(sys, 'argv', ['delivery', 'apply', str(batch)]), redirect_stdout(io.StringIO()):
            self.assertEqual(delivery.main(), 1)
        self.assertEqual((self.target / 'code.txt').read_text(), 'before')

    def test_rollback_preserves_newer_edit_and_blocks_next_delivery(self):
        command = [sys.executable, '-c',
                   "from pathlib import Path; p=Path('code.txt'); "
                   "p.write_text('concurrent') if Path.cwd().name == 'target' else None; "
                   "raise SystemExit(Path.cwd().name == 'target')"]
        batch = self.prepare(checks=[command]); self.change()
        _, result = delivery.apply(batch)
        self.assertEqual(result['status'], 'rollback_blocked')
        self.assertEqual(result['conflicts'], ['code.txt'])
        self.assertEqual((self.target / 'code.txt').read_text(), 'concurrent')
        (self.source / 'code.txt').write_text('concurrent')
        new_batch = self.prepare(); self.change()
        with self.assertRaisesRegex(delivery.Blocked, 'Unresolved'):
            delivery.apply(new_batch)

    def test_interrupted_partial_write_can_be_recovered(self):
        batch = self.prepare(files=['code.txt', 'new.txt']); self.change()
        (self.source / 'new.txt').write_text('new')
        original = delivery.atomic
        def interrupt(path, data, mode=0o600):
            if path == self.target / 'new.txt':
                raise KeyboardInterrupt()
            return original(path, data, mode)
        with patch.object(delivery, 'atomic', interrupt), self.assertRaises(KeyboardInterrupt):
            delivery.apply(batch)
        receipts = list(delivery.storage(self.target).glob('*.receipt.json'))
        self.assertEqual(len(receipts), 1)
        self.assertEqual(delivery.recover(receipts[0])['status'], 'rolled_back')
        self.assertEqual((self.target / 'code.txt').read_text(), 'before')

    def test_paths_archives_authority_and_symlinks_refused(self):
        for name in ['../outside', '/tmp/outside', 'a//b', 'a/./b', '.git/config',
                     '.codex/config.toml', 'AGENTS.md', '.env', '.maintenance/autonomy.md',
                     'scripts/autonomy_integrate.py', 'projets/corpus-ce-qui-reste-possible/a',
                     'research/completed/corpus-ui-workspace/a', 'backups/a']:
            with self.subTest(name=name), self.assertRaises(delivery.Blocked):
                self.prepare(files=[name])
        for root in (self.source, self.target):
            (root / 'link').symlink_to(root / 'code.txt')
        with self.assertRaises(delivery.Blocked):
            self.prepare(files=['link'])
        (self.target / 'alias').symlink_to(self.source, target_is_directory=True)
        with self.assertRaises(delivery.Blocked):
            self.prepare(files=['alias/new.txt'])

    def test_delete_noop_and_mode_change_refused(self):
        batch = self.prepare()
        with self.assertRaisesRegex(delivery.Blocked, 'No change'):
            delivery.apply(batch)
        (self.source / 'code.txt').unlink()
        with self.assertRaisesRegex(delivery.Blocked, 'Deletion'):
            delivery.apply(batch)
        (self.source / 'code.txt').write_text('after')
        (self.source / 'code.txt').chmod(0o755)
        with self.assertRaisesRegex(delivery.Blocked, 'Permission'):
            delivery.apply(batch)

    def test_batch_cannot_be_applied_twice(self):
        batch = self.prepare(); self.change()
        delivery.apply(batch)
        with self.assertRaisesRegex(delivery.Blocked, 'already attempted'):
            delivery.apply(batch)

    def test_target_race_during_candidate_checks_is_detected(self):
        batch = self.prepare(); self.change()
        def checks(*args):
            (self.target / 'code.txt').write_text('parallel update')
            return [{'returncode': 0}]
        with patch.object(delivery, 'run_checks', checks), self.assertRaises(delivery.Blocked):
            delivery.apply(batch)
        self.assertEqual((self.target / 'code.txt').read_text(), 'parallel update')

    def test_corrupt_recovery_data_never_restored(self):
        batch = self.prepare(); self.change()
        receipt, result = delivery.apply(batch)
        result['baseline']['code.txt']['data'] = 'YmFk'
        receipt.write_text(json.dumps(result))
        with self.assertRaisesRegex(delivery.Blocked, 'Corrupt'):
            delivery.recover(receipt)
        self.assertEqual((self.target / 'code.txt').read_text(), 'after')

    def test_recovery_does_not_follow_a_new_symlink(self):
        batch = self.prepare(); self.change()
        receipt, _ = delivery.apply(batch)
        (self.target / 'code.txt').unlink()
        (self.target / 'code.txt').symlink_to(self.target / 'unrelated.txt')
        result = delivery.recover(receipt)
        self.assertEqual(result['status'], 'rollback_blocked')
        self.assertEqual(result['conflicts'], ['code.txt'])
        self.assertEqual((self.target / 'unrelated.txt').read_text(), 'keep concurrent work')

    def test_lock_and_receipt_directory_symlink_refused(self):
        with delivery.locked(self.target), self.assertRaisesRegex(delivery.Blocked, 'active'):
            with delivery.locked(self.target):
                pass
        (self.source / '.dev-local').symlink_to(self.target / '.dev-local', target_is_directory=True)
        with self.assertRaises(delivery.Blocked):
            self.prepare()


if __name__ == '__main__':
    unittest.main()
