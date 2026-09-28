#!/usr/bin/env python3
import json
import os
import subprocess
import sys
from pathlib import Path

import blocker_resilience as blocker_policy
import corpus_gpt_async as async_jobs
import corpus_gpt_job_policy as job_policy
import corpus_gpt_planner as execution_planner

# OpenCode peut imposer un HOME sandboxé à ses MCP.
# Ne jamais utiliser ce HOME pour retrouver l'infrastructure utilisateur.
#
# Ce fichier vit dans:
#   ~/Documents/ChatGPT/Corpus/projets/corpus-local-llm-migration/
# On remonte donc jusqu'au vrai HOME propriétaire du dépôt.
SELF = Path(__file__).resolve()

try:
    REAL_HOME = SELF.parents[5]
except IndexError:
    raise RuntimeError(
        f"Impossible de déduire le HOME réel depuis {SELF}"
    )

ENTRY = Path(
    os.environ.get(
        "CORPUS_GPT_BIN",
        str(REAL_HOME / ".local/bin/corpus-gpt"),
    )
)

BB = Path(
    os.environ.get(
        "CORPUS_BB_RUNNER_ROOT",
        str(REAL_HOME / ".local/share/corpus-bb-runner"),
    )
)

JOBS = BB / "jobs"
JOB_POLICY = BB / "state/job-policy.json"

def result(text, error=False):
    return {"content":[{"type":"text","text":text}], "isError": bool(error)}

def run(args, timeout=360, extra_env=None):
    try:
        child_env = os.environ.copy()
        child_env["CORPUS_GPT_BIN"] = str(ENTRY)
        child_env["CORPUS_BB_RUNNER_ROOT"] = str(BB)
        child_env["CORPUS_BB_SKIP_GPT"] = "1"
        child_env.update(extra_env or {})

        p = subprocess.run(
            [str(ENTRY), *args],
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            timeout=timeout,
            check=False,
            env=child_env,
        )
        return result(p.stdout.rstrip() + f"\nEXIT_CODE={p.returncode}", p.returncode != 0)
    except subprocess.TimeoutExpired:
        return result("TIMEOUT", True)

def safe_jobs():
    out = []
    if JOBS.is_dir():
        for p in sorted(JOBS.glob("*.sh")):
            if p.is_file() and p.parent == JOBS:
                out.append(p.stem)
    return out

