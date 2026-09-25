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

## Correction sémantique

L'ancien setup employait `CORPUS_STATE_ROOT` comme nom du runtime. Ce sens est
abandonné :

- `CORPUS_RUNTIME_ROOT` = runtime ;
- `CORPUS_STATE_ROOT` = état mutable au sens XDG.
