# Corrections de l’audit — 0.16.2

13 septembre 2026. Correctifs locaux appliqués au chantier existant ; aucun commit,
push, publication ni changement des clés personnelles.

## Résultat

Les 11 catégories reproduites dans l’audit 0.16.1 sont corrigées dans les parcours
testés. Le rapport initial et ses 15 assertions en échec sont conservés dans
`audits/2026-09-13/README.md` et `results.json`.

| Audit | Correction vérifiée |
| --- | --- |
| D01 — coffre concurrent | Verrou exclusif entre instances, transaction lecture/fusion/écriture, fichiers temporaires uniques et permissions 0600. |
| D02 — import | Schéma fermé, types normalisés, import borné à 5 Mo, sauvegarde après validation/rendu, retour à l’ancien état si échec. Un import tardif ne réintroduit pas les données après effacement. |
| D03 — disponibilité | Une actualisation négative retire le film du programme, même verrouillé. Message explicite ; renouvellement à la demande dans la réserve admissible. |
| D04 — effacement | Programme, catalogue, réserve, verrous, exclusions, filtres d’atelier et demandes en cours remis à zéro. Les anciennes réponses sont ignorées. |
| D05 — remplacement | La nouvelle carte occupe l’emplacement demandé ; les trois autres films conservent leur position. |
| D06 — pages en panne | Seules les pages effectivement réussies sont déclarées chargées ; une page échouée reste rechargeable. |
| D07 — collections | Vérifications par lots successifs de 20, compteur de progression, erreurs retentables ; affichage progressif par 48, sans troncature silencieuse. |
| D08 — atelier | Le compteur, les boutons et les calculs utilisent le même ensemble de films admissibles, y compris la bibliothèque rechargée. |
| D09 — budgets | Entrées invalides refusées : 40–600 minutes à deux, 90–900 pour une double séance, entracte compris. |
| D10 — fausses séries | Un premier mot commun n’interdit plus un film. La ressemblance lexicale est une préférence de diversité ; seuls identifiant ou collection connus excluent les doublons/séries. |
| D11 — bibliothèque vide | Message lorsque les filtres ne correspondent à aucun film et bouton pour les effacer. |

## Vérifications exécutées

- `npm test` : **78/78**, dont cinq nouveaux tests ciblant les imports, les quatre
  emplacements de remplacement, les budgets, la disponibilité et deux instances
  concurrentes du coffre.
- `npm run check` : syntaxe valide des modules contrôlés.
- `npm run benchmark` : **792 combinaisons, 474 programmes distincts**, sur fixture
  synthétique. Ce n’est ni une mesure du catalogue réel ni une validation du goût.
- `node audits/2026-09-13/harness.mjs` : **80/80 assertions**, zéro erreur de harnais.
  Rejoue les 78 contrôles initiaux et ajoute le lot suivant ainsi que l’accès aux
  80 films d’une collection. Sortie non nulle en cas d’échec.
- Résultats conservés : [results-after-0.16.2.json](audits/2026-09-13/results-after-0.16.2.json).
- Serveur local redémarré : `/api/status` annonce **0.16.2**, instance
  `fd5ce04cf1531610`. `app.js`, `studio.mjs` et `discovery.mjs` servis sont identiques
  aux fichiers corrigés. Les quatre sources restent configurées.

Tests destructifs : serveur et profil Firefox isolés, clés fictives, fichiers
temporaires. Le coffre et les préférences réels n’ont pas été modifiés.
Un onglet déjà ouvert doit être actualisé pour charger les nouveaux modules.

## Limites explicites

- Les parcours automatisés utilisent des services simulés et surtout des clics
  DOM. Ce n’est pas une certification exhaustive d’accessibilité ou de tous les
  navigateurs. La largeur minimale réellement mesurée par le harnais est 500 px.
- Les API externes n’ont pas été requalifiées par de nouveaux appels réels dans
  cette correction. « Configurée » ne signifie pas « critique trouvée » ; les
  résultats du diagnostic réel précédent restent datés dans l’audit initial.
- Un film retiré pour indisponibilité n’est pas remplacé automatiquement par un
  candidat non recontrôlé : utiliser le bouton de renouvellement.
- Un arrêt brutal pendant une écriture du coffre peut laisser son verrou. Les
  écritures échouent alors explicitement (409), sans supprimer à l’aveugle un
  verrou potentiellement actif. Vérifier le processus propriétaire avant reprise.
- Le serveur tourne dans une session locale Codex. Aucun démarrage automatique
  au lancement de la machine n’a été installé. Hors session : `npm run launch`
  depuis le dossier du projet, ou `npm start` en laissant le terminal ouvert.
