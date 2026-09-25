# Participants — implémentation non vérifiée

Demande : sélectionner et explorer tous les participants même si une fiche catalogue manque. L'utilisateur a explicitement demandé de ne lancer aucune vérification après l'écriture.

## Écrit

- Cases de sélection indépendantes des fiches, sélection globale et désélection globale.
- Nom de recherche par participant, sans réécrire le crédit ; variante sans suffixe 667 proposée uniquement par un bouton explicite.
- Recherche catalogue individuelle et lien direct individuel ; choix sans fiche toujours possible.
- Confirmation groupée des fiches choisies uniquement ; aucun artiste fictif créé pour un nom non résolu.
- Recherche YouTube par nom pour chaque participant sélectionné, six propositions maximum par requête, deux requêtes concurrentes maximum ; aucun crédit déduit du résultat.
- Si YouTube n'est pas configuré, état explicite et lien de recherche externe (aucune ouverture automatique).
- Vue commune entrelaçant les résultats par participant, dédoublonnage par identifiant exact, provenance affichée ; les catalogues documentés restent accessibles dans le moteur existant.
- Possibilité de rouvrir les choix depuis la vue commune ; recherche liée au départ éphémère.

## Statut

Code écrit, non testé, non activé. Aucun test, build, contrôle de syntaxe, essai navigateur ou recherche distante exécuté après cette implémentation. Le serveur 4181 reste inchangé. Pas de promesse de fonctionnement avant les essais communs.

## Essais à faire ensemble après activation autorisée

Sélectionner Zuukou Mayzie et Osirus Jack sans fiche ; associer uniquement la fiche de Zuukou ; ajuster la requête d'Osirus sans changer les crédits ; lancer la recherche commune et observer séparément accès YouTube absent, échec réseau, résultats disponibles et retour aux choix. Vérifier aussi une recherche catalogue retardée pendant un changement de départ, un départ sans aucune fiche et les participants avec homonymes.
