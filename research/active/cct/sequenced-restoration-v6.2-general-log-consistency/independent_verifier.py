"""Independent RFC 9162 consistency-proof verifier for CCT-EXEC 6.2.

This module deliberately shares no implementation code with the JavaScript
runtime or its proof generator.  Its only shared input is the frozen JSON
vector format.
"""

from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path


HEX_256 = re.compile(r"[0-9a-f]{64}\Z")


def _node_hash(left: str, right: str) -> str:
    return hashlib.sha256(b"\x01" + bytes.fromhex(left) + bytes.fromhex(right)).hexdigest()


def verify_consistency(
    old_size: int,
    new_size: int,
    old_root: str,
    new_root: str,
    proof: list[str],
) -> bool:
    """Return whether proof conserves the old RFC 9162 tree as a prefix."""
    if (
        isinstance(old_size, bool)
        or isinstance(new_size, bool)
        or not isinstance(old_size, int)
        or not isinstance(new_size, int)
        or old_size < 1
        or old_size >= new_size
        or not isinstance(old_root, str)
        or not isinstance(new_root, str)
        or HEX_256.fullmatch(old_root) is None
        or HEX_256.fullmatch(new_root) is None
        or not isinstance(proof, list)
        or not proof
        or any(not isinstance(node, str) or HEX_256.fullmatch(node) is None for node in proof)
    ):
        return False

    nodes = proof.copy()
    if old_size & (old_size - 1) == 0:
        nodes.insert(0, old_root)

    old_cursor = old_size - 1
    new_cursor = new_size - 1
    while old_cursor & 1:
        old_cursor >>= 1
        new_cursor >>= 1

    old_accumulator = nodes[0]
    new_accumulator = nodes[0]
    for node in nodes[1:]:
        if new_cursor == 0:
            return False
        if old_cursor & 1 or old_cursor == new_cursor:
            old_accumulator = _node_hash(node, old_accumulator)
            new_accumulator = _node_hash(node, new_accumulator)
            while old_cursor != 0 and old_cursor & 1 == 0:
                old_cursor >>= 1
                new_cursor >>= 1
        else:
            new_accumulator = _node_hash(new_accumulator, node)
        old_cursor >>= 1
        new_cursor >>= 1

    return new_cursor == 0 and old_accumulator == old_root and new_accumulator == new_root


def verify_vector_file(path: Path) -> bool:
    document = json.loads(path.read_text(encoding="utf-8"))
    vectors = document.get("vectors")
    if not isinstance(vectors, list) or not vectors:
        return False
    return all(
        verify_consistency(
            vector.get("first"),
            vector.get("second"),
            vector.get("firstRoot"),
            vector.get("secondRoot"),
            vector.get("path"),
        )
        for vector in vectors
        if isinstance(vector, dict)
    ) and all(isinstance(vector, dict) for vector in vectors)


if __name__ == "__main__":
    vector_path = Path(sys.argv[1]) if len(sys.argv) == 2 else Path(__file__).with_name("rfc9162-vectors.json")
    if not verify_vector_file(vector_path):
        raise SystemExit("independent verifier rejected at least one frozen vector")
    print("independent Python verifier: all frozen RFC 9162 vectors accepted")
