# Carte de stockage de l'écosystème Corpus

État de référence : 28 septembre 2026. Les volumes sont des mesures ponctuelles à réobserver avant une opération.

## Territoires

- Git : sources, contrats, documentation et preuves versionnées.
- DATA : données primaires persistantes.
- STATE : état mutable, reçus, checkpoints et récupération.
- CACHE : données reconstructibles.
- RUNTIME : payloads d'exécution actifs.
- MODELS/HOT : modèles à accès local rapide.
- Vault SSD : modèles froids, archives, environnements froids et snapshots.

Le contrat machine-lisible détaillé est projets/corpus-local-llm-migration/CORPUS_LIFECYCLE.json.

## Volumes observés

### NVMe système

La partition / dispose d'environ 176 Go, dont 165 Go utilisés et seulement 1,6 Go libres lors de l'audit.

Le dépôt occupe environ 6,9 Go, dont 4,1 Go sous .git. Le working tree suivi courant ne représente qu'environ 50 MiB.

Corpus local hors dépôt : environ 52 Go sous ~/.local/share/corpus, dont 45 Go de modèles HOT et 6,1 Go de runtimes ; environ 2,9 Go sous ~/.cache/corpus ; environ 289 Mo de STATE ; environ 59 Mo de DATA primaire.

### Vault SSD Kingston

CorpusVault occupe environ 84 Go ; le SSD dispose d'environ 870 Go libres. ColdModels représente environ 19 Go, ColdEnvs 13 Go, RecoverySnapshots 52 Go et Archive 272 Mo.

Le snapshot dominant, RecoverySnapshots/corpus-f1aa6af8cc37-20260925-192112, représente environ 55 Go. Son âge seul n'autorise pas sa suppression.

## Modèles HOT

Qwen3.6 représente environ 22 Go plus un mmproj d'environ 0,9 Go. Les modèles média représentent environ 21 Go. Retrieval, Docling et Whisper ajoutent environ 2 Go. Ce ne sont pas des caches : leur résidence HOT/COLD doit être décidée selon l'usage et le coût de chargement.

## Caches et artefacts reconstructibles observés

- build cache Corpus : ~1,13 Go ;
- .toolchains locale ignorée : ~798 Mo ;
- Crawl4AI/Playwright : ~688 Mo ;
- Hugging Face cache : ~530 Mo ;
- downloads cache : ~429 Mo ;
- Corpus 3D dist : ~232 Mo ;
- Corpus 3D target : ~159 Mo ;
- uv cache : ~156 Mo.

Soit environ 4,2 Go avant les petits caches. Reconstructible ne signifie pas suppression automatique : revalider processus actifs et contrat avant action.

## Git

Les packs Git occupent environ 4,05 GiB, alors que les objets atteignables par les refs actuelles représentent seulement environ 465 Mo. Les gros objets historiques inatteignables comprennent d'anciennes toolchains Rust/Godot et des builds/distributions 3D.

Le premier nettoyage Git à fort rendement est donc un repack/prune contrôlé des objets inatteignables, sans réécriture de l'historique public. Une sauvegarde ou quarantaine de récupération sur le Vault doit précéder le prune.

## Politique

1. Mesurer avant d'agir.
2. Classer chaque cible : primaire, état, preuve, runtime, modèle, archive, cache ou build.
3. Ne jamais supprimer implicitement DATA, STATE de récupération, modèles ou preuves irremplaçables.
4. Préférer quarantaine vérifiée avant suppression lorsqu'une cible n'est pas purement reconstructible.
5. Après chaque vague : vérifier services, tests ciblés, espace disque, Git et documentation.
6. Tout nouveau gros producteur doit déclarer son territoire et son cycle de vie.

## Ordre de campagne

1. Git local : objets inatteignables, avec sauvegarde de récupération.
2. Caches/builds explicitement reconstructibles du NVMe.
3. Toolchains et artefacts de projets ignorés.
4. Runtimes : déduplication et anciennes versions.
5. Modèles HOT/COLD : politique de résidence fondée sur l'usage.
6. RecoverySnapshots du Vault : rétention et restauration vérifiée.
7. Audit final chemins, symlinks, unités systemd, docs et volumes.

## Résilience opérationnelle

Les incidents et invariants transversaux sont consolidés dans RESILIENCE_LESSONS.md. Le storage doctor mesure automatiquement espace libre, volume temporaire et ratio Git/objets atteignables.
