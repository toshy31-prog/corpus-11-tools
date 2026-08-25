# Attestation locale des évaluations comportementales — 2026-08-25

## Objet et niveau de conclusion

Ce document consigne une observation déjà réalisée localement. Il ne relance
pas les évaluations et n’ajoute ni journal brut, ni preuve externe, ni nouvelle
mesure.

Le statut applicable est donc **validé localement dans le périmètre décrit
ci-dessous**. Il ne vaut ni validation GitHub, ni réobservation de la capacité
du fournisseur, ni validation générale du plugin.

## Observation consignée

L’agrégation locale observée dans un état Codex isolé a indiqué :

- 77 enregistrements dans le catalogue ;
- deux replicas pour chaque enregistrement ;
- 77 rapports au statut passant ;
- `missing=none`, `invalid=none`, `fingerprint_inconsistent=none` et
  `auth_remaining=none`.

Ces valeurs décrivent l’exécution locale observée ; elles ne constituent pas
un nouveau résultat de recherche, ni une preuve d’un comportement hors de ce
dispositif.

## Frontière de l’attestation

L’exécution a utilisé un environnement Codex local isolé. Cette attestation ne
réobserve pas :

- un runner GitHub Actions, sa version de Codex, son secret ou son état ;
- la disponibilité actuelle des crédits, quotas ou capacités du fournisseur ;
- la persistance du résultat sous un autre canal, testeur, moment ou contexte ;
- une validation scientifique, extérieure ou globale de Corpus.

Les traces brutes et l’authentification éphémère ne sont pas ajoutées au dépôt.
Le présent fichier est une inscription bornée de l’observation, pas un
substitut à une réexécution autorisée.

## Évaluation vivante GitHub différée manuellement

Sur instruction du mainteneur, l’invocation vivante Codex qui consomme des
crédits API est différée manuellement jusqu’à une nouvelle autorisation. Elle
n’est pas supprimée et cette décision ne la déclare pas vérifiée sur GitHub.

Cette différation ne concerne que l’appel vivant au fournisseur : les gates
non-API continuent à s’exécuter automatiquement, et les commits ou pushes Git
restent autorisés sans être arrêtés ni rejetés à cause de cette capacité
externe. Lorsqu’une nouvelle autorisation sera donnée, une réobservation
fraîche devra être enregistrée séparément de la présente attestation locale.
