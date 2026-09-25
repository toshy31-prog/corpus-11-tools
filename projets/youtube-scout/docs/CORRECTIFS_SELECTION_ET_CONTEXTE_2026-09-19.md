# Sélecteur, mémoire du graphe et lisibilité — 19 septembre 2026

Cette passe répond aux captures Firefox « Ant People / Kindaaz ». Elle conserve les changements antérieurs, la bibliothèque, les identités distinctes et le graphe. Pas de commit ni de publication.

## Causes vérifiées

1. `openExploration()` abandonnait quand aucune direction n’était cochée. Son message était affiché derrière le dialogue modal : le clic semblait inactif. Reproduit avant correction dans un navigateur isolé.
2. Le graphe reliait Kindaaz à une sortie « Untitled », puis à un nœud décennie. La route époque parcourait toutes les autres sorties de cette décennie présentes en mémoire. C’est ainsi que des résultats de KAS:ST et 808NOCHE entraient dans le mix ; ce cas ne démontre pas une mauvaise résolution de leurs noms.
3. Les suggestions et leurs nombreux paramètres étaient ouverts avant la recherche directe. Les paramètres du mix précédaient systématiquement les résultats ; les preuves ouvertes étiraient les cartes.

## Corrections

- Choix d’un morceau au clic ou au clavier : démarrage avec les labels par défaut si toutes les directions optionnelles sont désactivées. Les choix non vides de l’utilisateur sont conservés.
- Recherche directe en premier, suggestions et réglages avancés repliés, liste à hauteur bornée, bouton fermer accessible pendant le défilement. Un rafraîchissement identique ne remplace plus le bouton sous le pointeur. Les erreurs survenant dans le dialogue sont affichées dans celui-ci.
- La route époque est désormais l’intersection d’une période documentée et d’un chemin indépendant de label, remix, collaboration, compilation, alias ou chaîne. Aucun artiste n’est interdit nominativement. Le chemin relationnel et les preuves de date restent séparés et inspectables.
- Les pistes d’un ancien parcours sont revalidées à la reprise ; les résultats invalides sortent du mix mais restent dans les éléments historiques retirés. Les explications sont recalculées aussi, pas seulement les chemins.
- Recherche, source active et résultats lisibles avant les réglages fins ; instrument conservé dans « Affiner… ». Deux colonnes sur grand écran, une sur mobile, actions de 44 px, motif court visible, détail des preuves borné en hauteur. La vérification supplémentaire d’une vidéo est dans les détails.
- Une jonction d’identité entre catalogues n’est plus décrite comme une simple égalité de noms.

## Résultats observés

Recalcul en lecture seule du graphe local fourni : pour le départ Ant People, la route époque passe de 168 à 84 candidats de catalogue (éditions comprises), sans KAS:ST ni 808NOCHE. Les 117 candidats label et le candidat alias Analog Renegade restent disponibles. Ce n’est pas une évaluation esthétique de chacun des résultats restants.

- `npm run check` : succès.
- `npm test` avec Node 18.19.1 : **518/518** ; même résultat avec Node 24.19.0. Les tests HTTP ont besoin de pouvoir écouter sur loopback : l’essai initial dans le bac à sable sans cette permission échouait et n’est pas compté comme validation.
- Le script `scripts/consolidation-browser-audit.mjs` permet désormais Chromium ou Firefox via `SCOUT_AUDIT_BROWSER`, et une taille de bibliothèque fictive via `SCOUT_AUDIT_LIBRARY_SIZE`.
- Parcours complet sur **4 229 vidéos fictives** : **26 contrôles sous Firefox et 26 sous Chromium**. Choix de morceau sans direction, clavier, liste bornée, stabilité du bouton au rafraîchissement, changement de départ pendant une lecture retardée, reprise locale sans recherche fournisseur, exclusion d’un ancien résultat mémorisé, carnet, continuer/retour, deux colonnes, preuves dépliées bornées, largeur et actions mobiles. Les mesures après redimensionnement attendent la mise en page du navigateur.
- Rapports et captures de la dernière exécution : `/tmp/scout-consolidation-ui-ENFxoi/` (Firefox), `/tmp/scout-consolidation-ui-Z5Di2b/` (Chromium).
- Régressions métier : mémoire enrichie de 100 sorties sans lien, chemin relationnel distinct du contexte temporel, identité non confirmée, ancien front à revalider, période du morceau différente de celle d’une sortie ultérieure.
- Les navigateurs sont jetables ; API musicales simulées localement, requêtes externes bloquées. Le Firefox personnel et ses données n’ont pas été manipulés. Aucune recherche musicale réelle effectuée dans cette passe.

## Mise en service et limites

Le serveur local identifié sur le port 4181 a été redémarré. La santé HTTP et l’égalité des fichiers servis avec les fichiers locaux ont été contrôlées. Recharger l’onglet est nécessaire pour remplacer le JavaScript déjà exécuté ; la reprise explicite revalide ensuite les anciennes pistes.

Cette passe ne certifie pas tous les parcours OAuth réels, toutes les résolutions de morceaux ni la pertinence esthétique globale du catalogue. Elle corrige et teste les cas signalés, sans purger l’historique ni ajouter des fusions de noms.

La validation de changement a conduit à tester le geste défaillant et ses variantes (aucune direction, chargement concurrent, état sauvegardé, grosse bibliothèque, deux navigateurs), plutôt qu’à s’appuyer uniquement sur le nombre de tests unitaires.
