# Corpus Local Runtime — MVP

This is a bounded local execution layer, not a second agent, UI, memory system,
or automatic modifier of Corpus. It lets Codex or a user invoke only named
capabilities from `capabilities.json`; arbitrary shell commands are impossible
through this runtime.

## Authority and limits

| Capability kind | Authority | Effect |
|---|---|---|
| `observe` | Runtime may execute | Reads a named workspace tool only. |
| `execute` | User must pass `--approve-execution` | May write only the declared workspace side effect. |

The runtime never sends data to a service, stores a prompt, changes a skill, or
promotes a result to a conclusion. Traces are opt-in via `--trace`; choose a
path outside the repository if it can contain sensitive filenames or output.

## Use

```bash
python3 runtime/corpus_runtime.py list
python3 runtime/corpus_runtime.py run workspace.status
python3 runtime/corpus_runtime.py run workspace.search --arguments '{"query":"CAPABILITY"}'
python3 runtime/corpus_runtime.py run workspace.verify --approve-execution
```

`workspace.search` n'accepte qu'un chemin situé dans l'espace de travail choisi : il ne peut pas remonter vers les fichiers personnels voisins. Avant un plan, inspecte-le sans rien exécuter :

```bash
python3 runtime/corpus_runtime.py inspect-plan runtime/examples/read-only-plan.json
python3 runtime/corpus_runtime.py run-plan runtime/examples/read-only-plan.json
```

Si le plan comporte une étape qui écrit, l'approbation est vérifiée avant le démarrage de la première étape.

Plans are limited to capability IDs and declared arguments:

```json
{"steps":[
  {"capability":"workspace.status"},
  {"capability":"workspace.search","arguments":{"query":"CAPABILITY","path":"corpus-11-tools"}}
]}
```

```bash
python3 runtime/corpus_runtime.py run-plan plan.json --trace /tmp/corpus-runtime.jsonl
```

`workspace.verify` requires `--approve-execution` because it can create or
refresh `.venv`. Its declared recovery is `make clean-venv`; that is not run
automatically.

## Codex bridge

The included stdio MCP bridge exposes only capability listing and named
read-only observations. It can prepare, but never execute, a write-capable
operation. This keeps user authorization outside the model's tool call.

Register it once in the Codex CLI, then open a new Codex task:

```bash
codex mcp add corpus-local-runtime -- python3 /home/olivier/Documents/ChatGPT/Corpus/runtime/mcp_server.py
```

Ask Codex to use `corpus_runtime_list_capabilities` or
`corpus_runtime_observe`; it can receive structured JSON instead of inventing a
shell command. For `workspace.verify`, it can only show the exact local command
that you must authorize and run yourself.

## Status vocabulary

`list` distinguishes described, packaged, context-accessible and executable
presence. A successful command is a local verification of that command only;
it does not establish general robustness, autonomy, or usefulness.
