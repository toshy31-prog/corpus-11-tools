import copy
import json
from pathlib import Path
import sqlite3
import subprocess
import sys
import tempfile
import unittest

from autonomy_schedule import ACTIVE_RULE, AUTOMATION_ID, THREAD_ID, plan, timestamp, verify_runtime


class ScheduleTests(unittest.TestCase):
    def setUp(self):
        self.now = timestamp("2026-09-20T05:00:00Z")
        self.automation = {"id": AUTOMATION_ID, "kind": "heartbeat", "status": "ACTIVE",
                           "target_thread_id": THREAD_ID, "name": "Corpus",
                           "prompt": "Mandat inchangé", "rrule": ACTIVE_RULE,
                           "notification_policy": "failed_runs_only"}
        self.state = {"mode": "attente_datee", "next_review_at": "2026-09-20T11:00:46.213375+02:00",
                      "last_exploration": {"at": "2026-09-20T03:00:46.213375Z"}}

    def test_wait_is_absolute_and_does_not_repeat_an_hourly_clock_check(self):
        before = copy.deepcopy((self.state, self.automation))
        result = plan(self.state, self.automation, self.now)
        self.assertEqual(result["not_before"], "2026-09-20T09:00:47+00:00")
        self.assertEqual(result["desired_rrule"],
                         "DTSTART:20260920T090047Z\nRRULE:FREQ=MINUTELY;INTERVAL=30")
        request = result["automation_update"]
        self.assertEqual(request["prompt"], "Mandat inchangé")
        self.assertEqual(request["targetThreadId"], THREAD_ID)
        self.assertEqual(request["notificationPolicy"], "failed_runs_only")
        self.assertEqual((self.state, self.automation), before)

    def test_wait_plan_is_idempotent_and_does_not_push_the_deadline_forward(self):
        first = plan(self.state, self.automation, self.now)
        self.automation["rrule"] = first["desired_rrule"]
        second = plan(self.state, self.automation, timestamp("2026-09-20T08:30:00Z"))
        self.assertEqual(second["action"], "none")
        self.assertEqual(second["not_before"], first["not_before"])

    def test_due_wait_returns_to_exploration_without_disabling_the_heartbeat(self):
        self.automation["rrule"] = plan(self.state, self.automation, self.now)["desired_rrule"]
        for now in ["2026-09-20T09:00:46.213375Z", "2026-09-22T08:00:00Z"]:
            with self.subTest(now=now):
                result = plan(self.state, self.automation, timestamp(now))
                self.assertEqual(result["mode"], "exploration")
                self.assertEqual(result["automation_update"]["rrule"], ACTIVE_RULE)
                self.assertEqual(result["automation_update"]["status"], "ACTIVE")

    def test_useful_work_can_resume_before_the_old_wait_deadline(self):
        self.automation["rrule"] = plan(self.state, self.automation, self.now)["desired_rrule"]
        for mode in ["execution", "exploration"]:
            with self.subTest(mode=mode):
                result = plan({"mode": mode}, self.automation, self.now)
                self.assertIsNone(result["not_before"])
                self.assertEqual(result["automation_update"]["rrule"], ACTIVE_RULE)

    def test_user_pause_is_never_reactivated(self):
        self.automation["status"] = "PAUSED"
        self.assertEqual(plan({}, self.automation, self.now)["action"], "none")

    def test_invalid_wait_is_not_silently_scheduled(self):
        for due in [None, "invalid", "2026-09-20T11:00:00", "2026-09-21T09:00:00Z", "2026-09-20T02:00:00Z"]:
            with self.subTest(due=due), self.assertRaises(ValueError):
                plan({**self.state, "next_review_at": due}, self.automation, self.now)
        with self.assertRaises(ValueError):
            plan(self.state, self.automation, timestamp("2026-09-20T02:00:00Z"))

    def test_wrong_automation_target_and_model_override_are_rejected(self):
        for changed in [{"id": "other"}, {"kind": "cron"}, {"target_thread_id": "other"},
                        {"model": "explicit-user-model"}, {"status": "DELETED"}]:
            with self.subTest(changed=changed), self.assertRaises(ValueError):
                plan(self.state, {**self.automation, **changed}, self.now)

    def test_missing_mode_and_mandate_fail_without_an_update_payload(self):
        with self.assertRaises(ValueError):
            plan({}, self.automation, self.now)
        with self.assertRaises(ValueError):
            plan(self.state, {**self.automation, "prompt": ""}, self.now)

    def test_whole_second_is_not_delayed_and_timezone_is_preserved(self):
        self.state["next_review_at"] = "2026-09-20T10:30:00+02:00"
        result = plan(self.state, self.automation, self.now)
        self.assertEqual(result["not_before"], "2026-09-20T08:30:00+00:00")

    def test_runtime_verification_catches_old_deadlines_and_writes_nothing(self):
        result = plan(self.state, self.automation, self.now)
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "scheduler.db"
            db = sqlite3.connect(path)
            db.execute("CREATE TABLE automations (id,kind,status,target_thread_id,rrule,next_run_at,name,prompt,model,reasoning_effort,notification_policy)")
            row = (AUTOMATION_ID, "heartbeat", "ACTIVE", THREAD_ID, result["desired_rrule"],
                   int(timestamp(result["not_before"]).timestamp() * 1000),
                   "Corpus", "Mandat inchangé", None, None, "failed_runs_only")
            db.execute("INSERT INTO automations VALUES (?,?,?,?,?,?,?,?,?,?,?)", row)
            db.commit()
            original = path.read_bytes()
            self.assertTrue(verify_runtime(path, result)["verified"])
            self.assertEqual(path.read_bytes(), original)
            db.execute("UPDATE automations SET prompt='Mandat modifié'")
            db.commit()
            self.assertFalse(verify_runtime(path, result)["verified"])
            db.execute("UPDATE automations SET prompt='Mandat inchangé'")
            db.execute("UPDATE automations SET next_run_at=next_run_at-1800000")
            db.commit()
            self.assertFalse(verify_runtime(path, result)["verified"])
            db.close()

    def test_refusal_only_proposes_stopping_future_calls(self):
        error = {"isError": True, "content": [{"type": "text", "text": "Report refusé par la revue."}]}
        result = plan(self.state, self.automation, self.now, refusal=error)
        request = result["automation_update"]
        self.assertEqual(result["schedule_state"], "refused")
        self.assertEqual(result["changed_fields"], ["status"])
        self.assertEqual(request["status"], "PAUSED")
        self.assertEqual(request["rrule"], self.automation["rrule"])
        self.assertEqual(request["prompt"], self.automation["prompt"])
        with self.assertRaises(ValueError):
            plan(self.state, self.automation, self.now, refusal={"isError": False})

    def test_pause_requires_real_scheduler_confirmation(self):
        self.automation["status"] = "PAUSED"
        result = plan({}, self.automation, self.now)
        self.assertEqual(result["schedule_state"], "unverified")
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "scheduler.db"
            db = sqlite3.connect(path)
            db.execute("CREATE TABLE automations (id,kind,status,target_thread_id,rrule,next_run_at,name,prompt,model,reasoning_effort,notification_policy)")
            db.execute("INSERT INTO automations VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                       (AUTOMATION_ID, "heartbeat", "PAUSED", THREAD_ID, ACTIVE_RULE, None,
                        "Corpus", "Mandat inchangé", None, None, "failed_runs_only"))
            db.commit()
            self.assertEqual(verify_runtime(path, result)["schedule_state"], "paused")
            db.execute("UPDATE automations SET next_run_at=123")
            db.commit()
            self.assertFalse(verify_runtime(path, result)["verified"])
            db.close()

    def test_cli_rejects_bad_state_without_touching_the_automation(self):
        with tempfile.TemporaryDirectory() as tmp:
            state = Path(tmp) / "state.json"
            config = Path(tmp) / "automation.toml"
            state.write_text(json.dumps({**self.state, "next_review_at": "bad"}))
            config.write_text("\n".join(f"{key} = {json.dumps(value)}" for key, value in self.automation.items()))
            before = config.read_bytes()
            result = subprocess.run([sys.executable, str(Path(__file__).with_name("autonomy_schedule.py")),
                                     "--state", str(state), "--automation", str(config),
                                     "--now", self.now.isoformat()], capture_output=True, text=True)
            self.assertEqual(result.returncode, 2)
            self.assertEqual(json.loads(result.stdout)["action"], "error")
            self.assertEqual(config.read_bytes(), before)


if __name__ == "__main__":
    unittest.main()
