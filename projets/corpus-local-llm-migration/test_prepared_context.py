import json
import unittest
from pathlib import Path
from prepared_context import prepare_context
HERE = Path(__file__).resolve().parent
CATALOG = json.loads((HERE / 'tool_router_catalog_v2.json').read_text())
PROFILES = json.loads((HERE / 'tool_profiles.json').read_text())
class PreparedContextTests(unittest.TestCase):
    def prepare(self, **changes):
        values = {'model':'qwen-local','profile_id':'resume-check','profiles':PROFILES,'catalog':CATALOG,'permissions':{'read':'allow','bash':'ask','network':'deny'},'invariant_context':'Corpus reste local et toute action sensible demande confirmation.','user_request':'Relis le travail et contrôle le test.','context_items':[{'id':'resume-1','kind':'resume','text':'État: test nécessaire.'},{'id':'tool-1','kind':'resume','text':'État: test nécessaire.'},{'id':'note-1','kind':'workspace','text':'Le fichier cible est fixture.py.'}]}
        values.update(changes); return prepare_context(**values)
    def test_exact_duplicates_are_removed_but_receipted(self):
        prepared=self.prepare(); self.assertEqual([r['id'] for r in prepared.included_context],['resume-1','note-1']); self.assertEqual(prepared.dropped_duplicates[0]['id'],'tool-1'); self.assertEqual(prepared.dropped_duplicates[0]['duplicate_of'],'resume-1'); report=prepared.receipt(); self.assertEqual(report['context']['supplied_count'],3); self.assertEqual(report['context']['included_count'],2); self.assertEqual(report['context']['dropped_exact_duplicates'],1); self.assertNotIn('test nécessaire',str(report))
    def test_profile_is_minimal_exposure_and_never_permission_or_execution(self):
        receipt=self.prepare().receipt(); self.assertEqual(receipt['tool_exposure'],['bash','corpus-retrieval_memory_search','read']); self.assertEqual(receipt['permission'],'unchanged_not_evaluated'); self.assertEqual(receipt['execution'],'not_started'); self.assertNotIn('edit',receipt['tool_exposure'])
    def test_variable_context_does_not_change_stable_cache_prefix(self):
        first=self.prepare(user_request='Contrôle A.'); second=self.prepare(user_request='Contrôle B.',context_items=[{'id':'x','kind':'workspace','text':'Autre contexte.'}]); self.assertEqual(first.envelope.cache_key,second.envelope.cache_key); self.assertEqual(first.envelope.prefix,second.envelope.prefix); self.assertNotEqual(first.envelope.suffix,second.envelope.suffix)
    def test_identical_text_never_crosses_provenance_or_permission_boundaries(self):
        prepared = self.prepare(context_items=[
            {'id':'local','kind':'workspace','provenance':'local-file','permission_scope':'project-a','text':'Même passage.'},
            {'id':'imported','kind':'workspace','provenance':'imported-archive','permission_scope':'project-a','text':'Même passage.'},
            {'id':'restricted','kind':'workspace','provenance':'local-file','permission_scope':'project-b','text':'Même passage.'},
        ])
        self.assertEqual(len(prepared.included_context), 3)
        self.assertEqual(len(prepared.dropped_duplicates), 0)

    def test_identical_text_in_same_boundary_is_deduplicated(self):
        prepared = self.prepare(context_items=[
            {'id':'a','kind':'workspace','provenance':'local-file','permission_scope':'project-a','text':'Même passage.'},
            {'id':'b','kind':'workspace','provenance':'local-file','permission_scope':'project-a','text':'Même passage.'},
        ])
        self.assertEqual([row['id'] for row in prepared.included_context], ['a'])
        self.assertEqual(prepared.dropped_duplicates[0]['duplicate_of'], 'a')

    def test_invalid_context_is_refused(self):
        with self.assertRaisesRegex(ValueError,'Identifiant'): self.prepare(context_items=[{'id':'same','kind':'workspace','text':'A'},{'id':'same','kind':'workspace','text':'B'}])
        with self.assertRaisesRegex(ValueError,'kind'): self.prepare(context_items=[{'id':'x','kind':'internet','text':'A'}])
        with self.assertRaisesRegex(ValueError,'texte non vide'): self.prepare(context_items=[{'id':'x','kind':'workspace','text':' '}])
if __name__ == '__main__': unittest.main()
