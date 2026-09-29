#!/usr/bin/env python3
import base64
import json
import os
import socket
import subprocess
import sys
import threading
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import blocker_resilience as blocker_policy
import authorized_async_gate as auth_gate
import capability_handoff as handoff
import corpus_gpt_async as async_jobs
import corpus_gpt_job_policy as job_policy
import corpus_gpt_reload as reload_guard
import corpus_gpt_planner as execution_planner
import decision_grounding_orchestrator
import local_task_bridge
import visual_artifact_occurrence as visual_artifacts

RUNTIME_LOAD_CONFIRMATION = reload_guard.confirm_loaded_runtime()

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
AUTHORIZATION_CONFIG = BB / "state/authorization.json"
VISUAL_ARTIFACT_ROOT = BB / "visual-artifacts"

def result(text, error=False):
    return {"content":[{"type":"text","text":text}], "isError": bool(error)}

def _local_task_client_allowed():
    # corpus_gpt_mcp.py is also spawned inside OpenCode itself.  Do not expose
    # a GPT->local delegation tool back to that local model and create recursion.
    return not bool(os.environ.get("OPENCODE_TEST_HOME"))

def _local_task_scope(raw):
    catalog = json.loads(SELF.with_name("tool_router_catalog_v2.json").read_text(encoding="utf-8"))
    names = set(catalog.get("tools", {}))
    if raw is None:
        return {name: False for name in sorted(names)}
    if (not isinstance(raw, dict) or len(raw) > 100
            or not all(isinstance(k, str) and k and len(k) <= 200 and type(v) is bool
                       for k, v in raw.items())):
        raise ValueError("tool_scope invalide")
    unknown = set(raw) - names
    if unknown:
        raise ValueError("tool_scope inconnu: " + ", ".join(sorted(unknown)))
    return {name: bool(raw.get(name, False)) for name in sorted(names)}

_BROWSER_WORKER = None
_BROWSER_LOCK = threading.Lock()
_SEND_LOCK = threading.Lock()
_TOOL_EXECUTOR = ThreadPoolExecutor(max_workers=8, thread_name_prefix="corpus-mcp")

def _browser_png(image_uri):
    prefix = "data:image/png;base64,"
    if not isinstance(image_uri, str) or not image_uri.startswith(prefix):
        raise ValueError("image navigateur invalide")
    payload = image_uri[len(prefix):]
    try:
        raw = base64.b64decode(payload, validate=True)
    except Exception as exc:
        raise ValueError("image navigateur base64 invalide") from exc
    return payload, raw

def browser_result(value, *, error=False):
    clean = dict(value)
    image_uri = clean.pop("image", None)
    content = [{"type":"text","text":json.dumps(clean, ensure_ascii=False, separators=(",",":"))}]
    if image_uri is not None:
        prefix = "data:image/png;base64,"
        if not isinstance(image_uri, str) or not image_uri.startswith(prefix):
            return result("REFUS: image navigateur invalide", True)
        payload = image_uri[len(prefix):]
        try:
            base64.b64decode(payload, validate=True)
        except Exception:
            return result("REFUS: image navigateur base64 invalide", True)
        content.append({"type":"image","data":payload,"mimeType":"image/png"})
    return {"content":content,"isError":bool(error)}

def _persist_browser_visual(value, *, action, lifecycle_known, lifecycle, lifecycle_error=None):
    if action not in {"screenshot", "frame"} or "image" not in value:
        return value, False
    value = dict(value)
    if not lifecycle_known:
        value["visual_occurrence_status"] = "attribution_uncertain"
        value["visual_occurrence_error"] = str(lifecycle_error or "lifecycle indéterminé")[:1200]
        return value, True
    try:
        _, raw = _browser_png(value["image"])
    except ValueError:
        return value, False
    producing_token = lifecycle["token"] if lifecycle is not None else None
    value["visual_occurrence_attribution"] = "lifecycle" if lifecycle is not None else "standalone"
    try:
        occurrence_ref = visual_artifacts.persist_visual_occurrence(
            VISUAL_ARTIFACT_ROOT, raw, producing_token, action
        )
    except visual_artifacts.VisualArtifactPublicationError as exc:
        value["visual_occurrence_status"] = "publication_error"
        value["visual_occurrence_error"] = str(exc)[:1200]
        value["visual_occurrence_published"] = bool(exc.published)
        if exc.published and exc.occurrence_ref:
            value["visual_occurrence_ref"] = exc.occurrence_ref
        return value, True
    except visual_artifacts.VisualArtifactError as exc:
        value["visual_occurrence_status"] = "publication_error"
        value["visual_occurrence_error"] = str(exc)[:1200]
        value["visual_occurrence_published"] = False
        return value, True
    value["visual_occurrence_status"] = "published"
    value["visual_occurrence_published"] = True
    value["visual_occurrence_ref"] = occurrence_ref
    return value, False

