#!/usr/bin/env python3
from __future__ import annotations

from collections import Counter, defaultdict
from fractions import Fraction
from itertools import permutations, product

ORDER = 3
ELEMENTS = tuple(range(ORDER))
PERMUTATIONS = tuple(permutations(ELEMENTS))
THRESHOLD = Fraction(1, 27)


def opposite(table):
    return tuple(table[right * ORDER + left] for left in ELEMENTS for right in ELEMENTS)


def relabel_table(table, relabel):
    result = [0] * (ORDER * ORDER)
    for left in ELEMENTS:
        for right in ELEMENTS:
            result[relabel[left] * ORDER + relabel[right]] = relabel[table[left * ORDER + right]]
    return tuple(result)


def canonical(table):
    return min(relabel_table(table, relabel) for relabel in PERMUTATIONS)


def automorphism_size(table):
    return sum(relabel_table(table, relabel) == table for relabel in PERMUTATIONS)


def histogram_l1(left_values, right_values):
    left = Counter(left_values)
    right = Counter(right_values)
    keys = set(left) | set(right)
    return Fraction(sum(abs(left[key] - right[key]) for key in keys), 2 * ORDER)


def static_metrics(table):
    left_images = []
    right_images = []
    left_collisions = []
    right_collisions = []
    left_fixed = []
    right_fixed = []

    for fixed in ELEMENTS:
        row = [table[fixed * ORDER + item] for item in ELEMENTS]
        column = [table[item * ORDER + fixed] for item in ELEMENTS]
        left_images.append(len(set(row)))
        right_images.append(len(set(column)))
        left_collisions.append(sum(value * value for value in Counter(row).values()))
        right_collisions.append(sum(value * value for value in Counter(column).values()))
        left_fixed.append(sum(table[fixed * ORDER + item] == item for item in ELEMENTS))
        right_fixed.append(sum(table[item * ORDER + fixed] == item for item in ELEMENTS))

    a_image = histogram_l1(left_images, right_images)
    a_coll = histogram_l1(left_collisions, right_collisions)
    a_fix = histogram_l1(left_fixed, right_fixed)

    if a_image:
        d_chi = 1
    elif a_coll:
        d_chi = 2
    elif a_fix:
        d_chi = 3
    else:
        d_chi = 99

    a_chi = max(a_image, a_coll, a_fix)
    idempotents = sum(table[item * ORDER + item] == item for item in ELEMENTS)
    output_frequencies = tuple(sorted(Counter(table).values(), reverse=True))
    associative_triples = sum(
        table[table[a * ORDER + b] * ORDER + c] == table[a * ORDER + table[b * ORDER + c]]
        for a, b, c in product(ELEMENTS, repeat=3)
    )
    commuting_ordered_pairs = sum(
        table[a * ORDER + b] == table[b * ORDER + a]
        for a, b in product(ELEMENTS, repeat=2)
    )
    automorphisms = automorphism_size(table)
    translation_image_multiset = tuple(sorted(left_images + right_images))
    controls = (
        idempotents,
        output_frequencies,
        associative_triples,
        commuting_ordered_pairs,
        automorphisms,
        translation_image_multiset,
    )

    return {
        "A_image": a_image,
        "A_coll": a_coll,
        "A_fix": a_fix,
        "d_chi": d_chi,
        "A_chi": a_chi,
        "controls": controls,
    }


def tree_shapes(leaves):
    if leaves == 1:
        return (None,)
    result = []
    for left_size in range(1, leaves):
        for left in tree_shapes(left_size):
            for right in tree_shapes(leaves - left_size):
                result.append((left, right))
    return tuple(result)


def mirror_shape(shape):
    if shape is None:
        return None
    return mirror_shape(shape[1]), mirror_shape(shape[0])


def label_shape(shape, next_index=0):
    if shape is None:
        return next_index, next_index + 1
    left, next_index = label_shape(shape[0], next_index)
    right, next_index = label_shape(shape[1], next_index)
    return (left, right), next_index


def unlabel(tree):
    if isinstance(tree, int):
        return None
    return unlabel(tree[0]), unlabel(tree[1])


def mirror_labeled(tree):
    return label_shape(mirror_shape(unlabel(tree)))[0]


def evaluate_tree(tree, inputs, table):
    if isinstance(tree, int):
        return inputs[tree]
    left = evaluate_tree(tree[0], inputs, table)
    right = evaluate_tree(tree[1], inputs, table)
    return table[left * ORDER + right]


def collision_score(table, tree, leaves):
    counts = [0] * ORDER
    for inputs in product(ELEMENTS, repeat=leaves):
        counts[evaluate_tree(tree, inputs, table)] += 1
    denominator = ORDER**leaves
    return Fraction(sum(count * count for count in counts), denominator * denominator)


TREE_PAIRS = {}
for leaves in (3, 4, 5):
    trees = [label_shape(shape)[0] for shape in tree_shapes(leaves)]
    seen = set()
    pairs = []
    for tree in trees:
        other = mirror_labeled(tree)
        key = (min(repr(tree), repr(other)), max(repr(tree), repr(other)))
        if key in seen:
            continue
        seen.add(key)
        first, second = (tree, other) if repr(tree) <= repr(other) else (other, tree)
        pairs.append((first, second, first == second))
    TREE_PAIRS[leaves] = tuple(pairs)


