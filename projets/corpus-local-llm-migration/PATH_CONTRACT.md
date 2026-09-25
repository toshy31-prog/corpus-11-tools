# Contrat de chemins Corpus

Corpus distingue désormais explicitement ses territoires physiques.

| Variable | Défaut | Rôle |
|---|---|---|
| `CORPUS_RUNTIME_ROOT` | `$XDG_DATA_HOME/corpus/runtime` | exécutables, environnements et runtimes HOT |
| `CORPUS_MODELS_ROOT` | `$XDG_DATA_HOME/corpus/models/hot` | poids de modèles HOT actifs |
| `CORPUS_TOOLCHAINS_ROOT` | `$XDG_DATA_HOME/corpus/toolchains` | toolchains durables et sources de reconstruction |
| `CORPUS_DATA_ROOT` | `$XDG_DATA_HOME/corpus/data` | données persistantes |
| `CORPUS_STATE_ROOT` | `$XDG_STATE_HOME/corpus` | logs, locks, diagnostics, receipts |
| `CORPUS_CACHE_ROOT` | `$XDG_CACHE_HOME/corpus` | caches et builds reconstructibles |
| `CORPUS_CONFIG_ROOT` | `$XDG_CONFIG_HOME/corpus` | configuration |
| `CORPUS_VAULT_ROOT` | aucun défaut | stockage COLD/recovery configuré par machine |

Les chemins doivent être absolus.

`CORPUS_VAULT_ROOT` n'a volontairement aucun défaut : Git ne doit pas encoder
le point de montage d'un support externe particulier.

## Compatibilité transitoire

Pendant la migration :

```text
repo/.dev-local -> $CORPUS_RUNTIME_ROOT
```

reste valide pour les fixtures, preuves historiques et contrôles de sécurité.
Les nouveaux composants opérationnels ne doivent plus construire leur runtime
avec `ROOT / ".dev-local/..."`.

Cette phase ne déplace aucun octet. Les sous-organes actuels restent
temporairement sous `$CORPUS_RUNTIME_ROOT` :

```text
corpus-local/
corpus-capabilities/
corpus-media/
corpus-office/
corpus-updates/
```

La séparation physique runtime/models/toolchains/data/state/cache/config viendra ensuite,
organe par organe.

`CORPUS_MODELS_ROOT` désigne uniquement les modèles HOT. Les modèles COLD et les snapshots restent gouvernés par `CORPUS_VAULT_ROOT`.

`CORPUS_TOOLCHAINS_ROOT` contient les toolchains durables nécessaires aux builds. Les sorties de compilation reconstruisibles vont sous `CORPUS_CACHE_ROOT/build`, pas dans TOOLCHAINS.

Les preuves, audits et receipts de maintenance vont sous `CORPUS_STATE_ROOT/maintenance`.

## Migration physique — Wave 1A

Les préférences applicatives Corpus (`browser-settings.json`, `plugins.json`, `git-settings.json`, `hooks.json`) vivent désormais sous `CORPUS_CONFIG_ROOT/corpus-local`.

Le scheduler persistant vit sous `CORPUS_STATE_ROOT/scheduler` et l'état de découverte des mises à jour sous `CORPUS_STATE_ROOT/updates`.

Les environnements/worktrees, logs, données OpenCode, modèles, caches, toolchains et receipts d'autonomie ne sont pas déplacés par cette vague.

## Migration physique — Wave 1B

Les preuves de maintenance vivent désormais sous `CORPUS_STATE_ROOT/maintenance`; l'ancien sibling `~/.local/state/corpus-maintenance` est retiré.

Le helper `autonomy_integrate.py` ne stocke plus batches, receipts, logs et locks dans les worktrees sous `.dev-local`. Son store actif est centralisé sous `CORPUS_STATE_ROOT/maintenance/autonomy/delivery/<root-key>`, où `<root-key>` encode l'identité du source ou du target sans dépendre du checkout.

Les batches legacy devenus inapplicables par dérive de target sont conservés sous `maintenance/autonomy/history/blocked-prepared`; ils ne polluent plus le store actif. Les anciennes traces runtime d'audit/expérience sont rangées sous `maintenance/runtime-history`.

## Migration physique — Wave 1C

Les journaux opérationnels `corpus-local` vivent sous `CORPUS_STATE_ROOT/logs/corpus-local`. Les réglages Environnements et Worktrees vivent sous `CORPUS_CONFIG_ROOT/corpus-local`, tandis que les worktrees physiques restent sous le runtime HOT.

Les anciens registres capabilities, logs d'installation et diagnostics média sans consommateur opérationnel sont conservés comme provenance sous `CORPUS_STATE_ROOT/maintenance/runtime-history`.

