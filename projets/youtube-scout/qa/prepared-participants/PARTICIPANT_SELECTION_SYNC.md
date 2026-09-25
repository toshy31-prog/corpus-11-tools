# Synchronisation des propositions de participants

Mise à jour directe de `public/app.js` : les propositions du guidage sont
réunies avec les fiches locales et les résultats de recherche dans le sélecteur
des participants. Les propositions représentées dans ce sélecteur ne sont plus
affichées dans un second parcours de confirmation au-dessus.

Les choix existants sont conservés ; aucune fiche n'est choisie automatiquement.
Un registre vide ne masque plus les fiches locales et les propositions tardives
sont intégrées lors du rendu suivant.

Installation : fichiers publics modifiés sur place, sans redémarrage du service.
Tests et contrôles après modification non exécutés à la demande de l'utilisateur.
Résultat fonctionnel à observer ensemble après rechargement du navigateur.

Sauvegarde avant modification : `/tmp/scout-participant-sync-deb9xz/`.
