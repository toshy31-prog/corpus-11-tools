"""Reusable execution primitives extracted from Corpus research projects."""

from .event_store import EventStore, StoreError
from .institutional_protocol import InstitutionalService, ProtocolError
from .json_schema_subset import JsonSchemaSubsetError, validate_json_schema_subset
from .independent_replication import (
    ATTESTATION_SCHEMA,
    FROZEN_PACKAGE_SCHEMA,
    ISOLATION_BACKEND_BUBBLEWRAP,
    OUTPUT_CONTRACT_SCHEMA,
    ReplicationError,
    RuntimeMount,
    evaluate_replication,
    run_isolated_submission,
    run_projected_submission,
    sha256_file,
    sha256_value,
)

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
    "ATTESTATION_SCHEMA",
    "FROZEN_PACKAGE_SCHEMA",
    "ISOLATION_BACKEND_BUBBLEWRAP",
    "OUTPUT_CONTRACT_SCHEMA",
    "ReplicationError",
    "RuntimeMount",
    "evaluate_replication",
    "run_isolated_submission",
    "run_projected_submission",
    "sha256_file",
    "sha256_value",
]
