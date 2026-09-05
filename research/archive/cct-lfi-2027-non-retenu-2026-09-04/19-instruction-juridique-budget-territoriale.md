# Instruction juridique, budgétaire et territoriale des six garanties

## Règle de décision

Chaque garantie est instruite par trois portes indépendantes :

1. **droit** : norme compétente, titulaire de l'obligation, borne de droit existante et question ouverte ;
2. **budget/capacité** : porteur, dépense d'investissement, dépense récurrente, effectifs, système et source de financement à chiffrer ;
3. **territoire** : lieu d'accès, continuité de l'énergie/des réseaux, ingénierie locale, partenaires, publics exposés et voie de recours.

Statuts : **P** = pièce présente dans le cas instruit ; **C** = conditionnelle, à documenter ; **A** = absente ou non établie. Une mesure ne passe pas à la rédaction normative si l'une des trois portes est A. Ce protocole ne rend aucun avis juridique et ne chiffre aucun dispositif.

| Garantie | Porte de droit | Porte budget/capacité | Porte territoriale | Décision si pièce manquante |
|---|---|---|---|---|
| A1 Dépendances vitales | loi sectorielle et bornage secret/sûreté/données ; responsable public du contrôle | cartographie, cybersécurité, mise à jour, audit ; opérateur et administration responsables | inventaire des réseaux, sites de secours, coordination intercommunale et public informé | **retenir** : pas de registre public sans annexe protégée ni responsable de mise à jour |
| A2 Continuité avant transfert | base légale ou contractuelle d'accès aux données, contrats et équipements ; autorité de suspension | équipe de reprise, audit, stock, systèmes, contrat de maintenance et coût récurrent | relève locale, délais d'intervention, accès des usagers et solution de secours | **retenir** : aucune bascule irréversible sans preuve de continuité |
| A3 Voie hors numérique | obligation de service public et voie de recours ; articulation avec CRPA et opérateurs | guichets, téléphone, médiation, interprétariat, formation et délai de correction | point d'accueil atteignable, accessibilité, couverture téléphonique, permanence en crise | **retenir** : aucun droit vital ne peut basculer au numérique seul |
| A4 Fin des exceptions | qualification de chaque régime : loi ordinaire, organique ou Constitution ; juge compétent | registre d'activation, contrôle, contentieux et archivage ; agents compétents | information locale, contrôle des effets différenciés et accès effectif au recours | **retenir** : ne pas promettre une règle unique pour tous les régimes d'exception |
| A5 Charge démocratique | support dans étude d'impact, décret ou règle de consultation ; autorité de publication | enquête usager, traduction, assistance, traitement des retours et système de suivi | temps de trajet, horaires, langue, handicap, fracture numérique et saisonnalité | **retenir** : aucun indicateur sans protocole d'observation ni correction des formalités inutiles |
| A6 Évaluation contradictoire | articulation avec études d'impact, LOLF, secret protégé et commande publique | données, expertise indépendante, contradicteur, publication et révision | données désagrégées, effets distributifs, collectivités concernées et recours | **retenir** : aucun investissement majeur sans hypothèses et réponse aux objections accessibles |

## Paquets de pièces exigibles avant rédaction normative

### Paquet droit

- mesure concernée, norme visée, niveau de norme et ministère/administration porteur ;
- droit existant modifié ou complété ;
- droits fondamentaux, secret, données, droit de l'Union et contrôle juridictionnel éventuellement en cause ;
- disposition à ne pas rédiger sans expertise compétente.

### Paquet budget et capacité

- unité porteuse, effectifs à créer ou redéployer, outils et maintenance ;
- investissement initial, coût annuel, coûts transférés aux usagers et collectivités ;
- source de financement à arbitrer, sans annoncer de montant global ;
- indicateur de continuité et condition de retrait.

### Paquet territoire

- service et périmètre réellement concernés ;
- lieux et modalités de la voie humaine ;
- réseau, énergie, transport, partenaires et mémoire opérationnelle nécessaires ;
- publics les plus exposés à la rupture et voie locale de recours ;
- test de crise : panne numérique, événement climatique, changement d'opérateur ou retard de financement.

## Ce que le simulateur peut décider

Le moteur situé dans [`19-laboratoire-instruction/`](19-laboratoire-instruction/) prend des profils **synthétiques** de disponibilité des pièces et renvoie, garantie par garantie : `PRET_A_INSTRUIRE`, `A_RETENIR` ou `HORS_PERIMETRE`. Il ne décide jamais « légal », « financé » ou « faisable en France ».