def dynamic_metrics(table):
    coupling = {}
    signed_responses = {}
    for leaves, pairs in TREE_PAIRS.items():
        responses = []
        for first, second, self_mirror in pairs:
            response = collision_score(table, first, leaves) - collision_score(table, second, leaves)
            if self_mirror and response != 0:
                raise AssertionError("self-mirror tree has non-zero signed response")
            responses.append(response)
        signed_responses[leaves] = tuple(responses)
        coupling[leaves] = max((abs(response) for response in responses), default=Fraction(0))

    h_chi = next((leaves for leaves in (3, 4, 5) if coupling[leaves] > 0), 99)
    strongly_couplable = sum(coupling[leaves] >= THRESHOLD for leaves in (3, 4, 5)) >= 2
    return {
        "C_profile": (coupling[3], coupling[4], coupling[5]),
        "signed_responses": signed_responses,
        "h_chi": h_chi,
        "strongly_couplable": strongly_couplable,
    }


representatives = {}
for table in product(ELEMENTS, repeat=ORDER * ORDER):
    representative = canonical(table)
    representatives.setdefault(representative, representative)

records = {}
for table in representatives:
    opposite_representative = canonical(opposite(table))
    records[table] = {
        "static": static_metrics(table),
        "dynamic": dynamic_metrics(table),
        "opposite": opposite_representative,
        "chiral": opposite_representative != table,
    }

# Mandatory exact controls.
self_opposite_nonzero = []
opposite_failures = []
rename_failures = []
swap_01 = (1, 0, 2)
for table, record in records.items():
    if not record["chiral"] and any(record["dynamic"]["C_profile"]):
        self_opposite_nonzero.append(table)

    opposite_record = records[record["opposite"]]
    if record["dynamic"]["C_profile"] != opposite_record["dynamic"]["C_profile"]:
        opposite_failures.append((table, "absolute profile"))
    else:
        for leaves in (3, 4, 5):
            first = record["dynamic"]["signed_responses"][leaves]
            second = opposite_record["dynamic"]["signed_responses"][leaves]
            if any(a != -b for a, b in zip(first, second)):
                opposite_failures.append((table, leaves))
                break

    renamed = relabel_table(table, swap_01)
    renamed_static = static_metrics(renamed)
    renamed_dynamic = dynamic_metrics(renamed)
    original_static = record["static"]
    static_tuple = (
        original_static["A_image"],
        original_static["A_coll"],
        original_static["A_fix"],
        original_static["d_chi"],
        original_static["A_chi"],
        original_static["controls"],
    )
    renamed_tuple = (
        renamed_static["A_image"],
        renamed_static["A_coll"],
        renamed_static["A_fix"],
        renamed_static["d_chi"],
        renamed_static["A_chi"],
        renamed_static["controls"],
    )
    if static_tuple != renamed_tuple:
        rename_failures.append((table, "static"))
    elif renamed_dynamic["C_profile"] != record["dynamic"]["C_profile"]:
        rename_failures.append((table, "dynamic"))

assert not self_opposite_nonzero
assert not opposite_failures
assert not rename_failures

chiral_records = [record for record in records.values() if record["chiral"]]
strong_records = [record for record in chiral_records if record["dynamic"]["strongly_couplable"]]
strong_fraction = Fraction(len(strong_records), len(chiral_records))

matched_buckets = defaultdict(lambda: {False: [], True: []})
for table, record in records.items():
    if not record["chiral"]:
        continue
    static = record["static"]
    key = (static["d_chi"], static["A_chi"], static["controls"])
    matched_buckets[key][record["dynamic"]["strongly_couplable"]].append(table)

matched = []
for key, groups in matched_buckets.items():
    if groups[False] and groups[True]:
        matched.append((key, groups[True][0], groups[False][0]))

if Fraction(1, 100) <= strong_fraction <= Fraction(1, 4) and matched:
    outcome = "supported"
elif strong_fraction > Fraction(1, 4):
    outcome = "too_common"
elif strong_fraction < Fraction(1, 100):
    outcome = "too_rare_or_null"
else:
    outcome = "static_exhausts_protocol"

print(f"PASS: {ORDER ** (ORDER * ORDER)} labelled magmas enumerated")
print(f"isomorphism classes: {len(records)}")
print(f"chiral classes: {len(chiral_records)}")
print("controls: self-opposite=0, opposite-sign=0, relabeling=0 failures")
print(f"strongly couplable: {len(strong_records)}/{len(chiral_records)} = {strong_fraction} = {float(strong_fraction):.6f}")
print(f"matched static-control buckets split by coupling: {len(matched)}")

for index, leaves in enumerate((3, 4, 5)):
    distribution = Counter(record["dynamic"]["C_profile"][index] for record in chiral_records)
    print(
        f"C_{leaves}: unique={len(distribution)} zero={distribution[Fraction(0)]} "
        f"max={max(distribution)} threshold_or_more="
        f"{sum(count for value, count in distribution.items() if value >= THRESHOLD)}"
    )

print("h_chi:", dict(sorted(Counter(record["dynamic"]["h_chi"] for record in chiral_records).items())))
print("d_chi:", dict(sorted(Counter(record["static"]["d_chi"] for record in chiral_records).items())))
print("OUTCOME:", outcome)

if matched:
    key, strong_table, weak_table = matched[0]
    print("MATCHED EXAMPLE KEY:", key)
    print("MATCHED STRONG TABLE:", strong_table, records[strong_table]["dynamic"]["C_profile"])
    print("MATCHED WEAK TABLE:", weak_table, records[weak_table]["dynamic"]["C_profile"])
