#!/usr/bin/env python3
"""Regression tests for the live behavioral routing-policy handoff."""
from __future__ import annotations

import json
import os
from pathlib import Path
from types import SimpleNamespace
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


def test_handoff_prompt_exemplifies_an_array_for_selected_skills() -> None:
    record = sample_record()
    prompt = runner.make_prompt(record, runner.mandatory_route(record))
    assert '"selected_skills": ["skill-a"]' in prompt
    assert '"selected_skills": "exact mandatory executable route supplied below"' not in prompt


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


def test_isolated_codex_home_uses_api_key_without_auth_copy(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CODEX_API_KEY", "test-only-key")
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    home = tmp_path / "isolated-codex"

    env, mode, ephemeral_auth = runner.auth_context(codex_home=home)

    assert mode == "api-key"
    assert ephemeral_auth is None
    assert env["CODEX_HOME"] == str(home.resolve())
    assert env["CODEX_API_KEY"] == "test-only-key"
    assert "OPENAI_API_KEY" not in env
    assert not (home / "auth.json").exists()
    assert os.stat(home).st_mode & 0o077 == 0


def test_default_authenticated_codex_home_keeps_legacy_auth_mode(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.delenv("CODEX_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    home = tmp_path / "existing-codex-home"
    home.mkdir()
    (home / "auth.json").write_text('{"token":"test-only"}', encoding="utf-8")
    monkeypatch.setenv("CODEX_HOME", str(home))

    env, mode, ephemeral_auth = runner.auth_context()

    assert mode == "codex-home-auth"
    assert ephemeral_auth is None
    assert env["CODEX_HOME"] == str(home)


def test_explicit_auth_copy_is_private_and_removed(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.delenv("CODEX_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    source = tmp_path / "desktop-auth.json"
    source.write_text('{"token":"test-only"}', encoding="utf-8")
    home = tmp_path / "isolated-codex"

    env, mode, ephemeral_auth = runner.auth_context(codex_home=home, auth_file=source)

    assert mode == "isolated-auth-copy"
    assert env["CODEX_HOME"] == str(home.resolve())
    assert ephemeral_auth == home / "auth.json"
    assert ephemeral_auth.read_text(encoding="utf-8") == source.read_text(encoding="utf-8")
    assert os.stat(ephemeral_auth).st_mode & 0o077 == 0

    runner.remove_ephemeral_auth(ephemeral_auth)
    assert not ephemeral_auth.exists()
    assert source.exists()


def test_auth_copy_requires_an_explicit_isolated_home(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.delenv("CODEX_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    source = tmp_path / "auth.json"
    source.write_text('{"token":"test-only"}', encoding="utf-8")

    with pytest.raises(runner.ConfigurationError, match="requires an explicit --codex-home"):
        runner.auth_context(auth_file=source)


def test_isolated_home_rejects_active_home_and_missing_auth(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.delenv("CODEX_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    with pytest.raises(runner.ConfigurationError, match="dedicated directory"):
        runner.prepare_isolated_codex_home(Path.home() / ".codex")
    with pytest.raises(runner.AuthenticationError, match="require CODEX_API_KEY"):
        runner.auth_context(codex_home=tmp_path / "empty-isolated-home")


def test_initialize_isolated_home_installs_only_local_plugin(monkeypatch: pytest.MonkeyPatch) -> None:
    commands: list[list[str]] = []

    def fake_run(command: list[str], **_: object) -> SimpleNamespace:
        commands.append(command)
        if command[-2:] == ["plugin", "list"]:
            # The first listing is empty; the second lists the local plugin.
            listed = "corpus-11-tools\n" if sum(
                item[-2:] == ["plugin", "list"] for item in commands
            ) == 2 else ""
            return SimpleNamespace(returncode=0, stdout=listed, stderr="")
        return SimpleNamespace(returncode=0, stdout="", stderr="")

    monkeypatch.setattr(runner.subprocess, "run", fake_run)
    runner.initialize_isolated_codex_home(["codex"], codex_env={"CODEX_HOME": "/isolated"})

    assert commands == [
        ["codex", "plugin", "list"],
        ["codex", "plugin", "marketplace", "add", "."],
        ["codex", "plugin", "add", "corpus-11-tools@corpus-11-local"],
        ["codex", "plugin", "list"],
    ]


def test_initialize_isolated_home_skips_install_when_plugin_is_already_listed(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    commands: list[list[str]] = []

    def fake_run(command: list[str], **_: object) -> SimpleNamespace:
        commands.append(command)
        return SimpleNamespace(returncode=0, stdout="corpus-11-tools\n", stderr="")

    monkeypatch.setattr(runner.subprocess, "run", fake_run)
    runner.initialize_isolated_codex_home(["codex"], codex_env={"CODEX_HOME": "/isolated"})

    assert commands == [["codex", "plugin", "list"]]


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
