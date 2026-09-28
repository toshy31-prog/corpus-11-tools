import ast,json,unittest
from pathlib import Path
from unittest import mock
import local_bridge

class RetrievalExecutionSurfaceTests(unittest.TestCase):
 def test_invalid_operation_is_rejected_without_provider(self):
  raw=local_bridge.retrieval_grounding_response(json.dumps({"operation":"delete","arguments":{"id":"x"}}).encode())
  self.assertIn(b"400 Bad Request",raw);self.assertIn(b"invalid_request",raw)
 def test_search_bounds_are_preserved(self):
  fake=mock.Mock(stdout=json.dumps({"jsonrpc":"2.0","id":1,"result":{"content":[{"type":"text","text":"{\\\"results\\\":[]}" }]}})+"\n",stderr="",returncode=0)
  with mock.patch("subprocess.run",return_value=fake) as run:
   raw=local_bridge.retrieval_grounding_response(json.dumps({"operation":"search","arguments":{"query":"q","limit":20}}).encode())
  self.assertIn(b"200 OK",raw)
  request=json.loads(run.call_args.kwargs["input"])
  self.assertEqual(request["params"]["name"],"memory_search");self.assertEqual(request["params"]["arguments"],{"query":"q","limit":20})
 def test_index_bounds_reject_oversize(self):
  body={"operation":"index","arguments":{"id":"x","text":"x"*100001,"source":"s"}}
  raw=local_bridge.retrieval_grounding_response(json.dumps(body).encode());self.assertIn(b"400 Bad Request",raw)
 def test_corpus_gpt_declares_bounded_retrieval_tool(self):
  tree=ast.parse(Path("corpus_gpt_mcp.py").read_text())
  assign=next(n for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=="TOOLS" for t in n.targets))
  names=[]
  for item in assign.value.elts:
   if isinstance(item,ast.Dict):
    d={k.value:v for k,v in zip(item.keys,item.values) if isinstance(k,ast.Constant)}
    if "name" in d and isinstance(d["name"],ast.Constant):names.append(d["name"].value)
  self.assertEqual(names.count("retrieval_grounding"),1)
if __name__=="__main__":unittest.main()
