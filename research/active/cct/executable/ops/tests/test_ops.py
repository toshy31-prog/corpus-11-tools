from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

from cct_ops import CCTError, EventStore, InstitutionalService


BASE = datetime(2030, 1, 1, tzinfo=timezone.utc)


class OpsCase(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.store = EventStore(self.root)
        self.service = InstitutionalService(self.store)
        self.minute = 0
        self.service.init("registry", "Registre local", self.at())
        actors = [
            ("alice", "Alice", ["appellant", "proposer"]),
            ("decider", "Collège de décision", ["decision_maker"]),
            ("mandator", "Octroi des mandats", ["mandate_granter"]),
            ("delegate", "Délégué", ["mandate_holder"]),
            ("crisis-board", "Collège de crise", ["emergency_granter"]),
            ("crisis-team", "Équipe de crise", ["emergency_holder"]),
            ("reviewer", "Chambre de recours", ["appeal_reviewer"]),
        ]
        for actor_id, name, roles in actors:
            self.service.add_actor("registry", actor_id, name, roles, self.at())

    def tearDown(self) -> None:
        self.temp.cleanup()

    def at(self, jump: int = 1) -> str:
        value = BASE + timedelta(minutes=self.minute)
        self.minute += jump
        return value.isoformat().replace("+00:00", "Z")

    def future(self, minutes: int) -> str:
        return (BASE + timedelta(minutes=minutes)).isoformat().replace("+00:00", "Z")

    def approved_decision(
        self,
        kind: str = "policy",
        holder: str | None = None,
        scopes: list[str] | None = None,
        valid_for_minutes: int = 300,
    ) -> tuple[dict, dict]:
        authorization = {}
        if kind != "policy":
            authorization = {
                "requested_holder_id": holder,
                "authorized_scopes": scopes,
                "not_after": self.future(self.minute + valid_for_minutes),
            }
        proposal = self.service.create_proposal(
            "alice",
            "Réparer le puits",
            "Budget et chantier local",
            self.at(),
            kind,
            **authorization,
        )
        decision = self.service.record_decision(
            "decider", proposal["id"], "approve", "Besoin vital établi", self.at()
        )
        return proposal, decision

    def test_repository_initialization_is_explicitly_prototype(self) -> None:
        state = self.store.load_state()
        self.assertTrue(state["prototype"])
        self.assertEqual(state["deployment_status"], "non_deploye")
        self.assertEqual(state["actors"]["registry"]["roles"], ["auditor", "registrar"])

    def test_unknown_and_incompatible_roles_are_refused(self) -> None:
        with self.assertRaises(CCTError):
            self.service.add_actor("registry", "bad", "Bad", ["unknown"], self.at())
        with self.assertRaises(CCTError):
            self.service.add_actor(
                "registry",
                "concentrated",
                "Concentrated",
                ["decision_maker", "appeal_reviewer"],
                self.at(),
            )

    def test_author_cannot_decide_own_proposal(self) -> None:
        self.service.add_actor(
            "registry", "mixed", "Auteur décideur", ["proposer", "decision_maker"], self.at()
        )
        proposal = self.service.create_proposal("mixed", "Titre", "Corps", self.at())
        with self.assertRaisesRegex(CCTError, "auteur"):
            self.service.record_decision(
                "mixed", proposal["id"], "approve", "Auto-aval", self.at()
            )

    def test_decision_requires_reasons_and_closes_proposal(self) -> None:
        proposal = self.service.create_proposal("alice", "Titre", "Corps", self.at())
        with self.assertRaises(CCTError):
            self.service.record_decision("decider", proposal["id"], "approve", "", self.at())
        decision = self.service.record_decision(
            "decider", proposal["id"], "approve", "Motif public", self.at()
        )
        state = self.store.load_state()
        self.assertEqual(state["proposals"][proposal["id"]]["status"], "approved")
        self.assertEqual(decision["effective_outcome"], "approve")

    def test_mandate_is_exercisable_then_automatically_expires(self) -> None:
        _, decision = self.approved_decision(
            "mandate_authorization", "delegate", ["Commander les pièces du puits"]
        )
        issued = self.minute
        mandate = self.service.grant_mandate(
            "mandator",
            "delegate",
            decision["id"],
            "Commander les pièces du puits",
            self.future(issued + 5),
            at=self.at(),
        )
        accepted = self.service.exercise_mandate(
            "delegate", mandate["id"], "Commande n°1", self.at()
        )
        self.assertTrue(accepted["accepted"])
        with self.assertRaisesRegex(CCTError, "non exerçable"):
            self.service.exercise_mandate(
                "delegate", mandate["id"], "Commande tardive", self.future(issued + 6)
            )
        self.assertEqual(
            self.store.load_state()["mandates"][mandate["id"]]["status"], "expired"
        )

    def test_mandate_has_a_hard_maximum_duration(self) -> None:
        _, decision = self.approved_decision(
            "mandate_authorization", "delegate", ["Mandat perpétuel"]
        )
        now = self.at()
        with self.assertRaises(CCTError) as raised:
            self.service.grant_mandate(
                "mandator",
                "delegate",
                decision["id"],
                "Mandat perpétuel",
                (BASE + timedelta(days=367)).isoformat().replace("+00:00", "Z"),
                at=now,
            )
        self.assertEqual(
            str(raised.exception),
            "durée maximale d'un mandat prototype: 366 jours",
        )

    def test_open_appeal_can_suspend_and_independent_reviewer_can_confirm(self) -> None:
        _, decision = self.approved_decision()
        appeal = self.service.create_appeal(
            "alice", decision["id"], "Données nouvelles", True, self.at()
        )
        self.assertEqual(
            self.store.load_state()["decisions"][decision["id"]]["effective_outcome"],
            "suspended",
        )
        resolved = self.service.resolve_appeal(
            "reviewer", appeal["id"], "confirm", "Données non décisives", self.at()
        )
        self.assertEqual(resolved["status"], "resolved")
        self.assertEqual(
            self.store.load_state()["decisions"][decision["id"]]["effective_outcome"],
            "approve",
        )

    def test_claimant_cannot_resolve_own_appeal(self) -> None:
        self.service.add_actor(
            "registry", "dual", "Requérant réviseur", ["appellant", "appeal_reviewer"], self.at()
        )
        _, decision = self.approved_decision()
        appeal = self.service.create_appeal(
            "dual", decision["id"], "Atteinte alléguée", False, self.at()
        )
        with self.assertRaisesRegex(CCTError, "partie"):
            self.service.resolve_appeal(
                "dual", appeal["id"], "confirm", "Auto-révision", self.at()
            )

    def test_power_scope_and_automatic_extinction_are_enforced(self) -> None:
        _, decision = self.approved_decision(
            "temporary_power_authorization",
            "crisis-team",
            ["reroute_water", "open_reserve"],
        )
        issued = self.minute
        power = self.service.grant_temporary_power(
            "crisis-board",
            "crisis-team",
            decision["id"],
            "Continuité de l'eau",
            ["reroute_water", "open_reserve"],
            self.future(issued + 4),
            self.at(),
        )
        with self.assertRaisesRegex(CCTError, "hors périmètre"):
            self.service.exercise_temporary_power(
                "crisis-team", power["id"], "seize_housing", "Action", self.at()
            )
        self.assertTrue(
            self.service.exercise_temporary_power(
                "crisis-team", power["id"], "open_reserve", "Ouvrir réserve A", self.at()
            )["accepted"]
        )
        with self.assertRaisesRegex(CCTError, "éteint"):
            self.service.exercise_temporary_power(
                "crisis-team",
                power["id"],
                "open_reserve",
                "Après terme",
                self.future(issued + 5),
            )
        expired = self.store.load_state()["temporary_powers"][power["id"]]
        self.assertEqual(expired["status"], "expired")
        self.assertFalse(expired["reactivable"])

    def test_temporary_power_cannot_exceed_seven_days(self) -> None:
        _, decision = self.approved_decision(
            "temporary_power_authorization", "crisis-team", ["action"], 20000
        )
        now = self.at()
        with self.assertRaises(CCTError) as raised:
            self.service.grant_temporary_power(
                "crisis-board",
                "crisis-team",
                decision["id"],
                "Trop long",
                ["action"],
                (BASE + timedelta(days=8)).isoformat().replace("+00:00", "Z"),
                now,
            )
        self.assertEqual(
            str(raised.exception),
            "durée maximale d'un pouvoir temporaire prototype: 168 heures",
        )

    def test_power_requires_an_effective_approval(self) -> None:
        proposal = self.service.create_proposal(
            "alice",
            "Crise",
            "Texte",
            self.at(),
            "temporary_power_authorization",
            "crisis-team",
            ["action"],
            self.future(self.minute + 30),
        )
        decision = self.service.record_decision(
            "decider", proposal["id"], "reject", "Disproportionné", self.at()
        )
        with self.assertRaisesRegex(CCTError, "autorise"):
            self.service.grant_temporary_power(
                "crisis-board",
                "crisis-team",
                decision["id"],
                "Refusé",
                ["action"],
                self.future(self.minute + 3),
                self.at(),
            )

    def test_generic_approval_cannot_authorize_a_temporary_power(self) -> None:
        _, decision = self.approved_decision()
        with self.assertRaisesRegex(CCTError, "temporary_power_authorization"):
            self.service.grant_temporary_power(
                "crisis-board",
                "crisis-team",
                decision["id"],
                "Détournement",
                ["open_reserve"],
                self.future(self.minute + 5),
                self.at(),
            )

    def test_power_cannot_exceed_approved_scope_or_deadline(self) -> None:
        _, decision = self.approved_decision(
            "temporary_power_authorization", "crisis-team", ["open_reserve"], 10
        )
        with self.assertRaisesRegex(CCTError, "non approuvées"):
            self.service.grant_temporary_power(
                "crisis-board",
                "crisis-team",
                decision["id"],
                "Trop large",
                ["open_reserve", "seize_housing"],
                self.future(self.minute + 5),
                self.at(),
            )
        with self.assertRaisesRegex(CCTError, "date butoir"):
            self.service.grant_temporary_power(
                "crisis-board",
                "crisis-team",
                decision["id"],
                "Trop long",
                ["open_reserve"],
                self.future(self.minute + 20),
                self.at(),
            )

    def test_suspensive_appeal_freezes_and_confirmation_restores_power(self) -> None:
        _, decision = self.approved_decision(
            "temporary_power_authorization", "crisis-team", ["open_reserve"], 30
        )
        power = self.service.grant_temporary_power(
            "crisis-board",
            "crisis-team",
            decision["id"],
            "Réserve",
            ["open_reserve"],
            self.future(self.minute + 20),
            self.at(),
        )
        appeal = self.service.create_appeal(
            "alice", decision["id"], "Contrôle urgent", True, self.at()
        )
        self.assertEqual(
            self.store.load_state()["temporary_powers"][power["id"]]["status"],
            "suspended",
        )
        with self.assertRaisesRegex(CCTError, "éteint"):
            self.service.exercise_temporary_power(
                "crisis-team", power["id"], "open_reserve", "Pendant recours", self.at()
            )
        self.service.resolve_appeal(
            "reviewer", appeal["id"], "confirm", "Contrôle achevé", self.at()
        )
        self.assertEqual(
            self.store.load_state()["temporary_powers"][power["id"]]["status"], "active"
        )

    def test_reversed_appeal_extinguishes_dependents_and_cannot_be_replayed(self) -> None:
        _, decision = self.approved_decision(
            "temporary_power_authorization", "crisis-team", ["open_reserve"], 30
        )
        power = self.service.grant_temporary_power(
            "crisis-board",
            "crisis-team",
            decision["id"],
            "Réserve",
            ["open_reserve"],
            self.future(self.minute + 20),
            self.at(),
        )
        appeal = self.service.create_appeal(
            "alice", decision["id"], "Autorisation contestée", True, self.at()
        )
        self.service.resolve_appeal(
            "reviewer", appeal["id"], "reverse", "Autorisation disproportionnée", self.at()
        )
        state = self.store.load_state()
        self.assertEqual(
            state["temporary_powers"][power["id"]]["status"], "revoked_by_appeal"
        )
        self.assertEqual(state["decisions"][decision["id"]]["effective_outcome"], "voided")
        with self.assertRaisesRegex(CCTError, "déjà été exercé"):
            self.service.create_appeal(
                "alice", decision["id"], "Tentative de réactivation", False, self.at()
            )

    def test_scheduled_mandate_activates_only_at_start(self) -> None:
        _, decision = self.approved_decision(
            "mandate_authorization", "delegate", ["Préparer l'atelier"], 40
        )
        start_minute = self.minute + 5
        mandate = self.service.grant_mandate(
            "mandator",
            "delegate",
            decision["id"],
            "Préparer l'atelier",
            self.future(start_minute + 10),
            starts_at=self.future(start_minute),
            at=self.at(),
        )
        self.assertEqual(mandate["status"], "scheduled")
        with self.assertRaisesRegex(CCTError, "non exerçable"):
            self.service.exercise_mandate(
                "delegate", mandate["id"], "Trop tôt", self.at()
            )
        accepted = self.service.exercise_mandate(
            "delegate", mandate["id"], "Ouverture", self.future(start_minute)
        )
        self.assertTrue(accepted["accepted"])
        self.assertEqual(
            self.store.load_state()["mandates"][mandate["id"]]["status"], "active"
        )

    def test_hash_chain_audit_detects_tampering(self) -> None:
        self.approved_decision()
        self.assertTrue(self.store.verify_repository()["ok"])
        lines = self.store.events_path.read_text(encoding="utf-8").splitlines()
        event = json.loads(lines[1])
        event["action"] = "actor_added_falsified"
        lines[1] = json.dumps(event, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        self.store.events_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
        result = self.store.verify_repository()
        self.assertFalse(result["ok"])
        self.assertTrue(any("hachage invalide" in item for item in result["errors"]))

    def test_state_can_be_recovered_only_from_valid_log(self) -> None:
        self.approved_decision()
        self.store.state_path.write_text("{}\n", encoding="utf-8")
        preview = self.store.recover_state(False)
        self.assertFalse(preview["already_current"])
        applied = self.store.recover_state(True)
        self.assertTrue(applied["applied"])
        self.assertTrue(self.store.verify_repository()["ok"])

    def test_export_contains_state_events_and_audit(self) -> None:
        self.approved_decision()
        output = self.root / "exports" / "bundle.json"
        result = self.store.export_bundle(output, self.at())
        self.assertGreater(result["events"], 1)
        bundle = json.loads(output.read_text(encoding="utf-8"))
        self.assertTrue(bundle["prototype"])
        self.assertTrue(bundle["repository_audit"]["ok"])
        self.assertEqual(bundle["deployment_status"], "non_deploye")

    def test_separation_audit_is_clean_for_complete_example(self) -> None:
        self.approved_decision()
        result = self.service.separation_audit(self.at())
        self.assertTrue(result["ok"], result["errors"])
        self.assertEqual(result["errors"], [])
        self.assertFalse(any("fonction non pourvue" in item for item in result["warnings"]))

    def test_uninitialized_audit_keeps_cct_metadata(self) -> None:
        missing = Path(self.temp.name) / "missing"
        result = InstitutionalService(EventStore(missing)).separation_audit(self.at())
        self.assertFalse(result["ok"])
        self.assertIs(result["prototype"], True)
        self.assertEqual(result["deployment_status"], "non_deploye")
        self.assertTrue(any("absent" in item or "vide" in item for item in result["errors"]))

    def test_cli_initializes_and_reports_machine_readable_status(self) -> None:
        cli_root = self.root / "cli"
        entry = Path(__file__).parents[1] / "cct.py"
        command = [
            sys.executable,
            str(entry),
            "--data-dir",
            str(cli_root),
            "--at",
            "2040-01-01T00:00:00Z",
            "init",
            "--bootstrap-id",
            "root-auditor",
            "--bootstrap-name",
            "Audit",
        ]
        completed = subprocess.run(command, text=True, capture_output=True, check=False)
        self.assertEqual(completed.returncode, 0, completed.stderr)
        payload = json.loads(completed.stdout)
        self.assertTrue(payload["prototype"])
        status = subprocess.run(
            [sys.executable, str(entry), "--data-dir", str(cli_root), "status"],
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertEqual(status.returncode, 0, status.stderr)
        self.assertEqual(json.loads(status.stdout)["counts"]["actors"], 1)


if __name__ == "__main__":
    unittest.main()
