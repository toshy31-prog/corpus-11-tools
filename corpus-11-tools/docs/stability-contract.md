# Contrat de stabilité v1.6.1 — release locale préparée

## Ce qui est stabilisé

- manifeste et installation du plugin ;
- inventaire des skills et catégories ;
- synchronisation du graphe, des dossiers et des références ;
- liens et compteurs des documents courants ;
- évaluations de routage/non-régression ;
- interfaces déterministes de l’Arena et de la porte de rendement.
- contrat d'organisme, état de lignée et frontières entre corps actif, mémoire,
  laboratoires, recherches et transferts ;
- contenu exact du plugin attesté octet par octet dans
  `release-content-v1.6.1.json`, hors auto-référence explicitement déclarée ;
- frontières de validation publiées : collecte Python bornée au produit,
  attestations d'identité, liens distribués et gel CCT v013 cohérents.

## Ce qui ne l’est pas par cette release

- validité scientifique générale des 49 capabilities ;
- transport vers toute population ou tout domaine ;
- indépendance extérieure des scénarios synthétiques ;
- indépendance externe, des auteurs ou de l’environnement :
  `independence_unknown` reste obligatoire, y compris avec Bubblewrap ;
- autorisation ou déploiement territorial de la CCT ;
- maintien d’un prototype ou d’un déploiement hors du périmètre du produit.

## Taxonomie canonique

| Objet | Nombre | Statut |
|---|---:|---|
| Skills | 58 | chargeables par le plugin |
| Wrappers de capability natifs | 31 | `candidate_unvalidated` |
| Wrappers récupérés | 9 | `recovered_candidate_unvalidated` |
| Wrappers de conception v1.2 | 9 | `design_candidate_unvalidated` |
| Skills opérationnels sans nœud `CAP.*` | 9 | routage, règles, procédures, contexte ou expérimentation |
| Familles descriptives | 4 | non exécutables |
| Relations | 88 | graphe 11.x |
| Évaluations | 77 | périmètre fini de routage/non-régression |

La source machine lisible est [`inventory.json`](inventory.json). L’index destiné au routage est [`capability-index.md`](../skills/corpus-11-routing/references/capability-index.md).

Ces compteurs décrivent le même périmètre courant que l’inventaire : **58
skills, 49 capabilities, 4 familles, 88 relations et 77 évaluations**. Le
contrôle `tools/check_docs.py` dérive désormais ces valeurs de
`docs/inventory.json` et refuse toute divergence dans ce contrat. Les mentions
de releases antérieures restent historiques ; elles ne redéfinissent pas ce
candidate corrective v1.6.1.

## Condition de retrait de la release locale

Retirer ou refuser la release locale si l’installation ne reproduit plus l’inventaire, si une catégorie devient ambiguë, si le graphe diverge des dossiers, si un lien courant casse, si une variation d’ordre produit une dérive matérielle inexpliquée sur le jeu d’évaluations déclaré, si le harnais importe une recherche, s’il masque une dépendance ou un écart, s’il transforme projection/isolation locale en indépendance, ou si Bubblewrap replie vers la projection.
