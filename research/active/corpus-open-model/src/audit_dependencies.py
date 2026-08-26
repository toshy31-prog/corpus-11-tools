"""Inventorie les dépendances et signale l'absence de licence observable."""

from __future__ import annotations

import json
from pathlib import Path

from kernel import EXCLUDED_PARTS


ROOT = Path(__file__).resolve().parents[4]
OUTPUT = Path(__file__).resolve().parents[1] / "artifacts/dependency-audit.json"


def audit(root: Path = ROOT) -> dict:
    licenses = [path.relative_to(root).as_posix() for path in root.rglob("*") if path.is_file() and not any(part in EXCLUDED_PARTS for part in path.relative_to(root).parts) and path.name.casefold().startswith(("license", "copying"))]
    return {"schema_version": 1, "runtime": {"python_standard_library": "required", "codex": "not_required", "gpt_or_external_api": "not_required", "gpu": "not_required"}, "data_dependency": "observed Corpus checkout", "license_files_observed": sorted(licenses), "redistribution_status": "unknown_blocked_pending_human_audit" if not licenses else "requires_human_audit", "scope": "Filesystem presence only; this is not a legal opinion."}


if __name__ == "__main__":
    result = audit()
    OUTPUT.parent.mkdir(exist_ok=True)
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(result, ensure_ascii=False, indent=2))
