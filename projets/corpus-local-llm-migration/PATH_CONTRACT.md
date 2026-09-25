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

## Correction sémantique

L'ancien setup employait `CORPUS_STATE_ROOT` comme nom du runtime. Ce sens est
abandonné :

- `CORPUS_RUNTIME_ROOT` = runtime ;
- `CORPUS_STATE_ROOT` = état mutable au sens XDG.
