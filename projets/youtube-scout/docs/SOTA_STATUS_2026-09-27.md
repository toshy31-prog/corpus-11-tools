# YouTube Scout : bilan global et état de l'art — 27 septembre 2026

**Dernier état : [livraison 0.21.0 activée, W1–W5 et Git](RELEASE_0.21.0_2026-09-27.md).** 797/797 tests et interface/serveur alignés observés. Le repère 43/80 reste inchangé ; aucune parité SOTA globale établie.

Suites de ce bilan historique : [vague 2](SOTA_REUSE_W2_2026-09-27.md), [vague 3](SOTA_REUSE_W3_2026-09-27.md), [comparateur externe W4](SOTA_RECORDLINKAGE_W4.md), [validation W5](SOTA_VALIDATION_W5.md). Les comptes de tests et constats d'activation ci-dessous restent ceux de la première vague.

## Réponse courte

**54 % sur une grille explicite de maturité démontrée du cœur actuel.** Ce n'est ni un pourcentage de travail terminé, ni une probabilité de succès, ni « 54 % du niveau de Google ». Le projet n'a pas de backlog final fermé permettant de calculer honnêtement une fraction de fonctionnalités terminées. Le palier SOTA demandé n'est **pas encore établi**.

Le cœur audité est l'outil local de découverte par relations documentées : identification, huit directions, classement et explications, orchestration des sources, bibliothèque/import/export/confidentialité, interface et contrôle des recherches. L'audio acoustique est une extension séparée, actuellement absente, et non un acquis implicite du graphe.

## Dénominateur et convention

Cinq axes, quatre critères falsifiables par axe, poids égaux. Chaque critère : 0 absent ou non établi ; 1 écrit/partiel ; 2 validation historique tracée ; 3 validation locale actuelle ciblée ; 4 confrontation indépendante représentative. Dénominateur 5 × 4 × 4 = 80 points. Somme actuelle 43 ; 43/80 = 53,75 %, arrondi à 54 %. Il s'agit d'un indice conventionnel ordinal, pas d'une mesure physique ni d'un devis de temps restant. Le choix des poids est explicite mais non validé par une étude utilisateur.

Un test ciblé ne valide pas tous les usages d'un axe. Les critères détaillés et leurs limites sont conservés dans chaque rapport. Une comparaison indépendante est un verrou spécifique : un bon total ne peut pas le remplacer. Mettre à jour le score seulement lorsque de nouvelles preuves satisfont les mêmes critères ; publier toute modification du périmètre ou des poids.

| Axe | Points | Indice arrondi | Ce qui manque surtout |
| --- | ---: | ---: | --- |
| [Identification et crédits](SOTA_IDENTITY_2026-09-27.md) | 9/16 | 56 % | Corpus indépendant, faux rapprochements et abstention mesurés ensemble |
| [Découverte, huit directions, classement](SOTA_DISCOVERY_2026-09-27.md) | 9/16 | 56 % | Utilité musicale et fidélité des chemins jugées à l'aveugle |
| [Fiabilité des sources](SOTA_PLATFORM_2026-09-27.md) | 8/16 | 50 % | Annulation complète, budget commun, campagne de pannes et latence utilisateur |
| [Données personnelles et sécurité](SOTA_PLATFORM_2026-09-27.md) | 10/16 | 63 % | Crash réel, récupération indépendante, concurrence et audit de sécurité complet |
| [Interface et automatisation](SOTA_UX_2026-09-27.md) | 7/16 | 44 % | Parcours autonome observé, accessibilité complète, temps et erreurs utilisateur |

[Audio, empreintes et similarité](SOTA_AUDIO_2026-09-27.md) : 0/16 pour cette extension, exclue des 80 points. [Évaluation comparative](SOTA_EVALUATION_2026-09-27.md) : méthode transversale, non ajoutée une seconde fois au score global.

## Couverture de la recherche

Chaque rapport distingue chercheurs, grands acteurs et logiciels ouverts, avec sources primaires, limites de transfert et licences observées. Ce panorama est international mais pas une revue systématique exhaustive. Les huit directions sont examinées individuellement : labels, remixeurs/producteurs, collaborations, compilations, alias/projets, chaînes, scènes et période. Lorsqu'aucun benchmark industriel public du motif exact n'est vérifié, le rapport le dit ; un article général de recommandation ne remplit pas ce manque.

