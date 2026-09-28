import ast
import unittest
from pathlib import Path

HERE=Path(__file__).resolve().parent
MCP=HERE/"corpus_gpt_mcp.py"

class ExecutionLifecycleContractTests(unittest.TestCase):
    def test_mcp_tools_are_unique(self):
        tree=ast.parse(MCP.read_text())
        tools=next(n.value for n in tree.body if isinstance(n,ast.Assign) for target in n.targets if isinstance(target,ast.Name) and target.id=="TOOLS")
        names=[]
        for item in tools.elts:
            data={k.value:v for k,v in zip(item.keys,item.values) if isinstance(k,ast.Constant)}
            if "name" in data and isinstance(data["name"],ast.Constant): names.append(data["name"].value)
        self.assertEqual(len(names),len(set(names)))
        for required in ["start_job","job_status","cancel_job","browser"]:
            self.assertIn(required,names)

    def test_visual_metadata_is_single_and_canonical(self):
        source=MCP.read_text()
        self.assertEqual(source.count('"visual_job_kinds":["browser-headless","browser-visible","browser-hybrid"]'),1)
        self.assertEqual(source.count('"visual_target_marker":"# corpus-visual-target: <url>"'),1)


    def test_active_visual_target_has_one_definition(self):
        tree=ast.parse(MCP.read_text())
        defs=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=="active_visual_target"]
        self.assertEqual(len(defs),1)

    def test_visual_target_is_scoped_to_async_state(self):
        source=(HERE/"corpus_gpt_async.py").read_text()
        self.assertIn('"job_kind": job_kind', source)
        self.assertIn('"visual_target": visual_target if job_kind in {"browser-visible", "browser-hybrid"} else ""', source)

    def test_browser_convergence_uses_only_active_visual_jobs(self):
        source=MCP.read_text()
        self.assertIn('state.get("status") not in {"starting", "running"}', source)
        self.assertIn('state.get("job_kind") not in {"browser-visible", "browser-hybrid"}', source)
        self.assertIn('value["target_converged"] = value.get("url") == lifecycle["target"]', source)
        self.assertIn('REFUS: navigation hors cible lifecycle active', source)

if __name__=="__main__":
    unittest.main()
