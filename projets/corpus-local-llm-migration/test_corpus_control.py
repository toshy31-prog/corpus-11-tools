from pathlib import Path
import json
import tempfile
import unittest

import corpus_control


class CorpusControlTests(unittest.TestCase):
    def test_policy_schema_and_unique_ids(self):
        policy=corpus_control.load_policy()
        self.assertEqual(policy["schema_version"],1)
        organ_ids=[x["id"] for x in policy["organs"]]
        debt_ids=[x["id"] for x in policy["debts"]]
        self.assertEqual(len(organ_ids),len(set(organ_ids)))
        self.assertEqual(len(debt_ids),len(set(debt_ids)))

    def test_every_territory_has_contract_path_key(self):
        policy=corpus_control.load_policy()
        paths=corpus_control.current_paths()
        for name,spec in policy["territories"].items():
            if spec.get("optional_mount"):
                continue
            self.assertIn(spec["path_key"],paths,name)

    def test_resolve_spec_is_pure(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp)
            paths={"runtime":root/"runtime","local_runtime":root/"runtime/local"}
            item={"path_key":"local_runtime","relative":"home"}
            self.assertEqual(corpus_control.resolve_spec(item,paths),root/"runtime/local/home")
            self.assertFalse((root/"runtime").exists())

    def test_gc_v1_is_preview_only(self):
        source=Path(corpus_control.__file__).read_text()
        self.assertIn("Seul `gc --dry-run` existe",source)
        self.assertNotIn("shutil.rmtree",source)
        self.assertNotIn(".unlink(",source)

    def test_primary_data_aliases_are_explicit(self):
        policy=corpus_control.load_policy()
        ids={x['id'] for x in policy.get('compatibility_links',[])}
        self.assertIn('attachments-runtime-alias',ids)
        self.assertIn('documents-runtime-alias',ids)
        debts={x['id'] for x in policy['debts']}
        self.assertNotIn('attachments-in-runtime',debts)
        self.assertNotIn('documents-in-runtime',debts)

    def test_opencode_data_is_no_longer_drift(self):
        policy=corpus_control.load_policy()
        debts={x['id'] for x in policy['debts']}
        self.assertNotIn('opencode-synthetic-data',debts)
        links={x['id'] for x in policy.get('compatibility_links',[])}
        self.assertIn('opencode-data-runtime-alias',links)

    def test_opencode_profile_boundary_is_no_longer_drift(self):
        policy=corpus_control.load_policy()
        debts={x['id'] for x in policy['debts']}
        for ident in ('opencode-synthetic-home','opencode-synthetic-config','opencode-synthetic-cache','opencode-synthetic-state'):
            self.assertNotIn(ident,debts)
        organs={x['id']:x for x in policy['organs']}
        self.assertEqual(organs['opencode-profile-home']['allowed_top_level'],['.nv'])

    def test_media_lifecycle_split_is_explicit(self):
        policy=corpus_control.load_policy()
        debts={x['id'] for x in policy['debts']}
        for ident in ('media-audio-archive','media-runtime-archive','media-jobs'):
            self.assertNotIn(ident,debts)
        organs={x['id'] for x in policy['organs']}
        self.assertIn('media-jobs-data',organs)
        links={x['id'] for x in policy.get('compatibility_links',[])}
        self.assertIn('media-jobs-runtime-alias',links)
        forbidden={x['id'] for x in policy['forbidden_paths']}
        self.assertIn('legacy-media-runtime-archive',forbidden)
        self.assertIn('legacy-media-audio-archive',forbidden)

    def test_data_and_config_are_primary_truth(self):
        policy=corpus_control.load_policy()
        self.assertEqual(policy["territories"]["data"]["truth"],"primary")
        self.assertEqual(policy["territories"]["config"]["truth"],"primary")
        self.assertEqual(policy["territories"]["cache"]["truth"],"none")


if __name__=="__main__":
    unittest.main()