Repères : COLING 2025 pour extraction musicale ; KPRN et travaux sur qualité des chemins ; Microsoft HAI et systèmes distribués ; Google/YouTube, Spotify, Amazon et Tencent avec des portées différentes ; Apple/Google/ACRCloud pour audio ; MetaBrainz/Picard/Troi, RecBole, Recommenders, SQLite, Automerge, Chromaprint, CLAP et MERT côté ouvert. Le papier Tencent étudié porte sur la publicité, pas QQ Music. Les résultats industriels auto-rapportés ne sont pas indépendants.

## Réemplois réalisés dans ce lot

1. **Identification prudente** : une très bonne correspondance avec un seul participant ne suffit plus pour accepter automatiquement une demande à plusieurs artistes. Le candidat incomplet reste proposé.
2. **Preuves idempotentes** : relire exactement le même chemin n'ajoute plus artificiellement une explication ; les chemins et preuves différents restent distincts.
3. **Respect des sources** : une longue pause Retry-After s'applique aux requêtes suivantes de la même source, sans bloquer les autres sources ni masquer le caractère périmé d'un cache utilisé.
4. **Contrôle utilisateur** : une direction choisie mais en attente peut être désélectionnée. Le rack distingue sélection et disponibilité. Le libellé « Remixeurs et producteurs » correspond aux deux rôles réellement conservés par le graphe.
5. **Mesure hors ligne** : outil pur nDCG/recall/couverture/abstention, sans réseau ni historique privé ; les jugements manquants ne deviennent pas de faux négatifs.

Aucun code tiers copié, paquet ou modèle installé. Réemplois de mécanismes, pas importation d'un système industriel. [Revue producteur/remixeur](SOTA_RELATION_REVIEW_2026-09-27.md) : pas de conversion sémantique fautive trouvée ; supprimer les producteurs aurait cassé le contrat existant.

## Vérification et activation

Tests locaux isolés autorisés explicitement par l'utilisateur pendant cette tâche. Voir [rapport d'exécution](SOTA_VALIDATION_2026-09-27.md) pour copie, commandes, comptes et restrictions exactes. Snapshot final incluant les derniers tests de métriques et libellés : **748 cas réussis sur748, zéro échec, zéro ignoré**, code0 ; `npm run check` réussit également. Les empreintes SHA-256 des cinq modules modifiés correspondent entre copie testée et projet source lors du snapshot.

Pas de redémarrage du service personnel, pas de rechargement de sa page, pas de modification de sa bibliothèque ni d'appel à ses comptes catalogue. Les fichiers de code sont modifiés sur disque ; le chargement effectif de ces nouvelles versions par la session déjà ouverte n'est pas établi. Les captures historiques ne sont pas une validation des patches actuels.

Écart documentaire préexistant : package 0.20.1, README affichant 0.19.0 et anciennes validations 0.16.0. Les preuves actuelles de ce dossier ne doivent pas être confondues avec ces anciennes campagnes.

## Prochain palier, puis dépassement

Le protocole d'évaluation décrit un corpus gelé, des séparations développement/validation/test par famille, des baselines et des critères à fixer avant mesure. Les seuils proposés ne sont pas des résultats obtenus.

Ordre recommandé :

1. Exécuter les scénarios locaux de pannes/annulation et de récupération sans données personnelles.
2. Constituer un petit corpus musical autorisé et annoté indépendamment, couvrant les huit directions et les cas sans fiche ; conserver les erreurs et abstentions.
3. Comparer Scout, une baseline simple et un comparateur ouvert sur les mêmes candidats et budgets. Mesurer pertinence, fidélité des preuves, diversité, couverture, coût et latence séparément.
4. Ajouter seulement les mécanismes qui améliorent ce comparatif sans dégrader les garde-fous. Étudier audio/embeddings séparément si cette extension est confirmée : licences des poids distinctes du code, fichiers audio autorisés, pas de téléchargement YouTube implicite.

Atteindre ou dépasser une référence exigera des résultats de cette confrontation. Ni la quantité d'agents, ni le nombre de tests, ni l'installation d'un modèle ne peuvent honnêtement servir de raccourci.

## Coordination

Trois agents spécialisés simultanés, puis réaffectations : identité → audio → revue des rôles ; découverte → évaluation et cas limites ; plateforme → revue croisée et suite globale isolée. Le coordinateur a traité interface et synthèse. Les revues croisées renforcent le contrôle technique, mais les agents de la même tâche ne constituent pas une évaluation scientifique indépendante.
