"""Console web locale de contrôle du laboratoire Corpus Open Model."""
from __future__ import annotations
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import json, subprocess, sys, threading, webbrowser
from pathlib import Path
from enriched_relation_graph import enrich
from corpus_cortex import ask as cortex_ask
from corpus_state_kernel import STATE as KERNEL_STATE, advance as advance_kernel
from cognitive_cycle_v0 import QUEUE as PROPOSAL_QUEUE, run as cognitive_cycle
from experience_ledger import clear as clear_experiences, record as record_experience, summary as experience_summary

ROOT = Path(__file__).resolve().parents[4]
PROJECT = Path(__file__).resolve().parents[1]
UI = PROJECT / "ui"
TEMPORAL_EVENTS = PROJECT / "artifacts/temporal-relation-events-v0.jsonl"
state = {"process": None, "log": [], "disposition": "idle", "command": None}

def append(line):
    state["log"].append(line.rstrip())
    state["log"] = state["log"][-500:]

def status():
    readiness = subprocess.run([sys.executable, str(PROJECT / "src/metabolic_readiness.py")], cwd=ROOT, capture_output=True, text=True).stdout
    return {"run_active": state["process"] is not None and state["process"].poll() is None, "disposition": state["disposition"], "command": state["command"], "readiness": json.loads(readiness), "artifacts": len(list((PROJECT / "artifacts").glob("*")))}

def transitions():
    events = [json.loads(line) for line in TEMPORAL_EVENTS.read_text().splitlines() if line.strip()] if TEMPORAL_EVENTS.exists() else []
    return {"events": events[-20:], "shown": min(20, len(events)), "total": len(events)}

def kernel_state():
    return None if not KERNEL_STATE.exists() else json.loads(KERNEL_STATE.read_text())

def proposals():
    rows = [] if not PROPOSAL_QUEUE.exists() else [json.loads(line) for line in PROPOSAL_QUEUE.read_text().splitlines() if line.strip()]
    return {"proposals": rows[-20:], "shown": min(20, len(rows)), "total": len(rows)}

def launch(command):
    if state["process"] is not None and state["process"].poll() is None: raise RuntimeError("A run is already active.")
    state.update(process=subprocess.Popen(command, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1), log=[], disposition="running", command=command)
    def collect():
        for line in state["process"].stdout: append(line)
        code = state["process"].wait(); append(f"[process exited: {code}]")
        if state["disposition"] == "running": state["disposition"] = "completed_locally_not_promoted"
    threading.Thread(target=collect, daemon=True).start()

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs): super().__init__(*args, directory=str(UI), **kwargs)
    def json(self, payload, code=200):
        body=json.dumps(payload, ensure_ascii=False).encode(); self.send_response(code); self.send_header("Content-Type","application/json"); self.send_header("Content-Length",str(len(body))); self.end_headers(); self.wfile.write(body)
    def do_GET(self):
        if self.path == "/api/status": return self.json(status())
        if self.path == "/api/log": return self.json({"lines": state["log"]})
        if self.path == "/api/graph":
            graph=enrich(ROOT); return self.json({"nodes":[{"id":node["id"],"kind":node["kind"],"surface":node.get("surface","capability"),"status":node.get("status","")} for node in graph["nodes"]],"edges":[{"from":edge["from"],"to":edge["to"],"type":edge["type"]} for edge in graph["edges"]]})
        if self.path == "/api/trajectory":
            files=sorted((PROJECT/"artifacts/exploratory-sessions").glob("*-trajectory.jsonl")); rows=[] if not files else [json.loads(line) for line in files[-1].read_text().splitlines()]; return self.json({"rows":rows})
        if self.path == "/api/transitions": return self.json(transitions())
        if self.path == "/api/kernel-state": return self.json({"state": kernel_state()})
        if self.path == "/api/proposals": return self.json(proposals())
        if self.path == "/api/experiences": return self.json(experience_summary())
        return super().do_GET()
    def do_POST(self):
        size=int(self.headers.get("Content-Length","0")); payload=json.loads(self.rfile.read(size) or b"{}")
        try:
            if self.path == "/api/run": launch(payload["command"]); return self.json({"ok":True})
            if self.path == "/api/stop":
                if state["process"] and state["process"].poll() is None: state["disposition"] = "stopped_keep_local_checkpoint" if payload.get("keep",True) else "stopped_not_promoted"; state["process"].send_signal(__import__("signal").SIGINT)
                return self.json({"ok":True,"disposition":state["disposition"]})
            if self.path == "/api/chat":
                response = cortex_ask(payload.get("question", ""), payload.get("model", ""))
                if payload.get("remember", True): record_experience("dialogue", {"question": payload.get("question", ""), "model": payload.get("model", ""), "answer": response.get("answer", ""), "sources": response.get("sources", [])})
                return self.json(response)
            if self.path == "/api/advance-kernel": return self.json(advance_kernel())
            if self.path == "/api/cognitive-cycle": return self.json(cognitive_cycle())
            if self.path == "/api/feedback": return self.json(record_experience("human_feedback", {"text": payload.get("text", "")}))
            if self.path == "/api/clear-experiences": return self.json(clear_experiences())
            return self.json({"error":"unknown endpoint"},404)
        except Exception as error: return self.json({"error":str(error)},400)

if __name__ == "__main__":
    server=ThreadingHTTPServer(("127.0.0.1",8765),Handler); print("Corpus Metabolism Console: http://127.0.0.1:8765"); webbrowser.open("http://127.0.0.1:8765"); server.serve_forever()