def browser_socket_path():
    runtime = os.environ.get("XDG_RUNTIME_DIR") or ("/run/user/" + str(os.getuid()))
    return Path(runtime) / "corpus-gpt-browser.sock"

def active_visual_target():
    active = []
    for state in async_jobs.recent_states(BB, 100):
        if state.get("status") not in {"starting", "running"}:
            continue
        if state.get("job_kind") not in {"browser-visible", "browser-hybrid"}:
            continue
        target = state.get("visual_target")
        if isinstance(target, str) and target.startswith(("http://", "https://")):
            active.append((float(state.get("created_at_unix") or 0), state.get("token"), target))
    if not active:
        return None
    active.sort(reverse=True)
    _, token, target = active[0]
    return {"token": token, "target": target}

def browser_call(arguments):
    worker = SELF.with_name("browser_worker.py")
    if not worker.is_file():
        return result("REFUS: browser_worker absent", True)
    request_arguments = dict(arguments)
    action = request_arguments.get("action")
    lifecycle = None
    lifecycle_known = False
    lifecycle_error = None
    try:
        lifecycle = active_visual_target()
        lifecycle_known = True
    except Exception as exc:
        lifecycle_error = exc
        if action not in {"screenshot", "frame"}:
            return result("REFUS: lecture lifecycle visuel: " + str(exc), True)
    if lifecycle is not None and action == "navigate" and request_arguments.get("url") != lifecycle["target"]:
        return result("REFUS: navigation hors cible lifecycle active", True)
    sync_request = None
    if lifecycle is not None and action not in {"close", "clear"}:
        sync_request = {"action": "navigate", "url": lifecycle["target"], "visible": False}
    last_error = None
    with _BROWSER_LOCK:
        for attempt in range(2):
            try:
                def exchange(payload):
                    with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as peer:
                        peer.settimeout(35)
                        peer.connect(str(browser_socket_path()))
                        peer.sendall((json.dumps(payload, ensure_ascii=False) + "\n").encode("utf-8"))
                        chunks = bytearray()
                        while not chunks.endswith(b"\n"):
                            part = peer.recv(65536)
                            if not part:
                                break
                            chunks.extend(part)
                    if not chunks:
                        raise OSError("browser_worker sans réponse")
                    return json.loads(chunks.decode("utf-8"))
                if sync_request is not None:
                    synced = exchange(sync_request)
                    if synced.get("error"):
                        return result("REFUS: convergence cible lifecycle: " + str(synced["error"]), True)
                response = exchange(request_arguments)
                break
            except (OSError, json.JSONDecodeError) as exc:
                last_error = exc
                if attempt:
                    return result("REFUS: transport browser_worker: " + str(exc), True)
                subprocess.run(
                    ["systemctl", "--user", "start", "corpus-gpt-browser.service"],
                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                    timeout=5, check=False,
                )
                import time
                deadline = time.monotonic() + 3
                while time.monotonic() < deadline and not browser_socket_path().exists():
                    time.sleep(0.05)
        else:
            return result("REFUS: transport browser_worker: " + str(last_error), True)
    if response.get("error"):
        return result("REFUS: " + str(response["error"]), True)
    value = response.get("result")
    if not isinstance(value, dict):
        return result("REFUS: résultat browser_worker invalide", True)
    if lifecycle is not None:
        value = dict(value)
        value["lifecycle_target"] = lifecycle["target"]
        value["lifecycle_token"] = lifecycle["token"]
        value["target_converged"] = value.get("url") == lifecycle["target"]
    value, visual_error = _persist_browser_visual(
        value,
        action=action,
        lifecycle_known=lifecycle_known,
        lifecycle=lifecycle,
        lifecycle_error=lifecycle_error,
    )
    return browser_result(value, error=visual_error)

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
                    "runtime_degraded","external_dependency","permission_refusal","environment_constraint","explicit_cancel","runtime_restart","shutdown","cancelled_unknown","unknown"
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
        "inputSchema":{"type":"object","properties":{"status":{"type":"string","enum":["pass","degraded","unknown"]},"job_known":{"type":"boolean"},"job_kind":{"type":"string","enum":["local","browser","browser-headless","browser-visible","browser-hybrid"]},"potentially_long":{"type":"boolean"},"write":{"type":"boolean"},"destructive":{"type":"boolean"},"abstraction":{"type":"string"},"transversality":{"type":"string"},"reversibility":{"type":"string"},"evidence_freshness":{"type":"string"},"uncertainty":{"type":"string"},"counterfield":{"type":"string"},"revision_condition":{"type":"string"},"stop_condition":{"type":"string"},"exclusive_resources":{"type":"array","items":{"type":"string"}},"preserved_capabilities":{"type":"array","items":{"type":"string"}},"displaced_costs":{"type":"array","items":{"type":"string"}},"modalities":{"type":"array","items":{"type":"string","enum":["local_compute","browser_interaction","visual_evidence","outbound_transport"]}},"delegation":{"type":"object"},"blocker":{"type":"object"}},"additionalProperties":False},
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
            "properties":{
                "job":{"type":"string","pattern":"^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$"},
                "causal_refs":{"type":"object","properties":{
                    "decision_ref":{"type":"string","minLength":1,"maxLength":500},
                    "authorization_ref":{"type":"string","minLength":1,"maxLength":500},
                    "parent_ref":{"type":"string","minLength":1,"maxLength":500},
                    "evidence_refs":{"type":"array","items":{"type":"string","minLength":1,"maxLength":500},"maxItems":100}
                },"additionalProperties":False}
            },
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
        "name":"causal_trace",
        "description":"Retrouver la lignée causale d'un job async depuis son token ou une référence causale exacte.",
        "inputSchema":{
            "type":"object",
            "properties":{
                "token":{"type":"string","pattern":"^[a-f0-9]{16}$"},
                "ref":{"type":"string","minLength":1,"maxLength":500}
            },
            "additionalProperties":False,
        },
    },
    {
        "name":"cancel_job",
        "description":"Arrêter un job async Corpus actif par son token exact. Refuse token inconnu, terminé ou unité incohérente.",
        "inputSchema":{
            "type":"object",
            "properties":{"token":{"type":"string","pattern":"^[a-f0-9]{16}$"}},
            "required":["token"],
            "additionalProperties":False,
        },
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
        "name":"write_repo_file",
        "description":"Écrire atomiquement un fichier texte borné sous le dépôt Corpus. Refuse chemins absolus, traversal et écriture hors dépôt.",
        "inputSchema":{
            "type":"object",
            "properties":{
                "path":{"type":"string","minLength":1,"maxLength":500},
                "content":{"type":"string","maxLength":200000},
                "require_clean":{"type":"boolean"}
            },
            "required":["path","content"],
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
        "name":"ground_decision",
        "description":"Grounding décisionnel composite borné: retrieval réel, consideration, admission, receipt puis planner; aucune exécution.",
        "inputSchema":{"type":"object","properties":{
          "goal":{"type":"string","minLength":1,"maxLength":4000},
          "context_graph":{"type":"object"},
          "projection_roots":{"type":"array","items":{"type":"string"},"minItems":1},
          "admission_policy":{"type":"object"},
          "retrieval_query":{"type":"string","minLength":1,"maxLength":2000},
          "retrieval_limit":{"type":"integer","minimum":1,"maximum":20},
          "retrieval_scope":{"type":"string","minLength":1,"maxLength":1000},
          "retrieval_reason":{"type":"string","minLength":1,"maxLength":1000},
          "id_resolution_map":{"type":"object"},
          "planner_base":{"type":"object"},
          "exposure_context":{"type":"object","properties":{
            "decision_required":{"type":"boolean"},
            "persistent_context_required":{"type":"boolean"},
            "context_graph_available":{"type":"boolean"},
            "projection_roots_available":{"type":"boolean"}
          },"required":["decision_required","persistent_context_required","context_graph_available","projection_roots_available"],"additionalProperties":False},
          "current_context_graph":{"type":"object"},
          "inferences":{"type":"array","items":{"type":"object"}}
        },"required":["goal","context_graph","projection_roots","admission_policy","retrieval_query","retrieval_limit","retrieval_scope","retrieval_reason","id_resolution_map","planner_base","exposure_context"],"additionalProperties":False},
    },
    {
        "name":"retrieval_grounding",
        "description":"Transport borné vers le provider corpus-retrieval réel; aucune admission ni décision.",
        "inputSchema":{"type":"object","properties":{
          "operation":{"type":"string","enum":["index","search"]},
          "arguments":{"type":"object"}
        },"required":["operation","arguments"],"additionalProperties":False},
    },
    {
        "name":"context_graph_fixture",
        "description":"Lire le fixture canonique public/minimal ContextGraph v1. Lecture seule; aucune extension de l'algebre.",
        "inputSchema":{"type":"object","properties":{},"additionalProperties":False},
    },
    {
        "name":"capability_handoff",
        "description":"Créer un receipt borné de changement de capacité.",
        "inputSchema":{"type":"object","properties":{
          "start_head":{"type":"string"},"invariants":{"type":"array","items":{"type":"string"}},
          "work_in_progress":{"type":"string"},"next_action":{"type":"string"},
          "validations":{"type":"array","items":{"type":"string"}},
          "baselines":{"type":"array","items":{"type":"string"}},
          "expected_capabilities":{"type":"array","items":{"type":"string"}},
          "observed_capabilities":{"type":"array","items":{"type":"string"}},
          "exact_jobs":{"type":"object","additionalProperties":{"type":"string"}},
          "async_tokens":{"type":"array","items":{"type":"object","properties":{"job":{"type":"string"},"token":{"type":"string"},"status":{"type":"string"}},"required":["job","token"],"additionalProperties":False}},
          "blockers":{"type":"array","items":{"type":"string"}},
          "stop_conditions":{"type":"array","items":{"type":"string"}},
          "context_health":{"type":"string","enum":["healthy","degraded","unknown"]},
          "new_chat_reason":{"type":"string","maxLength":500},
          "context_graph":{"type":"object"},
          "projection_roots":{"type":"array","items":{"type":"string"}}
        },"additionalProperties":False},
    },
    {
        "name":"resume_handoff",
        "description":"Reprendre un handoff après vérification HEAD et working tree.",
        "inputSchema":{"type":"object","properties":{
          "handoff_id":{"type":"string","minLength":1,"maxLength":80},
          "current_context_graph":{"type":"object"}
        },"required":["handoff_id"],"additionalProperties":False},
    },
    {
        "name":"browser",
        "description":"Piloter la session navigateur Corpus bornée. screenshot/frame renvoient une vraie image MCP avec l’état textuel associé.",
        "inputSchema":{
            "type":"object",
            "properties":{
                "action":{"type":"string","enum":["status","launch","navigate","click","fill","back","forward","reload","snapshot","screenshot","frame","pointer","type","key","scroll","allow-origin","tab-new","tab-select","tab-close","find","zoom","device","history","downloads","close","clear"]},
                "url":{"type":"string","maxLength":4000},
                "visible":{"type":"boolean"},
                "selector":{"type":"string","maxLength":2000},
                "text":{"type":"string","maxLength":8000},
                "x":{"type":"number"},"y":{"type":"number"},"dy":{"type":"number"},
                "key":{"type":"string","maxLength":40},
                "tab":{"type":"string","maxLength":64},
                "zoom":{"type":"number"},
                "mobile":{"type":"boolean"}
            },
            "required":["action"],
            "additionalProperties":False
        },
    },
    {
        "name":"latest_evidence",
        "description":"Lister les derniers dossiers de preuves Corpus BugBounty. Lecture seule.",
        "inputSchema":{"type":"object","properties":{},"additionalProperties":False},
    },
 ]