TOOLS = [
    {
        "name":"status",
        "description":"Lire l'état du pont Corpus GPT : backend, CDP, Firefox et verrou du runner. Lecture seule.",
        "inputSchema":{"type":"object","properties":{},"additionalProperties":False},
    },
    {
        "name":"runtime_probe",
        "description":"Diagnostic lecture seule du processus MCP Corpus GPT lui-même. Ne lance aucun job ni subprocess.",
        "inputSchema":{"type":"object","properties":{},"additionalProperties":False},
    },
    {
        "name":"assess_blocker",
        "description":"Classifier un blocage déjà observé et retourner une stratégie de reprise déterministe, sans effet de bord.",
        "inputSchema":{
            "type":"object",
            "properties":{
                "message":{"type":"string","maxLength":12000},
                "kind":{"type":"string","enum":[
                    "transport_failure","timeout_unknown_completion","validation_failure",
                    "stale_derived_state","resource_pressure","concurrent_change",
                    "runtime_degraded","external_dependency","permission_refusal","environment_constraint","unknown"
                ]},
                "known_completion":{"type":"boolean"},
                "repeated":{"type":"boolean"},
                "destructive_cleanup_authorized":{"type":"boolean"}
            },
            "additionalProperties":False,
        },
    },
    {
        "name":"doctor",
        "description":"Vérifier l'infrastructure Corpus GPT sans exécuter de job de test.",
        "inputSchema":{"type":"object","properties":{},"additionalProperties":False},
    },
    {
        "name":"jobs",
        "description":"Lister les jobs Corpus GPT enregistrés et autorisés.",
        "inputSchema":{"type":"object","properties":{},"additionalProperties":False},
    },
    {
        "name":"job_info",
        "description":"Vérifier un job nommé sans lister tout le registre : existence et classe local/browser.",
        "inputSchema":{"type":"object","properties":{"job":{"type":"string","pattern":"^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$"}},"required":["job"],"additionalProperties":False},
    },
    {
        "name":"capabilities",
        "description":"Résumé compact des capacités et du protocole efficace Corpus GPT.",
        "inputSchema":{"type":"object","properties":{},"additionalProperties":False},
    },
    {
        "name":"plan_next",
        "description":"Planifier sans exécuter la prochaine utilisation Corpus GPT avec axes de portée, transversalité, abstraction, réversibilité et preuve.",
        "inputSchema":{"type":"object","properties":{"status":{"type":"string","enum":["pass","degraded","unknown"]},"job_known":{"type":"boolean"},"job_kind":{"type":"string","enum":["local","browser"]},"potentially_long":{"type":"boolean"},"write":{"type":"boolean"},"destructive":{"type":"boolean"},"abstraction":{"type":"string"},"transversality":{"type":"string"},"reversibility":{"type":"string"},"evidence_freshness":{"type":"string"},"uncertainty":{"type":"string"},"counterfield":{"type":"string"},"revision_condition":{"type":"string"},"stop_condition":{"type":"string"},"exclusive_resources":{"type":"array","items":{"type":"string"}},"preserved_capabilities":{"type":"array","items":{"type":"string"}},"displaced_costs":{"type":"array","items":{"type":"string"}},"blocker":{"type":"object"}},"additionalProperties":False},
    },
    {
        "name":"run_job",
        "description":"Exécuter un job Corpus GPT déjà enregistré. Le nom doit être celui d'un job listé; aucun chemin ni commande shell arbitraire n'est accepté.",
        "inputSchema":{
            "type":"object",
            "properties":{"job":{"type":"string","pattern":"^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$"}},
            "required":["job"],
            "additionalProperties":False,
        },
    },
    {
        "name":"start_job",
        "description":"Démarrer sans attente un job Corpus GPT déjà enregistré. Le même job actif n'est pas dupliqué; un token persistant est renvoyé.",
        "inputSchema":{
            "type":"object",
            "properties":{"job":{"type":"string","pattern":"^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$"}},
            "required":["job"],
            "additionalProperties":False,
        },
    },
    {
        "name":"async_jobs",
        "description":"Lister les derniers jobs asynchrones Corpus GPT avec token, état et code de sortie éventuel. Lecture seule.",
        "inputSchema":{"type":"object","properties":{},"additionalProperties":False},
    },
    {
        "name":"job_status",
        "description":"Lire l'état persistant et la fin de sortie d'un job asynchrone Corpus GPT.",
        "inputSchema":{
            "type":"object",
            "properties":{"token":{"type":"string","pattern":"^[a-f0-9]{16}$"},"tail_lines":{"type":"integer","minimum":0,"maximum":200}},
            "required":["token"],
            "additionalProperties":False,
        },
    },
    {
        "name":"install_managed_job",
        "description":"Installer ou mettre à jour un job Bash borné dans le registre Corpus GPT. Nom strict, destination imposée, backup et bash -n.",
        "inputSchema":{
            "type":"object",
            "properties":{
                "name":{"type":"string","pattern":"^[a-z0-9][a-z0-9-]{0,63}$"},
                "content":{"type":"string","minLength":20,"maxLength":60000}
            },
            "required":["name","content"],
            "additionalProperties":False,
        },
    },
    {
        "name":"latest_evidence",
        "description":"Lister les derniers dossiers de preuves Corpus BugBounty. Lecture seule.",
        "inputSchema":{"type":"object","properties":{},"additionalProperties":False},
    },
]

