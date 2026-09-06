# Matrice de validation — release candidate v1.6.2

Statut : `release_candidate_prepared` sous réserve des identités qui ne peuvent
être établies qu'après le futur commit et le futur tag.

| Surface | Contrôle | Résultat exigé |
| --- | --- | --- |
| Harnais, Bubblewrap fonctionnel | tests Python du harnais | le test réel atteint `process_isolation_exercised` avec `/usr/bin/python3` invité ; `independence_unknown` demeure |
| Harnais, Bubblewrap absent | produit Python complet avec `bwrap` hors `PATH` | le test réel est `skipped_unavailable`; aucun fallback ni succès simulé |
| Refus de namespace | test unitaire avec résolveur simulé | `isolation_unavailable`, même sans binaire Bubblewrap hôte |
| Inventaires | test et surfaces comportementales | arbres et objets Git explicitement attestés |
| Contenu | `check_release_content.py` | manifeste v1.6.2 concordant, hors auto-référence |
| Frontières | docs, package et boundaries | aucun runtime produit vers `research/`; docs distribuées autonomes |
| Régression dépôt | Node, CCT, portefeuille et métavalidation | portes applicables vertes dans le checkout propre |
| Évaluations | `check_evals.py` | `77/77` contrats et `49/49` capabilities couverts |
| Installation | clean-room temporaire | paquet installable et chargeable sans installation dans le profil utilisateur |
| Identité | identité et organisme | `not_executable_before_tag` avant le tag local v1.6.2 |

La candidate ne modifie pas le harnais de production et ne démontre ni
indépendance externe ni capacité Bubblewrap hors d'un hôte réellement
compatible.

## Résultats observés avant manifeste final

- Harnais depuis l'hôte Bubblewrap compatible : `17 passed`; le test réel ne
  saute pas et vérifie `process_isolation_exercised` avec `/usr/bin/python3`.
- Inventaire de tests : `90 surfaces, 113 modules`, mutation temporaire
  rejetée ; inventaire comportemental : `6 surfaces` attestées.
- Node : `24` modules passés ; portefeuille sûr : passé ; CCT exécutable :
  `stack`, constitution et économie passés.
- Produit complet sans Bubblewrap : `77 passed, 1 skipped, 8 subtests passed`;
  le saut observé est explicitement `skipped_unavailable`.
- Package, documentation, frontières, manifest, évaluations, intégrité,
  métavalidation (15 mutations), JSON et whitespace : passés. Le clean-room
  temporaire installe et liste la version `1.6.2+codex.20260906013502` via le
  CLI verrouillé `0.137.0`, puis est supprimé.

L'absence du tag v1.6.2 reste la seule condition attendue pour les contrôles
d'identité : `check_release_identity.py` et `check_organism.py --self-test`
refusent explicitement le tag manquant et rien d'autre.
