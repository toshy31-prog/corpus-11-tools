import copy
import json
import unittest
from pathlib import Path

from independent_verifier import verify_consistency, verify_vector_file


HERE = Path(__file__).resolve().parent
VECTORS_PATH = HERE / "rfc9162-vectors.json"


class IndependentVerifierTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.vectors = json.loads(VECTORS_PATH.read_text(encoding="utf-8"))["vectors"]

    def test_accepts_every_frozen_vector(self):
        self.assertTrue(verify_vector_file(VECTORS_PATH))

    def test_rejects_corruption_at_every_proof_position(self):
        for vector in self.vectors:
            for index in range(len(vector["path"])):
                with self.subTest(first=vector["first"], second=vector["second"], index=index):
                    corrupted = copy.deepcopy(vector)
                    corrupted["path"][index] = "00" * 32
                    self.assertFalse(verify_consistency(
                        corrupted["first"], corrupted["second"], corrupted["firstRoot"],
                        corrupted["secondRoot"], corrupted["path"]
                    ))

    def test_rejects_roots_sizes_and_shape_mutations(self):
        vector = self.vectors[0]
        cases = [
            (vector["first"], vector["second"], "00" * 32, vector["secondRoot"], vector["path"]),
            (vector["first"], vector["second"], vector["firstRoot"], "00" * 32, vector["path"]),
            (vector["second"], vector["second"], vector["firstRoot"], vector["secondRoot"], vector["path"]),
            (vector["first"], vector["second"], vector["firstRoot"], vector["secondRoot"], []),
            (vector["first"], vector["second"], vector["firstRoot"], vector["secondRoot"], vector["path"] + ["00" * 32]),
        ]
        for case in cases:
            with self.subTest(case=case):
                self.assertFalse(verify_consistency(*case))


if __name__ == "__main__":
    unittest.main()
