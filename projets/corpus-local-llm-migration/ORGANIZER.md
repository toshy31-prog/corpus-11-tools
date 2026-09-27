# Rangement automatique de Corpus

Accessible dans **Paramètres → Rangement**, et depuis le dépôt pour l’organisme Corpus :

```sh
python3 scripts/corpus organize status
python3 scripts/corpus organize preview
python3 scripts/corpus organize run
python3 scripts/corpus organize settings --settings-file /chemin/reglages.json
```

`status` et `preview` sont sans écriture. `run` effectue un passage manuel, même si l’automatisme est en pause, selon les règles enregistrées. Les permissions habituelles du shell restent applicables à Corpus.

## Périmètre initial

Deux règles nommées : captures historiques sous RUNTIME/corpus-local/logs et nouvelles captures sous STATE/logs/corpus-local/payload-capture. Seuls les noms de fichiers explicitement déclarés dans organizer.py sont éligibles. Aucun parcours du dépôt, des conversations, documents personnels, modèles ou téléchargements généraux.

Le mécanisme **classe une copie** dans STATE/organizer/archive/règle/date/empreinte-nom. Il conserve l’original à son chemin et ne libère donc pas de place dans les dossiers sources. La copie est vérifiée par SHA-256, publiée sans écrasement et dédupliquée par contenu et nom au sein de chaque règle. Les fichiers trop récents (5 minutes), dépassant 5 Mio, modifiés pendant la lecture ou symboliques sont exclus. Les captures restent privées ; aucun envoi réseau.

## Réglages persistants

CONFIG/organizer.json : activation, intervalle de 5 à 1440 minutes, quota de 1 à 1024 Mio, activation individuelle des règles. Par défaut : actif, 60 minutes, 64 Mio, deux règles activées. Les mêmes validations s’appliquent au site et à la CLI. Le quota bloque les copies supplémentaires sans purge ; le journal indique les fichiers bloqués. Réduire le quota ne supprime rien.

Exemple complet :

```json
{"enabled":true,"interval_minutes":60,"quota_mib":64,"rules":{"legacy-captures":true,"payload-captures":true}}
```

Le worker démarre avec le service Corpus, vérifie l’échéance toutes les minutes et reprend après un redémarrage. Il ne fonctionne pas lorsque Corpus est arrêté. Les passages manuels repoussent la prochaine échéance automatique. La pause est enregistrée immédiatement ; un passage déjà commencé termine avant l’enregistrement. Les actions concurrentes sont sérialisées par un verrou de fichier.

Historique : STATE/organizer/history.json, 100 derniers passages (30 exposés par API, 8 affichés dans l’écran). Erreur du worker : STATE/organizer/error.json. Les archives elles-mêmes ne sont jamais supprimées automatiquement. Une interruption laisse au pire une copie déjà publiée sans reçu ou un fichier .part ; le prochain passage retrouve la copie par son contenu ou signale le fichier temporaire existant. La reprise peut nécessiter un passage supplémentaire. Les fichiers originaux restent disponibles.

## Extension par Corpus

Corpus peut consulter et modifier les réglages avec la CLI ou éditer le module/règles dans ce dépôt sous les permissions existantes. Ajouter une famille de fichiers nécessite une modification de RULES, de DEFAULT et des validations/tests ; aucun champ de l’API ne permet de donner un chemin arbitraire. Une nouvelle règle doit préciser propriétaire, source, destination et conservation dans CORPUS_LIFECYCLE.json avant activation. Le runtime doit être redémarré après une modification de code ; un changement de réglages n’en nécessite pas.

API locale : GET /corpus/api/organizer ; POST avec action settings, preview ou run. La protection Host/Origin/JSON du portail est conservée. Aucun nouveau port, compte, fournisseur ou moteur IA.

## Validation

- `python3 projets/corpus-local-llm-migration/test_organizer.py` : 8 tests.
- `python3 projets/corpus-local-llm-migration/test_corpus_control.py` : 13 tests.
- `node --check projets/corpus-local-llm-migration/portal/app.js`.

Ce mécanisme automatise une première catégorie de rangement ; il ne prétend pas réorganiser automatiquement tout l’écosystème ni effacer la dette des emplacements historiques.

## Observation après activation — 27 septembre 2026

Premier passage automatique : 3 copies, 53421 octets ; empreintes comparées aux sources après le passage. Passage manuel suivant : 0 copie supplémentaire. Pause enregistrée et conservée après rechargement, puis automatique réactivé. Aperçu et enregistrement contrôlés dans le navigateur. Rendu observé sur bureau et à 390×844 ; navigation mobile des paramètres adaptée pour éviter l’écrasement du formulaire. Tests pont/protections supplémentaires : 11 réussis avec accès aux sockets locaux. Aucun appel au modèle.
