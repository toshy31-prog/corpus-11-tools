#!/usr/bin/env python3
from __future__ import annotations
import json, subprocess, time
from pathlib import Path

HOME=Path.home()
CLIENT=HOME/".local/bin/tunnel-client"
STATE=HOME/".local/state/corpus/gpt-tunnel-watchdog.json"
THRESHOLD=2

def run(*args):
    return subprocess.run(args,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,check=False,timeout=15)

def load():
    try: return json.loads(STATE.read_text())
    except (OSError,json.JSONDecodeError): return {"consecutive_failures":0}

def save(v):
    STATE.parent.mkdir(parents=True,exist_ok=True)
    tmp=STATE.with_suffix(".tmp")
    tmp.write_text(json.dumps(v,ensure_ascii=False,indent=2)+"\n")
    tmp.replace(STATE)

def main():
    now=time.time()
    probe=run(str(CLIENT),"health","--port","8080","--require-control-plane-poll","--json")
    state=load()
    if probe.returncode==0:
        state.update({"consecutive_failures":0,"last_ok_unix":now,"last_probe":"ok"})
        save(state)
        print("WATCHDOG=HEALTHY")
        return 0

    failures=int(state.get("consecutive_failures",0))+1
    state.update({"consecutive_failures":failures,"last_failure_unix":now,"last_probe":"failed","probe_output":probe.stdout[-4000:]})
    if failures < THRESHOLD:
        save(state)
        print(f"WATCHDOG=DEGRADED failures={failures} action=observe")
        return 0

    restart=run("systemctl","--user","restart","corpus-gpt-tunnel.service")
    state["last_restart_unix"]=now
    state["last_restart_rc"]=restart.returncode
    state["last_restart_output"]=restart.stdout[-4000:]
    if restart.returncode==0:
        state["consecutive_failures"]=0
        state["last_probe"]="restart_requested"
    save(state)
    print(f"WATCHDOG=RESTART rc={restart.returncode}")
    return 0 if restart.returncode==0 else 1

if __name__=="__main__":
    raise SystemExit(main())
