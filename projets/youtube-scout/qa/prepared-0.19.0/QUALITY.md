# Scout 0.19.0 — collecte et présentation des découvertes

## État

Correctif préparé sur une copie isolée, sans modification du service personnel pendant son développement. Activation distincte, soumise à autorisation. Validation musicale finale laissée à l’utilisateur, à sa demande. Aucun accès Google ni fournisseur musical réel utilisé pour ces tests.

## Changements

- Collecte : obtenir un premier album d’un partenaire, puis échantillonner les suivants avant de remplir toute la recherche avec les albums du premier. Reprise conservée dans le curseur éphémère. Budgets réseau inchangés (5 lectures non cachées par étape par défaut), cache gratuit et limite de traitement conservés.
- Identité : après validation explicite titre/artistes, proposer directement les fiches si l’identité reste non établie. Rechercher les crédits séparément et conserver aussi la recherche du nom complet (les séparateurs peuvent appartenir à un nom de groupe). Aucun choix automatique d’homonyme. Ne plus afficher la même saisie comme si le nom n’avait pas été enregistré.
- Crédits : décomposer les crédits textuels multiples dans l’index local et le filtre d’artistes ; éviter une relation entre Jolagreen23 et une chaîne concaténant Jolagreen23 avec trois autres noms. Cette décomposition n’établit pas une identité catalogue.
- Présentation : une carte pour les variantes compatibles de titre/artistes ; chaque fiche et ses actions restent accessibles sous « comparer les sources ». ISRC ou identifiants de recording contradictoires empêchent ce rapprochement ; les suffixes remix/live/version sont conservés. Aucun `same_identity` ajouté au graphe.
- Mélange : préférence pour plusieurs artistes, albums et intermédiaires. Si les alternatives manquent, les autres pistes restent parcourables. La période ne crée plus une seconde file de priorité pour un morceau déjà présent dans une autre direction ; son observation reste consultable.
- Explications : chemins nommés et sources non répétées, plutôt qu’une suite de noms de fournisseurs.

Bibliothèque, carnet, corrections explicites, sauvegardes, isolation éphémère et contrôles d’identité ne sont pas remplacés. Aucun cas musical nommé dans les captures n’est codé en dur dans le moteur.

## Vérifications et coûts

Les tests utilisent des fournisseurs simulés. Sur le même scénario de trois partenaires et un plafond de 12 requêtes :

| Observation | Avant (0.18) | Correctif |
| --- | ---: | ---: |
| Partenaires échantillonnés | 1 | 3 |
| Requêtes réellement utilisées | 3 | 9 |
| Cartes pour un morceau catalogue + YouTube compatible | 2 | 1, variantes conservées |

Une épreuve séparée avec le budget par défaut vérifie qu’un premier lot est obtenu avant de préparer tous les partenaires. Une reprise en lots de deux requêtes vérifie l’absence de relecture et la progression. Le coût supplémentaire de diversité n’est pas une accélération des API.

Comparaison CPU en lecture seule du même graphe historique : 6 867 entités, 19 898 relations, neuf mesures après chauffe. SHA-256 du stockage vérifié inchangé : `5e9e0d7b3bfb6b373348e24c913d964765261e095756e895c19dec0a4d8b7a49`.

| Médiane | Pré-0.16 disponible : 0.14 | 0.18 | 0.19 |
| --- | ---: | ---: | ---: |
| Nouveau graphe de lecture + huit directions | 74,98 ms | 116,44 ms | 108,69 ms |
| Huit directions, instantané réutilisé | 72,33 ms | 0,29 ms | 0,30 ms |

La 0.14 ne possède pas la même étape de sécurisation. Son ancien ensemble comporte aussi 203 candidats de période exclus par la politique récente. Les ensembles 0.18 et 0.19 sont identiques sur cette épreuve ; la réutilisation est conservée, sans prétendre que tout est plus rapide que pré-0.16. Ce n’est ni un test de latence réseau ni une reproduction exacte de 0.15.

Micro-mesure du mélange sur 480 observations synthétiques, 50 passages après chauffe : environ 35,7 ms avant et 36,8 ms après lors du premier passage de contrôle. Le regroupement a un coût ; cette mesure ponctuelle ne démontre pas une accélération du mélange ni un seuil garanti.

Commandes :

```sh
node --test --test-reporter=tap server.test.mjs lib/*.test.mjs public/*.test.mjs tests/*.test.mjs
node lib/discovery-quality.test.mjs
node scripts/discovery-quality-performance.mjs STORE SEED ROOT_PRE016 ROOT_AVANT ROOT_CORRIGE
```

Résultat : **703 tests réussis, zéro échec**, dont 11 nouveaux cas ciblés. Vérifications de syntaxe client, panneau et serveur réussies. Journaux locaux de ce chantier : `/tmp/scout-quality-full.tap`, `/tmp/scout-quality-performance-fair.json`. La suite couvre notamment isolation, courses asynchrones, conservation des données, sources indisponibles, pagination, contradicteurs de regroupement et absence de confirmation implicite.

## Limites à vérifier en usage

Le moteur suit des liens documentaires ; il ne mesure pas la ressemblance sonore. Un label commun ne garantit pas une proximité musicale. Les catalogues incomplets, homonymes et crédits textuels ambigus restent possibles. Les regroupements probables sont présentés comme tels, pas comme des identités prouvées. Aucune certification globale de pertinence musicale n’est déduite des tests logiciels.

Cas proposés pour le test utilisateur : Jolagreen23 avec/sans filtre « autres artistes », Deelee S pour les variantes, ISHA/Limsa pour la validation, changement de départ pendant une lecture, puis une recherche avec une source indisponible. Ne pas exiger six artistes si le catalogue chargé n’en contient qu’un : vérifier plutôt la progression et l’absence de répétitions évitables.
