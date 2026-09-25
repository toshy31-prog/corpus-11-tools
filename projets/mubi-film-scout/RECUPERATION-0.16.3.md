# Récupération 0.16.3 — 22 septembre 2026

## Origine et périmètre

La livraison 0.16.2 absente du répertoire de travail était conservée dans le
stash Git `18b3448b3a30da2fe77889a047b98c6f8ff54e34`, créé le 13 septembre avant
une réécriture d’historique. Son parent de fichiers non suivis est
`9fbf58f98731fec288fa7d36f4f6ef78041cff6f`. La récupération a porté exclusivement
sur les fichiers de MUBI Film Scout, sans appliquer ni supprimer le stash global.

Les fichiers récupérés ont été fusionnés avec le travail récent : export texte
minimal des films gardés, diagnostic d’identité du serveur, protections contre
les imports invalides, concurrents et les erreurs de stockage. Le numéro 0.16.3
distingue cette fusion de la livraison historique.

## Fonctionnalités et corrections

- Atelier restauré : collections, profil explicite, choix à deux, doubles
  séances et parcours ; modules de découverte et de préréglages rétablis.
- Catalogue progressif, fiches, verrouillage et remplacement du programme,
  bibliothèque sans plafond applicatif de favoris, cache persistant récupérés.
- Import : données d’atelier conservées et nettoyées ; un import refusé conserve
  les choix précédents ; pas de seconde écriture de stockage après validation.
- Réglages importés synchronisés avec les contrôles de l’atelier ; champs
  numériques vides ignorés plutôt que convertis en zéro.
- Lanceur : contrôle du service, de sa version et de l’identité de cette copie,
  pour ne pas réutiliser silencieusement une ancienne version ou une autre copie.

Les clés des sources n’ont pas été restaurées depuis Git ni remplacées.
Aucune manipulation des préférences du navigateur personnel n’a été effectuée.
Aucun commit ni aucune publication distante n’a été réalisé.

## Vérifications du jour

| Vérification | Résultat et portée |
| --- | --- |
| `npm test` | 98 tests réussis, aucun échec |
| `npm run check` | Vérification syntaxique réussie |
| `npm run benchmark` | 792 combinaisons, 474 programmes distincts sur données synthétiques |
| `node audits/2026-09-13/harness.mjs` | 80 contrôles réussis dans Firefox isolé, sources simulées |
| `git diff --check -- .` | Aucun défaut d’espacement détecté |
| Serveur local | `/api/status` annonce 0.16.3 et le service attendu sur le port 4180 |
| Ressources servies | `app.js`, `studio.mjs`, `discovery.mjs` identiques aux fichiers présents sur disque |

Résultats du nouvel audit : [results-0.16.3.json](./audits/2026-09-22/results-0.16.3.json).
Les rapports du 13 septembre restent des archives historiques, pas une preuve
de vérification actuelle. Les contrôles rejoués ne prouvent ni une qualité
subjective des recommandations ni une couverture de toutes les combinaisons.

Les quatre sources sont déclarées configurées par le serveur. Aucun nouveau
test réseau auprès de TMDB, Guardian, NYT ou OMDb n’a été effectué pendant cette
récupération. Le navigateur intégré était bloqué sur son ancienne page
`ERR_CONNECTION_REFUSED` ; sa réinspection automatique n’a pas abouti.
Recharger manuellement `http://127.0.0.1:4180/` pour retrouver l’interface.

## Sauvegardes et retour arrière

Les archives locales ignorées par Git se trouvent dans
`.runtime/recovery-20260922/` : `before-code.tar` conserve le code avant fusion ;
`release-0.16.3.tar` conserve le code récupéré et ses tests ; `SHA256SUMS`
permet de vérifier ces deux archives. Elles ne contiennent ni coffre de clés ni
préférences du navigateur. Elles ne constituent pas une sauvegarde hors machine.

Pour un retour arrière, extraire d’abord l’archive dans un répertoire séparé,
comparer les fichiers du seul projet, puis restaurer les fichiers nécessaires
avec accord de l’utilisateur. Ne pas appliquer le stash global et ne pas écraser
le coffre des sources. Redémarrer ensuite le serveur et vérifier sa version ainsi
que les ressources effectivement servies.
