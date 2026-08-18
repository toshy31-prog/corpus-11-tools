from __future__ import annotations

import json
import tempfile
import unittest
from datetime import timedelta
from pathlib import Path

from corpus_labs import EventStore, InstitutionalService, ProtocolError, StoreError


SCHEMA = "workshop-protocol/1"
WORKSHOP_ROLES = {
    "appeal_reviewer",
    "appellant",
    "auditor",
    "decision_maker",
    "emergency_granter",
    "emergency_holder",
    "mandate_granter",
    "mandate_holder",
    "project_owner",
    "proposer",
    "registrar",
}


def workshop_state(created_at: str) -> dict[str, object]:
    return {
        "schema_version": SCHEMA,
        "prototype": True,
        "deployment_status": "local_test",
        "created_at": created_at,
        "actors": {},
        "proposals": {},
        "decisions": {},
        "mandates": {},
        "appeals": {},
        "temporary_powers": {},
    }


class InstitutionalProtocolTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.store = EventStore(
            Path(self.temp.name),
            schema_version=SCHEMA,
            state_factory=workshop_state,
            bootstrap_roles=("auditor", "registrar"),
            export_format="workshop-export/1",
            artifact_metadata={"prototype": True},
        )
        self.service = InstitutionalService(
            self.store,
            roles=WORKSHOP_ROLES,
            forbidden_role_pairs={
                frozenset(("project_owner", "proposer")),
            },
            max_mandate_duration=timedelta(hours=30),
            max_temporary_power_duration=timedelta(hours=3),
        )
        self.service.init("registry", "Community workshop", "2031-01-01T00:00:00Z")

    def tearDown(self) -> None:
        self.temp.cleanup()

    def test_institution_policy_has_no_implicit_fallback(self) -> None:
        with self.assertRaisesRegex(TypeError, "roles"):
            InstitutionalService(self.store)  # type: ignore[call-arg]

    def test_non_cct_policy_uses_trace_decision_and_appeal(self) -> None:
        actors = [
            ("member", ["appellant", "proposer"]),
            ("panel", ["decision_maker"]),
            ("review", ["appeal_reviewer"]),
        ]
        for index, (actor_id, roles) in enumerate(actors, start=1):
            self.service.add_actor(
                "registry",
                actor_id,
                actor_id,
                roles,
                f"2031-01-01T00:0{index}:00Z",
            )
        proposal = self.service.create_proposal(
            "member", "Repair the kiln", "Shared parts budget", "2031-01-01T00:10:00Z"
        )
        decision = self.service.record_decision(
            "panel", proposal["id"], "approve", "Workshop need", "2031-01-01T00:11:00Z"
        )
        appeal = self.service.create_appeal(
            "member", decision["id"], "Missing cost", True, "2031-01-01T00:12:00Z"
        )
        resolved = self.service.resolve_appeal(
            "review", appeal["id"], "remand", "Reprice parts", "2031-01-01T00:13:00Z"
        )
        self.assertEqual(resolved["status"], "resolved")
        self.assertTrue(self.store.verify_repository()["ok"])
        self.assertGreaterEqual(self.store.verify_repository()["events"], 8)

    def test_non_cct_policy_drives_conflicts_and_time_bounds(self) -> None:
        self.service.add_actor(
            "registry",
            "owner",
            "Project owner",
            ["project_owner"],
            "2031-01-01T00:01:00Z",
        )
        with self.assertRaises(ProtocolError):
            self.service.add_actor(
                "registry",
                "conflicted",
                "Conflicted role",
                ["project_owner", "proposer"],
                "2031-01-01T00:02:00Z",
            )

        actors = [
            ("member", ["proposer"]),
            ("panel", ["decision_maker"]),
            ("mandate-desk", ["mandate_granter"]),
            ("delegate", ["mandate_holder"]),
            ("safety-desk", ["emergency_granter"]),
            ("safety-team", ["emergency_holder"]),
        ]
        for index, (actor_id, roles) in enumerate(actors, start=3):
            self.service.add_actor(
                "registry",
                actor_id,
                actor_id,
                roles,
                f"2031-01-01T00:{index:02d}:00Z",
            )

        mandate_proposal = self.service.create_proposal(
            "member",
            "Kiln maintenance",
            "Authorize a bounded repair mandate",
            "2031-01-01T00:10:00Z",
            "mandate_authorization",
            "delegate",
            ["repair_kiln"],
            "2031-01-05T00:00:00Z",
        )
        mandate_decision = self.service.record_decision(
            "panel",
            mandate_proposal["id"],
            "approve",
            "Workshop safety",
            "2031-01-01T00:11:00Z",
        )
        with self.assertRaisesRegex(ProtocolError, "30 heures"):
            self.service.grant_mandate(
                "mandate-desk",
                "delegate",
                mandate_decision["id"],
                "repair_kiln",
                "2031-01-02T07:00:00Z",
                at="2031-01-01T00:12:00Z",
            )
        mandate = self.service.grant_mandate(
            "mandate-desk",
            "delegate",
            mandate_decision["id"],
            "repair_kiln",
            "2031-01-02T06:12:00Z",
            at="2031-01-01T00:12:00Z",
        )
        self.assertEqual(mandate["status"], "active")

        power_proposal = self.service.create_proposal(
            "member",
            "Ventilation incident",
            "Authorize a short safety intervention",
            "2031-01-01T00:13:00Z",
            "temporary_power_authorization",
            "safety-team",
            ["stop_kiln"],
            "2031-01-02T00:00:00Z",
        )
        power_decision = self.service.record_decision(
            "panel",
            power_proposal["id"],
            "approve",
            "Smoke detected",
            "2031-01-01T00:14:00Z",
        )
        with self.assertRaisesRegex(ProtocolError, "3 heures"):
            self.service.grant_temporary_power(
                "safety-desk",
                "safety-team",
                power_decision["id"],
                "Kiln stop",
                ["stop_kiln"],
                "2031-01-01T04:15:00Z",
                "2031-01-01T00:15:00Z",
            )
        power = self.service.grant_temporary_power(
            "safety-desk",
            "safety-team",
            power_decision["id"],
            "Kiln stop",
            ["stop_kiln"],
            "2031-01-01T03:15:00Z",
            "2031-01-01T00:15:00Z",
        )
        self.assertEqual(power["status"], "active")

    def test_event_store_recovers_materialized_state(self) -> None:
        self.service.add_actor(
            "registry", "member", "Member", ["proposer"], "2031-01-01T00:01:00Z"
        )
        self.store.state_path.unlink()
        recovery = self.store.recover_state(apply=True)
        self.assertTrue(recovery["applied"])
        self.assertIn("member", self.store.load_state()["actors"])

    def test_export_is_external_and_keeps_authoritative_fields(self) -> None:
        output = Path(self.temp.name) / "exports" / "bundle.json"
        result = self.store.export_bundle(output, "2031-01-01T01:00:00Z")
        bundle = json.loads(output.read_text(encoding="utf-8"))
        self.assertEqual(result["output"], str(output))
        self.assertEqual(bundle["format"], "workshop-export/1")
        self.assertTrue(bundle["prototype"])

        for protected in (self.store.state_path, self.store.events_path):
            with self.assertRaisesRegex(StoreError, "destination"):
                self.store.export_bundle(protected, "2031-01-01T01:00:00Z")
        self.assertTrue(self.store.verify_repository()["ok"])

    def test_export_metadata_cannot_replace_reserved_fields(self) -> None:
        with self.assertRaisesRegex(ValueError, "reserved export keys"):
            EventStore(
                Path(self.temp.name) / "reserved",
                schema_version=SCHEMA,
                state_factory=workshop_state,
                artifact_metadata={"format": "shadow-format"},
            )


if __name__ == "__main__":
    unittest.main()
