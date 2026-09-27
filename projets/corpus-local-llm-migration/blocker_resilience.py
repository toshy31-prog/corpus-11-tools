"""Deterministic classification and recovery policy for observed Corpus blockers."""
from __future__ import annotations

import json
import sys
from typing import Any

KINDS = {
    "transport_failure",
    "timeout_unknown_completion",
    "validation_failure",
    "stale_derived_state",
    "resource_pressure",
    "concurrent_change",
    "runtime_degraded",
    "external_dependency",
    "permission_refusal",
    "environment_constraint",
    "unknown",
}

POLICIES = {
    "transport_failure": {
        "first_action": "inspect_transport_and_runner_state",
        "retry": "only_after_completion_state_is_known",
        "write_policy": "preserve_worktree",
    },
    "timeout_unknown_completion": {
        "first_action": "inspect_run_lock_process_and_evidence",
        "retry": "never_duplicate_unknown_run",
        "write_policy": "preserve_worktree",
    },
    "validation_failure": {
        "first_action": "isolate_smallest_failing_check",
        "retry": "targeted_then_full_validation",
        "write_policy": "root_cause_only",
    },
    "stale_derived_state": {
        "first_action": "compare_attested_state_to_head_and_worktree",
        "retry": "regenerate_only_after_reviewed_source_change",
        "write_policy": "derived_files_only_after_review",
    },
    "resource_pressure": {
        "first_action": "measure_relevant_surface_and_classify_storage_truth",
        "retry": "reduce_scope_before_cleanup",
        "write_policy": "never_delete_primary_data_implicitly",
    },
    "concurrent_change": {
        "first_action": "stop_writes_and_compare_versions",
        "retry": "resume_after_scope_resolution",
        "write_policy": "never_overwrite_concurrent_work",
    },
    "runtime_degraded": {
        "first_action": "obtain_fresh_runtime_diagnostic",
        "retry": "only_after_healthy_observation",
        "write_policy": "no_inference_from_stale_health",
    },
    "external_dependency": {
        "first_action": "record_dependency_and_continue_independent_work",
        "retry": "when_dependency_changes",
        "write_policy": "preserve_partial_progress",
    },
    "permission_refusal": {
        "first_action": "record_refusal_and_stop_that_action",
        "retry": "only_after_explicitly_changed_authorization",
        "write_policy": "never_bypass_refusal",
    },
    "environment_constraint": {
        "first_action": "identify_existing_bounded_execution_context",
        "retry": "use_equivalent_bounded_check_without_weakening_isolation",
        "write_policy": "never_disable_security_to_make_a_test_pass",
    },
    "unknown": {
        "first_action": "snapshot_state_and_minimize_reproduction",
        "retry": "after_cause_is_narrowed",
        "write_policy": "no_speculative_write",
    },
}

SIGNALS = [
    ("environment_constraint", ("no permissions to create new namespace", "bubblewrap", "user namespace", "nested sandbox")),
    ("permission_refusal", ("permission denied", "refus", "forbidden", "unauthorized")),
    ("resource_pressure", ("no space left", "insufficient free disk", "out of memory", "enospc")),
    ("timeout_unknown_completion", ("timed out", "timeout", "deadline exceeded")),
    ("transport_failure", ("session terminated", "connection reset", "broken pipe", "transport")),
    ("concurrent_change", ("concurrent", "staged foreign", "head inattendu", "expected_current_version")),
    ("stale_derived_state", ("attestation", "test surface drift", "release content differs", "stale")),
    ("runtime_degraded", ("cuda", "service_non_prêt", "not ready", "health")),
    ("external_dependency", ("dependency unavailable", "network unavailable", "external dependency")),
    ("validation_failure", ("test failed", "failed (failures=", "assertionerror", "diff --check")),
]


def classify(message: str, *, explicit_kind: str | None = None) -> str:
    if explicit_kind is not None:
        if explicit_kind not in KINDS:
            raise ValueError("explicit_kind inconnu")
        return explicit_kind
    text = str(message or "").lower()
    for kind, needles in SIGNALS:
        if any(needle in text for needle in needles):
            return kind
    return "unknown"


def assess(observation: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(observation, dict):
        raise ValueError("observation doit être un objet")
    allowed = {"message", "kind", "known_completion", "repeated", "destructive_cleanup_authorized"}
    unknown = set(observation) - allowed
    if unknown:
        raise ValueError("champs inconnus: " + ", ".join(sorted(unknown)))

    message = observation.get("message", "")
    if not isinstance(message, str):
        raise ValueError("message invalide")
    kind = observation.get("kind")
    if kind is not None and not isinstance(kind, str):
        raise ValueError("kind invalide")
    known_completion = observation.get("known_completion")
    if known_completion not in (None, True, False):
        raise ValueError("known_completion invalide")
    repeated = observation.get("repeated", False)
    if type(repeated) is not bool:
        raise ValueError("repeated invalide")
    cleanup_authorized = observation.get("destructive_cleanup_authorized", False)
    if type(cleanup_authorized) is not bool:
        raise ValueError("destructive_cleanup_authorized invalide")

    blocker = classify(message, explicit_kind=kind)
    policy = dict(POLICIES[blocker])

    if blocker == "timeout_unknown_completion" and known_completion is True:
        policy["first_action"] = "collect_existing_result"
        policy["retry"] = "do_not_rerun_completed_work"
    elif blocker == "timeout_unknown_completion" and known_completion is False:
        policy["retry"] = "resume_or_rerun_only_after_runner_is_idle"

    if blocker == "resource_pressure" and cleanup_authorized:
        policy["write_policy"] = "cleanup_only_reconstructible_or_explicitly_authorized_targets"

    escalation = []
    if repeated:
        escalation.extend([
            "convert_root_cause_fix_into_regression_test_or_guard",
            "document_recovery_path_in_canonical_operations",
            "prefer_reusable_automation_over_manual_repetition",
        ])

    return {
        "schema_version": 1,
        "kind": "corpus_blocker_assessment",
        "blocker": blocker,
        "policy": policy,
        "universal_invariants": [
            "preserve_last_known_good_checkpoint",
            "distinguish_task_failure_from_transport_failure",
            "inspect_before_retry",
            "never_duplicate_unknown_inflight_work",
            "prefer_root_cause_fix_over_repeated_retry",
            "preserve_primary_data_and_concurrent_work",
            "resume_from_last_verified_step",
        ],
        "escalation": escalation,
    }


def main(argv: list[str]) -> int:
    if len(argv) > 2:
        raise SystemExit("usage: blocker_resilience.py [json-file|-]")
    if len(argv) == 2 and argv[1] != "-":
        raw = open(argv[1], encoding="utf-8").read()
    else:
        raw = sys.stdin.read()
    print(json.dumps(assess(json.loads(raw)), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
