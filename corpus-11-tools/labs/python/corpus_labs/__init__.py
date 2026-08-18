"""Reusable execution primitives extracted from Corpus research projects."""

from .event_store import EventStore, StoreError
from .institutional_protocol import InstitutionalService, ProtocolError
from .json_schema_subset import JsonSchemaSubsetError, validate_json_schema_subset

from .simulation_campaign import (
    CampaignRunContext,
    PossibilityRunContext,
    apply_bounded_changes,
    common_random,
    compare_vectors,
    evaluate_boundary_rules,
    evaluate_loss_rules,
    pareto_dominates,
    pareto_frontier,
    possibility_relations,
    run_campaign,
    run_possibility_space,
    validate_budget,
)

__all__ = [
    "CampaignRunContext",
    "PossibilityRunContext",
    "apply_bounded_changes",
    "common_random",
    "compare_vectors",
    "evaluate_boundary_rules",
    "evaluate_loss_rules",
    "pareto_dominates",
    "pareto_frontier",
    "possibility_relations",
    "run_campaign",
    "run_possibility_space",
    "validate_budget",
    "EventStore",
    "StoreError",
    "InstitutionalService",
    "ProtocolError",
    "JsonSchemaSubsetError",
    "validate_json_schema_subset",
]
