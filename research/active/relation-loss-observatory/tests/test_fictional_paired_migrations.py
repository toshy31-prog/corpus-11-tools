#!/usr/bin/env python3
"""Paired fictional migrations that isolate relation loss from rival changes."""

from __future__ import annotations


BASE_EDGES = {
    ("entry", "index", "open_index"),
    ("index", "object", "locate"),
    ("object", "context", "interpret"),
    ("entry", "appeal", "refuse"),
}
RIVAL_FIELDS = {
    "demand": "required",
    "permission": "granted",
    "cost": 1,
    "competence": "fixed-parser-v1",
}
OBJECTS = {"object": "sha256:fictional-object-17"}


def evaluate(
    edges: set[tuple[str, str, str]], rivals: dict[str, object]
) -> dict[str, bool]:
    graph_accessible = {
        ("entry", "index", "open_index"),
        ("index", "object", "locate"),
    }.issubset(edges)
    accessible = graph_accessible and rivals["permission"] == "granted" and rivals["cost"] <= 1
    reusable = (
        accessible
        and ("object", "context", "interpret") in edges
        and rivals["competence"] == "fixed-parser-v1"
        and rivals["demand"] == "required"
    )
    return {
        "object_present": "object" in OBJECTS,
        "accessible": accessible,
        "reusable": reusable,
        "refusal_available": ("entry", "appeal", "refuse") in edges,
    }


def paired_case(case_id: str, removed: tuple[str, str, str]) -> dict[str, object]:
    control_edges = set(BASE_EDGES)
    migrated_edges = control_edges - {removed}
    restored_edges = migrated_edges | {removed}
    control_rivals = dict(RIVAL_FIELDS)
    migrated_rivals = dict(RIVAL_FIELDS)
    return {
        "id": case_id,
        "objects_equal": OBJECTS == dict(OBJECTS),
        "rivals_equal": control_rivals == migrated_rivals,
        "control": evaluate(control_edges, control_rivals),
        "migrated": evaluate(migrated_edges, migrated_rivals),
        "reactivated": evaluate(restored_edges, migrated_rivals),
    }


def main() -> None:
    lost_index = paired_case("lost_index", ("index", "object", "locate"))
    lost_context = paired_case("lost_context", ("object", "context", "interpret"))

    assert lost_index["objects_equal"] and lost_index["rivals_equal"]
    assert lost_index["control"]["accessible"]
    assert not lost_index["migrated"]["accessible"]
    assert lost_index["migrated"]["refusal_available"]
    assert lost_index["reactivated"] == lost_index["control"]

    assert lost_context["objects_equal"] and lost_context["rivals_equal"]
    assert lost_context["migrated"]["accessible"]
    assert not lost_context["migrated"]["reusable"]
    assert lost_context["migrated"]["refusal_available"]
    assert lost_context["reactivated"] == lost_context["control"]

    permission_rival = evaluate(set(BASE_EDGES), dict(RIVAL_FIELDS, permission="denied"))
    cost_rival = evaluate(set(BASE_EDGES), dict(RIVAL_FIELDS, cost=2))
    competence_rival = evaluate(set(BASE_EDGES), dict(RIVAL_FIELDS, competence="other-parser"))
    demand_rival = evaluate(set(BASE_EDGES), dict(RIVAL_FIELDS, demand="absent"))
    assert not permission_rival["accessible"]
    assert not cost_rival["accessible"]
    assert competence_rival["accessible"] and not competence_rival["reusable"]
    assert demand_rival["accessible"] and not demand_rival["reusable"]

    print(
        "PASS relation loss paired migrations: 2/2 discriminants, "
        "2/2 reactivations, 4 rival controls"
    )


if __name__ == "__main__":
    main()
