# Leçons opérationnelles et invariants de résilience Corpus

Une seconde occurrence d'un obstacle généralisable est un bug d'infrastructure, pas une procédure manuelle à répéter.

## Transport et jobs longs
- Un timeout ChatGPT/MCP ne prouve pas l'échec du travail local.
- Aucun job à état inconnu ne doit être relancé avant inspection.
- Tout job long doit avoir identité persistante, état durable et résultat récupérable.
- Un job long doit vivre hors du cgroup du tunnel qui l'a demandé.
- Le tunnel est surveillé par santé fonctionnelle, pas seulement par PID.
- Deux probes fonctionnels consécutifs en échec sont nécessaires avant restart.

## Validation et Git
- Les validateurs doivent remonter toutes les dérives détectables en une passe.
- Le futur commit se valide contre le candidate tree/index, pas uniquement HEAD.
- Une mutation de dépôt travaille sur la surface Git suivie, jamais sur tout l'environnement physique.
- Un repack Git vérifie espace temporaire, refs et sauvegarde avant lancement et s'exécute de façon persistante.
- Une opération libérant de l'espace doit pouvoir financer son pic transitoire.
- Après interruption d'un repack, nettoyer les objets déjà packés et temporaires avant une nouvelle tentative.

## Stockage
- Corpus maintient une réserve absolue, pas seulement un pourcentage libre.
- Warning : moins de 10 GiB libres. Critical : moins de 5 GiB.
- Sous le seuil critique, aucun travail volumineux ne doit démarrer.
- DATA, STATE, MODEL, PROOF, RUNTIME et CACHE sont des classes distinctes.
- Les modèles HOT/COLD suivent une politique de résidence, pas un nettoyage générique.

## Temporaires
Tout producteur temporaire Corpus doit avoir un préfixe/propriétaire identifiable, un budget de taille, un cleanup normal, une récupération après crash, une règle d'âge minimale avant reaping et une vérification d'absence d'utilisateur actif.

Les corpus-validation-guards-* sont actuellement la seule classe automatiquement reapée : après six heures et seulement si aucun processus ne les utilise.

## Concurrence
- Ne jamais remettre un fichier concurrent à HEAD pour simplifier un chantier.
- Détecter, attribuer, comparer sémantiquement, fusionner puis tester.
- Les travaux concurrents inconnus sont préservés par défaut.

## Documentation
- Les nombres volatils viennent des doctors et états machine-lisibles.
- Les documents canoniques décrivent surtout territoires, politiques et invariants.
- Toute nouvelle racine volumineuse déclare son territoire et son cycle de vie.

## Boucle universelle
Observer → classifier → préserver → diagnostiquer → corriger la cause racine → tester la régression → automatiser la récupération → documenter l'invariant → reprendre au dernier checkpoint vérifié.
