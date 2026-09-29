import unittest

import local_task_bridge as bridge


class Clock:
    def __init__(self, step=0.1):
        self.value=0.0
        self.step=step
    def __call__(self):
        self.value += self.step
        return self.value



class LocalTaskBridgeTests(unittest.TestCase):
    def test_new_session_compact_result_and_no_history_copy(self):
        calls=[]
        polls=iter([
            [],
            [
                {"info":{"id":"u1","role":"user"}},
                {"info":{"role":"assistant","parentID":"u1","finish":"stop","time":{"completed":1}},
                 "parts":[{"type":"text","text":"42"}]},
            ],
        ])
        def request(method,path,body,directory):
            calls.append((method,path,body,directory))
            if path=="/session": return {"id":"ses_1"}
            if path.endswith("/message"): return next(polls)
            if path=="/permission": return []
            return {}
        result=bridge.submit_local_task(
            objective="Réponds 42",directory="/Corpus",context_refs=["decision:x"],
            constraints=["lecture seule"],request=request,
            clock=Clock(),sleep=lambda _:None)
        self.assertEqual(result["status"],"completed")
        self.assertEqual(result["summary"],"42")
        self.assertEqual(result["session_id"],"ses_1")
        self.assertNotIn("messages",result)
        payload=next(body for method,path,body,_ in calls if path.endswith("/prompt_async"))
        self.assertIn("decision:x",payload["parts"][0]["text"])
        self.assertNotIn("histor",str(payload).lower())

    def test_continuation_reuses_existing_session_and_targets_only_new_turn(self):
        calls=[]
        before=[
            {"info":{"id":"old","role":"user"}},
            {"info":{"role":"assistant","parentID":"old","finish":"stop","time":{"completed":1}},
             "parts":[{"type":"text","text":"ancien"}]},
        ]
        after=before+[
            {"info":{"id":"new","role":"user"}},
            {"info":{"role":"assistant","parentID":"new","finish":"stop","time":{"completed":2}},
             "parts":[{"type":"text","text":"nouveau"}]},
        ]
        polls=iter([before,after])
        def request(method,path,body,directory):
            calls.append((method,path,body,directory))
            if method=="GET" and path=="/session/ses_existing": return {"id":"ses_existing"}
            if path.endswith("/message"): return next(polls)
            if path=="/permission": return []
            return {}
        result=bridge.submit_local_task(
            objective="Continue",directory="/Corpus",session_id="ses_existing",
            request=request,clock=Clock(),sleep=lambda _:None)
        self.assertEqual(result["summary"],"nouveau")
        self.assertFalse(result["session_created"])
        self.assertFalse(any(path=="/session" and method=="POST" for method,path,_,_ in calls))

    def test_tool_calls_are_compact_and_preserved(self):
        polls=iter([
            [],
            [
                {"info":{"id":"u","role":"user"}},
                {"info":{"role":"assistant","parentID":"u","finish":"stop","time":{"completed":1}},
                 "parts":[{"type":"tool","tool":"corpus-gpt_status","state":{"status":"completed","output":"CORPUS=PASS"}}]},
            ],
        ])
        def request(method,path,body,directory):
            if path=="/session": return {"id":"s"}
            if path.endswith("/message"): return next(polls)
            if path=="/permission": return []
            return {}
        result=bridge.submit_local_task(
            objective="status",directory="/Corpus",request=request,
            clock=Clock(),sleep=lambda _:None)
        self.assertEqual(result["tool_calls"],[
            {"tool":"corpus-gpt_status","status":"completed","output":"CORPUS=PASS"}
        ])

    def test_503_is_loading_not_generic_failure(self):
        def request(method,path,body,directory):
            raise RuntimeError("HTTP 503 : moteur en préparation")
        result=bridge.submit_local_task(objective="x",directory="/Corpus",request=request)
        self.assertEqual(result["error"],"model_or_backend_loading")

    def test_connection_error_is_service_unavailable(self):
        def request(method,path,body,directory):
            raise OSError("connection refused")
        result=bridge.submit_local_task(objective="x",directory="/Corpus",request=request)
        self.assertEqual(result["error"],"local_service_unavailable")

    def test_model_error_is_distinct(self):
        polls=iter([
            [],
            [
                {"info":{"id":"u","role":"user"}},
                {"info":{"role":"assistant","parentID":"u","finish":"error","error":{"message":"boom"}},
                 "parts":[]},
            ],
        ])
        def request(method,path,body,directory):
            if path=="/session": return {"id":"s"}
            if path.endswith("/message"): return next(polls)
            if path=="/permission": return []
            return {}
        result=bridge.submit_local_task(
            objective="x",directory="/Corpus",request=request,
            clock=Clock(),sleep=lambda _:None)
        self.assertEqual(result["error"],"model_or_tool_error")

    def test_timeout_aborts_without_resubmit(self):
        calls=[]
        polls=iter([[],[],[]])
        def request(method,path,body,directory):
            calls.append((method,path))
            if path=="/session": return {"id":"s"}
            if path.endswith("/message"): return next(polls,[])
            if path=="/permission": return []
            return {}
        result=bridge.submit_local_task(
            objective="x",directory="/Corpus",deadline=0.15,poll_delay=0,
            request=request,clock=Clock(),sleep=lambda _:None)
        self.assertEqual(result["error"],"task_timeout")
        self.assertEqual(sum(path.endswith("/prompt_async") for _,path in calls),1)
        self.assertEqual(sum(path.endswith("/abort") for _,path in calls),1)

    def test_tool_scope_is_strict_and_forwarded(self):
        calls=[]
        polls=iter([
            [],
            [{"info":{"id":"u","role":"user"}},
             {"info":{"role":"assistant","parentID":"u","finish":"stop","time":{"completed":1}},
              "parts":[{"type":"text","text":"ok"}]}],
        ])
        def request(method,path,body,directory):
            calls.append((method,path,body))
            if path=="/session": return {"id":"s"}
            if path=="/permission": return []
            if path.endswith("/message"): return next(polls)
            if path=="/permission": return []
            return {}
        scope={"bash":False,"corpus-retrieval_memory_search":True}
        result=bridge.submit_local_task(objective="x",directory="/Corpus",tool_scope=scope,
            request=request,clock=Clock(),sleep=lambda _:None)
        payload=next(body for method,path,body in calls if path.endswith("/prompt_async"))
        self.assertEqual(payload["tools"],scope)
        self.assertEqual(result["status"],"completed")
        with self.assertRaises(ValueError):
            bridge.submit_local_task(objective="x",directory="/Corpus",tool_scope={"bash":"false"},
                request=request)

    def test_permission_required_is_distinct_and_never_replied(self):
        calls=[]
        polls=iter([[]])
        def request(method,path,body,directory):
            calls.append((method,path))
            if path=="/session": return {"id":"s"}
            if path.endswith("/message"): return next(polls,[])
            if path=="/permission": return [{"id":"perm_1","sessionID":"s","permission":"bash"}]
            return {}
        result=bridge.submit_local_task(objective="x",directory="/Corpus",request=request,
            clock=Clock(),sleep=lambda _:None)
        self.assertEqual(result["error"],"permission_required")
        self.assertEqual(result["permissions"],[{"id":"perm_1","permission":"bash"}])
        self.assertFalse(any(path.startswith("/permission/") for _,path in calls))

    def test_input_is_bounded(self):
        with self.assertRaises(ValueError):
            bridge.submit_local_task(objective="x"*12001,directory="/Corpus",request=lambda *a:None)
        with self.assertRaises(ValueError):
            bridge.submit_local_task(objective="x",directory="/Corpus",context_refs=[3],request=lambda *a:None)


if __name__=="__main__":
    unittest.main()