def call(name, a):
    a = a or {}
    if name == "runtime_probe":
        import shutil

        lines = [
            "PID=" + str(os.getpid()),
            "PPID=" + str(os.getppid()),
            "FILE=" + str(Path(__file__).resolve()),
            "HOME_ENV=" + repr(os.environ.get("HOME")),
            "PATH_ENV=" + repr(os.environ.get("PATH")),
            "REAL_HOME=" + str(REAL_HOME),
            "ENTRY=" + str(ENTRY),
            "ENTRY_EXISTS=" + repr(ENTRY.exists()),
            "ENTRY_IS_FILE=" + repr(ENTRY.is_file()),
            "ENTRY_EXECUTABLE=" + repr(os.access(ENTRY, os.X_OK)),
            "ENTRY_RESOLVED=" + str(ENTRY.resolve()),
            "BB=" + str(BB),
            "BB_EXISTS=" + repr(BB.exists()),
            "BASH_WHICH=" + repr(shutil.which("bash")),
            "ENV_CORPUS_GPT_BIN=" + repr(os.environ.get("CORPUS_GPT_BIN")),
            "ENV_CORPUS_BB_RUNNER_ROOT=" + repr(os.environ.get("CORPUS_BB_RUNNER_ROOT")),
        ]

        return result("\n".join(lines))

    if name == "status":
        return run(["status"], 20)
    if name == "assess_blocker":
        observation = {key: value for key, value in a.items() if value is not None}
        try:
            value = blocker_policy.assess(observation)
        except ValueError as exc:
            return result("REFUS: " + str(exc), True)
        return result(json.dumps(value, ensure_ascii=False, indent=2))
    if name == "doctor":
        return run(["doctor"], 30)
    if name == "jobs":
        return result("\n".join(safe_jobs()))
    if name == "job_info":
        job=a.get("job"); allowed=safe_jobs()
        if not isinstance(job,str) or job not in allowed:return result(json.dumps({"job":job,"exists":False},ensure_ascii=False))
        return result(json.dumps({"job":job,"exists":True,"kind":job_policy.kind_for(job,job_policy.load(JOB_POLICY))},ensure_ascii=False))
    if name == "capabilities":
        value={"protocol":"efficient-v2","fast_path":"status_then_known_job","doctor":"on_degraded_only","discovery":"jobs_or_job_info","long_jobs":"start_job_then_job_status","job_status_default_tail_lines":24,"managed_job_default_kind":"local","browser_marker":"# corpus-job-kind: browser","repo":str(SELF.parents[2]),"runner":str(BB)}
        return result(json.dumps(value,ensure_ascii=False,separators=(",",":")))
    if name == "plan_next":
        try: value=execution_planner.plan(a)
        except ValueError as exc: return result("REFUS: "+str(exc),True)
        return result(json.dumps(value,ensure_ascii=False,separators=(",",":")))
    if name == "start_job":
        job = a.get("job")
        try:
            value = async_jobs.start_job(
                job,
                allowed_jobs=safe_jobs(),
                entry=ENTRY,
                bb=BB,
                repo=SELF.parents[2],
                job_kind=job_policy.kind_for(job, job_policy.load(JOB_POLICY)),
            )
        except ValueError as exc:
            return result("REFUS: " + str(exc), True)
        lines = [
            "ASYNC_JOB_STARTED=" + ("PASS" if value.get("started") else "EXISTING"),
            "TOKEN=" + str(value.get("token")),
            "JOB=" + str(value.get("job")),
            "STATUS=" + str(value.get("status")),
            "PID=" + str(value.get("pid")),
        ]
        return result("\n".join(lines))
    if name == "async_jobs":
        rows = []
        for value in async_jobs.recent_states(BB):
            rows.append({
                "token": value.get("token"),
                "job": value.get("job"),
                "status": value.get("status"),
                "completion_known": value.get("completion_known"),
                "exit_code": value.get("exit_code"),
                "pid": value.get("pid"),
            })
        return result(json.dumps(rows, ensure_ascii=False, indent=2))
    if name == "job_status":
        try:
            value = async_jobs.job_status(a.get("token"), bb=BB, tail_lines=a.get("tail_lines", 24))
        except ValueError as exc:
            return result("REFUS: " + str(exc), True)
        return result(json.dumps(value, ensure_ascii=False, indent=2))
    if name == "install_managed_job":
        import re
        import shutil
        import tempfile
        import datetime
        job_name = a.get("name")
        content = a.get("content")
        if not isinstance(job_name, str) or not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,63}", job_name):
            return result("REFUS: nom de job invalide", True)
        if not isinstance(content, str) or not content.startswith("#!/usr/bin/env bash\n"):
            return result("REFUS: shebang bash requis", True)
        if len(content) < 20 or len(content) > 60000:
            return result("REFUS: taille de job invalide", True)
        jobs = JOBS.resolve()
        jobs.mkdir(parents=True, exist_ok=True)
        dest = (jobs / (job_name + ".sh")).resolve()
        if dest.parent != jobs:
            return result("REFUS: sortie du registre jobs", True)
        backup = None
        if dest.exists():
            stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S-%f")
            bdir = BB / "backups" / "managed-jobs" / stamp
            bdir.mkdir(parents=True, exist_ok=True)
            backup = bdir / dest.name
            shutil.copy2(dest, backup)
        fd, tmp = tempfile.mkstemp(prefix=".managed-job-", dir=str(jobs))
        os.close(fd)
        tp = Path(tmp)
        try:
            tp.write_text(content)
            chk = subprocess.run(
                ["/usr/bin/bash","-n",str(tp)],
                text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                timeout=10, check=False,
            )
            if chk.returncode != 0:
                return result("REFUS: bash -n: " + chk.stdout, True)
            tp.chmod(0o700)
            tp.replace(dest)
        finally:
            if tp.exists():
                tp.unlink()
        registry=job_policy.load(JOB_POLICY)
        registry[job_name]={"kind":job_policy.kind_from_content(content)}
        JOB_POLICY.parent.mkdir(parents=True,exist_ok=True)
        JOB_POLICY.write_text(json.dumps(registry,ensure_ascii=False,indent=2)+"\n")
        lines=["MANAGED_JOB_INSTALL=PASS","JOB="+job_name,"KIND="+registry[job_name]["kind"],"PATH="+str(dest),"BASH_N=PASS"]
        if backup is not None:
            lines.append("BACKUP="+str(backup))
        return result("\n".join(lines))
    if name == "latest_evidence":
        return run(["evidence"], 20)
    if name == "run_job":
        job = a.get("job")
        allowed = safe_jobs()
        if not isinstance(job, str) or job not in allowed:
            return result("REFUS: job non enregistré. Autorisés: " + ", ".join(allowed), True)
        kind=job_policy.kind_for(job,job_policy.load(JOB_POLICY))
        return run(["run", job], 600, job_policy.runner_env(kind))
    return result("outil inconnu", True)

def send(obj):
    sys.stdout.write(json.dumps(obj, ensure_ascii=False) + "\n")
    sys.stdout.flush()

for line in sys.stdin:
    try:
        req = json.loads(line)
        mid = req.get("id")
        method = req.get("method")
        if method == "initialize":
            res = {
                "protocolVersion":"2024-11-05",
                "capabilities":{"tools":{}},
                "serverInfo":{"name":"corpus-gpt","version":"1"},
            }
        elif method == "notifications/initialized":
            continue
        elif method == "tools/list":
            res = {"tools":TOOLS}
        elif method == "tools/call":
            p = req.get("params") or {}
            res = call(p.get("name"), p.get("arguments") or {})
        else:
            if mid is None:
                continue
            send({"jsonrpc":"2.0","id":mid,"error":{"code":-32601,"message":"Method not found"}})
            continue
        if mid is not None:
            send({"jsonrpc":"2.0","id":mid,"result":res})
    except Exception as e:
        try:
            send({"jsonrpc":"2.0","id":req.get("id"),"error":{"code":-32000,"message":str(e)}})
        except Exception:
            pass
