#!/usr/bin/env python3
"""Regression tests for the live behavioral routing-policy handoff."""
from __future__ import annotations

import json
from pathlib import Path
import tempfile

import pytest

import run_behavioral_evals as runner


def sample_record() -> dict:
    return {
        "id": "sample",
        "prompt": "Cette réforme change-t-elle réellement la situation ou seulement le vocabulaire ?",
        "expect": ["real-transformation-assessment"],
    }


def test_runner_import_has_no_cli_side_effects() -> None:
    # Importing this module is itself the assertion: argparse/main must not run.
    assert callable(runner.main)
    assert callable(runner.mandatory_route)


def test_mandatory_route_is_deterministic_and_canonical() -> None:
    record = sample_record()
    first = runner.mandatory_route(record, runner.SKILLS)
    second = runner.mandatory_route(record, reversed(runner.SKILLS))
    assert first == second
    assert first == sorted(set(first))
    assert "real-transformation-assessment" in first


def test_two_replica_prompts_are_byte_identical_for_same_scene() -> None:
    record = sample_record()
    core = runner.mandatory_route(record)
    # Replica identity deliberately never enters make_prompt.
    assert runner.make_prompt(record, core) == runner.make_prompt(record, core)


def test_handoff_requires_exact_core_no_add_remove_or_reorder() -> None:
    record = sample_record()
    core = runner.mandatory_route(record)
    assert runner.validate_output(record, {"selected_skills": core}, "replica-a", core) == []

    removed = core[:-1]
    assert runner.validate_output(record, {"selected_skills": removed}, "replica-a", core)

    added = sorted(set(core) | {"chain-tracing"})
    assert runner.validate_output(record, {"selected_skills": added}, "replica-a", core)

    if len(core) > 1:
        reversed_core = list(reversed(core))
        assert runner.validate_output(record, {"selected_skills": reversed_core}, "replica-a", core)


def test_unknown_duplicate_and_unsorted_output_fail() -> None:
    record = sample_record()
    core = runner.mandatory_route(record)
    assert runner.validate_output(record, {"selected_skills": ["not-a-skill"]}, "replica-a", core)
    if core:
        duplicate = [core[0], core[0]]
        assert runner.validate_output(record, {"selected_skills": duplicate}, "replica-a", core)


def test_checkpoint_fresh_resume_mismatch_and_corruption() -> None:
    with tempfile.TemporaryDirectory() as raw:
        path = Path(raw) / "checkpoint.json"
        fp = {"schema": 3, "head": "abc"}
        created = runner.load_checkpoint(path, fp, fresh=False)
        assert created == {"fingerprint": fp, "results": {}}
        created["results"]["x"] = {"status": "success", "output": {"selected_skills": []}}
        runner.atomic_json(path, created)
        resumed = runner.load_checkpoint(path, fp, fresh=False)
        assert "x" in resumed["results"]
        fresh = runner.load_checkpoint(path, fp, fresh=True)
        assert fresh["results"] == {}
        with pytest.raises(RuntimeError, match="incompatible"):
            runner.load_checkpoint(path, {"schema": 3, "head": "other"}, fresh=False)
        path.write_text("{broken", encoding="utf-8")
        with pytest.raises(RuntimeError, match="corrupt"):
            runner.load_checkpoint(path, fp, fresh=False)


def test_atomic_json_writes_valid_complete_json() -> None:
    with tempfile.TemporaryDirectory() as raw:
        path = Path(raw) / "state.json"
        payload = {"secret": "not-a-credential", "values": [1, 2, 3]}
        runner.atomic_json(path, payload)
        assert json.loads(path.read_text(encoding="utf-8")) == payload
        assert not path.with_suffix(".json.tmp").exists()


def test_offline_router_has_no_eval_oracle_dependency() -> None:
    source = (runner.ROOT / "tools" / "offline_router.py").read_text(encoding="utf-8")
    forbidden = (
        "routing-and-nonregression.jsonl",
        "record[\"id\"]",
        "record['id']",
        "record[\"expect\"]",
        "record['expect']",
    )
    assert not any(token in source for token in forbidden)
