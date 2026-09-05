# Critères d’acceptation v0.2 — candidate de release : réplication indépendante

Date : 2026-09-05

Statut : `criteria_prepared_not_authorized`. Ces critères remplacent la
tentative v0.1 refusée pour la seule préparation de la candidate v1.6.0. Ils
n’autorisent aucun ajout à l’index, commit, tag, publication, installation ou
réobservation de release.

## Objet strict

La candidate peut contenir :

- `corpus_labs.independent_replication`, ses exports publics et ses tests
  indépendants de toute recherche ;
- sa documentation de laboratoire et la documentation de release nécessaire ;
- les métadonnées, inventaires et manifeste de contenu nécessaires pour une
  release candidate cohérente ;
- la réparation bornée de la métavalidation
  `tools/test_validation_guards.py` et son inventaire attesté
  `docs/test-inventory.json`, car cette porte de validation est applicable à
  la candidate et sa réparation est requise pour l’exécuter sans épuiser les
  ressources locales.

Cette dernière exception ne crée aucune capability : elle préserve les quinze
mutations et leurs oracles, exclut les états locaux non distribués des copies
mutantes, vérifie la marge disque et nettoie les répertoires temporaires.

## Conditions d’acceptation

1. Aucun code, fixture, protocole, résultat, adaptateur, règle ou verdict
   appartenant à FOE-001, provenance ou une autre recherche ne figure dans
   `corpus-11-tools/`.
2. Le module n’importe pas `research/` et ses tests ne requièrent aucun arbre
   de recherche.
3. Toute comparaison maintient
   `independence_verdict: independence_unknown` ; ni projection locale ni
   Bubblewrap ne peut produire `independent` ou une affirmation
   d’indépendance externe.
4. `run_projected_submission` reste inchangé dans son sens ;
   `run_isolated_submission` reste une API Bubblewrap optionnelle, fermée par
   défaut, avec réseau désactivé et sans fallback vers la projection.
   Bubblewrap absent ou namespaces refusés donnent `isolation_unavailable`.
5. Les tests couvrent au minimum entrée gelée, entrée non autorisée,
   dépendance non déclarée, sortie divergente, sortie incomplète, référence
   accessible, commande Bubblewrap fermée, réseau absent, référence non
   montée, backend absent/refusé, interdiction du fallback, destinations
   invitées lexicales merged-/usr et maintien de `independence_unknown`. Le
   test réel Bubblewrap peut rester conditionnel quand l’hôte refuse les
   namespaces ; il ne peut pas simuler un succès.
6. `docs/test-inventory.json` doit viser le véritable arbre Git de
   `corpus-11-tools/labs/python/tests` qui inclut
   `test_independent_replication.py`, et non un hash fictif ni l’arbre HEAD
   antérieur. Pour le contenu gelé de cette candidate, cet objet calculé est
   `5cd699ce0333da3829568fa374d1bdc921c760ab` ; il ne devient attesté qu’une
   fois le commit candidat local créé. Avant ce commit,
   `check_test_inventory.py` doit donc signaler explicitement la divergence
   HEAD attendue, sans être présenté comme vert.
7. Aucune modification ne touche `research/active/cct/`, et aucun artefact ou
   protocole scellé n’est modifié.
8. La version est déterminée par le contrat de version existant, non par la
   seule intuition qu’une API est nouvelle. Les métadonnées de release,
   documentation, inventaires et manifeste octet-par-octet doivent tous
   désigner la même release candidate.
9. Après le commit local autorisé, tous les contrôles applicables doivent
   passer, notamment la métavalidation, l’inventaire de tests et le manifeste
   de contenu régénéré. Le reçu ne peut alors porter
   `release_candidate_prepared` qu’après ce rejeu observable.

## Arrêt et retrait

Arrêter sans préparer la candidate si le diff produit contient une sémantique
de recherche, un changement CCT, un artefact scellé, une dépendance externe,
un fallback d’isolation, une limite affaiblie, une réparation hors de la
métavalidation bornée ci-dessus, ou un contrôle local applicable non passant
après commit. Retirer la candidate si la contre-revue séparée trouve que le
diff, les exports, l’installation propre ou les limites ne respectent pas ces
critères.

## Frontière de cette passe

Cette passe prépare uniquement une candidate locale. Le futur statut
`release_candidate_prepared` ne signifie ni acceptée, ni taguée, ni publiée,
ni installée, ni active dans le plugin déjà installé. Une conversation Codex
distincte doit contre-relire le diff et le chemin d’installation avant toute
demande d’autorisation de publication et d’installation.
