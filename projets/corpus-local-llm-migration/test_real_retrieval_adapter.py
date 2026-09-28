import unittest
import decision_grounding as dg
class RealAdapterTests(unittest.TestCase):
 def test_real_shape_explicit_id_mapping_only(self):
  raw={"results":[{"id":"doc-1","source":"fixture","text":"arbitrary words","score":.91}]}
  x=dg.normalize_memory_search_response(provider_response=raw,query="q",limit=5,scope="A",reason="ground",id_resolution_map={"doc-1":{"assertion_ref":"ast:known"}})
  self.assertEqual(x["status"],"hits");self.assertEqual(x["retrieval_results"][0]["resolution"],{"assertion_ref":"ast:known"});self.assertEqual(x["retrieval_results"][0]["score"],.91)
 def test_unmapped_real_hit_is_unresolved_not_text_matched(self):
  raw={"results":[{"id":"doc-x","source":"fixture","text":"task.reversibility reversible safe change","score":1.0}]}
  x=dg.normalize_memory_search_response(provider_response=raw,query="safe change",limit=5,scope="A",reason="ground")
  self.assertEqual(x["retrieval_results"][0]["resolution"],{"assertion_ref":"provider-unresolved:doc-x"})
 def test_failure_and_zero_hits_distinct(self):
  f=dg.normalize_memory_search_response(provider_response={"error":{"code":-32603,"message":"router unavailable"}},query="q",limit=5,scope="A",reason="ground")
  z=dg.normalize_memory_search_response(provider_response={"results":[]},query="q",limit=5,scope="A",reason="ground")
  self.assertEqual(f["status"],"provider_failure");self.assertEqual(z["status"],"zero_hits")
 def test_rank_is_observed_order_only(self):
  raw={"results":[{"id":"a","source":"s","text":"a","score":.2},{"id":"b","source":"s","text":"b","score":.9}]}
  x=dg.normalize_memory_search_response(provider_response=raw,query="q",limit=5,scope="A",reason="ground")
  self.assertEqual([r["rank"] for r in x["retrieval_results"]],[1,2]);self.assertEqual([r["score"] for r in x["retrieval_results"]],[.2,.9])
if __name__=="__main__":unittest.main()
