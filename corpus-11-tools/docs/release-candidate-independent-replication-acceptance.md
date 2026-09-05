# Critères d’acceptation v0.1 — tentative refusée : réplication indépendante

Date : 2026-09-05

Statut : `refused_by_separate_counter_review`.

Ce document est la tentative v0.1 initiale, conservée telle que cadrée avant
la contre-revue. Il n’autorise ni tag, publication, installation,
réobservation d’une nouvelle release, ni commit. La contre-revue a refusé son
usage pour la v1.6.0 : elle n’autorisait pas explicitement la réparation
bornée de la métavalidation rendue nécessaire par une porte applicable, et
elle ne garantissait pas que l’inventaire de tests attesterait l’arbre Git qui
contient réellement le nouveau test du harnais.

Les critères v0.2, séparés, sont dans
[`release-candidate-independent-replication-acceptance-v0.2.md`](release-candidate-independent-replication-acceptance-v0.2.md).
Ils ne réécrivent pas cette tentative refusée.

## Objet strict

La candidate ne peut contenir que :

- `corpus_labs.independent_replication`, ses exports publics et ses tests indépendants de toute recherche ;
- sa documentation de laboratoire et la documentation de release nécessaire ;
- les métadonnées, inventaires et manifeste de contenu nécessaires pour une release candidate cohérente.

## Conditions d’acceptation

1. Aucun code, fixture, protocole, résultat, adaptateur, règle ou verdict appartenant à FOE-001, provenance ou une autre recherche ne figure dans `corpus-11-tools/`.
2. Le module n’importe pas `research/` et ses tests ne requièrent aucun arbre de recherche.
3. Toute comparaison maintient `independence_verdict: independence_unknown` ; ni projection locale ni Bubblewrap ne peut produire `independent` ou une affirmation d’indépendance externe.
4. `run_projected_submission` reste inchangé dans son sens ; `run_isolated_submission` reste une API Bubblewrap optionnelle, fermée par défaut, avec réseau désactivé et sans fallback vers la projection. Bubblewrap absent ou namespaces refusés donnent `isolation_unavailable`.
5. Les tests couvrent au minimum entrée gelée, entrée non autorisée, dépendance non déclarée, sortie divergente, sortie incomplète, référence accessible, commande Bubblewrap fermée, réseau absent, référence non montée, backend absent/refusé, interdiction du fallback, destinations invitées lexicales merged-/usr et maintien de `independence_unknown`. Le test réel Bubblewrap peut rester conditionnel quand l’hôte refuse les namespaces ; il ne peut pas simuler un succès.
6. Aucune modification ne touche `research/active/cct/`, et aucun artefact ou protocole scellé n’est modifié.
7. La version est déterminée par le contrat de version existant, non par la seule intuition qu’une API est nouvelle. Les métadonnées de release, documentation, inventaires et manifeste octet-par-octet doivent tous désigner la même release candidate.
8. Tous les contrôles locaux applicables passent ; le reçu de préparation contient le diff exact depuis `v1.5.0`, les tests réellement exécutés, les empreintes, les limites et le statut `release_candidate_prepared`.

## Arrêt et retrait

Arrêter sans préparer la candidate si le diff produit contient une sémantique de recherche, un changement CCT, un artefact scellé, une dépendance externe, un fallback d’isolation, une limite affaiblie, ou un contrôle local applicable non passant. Retirer la candidate si la contre-revue séparée trouve que le diff, les exports, l’installation propre ou les limites ne respectent pas ces critères.

## Frontière de cette passe

Cette passe prépare uniquement une candidate locale. `release_candidate_prepared` ne signifie ni acceptée, ni taguée, ni publiée, ni installée, ni active dans le plugin déjà installé. Une conversation Codex distincte doit contre-relire le diff et le chemin d’installation avant toute demande d’autorisation de publication et d’installation.
