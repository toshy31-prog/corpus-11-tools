# Scout 0.20.1 — portée du filtre artistes

## Observation et correction

Les captures montrent que les vidéos de la chaîne non-Topic restent chargées après le choix d'une fiche catalogue. Le filtre « Autres artistes uniquement » les masque lorsqu'aucun artiste n'est renseigné. Cela ne démontre pas une exclusion générale des chaînes non-Topic.

Le filtre conserve son comportement strict par défaut. Deux options locales indépendantes permettent d'inclure les artistes inconnus, avec mention « à vérifier », et les collaborations comprenant un participant extérieur au départ. La classification commune au navigateur et au serveur distingue même artiste, autre artiste, collaboration et inconnu. Elle n'attribue aucun artiste depuis le titre ou le nom de chaîne et ne fusionne aucune identité.

Les compteurs globaux distinguent les cartes masquées restant à parcourir des observations de routes chargées. Le panneau signale les inconnus masqués et propose leur réaffichage sans relancer les catalogues. Les filtres éditoriaux, promotionnels et de liens éloignés restent applicables.

## Validation

- Suite complète : 724 tests réussis sous Node 18.19.1.
- `npm run check` : réussi.
- Régression synthétique des 37 vidéos inconnues : zéro admissible en strict, 37 récupérables par l'option, pagination complète sans perte, sans mutation des candidats.
- Matrice des deux options : même politique de collecte et d'affichage ; même artiste solo toujours exclu en strict.
- Comptage : doublons de routes, filtre de direction, pistes déjà vues, variante visible par une autre route.
- Binding réel des paramètres de l'application : aucun appel réseau, aucune sauvegarde ni consommation de page.
- HTTP isolé : validation des booléens, ancien format compatible, option inconnus transmise jusqu'à l'objectif de collecte, candidats préservés.
- Navigateur réel sur fixture isolée : réaffichage par bouton, cases indépendantes, badge d'incertitude, collaboration, filtre YouTube, pagination et conservation des six premières pistes vues.

Un premier lancement de la suite a détecté un dossier `patch` oublié dans la copie isolée ; il a été copié depuis la racine existante. Une assertion nouvelle utilisait un niveau `controls` absent du modèle ; l'assertion a été corrigée. Ces essais ne sont pas comptés comme réussis.

## Limites et activation

Les données navigateur sont fictives : aucune évaluation musicale réelle, aucune connexion Google et aucune recherche externe n'ont été effectuées. L'identification manquante d'Osirus Jack et l'extraction de crédits depuis les titres restent des problèmes distincts, non corrigés par cette version.

La préparation et les tests ne valent pas activation. L'application active ne doit être remplacée qu'après accord, sauvegarde des données et vérification des empreintes initiales. Les fichiers front sont servis directement : arrêter le seul serveur Scout avant application pour éviter une version partielle.
