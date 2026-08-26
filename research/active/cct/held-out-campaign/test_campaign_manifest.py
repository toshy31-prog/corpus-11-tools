from __future__ import annotations

import copy
import unittest

from validate_campaign import validate


def valid_campaign() -> dict:
    submissions = []
    for index in range(8):
        tags = []
        if index == 0:
            tags.append("reliable-information-rare-action")
        if index == 1:
            tags.append("degraded-information-available-action")
        submissions.append({
            "scenario_id": f"held-out-{index}",
            "freeze_hash": f"sha256:{index:064x}",
            "author_id": "author-a" if index < 4 else "author-b",
            "admission_status": "admitted",
            "predicted_rival_advantage": index == 2,
            "stress_tags": tags,
        })
    return {
        "protocol_version": "cct-held-out-campaign/v1",
        "candidate_freeze_id": "CCT-V013-FREEZE-2026-08-26-01",
        "contender_identities_revealed": False,
        "submissions": submissions,
    }


class CampaignManifestTests(unittest.TestCase):
    def test_valid_composition(self) -> None:
        self.assertEqual(validate(valid_campaign()), [])

    def test_single_author_is_rejected(self) -> None:
        data = valid_campaign()
        for item in data["submissions"]:
            item["author_id"] = "one-author"
        self.assertTrue(any("deux auteurs" in error for error in validate(data)))

    def test_author_majority_is_rejected(self) -> None:
        data = valid_campaign()
        data["submissions"][4]["author_id"] = "author-a"
        self.assertTrue(any("plus de la moitié" in error for error in validate(data)))

    def test_no_rival_favorable_world_is_rejected(self) -> None:
        data = valid_campaign()
        for item in data["submissions"]:
            item["predicted_rival_advantage"] = False
        self.assertTrue(any("favorable à un rival" in error for error in validate(data)))

    def test_missing_stress_family_is_rejected(self) -> None:
        data = valid_campaign()
        data["submissions"][1]["stress_tags"] = []
        self.assertTrue(any("familles de stress" in error for error in validate(data)))

    def test_revealed_identities_are_rejected(self) -> None:
        data = valid_campaign()
        data["contender_identities_revealed"] = True
        self.assertTrue(any("identités" in error for error in validate(data)))


if __name__ == "__main__":
    unittest.main()
