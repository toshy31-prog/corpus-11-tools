# Contrat de stabilité v1.3.1

## Ce qui est stabilisé

- manifeste et installation du plugin ;
- inventaire des skills et catégories ;
- synchronisation du graphe, des dossiers et des références ;
- liens et compteurs des documents courants ;
- évaluations de routage/non-régression ;
- interfaces déterministes de l’Arena et de la porte de rendement.

## Ce qui ne l’est pas par cette release

- validité scientifique générale des 49 capabilities ;
- transport vers toute population ou tout domaine ;
- indépendance extérieure des scénarios synthétiques ;
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
contrat v1.3.1.

## Condition de retrait du statut stable

La version doit redevenir candidate si l’installation ne reproduit plus l’inventaire, si une catégorie devient ambiguë, si le graphe diverge des dossiers, si un lien courant casse, ou si une variation d’ordre produit une dérive matérielle inexpliquée sur le jeu d’évaluations déclaré.
