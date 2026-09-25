"""Pure logical snapshot transition; not a network or physical-erasure model."""

from collections.abc import Mapping, Sequence


def atomic_sync(
    snapshot: Mapping[str, str], source: str, targets: Sequence[str],
    policy: str, partitioned: frozenset[str] = frozenset(),
) -> dict[str, str]:
    """Return a new state after one indivisible participant-only operation."""
    initial = dict(snapshot)
    targets = tuple(targets)
    if policy not in {"payload_wins", "tombstone_wins"}:
        raise ValueError("unknown sync policy")
    if any(value not in {"empty", "payload", "tombstone"} for value in initial.values()):
        raise ValueError("invalid logical state")
    if not targets or source in targets or len(set(targets)) != len(targets):
        raise ValueError("targets must be nonempty, distinct and exclude source")
    participants = {source, *targets}
    if not participants <= initial.keys():
        raise ValueError("unknown participant")
    if participants & partitioned:
        raise ValueError("sync across active partition")
    result = dict(initial)
    if policy == "tombstone_wins" and any(initial[n] == "tombstone" for n in participants):
        for node in participants:
            result[node] = "tombstone"
    else:
        for node in targets:
            result[node] = initial[source]
    return result