if _local_task_client_allowed():
    TOOLS.append({
        "name":"local_task",
        "description":"Déléguer une tâche bornée au Corpus Local/OpenCode existant et retourner un résultat compact. Aucun transcript complet; aucune permission OpenCode n'est auto-approuvée.",
        "inputSchema":{
            "type":"object",
            "properties":{
                "objective":{"type":"string","minLength":1,"maxLength":12000},
                "context_refs":{"type":"array","maxItems":20,"items":{"type":"string","minLength":1,"maxLength":500}},
                "constraints":{"type":"array","maxItems":20,"items":{"type":"string","minLength":1,"maxLength":1000}},
                "session_id":{"type":"string","pattern":"^ses_[A-Za-z0-9_-]{1,96}$"},
                "recovery_ref":{"type":"string","pattern":"^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$"},
                "tool_scope":{"type":"object","maxProperties":100,"additionalProperties":{"type":"boolean"}}
            },
            "required":["objective"],
            "additionalProperties":False,
        },
    })

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

    if name == "ground_decision":
        def retrieval_search(query, limit):
            payload=json.dumps({"operation":"search","arguments":{"query":query,"limit":limit}},ensure_ascii=False).encode()
            req=urllib.request.Request("http://127.0.0.1:18743/corpus/api/retrieval-grounding",data=payload,
                headers={"Content-Type":"application/json","Origin":"http://127.0.0.1:18743","Host":"127.0.0.1:18743"},method="POST")
            try:
                with urllib.request.urlopen(req,timeout=260) as response: bridge=json.load(response)
            except urllib.error.HTTPError as exc:
                try: return {"error":json.loads(exc.read().decode())}
                except Exception: return {"error":{"kind":"bridge_http","message":str(exc)}}
            except (OSError,ValueError) as exc:
                return {"error":{"kind":"bridge_transport","message":str(exc)}}
            provider=bridge.get("provider_response") if isinstance(bridge,dict) else None
            try:
                if not isinstance(provider,dict): return {"error":{"kind":"invalid_bridge_response","message":"provider_response absent"}}
                if "error" in provider: return {"error":provider["error"]}
                return json.loads(provider["result"]["content"][0]["text"])
            except (KeyError,IndexError,TypeError,ValueError,json.JSONDecodeError) as exc:
                return {"error":{"kind":"invalid_provider_response","message":str(exc)}}
        try:
            value=decision_grounding_orchestrator.orchestrate(
                goal=a.get("goal"),context_graph=a.get("context_graph"),projection_roots=a.get("projection_roots"),
                admission_policy=a.get("admission_policy"),retrieval_query=a.get("retrieval_query"),
                retrieval_limit=a.get("retrieval_limit"),retrieval_scope=a.get("retrieval_scope"),
                retrieval_reason=a.get("retrieval_reason"),id_resolution_map=a.get("id_resolution_map"),
                planner_base=a.get("planner_base"),retrieval_search=retrieval_search,
                exposure_context=a.get("exposure_context"),
                current_context_graph=a.get("current_context_graph"),inferences=a.get("inferences"))
        except ValueError as exc:
            return result("REFUS: "+str(exc),True)
        return result(json.dumps(value,ensure_ascii=False,separators=(",",":")))
    if name == "retrieval_grounding":
        operation=a.get("operation"); arguments=a.get("arguments")
        if operation not in {"index","search"} or not isinstance(arguments,dict):
            return result(json.dumps({"error":{"kind":"invalid_request","message":"operation/arguments invalides"}},ensure_ascii=False),True)
        payload=json.dumps({"operation":operation,"arguments":arguments},ensure_ascii=False).encode()
        req=urllib.request.Request("http://127.0.0.1:18743/corpus/api/retrieval-grounding",data=payload,
            headers={"Content-Type":"application/json","Origin":"http://127.0.0.1:18743","Host":"127.0.0.1:18743"},method="POST")
        try:
            with urllib.request.urlopen(req,timeout=260) as response:
                value=json.load(response)
            return result(json.dumps(value,ensure_ascii=False,separators=(",",":")))
        except urllib.error.HTTPError as exc:
            try:value=json.loads(exc.read().decode())
            except Exception:value={"error":{"kind":"bridge_http","message":str(exc)}}
            return result(json.dumps(value,ensure_ascii=False,separators=(",",":")),True)
        except (OSError,ValueError) as exc:
            return result(json.dumps({"error":{"kind":"bridge_transport","message":str(exc)}},ensure_ascii=False,separators=(",",":")),True)
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
        registry=job_policy.load(JOB_POLICY)
        return result(json.dumps({"job":job,"exists":True,"kind":job_policy.kind_for(job,registry),"effect":job_policy.effect_projection(job,registry)},ensure_ascii=False))
    if name == "capabilities":
        value={"protocol":"efficient-v2","fast_path":"status_then_known_job","doctor":"on_degraded_only","discovery":"jobs_or_job_info","long_jobs":"start_job_then_job_status","job_status_default_tail_lines":24,"managed_job_default_kind":"local","context_strategy":"stable_metadata_and_attested_evidence_before_heavy_recompute","delegation":"admission_only_no_permission_or_execution","browser_marker":"# corpus-job-kind: browser","visual_job_kinds":["browser-headless","browser-visible","browser-hybrid"],"visual_target_marker":"# corpus-visual-target: <url>","repo":str(SELF.parents[2]),"runner":str(BB)}
        return result(json.dumps(value,ensure_ascii=False,separators=(",",":")))
    if name == "plan_next":
        try: value=execution_planner.plan(a)
        except ValueError as exc: return result("REFUS: "+str(exc),True)
        return result(json.dumps(value,ensure_ascii=False,separators=(",",":")))
    if name == "start_job":
        job = a.get("job")
        try:
            registry = job_policy.load(JOB_POLICY)
            value = auth_gate.start_job_configured(
                job,
                allowed_jobs=safe_jobs(),
                entry=ENTRY,
                bb=BB,
                repo=SELF.parents[2],
                job_kind=job_policy.kind_for(job, registry),
                visual_target=(registry.get(job) or {}).get("visual_target",""),
                causal_refs=a.get("causal_refs"),
                job_registry=registry,
                authorization_config_path=AUTHORIZATION_CONFIG,
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
        if value.get("causal_refs"):
            lines.append("CAUSAL_REFS=" + json.dumps(value["causal_refs"], ensure_ascii=False, sort_keys=True, separators=(",",":")))
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
    if name == "causal_trace":
        token=a.get("token"); ref=a.get("ref")
        if bool(token) == bool(ref):
            return result("REFUS: fournir exactement token ou ref", True)
        try:
            if token:
                value=async_jobs.job_status(token, bb=BB, tail_lines=0)
                return result(json.dumps({"query":{"token":token},"matches":[value]},ensure_ascii=False,indent=2))
            rows=async_jobs.find_states_by_causal_ref(BB, ref, limit=50)
            return result(json.dumps({"query":{"ref":ref},"matches":rows},ensure_ascii=False,indent=2))
        except ValueError as exc:
            return result("REFUS: "+str(exc),True)
    if name == "cancel_job":
        try:
            value = async_jobs.cancel_job(a.get("token"), bb=BB)
        except (ValueError, RuntimeError) as exc:
            return result("REFUS: " + str(exc), True)
        return result(json.dumps(value, ensure_ascii=False, indent=2))
    if name == "job_status":
        try:
            value = async_jobs.job_status(a.get("token"), bb=BB, tail_lines=a.get("tail_lines", 24))
        except ValueError as exc:
            return result("REFUS: " + str(exc), True)
        return result(json.dumps(value, ensure_ascii=False, indent=2))
    if name == "write_repo_file":
        import tempfile
        repo = Path("/home/olivier/Documents/ChatGPT/Corpus").resolve()
        rel = a.get("path")
        content = a.get("content")
        require_clean = a.get("require_clean", False)
        if not isinstance(rel, str) or not rel or len(rel) > 500:
            return result("REFUS: chemin invalide", True)
        candidate = Path(rel)
        if candidate.is_absolute() or ".." in candidate.parts:
            return result("REFUS: chemin hors dépôt", True)
        target = (repo / candidate).resolve()
        try:
            target.relative_to(repo)
        except ValueError:
            return result("REFUS: chemin hors dépôt", True)
        if not isinstance(content, str) or len(content) > 200000:
            return result("REFUS: contenu invalide", True)
        if require_clean:
            cp = subprocess.run(["git", "status", "--porcelain=v1"], cwd=repo, text=True, capture_output=True, timeout=10)
            if cp.returncode != 0:
                return result("REFUS: état Git illisible", True)
            if cp.stdout.strip():
                return result("REFUS: working tree non propre", True)
        target.parent.mkdir(parents=True, exist_ok=True)
        fd, tmp = tempfile.mkstemp(prefix=".corpus-write-", dir=str(target.parent))
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as fh:
                fh.write(content)
                fh.flush()
                os.fsync(fh.fileno())
            os.replace(tmp, target)
        finally:
            try:
                if os.path.exists(tmp): os.unlink(tmp)
            except OSError:
                pass
        return result("REPO_WRITE=PASS\nPATH=" + str(candidate) + "\nBYTES=" + str(len(content.encode("utf-8"))))
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
        try:
            requires_auth = job_policy.authorization_requirement_from_content(content)
        except ValueError as exc:
            return result("REFUS: " + str(exc), True)
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
        registry[job_name]={"kind":job_policy.kind_from_content(content),"visual_target":job_policy.visual_target_from_content(content),"requires_durable_authorization":requires_auth}
        JOB_POLICY.parent.mkdir(parents=True,exist_ok=True)
        JOB_POLICY.write_text(json.dumps(registry,ensure_ascii=False,indent=2)+"\n")
        lines=["MANAGED_JOB_INSTALL=PASS","JOB="+job_name,"KIND="+registry[job_name]["kind"],"PATH="+str(dest),"BASH_N=PASS"]
        if backup is not None:
            lines.append("BACKUP="+str(backup))
        return result("\n".join(lines))
    if name == "context_graph_fixture":
        fixture=SELF.with_name("context_graph_fixture.json")
        if not fixture.is_file(): return result("REFUS: fixture ContextGraph absent", True)
        return result(fixture.read_text())
    if name == "capability_handoff":
        try: value=handoff.create(**a)
        except (ValueError,RuntimeError) as exc: return result("REFUS: "+str(exc),True)
        return result(json.dumps(value,ensure_ascii=False,indent=2))
    if name == "resume_handoff":
        try: value=handoff.resume(a.get("handoff_id"), current_context_graph=a.get("current_context_graph"))
        except (ValueError,RuntimeError) as exc: return result("REFUS: "+str(exc),True)
        return result(json.dumps(value,ensure_ascii=False,indent=2), not value.get("compatible"))
    if name == "local_task":
        if not _local_task_client_allowed():
            return result("REFUS: local_task n'est pas exposé au client OpenCode local.", True)
        try:
            scope = _local_task_scope(a.get("tool_scope"))
            value = local_task_bridge.submit_local_task(
                objective=a.get("objective"),
                directory=str(SELF.parents[2]),
                context_refs=a.get("context_refs"),
                constraints=a.get("constraints"),
                session_id=a.get("session_id"),
                recovery_ref=a.get("recovery_ref"),
                tool_scope=scope,
                deadline=240,
            )
        except ValueError as exc:
            return result("REFUS: " + str(exc), True)
        return result(json.dumps(value,ensure_ascii=False,separators=(",",":")), value.get("status") != "completed")
    if name == "browser":
        return browser_call(a)
    if name == "latest_evidence":
        return run(["evidence"], 20)
    if name == "run_job":
        job = a.get("job")
        allowed = safe_jobs()
        if not isinstance(job, str) or job not in allowed:
            return result("REFUS: job non enregistré. Autorisés: " + ", ".join(allowed), True)
        registry=job_policy.load(JOB_POLICY)
        kind=job_policy.kind_for(job,registry)
        target=(registry.get(job) or {}).get("visual_target","")
        return run(["run", job], 600, job_policy.execution_env(kind,target))
    return result("outil inconnu", True)

def send(obj):
    with _SEND_LOCK:
        sys.stdout.write(json.dumps(obj, ensure_ascii=False) + "\n")
        sys.stdout.flush()

def dispatch_tool_call(mid, params):
    try:
        res = call(params.get("name"), params.get("arguments") or {})
        send({"jsonrpc":"2.0","id":mid,"result":res})
    except Exception as exc:
        send({"jsonrpc":"2.0","id":mid,"error":{"code":-32000,"message":str(exc)}})

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
            if mid is None:
                continue
            _TOOL_EXECUTOR.submit(dispatch_tool_call, mid, p)
            continue
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
