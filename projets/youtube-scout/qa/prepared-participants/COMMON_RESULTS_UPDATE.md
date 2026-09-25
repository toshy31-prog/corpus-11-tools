# Résultats communs — 2026-09-22

Modification appliquée directement dans `public/app.js` et
`public/participant-explorer.mjs`, sur demande de déploiement automatique.
Le serveur lit les fichiers publics à chaque requête : aucun redémarrage
ni rechargement du navigateur utilisateur effectué.

- La relance conserve les pistes catalogue rattachées aux fiches encore
  sélectionnées, ainsi que la chaîne du même départ. Les curseurs et états
  de couverture sont réinitialisés pour la nouvelle sélection.
- La recherche commune réutilise les cartes normales et leurs actions
  Garder / Continuer. Les résultats par nom restent explicitement incertains,
  y compris dans la note du carnet ; aucun artiste n'est confirmé par leur sauvegarde.
- Les métadonnées YouTube observées sont transportées vers la vérification
  normale du prochain départ, sans transformer la requête en crédit.
- La vue commune est actualisée lors des chargements catalogue ultérieurs.
- La relance conserve explicitement le parcours au lieu d'ajouter une étape.

Sauvegarde préalable des deux fichiers :
`/tmp/scout-common-results-backup-TeI7x9/` (temporaire).

Conformément à la demande : aucun test, build, contrôle syntaxique, requête
de vérification HTTP ou essai navigateur exécuté. Installation des fichiers
effectuée ; comportement à confirmer ensemble dans l'interface.
Les résultats déjà effacés par l'ancienne version ne sont pas restaurés
par cette modification. Le module nouveau doit être chargé par le navigateur.
