# Reçu de préparation — release candidate v1.6.2

Statut : `release_candidate_prepared`.

La candidate est une correction de portabilité de tests. Sa base propre est
`8524d816a81c8800a64eb605e3ef5766880c7496` et sa version est
`v1.6.2` / `1.6.2+codex.20260906013502`.

## Périmètre fermé

Deux corrections déjà committées dans la base sont attestées :

1. le scénario de refus de namespace simule directement la résolution de
   Bubblewrap, sans exiger un `/usr/bin/bwrap` réel ;
2. le test réel Bubblewrap emploie `/usr/bin/python3`, visible par le montage
   invité `/usr`, et saute explicitement si cet interpréteur manque.

La candidate ne modifie pas `run_isolated_submission`, `_resolve_bubblewrap`,
les montages, les règles d'isolation, FOE-001, provenance ou un protocole et
artefact de recherche. Elle ne revendique aucun gain scientifique :
`independence_unknown` demeure le seul verdict d'indépendance.

Les douze métadonnées et attestations de candidate sont énumérées dans
[`../../release-candidate-v1.6.2-comparison.md`](../../release-candidate-v1.6.2-comparison.md).
L'inventaire de tests reste l'attestation déjà committée de l'arbre
`c413cd472ce7b80b57d7cd2b87d6c8c669c17809`; il n'est pas réécrit.

Le futur commit, le tag et le distant v1.6.2 sont respectivement
`not_verifiable_before_commit`, `not_verifiable_before_tag` et
`not_verifiable_before_publication`. Le manifeste de contenu est généré en
dernier depuis le checkout propre de candidate et s'exclut seulement lui-même.

## Contrôles déjà rejoués dans le checkout propre

- le harnais Python passe ses 17 tests sur l'hôte Bubblewrap compatible ; le
  scénario réel exerce l'isolation de processus avec `/usr/bin/python3` invité
  et conserve `independence_unknown` ;
- l'inventaire de tests atteste 90 surfaces et 113 modules, puis rejette sa
  mutation committée temporaire ; les 6 surfaces comportementales sont
  réattestées après le changement d'état d'organisme ;
- Node (24 modules), le portefeuille sûr et la suite CCT exécutable passent.
- avec `bwrap` absent du `PATH`, la collecte produit est `77 passed, 1 skipped,
  8 subtests passed` : le saut Bubblewrap est `skipped_unavailable`, sans
  fallback ;
- package, liens, frontières, attestations, 77 évaluations, 49 couvertures et
  métavalidation (15 mutations rejetées) passent après le manifeste ;
- le clean-room temporaire charge `corpus-11-tools` en
  `1.6.2+codex.20260906013502` avec le CLI verrouillé `0.137.0`, puis est
  supprimé. Aucun profil Codex utilisateur n'est modifié.

Seuls les contrôles d'identité échouent volontairement avant le futur tag :
`check_release_identity.py` et `check_organism.py --self-test` signalent tous
deux l'absence de `v1.6.2`, sans autre défaut.

## Retrait

Refuser ou retirer la candidate si les tests redeviennent dépendants du Python
du virtualenv hôte, si Bubblewrap absent se confond avec un succès, si un
fallback vers la projection apparaît, si `independence_unknown` est affaibli,
ou si un chemin hors de cette liste fermée est absorbé.
