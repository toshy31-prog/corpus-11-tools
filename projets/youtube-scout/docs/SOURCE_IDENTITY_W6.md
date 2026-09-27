# Récupération des propositions artiste — W6

Défaut reproductible : une réponse catalogue nommée `Tsee Muds` était supprimée localement pour la requête `The Tsee Muds` : tous les tokens de la requête étaient exigés par `artistChoiceRank`. Ceci explique un échec possible de présentation, pas la cause prouvée des captures historiques ni l'existence d'une fiche distante.

Correctif dans `public/departure-workflow.mjs` : un article initial anglais `The` peut être omis pour proposer une fiche si au moins deux mots restent. Rang faible 1, inférieur à l'identité textuelle exacte 3 et à l'alias documenté 2. Aucune fusion par nom, aucune sélection automatique, aucun changement des seuils d'identité ni des requêtes API. Le fallback s'applique uniquement aux réponses déjà disponibles : un fournisseur qui ne renvoie pas de fiche reste un cas non résolu.

Nouveaux tests `public/artist-article-proposals.test.mjs` : variante article, priorité exact/alias, protection `The Who`→`Who`, mots différents, maintien de deux identifiants catalogue distincts et absence de mutation. Le cas répété `The The`→`The` était déjà admis par le fallback de tokens ; comportement conservé et non attribué au patch. Une assertion initiale incorrecte de ce comportement a été corrigée après observation, sans changement production supplémentaire.

Sauvegarde antérieure : `/tmp/scout-departure-workflow-before-w6.mjs`. Aucun service, donnée privée, API distante, registre ou fichier serveur modifié. Le comportement fournisseur n'étant pas changé, aucune nouvelle revendication sur son API n'est faite.

Validation : `node --test public/artist-article-proposals.test.mjs lib/video-credits.test.mjs public/departure-workflow.test.mjs`. Voir retour d'exécution de la tâche ; aucun gain sur le corpus W4 ni observation de la session personnelle revendiqué.
