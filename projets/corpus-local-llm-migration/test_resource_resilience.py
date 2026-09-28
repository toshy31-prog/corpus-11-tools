import io
import unittest
from contextlib import redirect_stdout
from unittest.mock import patch

import corpus_storage_doctor as storage
import corpus_tmp_reaper as reaper
import corpus_gpt_tunnel_watchdog as watchdog


class ResourceResilienceTests(unittest.TestCase):
    def test_storage_reserve_is_absolute_and_ordered(self):
        self.assertEqual(storage.WARNING_FREE, 10 * 1024**3)
        self.assertEqual(storage.CRITICAL_FREE, 5 * 1024**3)
        self.assertGreater(storage.WARNING_FREE, storage.CRITICAL_FREE)

    def test_tmp_reaper_is_narrow_and_aged(self):
        self.assertEqual(reaper.PREFIXES, ("corpus-validation-guards-",))
        self.assertGreaterEqual(reaper.MIN_AGE, 6 * 3600)

    def test_runtime_backup_markers_are_detection_only(self):
        self.assertEqual(storage.RUNTIME_BACKUP_MARKERS, (".bad", ".pre-"))
        self.assertIn("/.local/share/corpus/runtime", str(storage.RUNTIME_ROOT))

    def test_watchdog_requires_two_failures(self):
        self.assertEqual(watchdog.THRESHOLD, 2)

    def test_watchdog_first_failure_does_not_restart(self):
        failed = type("P", (), {"returncode": 1, "stdout": "down"})()
        with patch.object(watchdog, "run", return_value=failed),              patch.object(watchdog, "load", return_value={"consecutive_failures": 0}),              patch.object(watchdog, "save") as save,              redirect_stdout(io.StringIO()):
            self.assertEqual(watchdog.main(), 0)
        value = save.call_args.args[0]
        self.assertEqual(value["consecutive_failures"], 1)
        self.assertNotIn("last_restart_unix", value)

    def test_watchdog_second_failure_requests_restart(self):
        failed = type("P", (), {"returncode": 1, "stdout": "down"})()
        restarted = type("P", (), {"returncode": 0, "stdout": ""})()
        with patch.object(watchdog, "run", side_effect=[failed, restarted]) as run,              patch.object(watchdog, "load", return_value={"consecutive_failures": 1}),              patch.object(watchdog, "save") as save,              redirect_stdout(io.StringIO()):
            self.assertEqual(watchdog.main(), 0)
        self.assertEqual(run.call_args_list[1].args[:3], ("systemctl", "--user", "restart"))
        self.assertEqual(save.call_args.args[0]["consecutive_failures"], 0)


if __name__ == "__main__":
    unittest.main()