Les backups historiques et releases sont COLD sous `CORPUS_VAULT_ROOT`; les deux restore trees modifiés sont archivés vers le Vault mais leur arbre ext4 original est conservé temporairement sous `maintenance/recovery-review/restores-pending-cold-finalization` jusqu'à une validation de restauration depuis le support COLD.

## MODELS — provenance scellée

`CORE_MODELS_LOCK.json` sépare les poids core HOT des comparateurs COLD. Qwen3.6, son projecteur F16 et faster-whisper-small sont HOT ; Qwen3.8-27B reste COLD dans CorpusVault.

Les anciens poids WAN `wan-5b.gguf` et `wan-vae.safetensors` ont été retirés du lock média parce qu'ils ne sont plus référencés par les profils d'inférence actifs. Un reinstall ne doit donc plus les ressusciter.

## MODELS Phase 2A1 — consommateurs canoniques

Les consommateurs actifs résolvent désormais les poids HOT par `CORPUS_MODELS_ROOT` et ses sous-racines dérivées `llm`, `media`, `speech` et `docling`. Pendant cette sous-phase, ces chemins sont des shims symboliques vers les poids encore physiquement sous runtime. Bubblewrap expose les modèles HOT en lecture seule.

## MODELS Phase 2A2 — producteurs canoniques

Les producteurs et l'inventaire convergent maintenant avec les consommateurs : `install_local.py` acquiert Qwen3.6 et son mmproj sous `LLM_MODELS_ROOT`; `install_media.py` et `install_audio.py` écrivent les poids sous `MEDIA_MODELS_ROOT`; `update_manager.py` lit les poids core HOT depuis `CORE_MODELS_LOCK.json` et `MODELS_ROOT`. Les archives/runtime restent dans `CORPUS_RUNTIME_ROOT`.

Qwen3.8 est uniquement COLD : il n'est plus une cible de reconstruction HOT. Le prochain changement peut donc être purement physique, sans nouveau reroot des consommateurs ou producteurs.

## MODELS Phase 2A3 — cache Docling reconstructible

Docling est physiquement autonome sous `CORPUS_MODELS_ROOT/docling`. Le cache Hugging Face n'est donc jamais une dépendance d'inférence. Les téléchargements de reconstruction utilisent `CORPUS_CACHE_ROOT/huggingface` et `.../hub`; les snapshots pinnés sont ensuite matérialisés dans MODELS par hardlinks lorsque cache et modèles partagent le même filesystem, avec copie comme fallback cross-filesystem.

`local_tools_mcp.py` transmet le contrat Corpus au worker Docling et utilise également le cache canonique, jamais `CORPUS_RUNTIME_ROOT/corpus-capabilities/huggingface`.

## BUILD Phase 3A — promotion runtime relocatable

Les sorties de compilation llama vivent sous `CORPUS_CACHE_ROOT/build`. Elles ne sont jamais consommées directement comme runtime. Les profils CPU local et CUDA local validés sont promus sous `CORPUS_RUNTIME_ROOT/corpus-local/versions/llama-b10964-*-local`, avec RUNPATH relatif `$ORIGIN`.

Le vieux `corpus-local/build` reste temporairement présent comme filet jusqu'à la vague physique suivante, mais n'est plus une dépendance d'exécution une fois cette phase validée.

## STORAGE Phase 3B1 — wiring TOOLCHAINS/CACHE

`TOOLCHAIN_SOURCES_ROOT` vaut `CORPUS_TOOLCHAINS_ROOT/sources`. Les sources llama.cpp, Hermes et OpenCode y sont consommées comme entrées durables de reconstruction. Les archives reproductibles sont acquises sous `CORPUS_CACHE_ROOT/downloads/corpus-local`, le cache uv sous `CORPUS_CACHE_ROOT/uv`, et les builds llama sous `CORPUS_CACHE_ROOT/build/corpus-local`.

`corpus-local/build-env` reste temporairement dans RUNTIME : l'audit a établi qu'il est mixte (Playwright + CMake + uv) et qu'il possède des shebangs absolus. Il sera scindé/reconstruit séparément, pas déplacé aveuglément. Le locator Qwen3.8 COLD reste également distinct des archives CACHE.

## BUILD Phase 3B2 — reconstruction durable CPU/CUDA

`rebuild_runtime.py` reconstruit désormais les profils CPU et CUDA depuis `TOOLCHAIN_SOURCES_ROOT` vers `LOCAL_BUILD_CACHE_ROOT`. Une dérive de `CMAKE_HOME_DIRECTORY` invalide uniquement le cache de build concerné, qui est régénéré. Les runtimes validés peuvent être promus atomiquement sous `runtime/versions` avec `--promote`.

## Correction sémantique

L'ancien setup employait `CORPUS_STATE_ROOT` comme nom du runtime. Ce sens est
abandonné :

- `CORPUS_RUNTIME_ROOT` = runtime ;
- `CORPUS_STATE_ROOT` = état mutable au sens XDG.
