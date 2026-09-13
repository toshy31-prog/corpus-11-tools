# Décision de portefeuille — fondations de preuve

Date de décision : 2026-09-05  
Statut : campagne exécutée une fois ; verdict observé `passage`, limité au
fixture FOE-001 gelé.

## Décision

Ne pas ouvrir de nouveau programme. La **campagne transversale de fondations
de preuve** a exécuté une fois le cas fictif FOE-001 scellé. Son reçu est
[`receipt.json`](artifacts/foe-001-transversal-campaign-v0.1-2026-09-05/receipt.json) :
les quatre contrôles sont conformes et la décision est `passage`.

Ce passage ne modifie pas les conclusions scientifiques des dossiers, ne
valide pas Corpus en général, n'établit aucune indépendance externe et
n'autorise aucune intégration produit.

## Portefeuille pendant la campagne

| Voie | Décision de pilotage | Condition de sortie |
| --- | --- | --- |
| Hypothèses Corpus ; CCT et field calibration ; fusion et matrice F0 | Veille active : ne pas prolonger les séries actuelles. | Un observable, une famille de mondes et un rival indépendants, fixés avant calcul et capables de renverser la conclusion locale. |
| Preuves indépendantes ; provenance ; migrations sémantiques ; diversité épistémique | Campagne FOE-001 exécutée une fois : `passage` sur le fixture gelé. | Aucun nouveau paquet ni conclusion générale sans protocole distinct scellé. |
| Corpus Open Model ; harness de réponse native | Aucune action ouverte par ce passage. | Toute évaluation produit reste un travail séparé ; le reçu FOE-001 ne l'intègre pas. |
| Tous les autres dossiers actifs | Maintien de leur prochaine décision locale, sans nouvelle dépendance créée par cette campagne. | Décision locale déjà déclarée dans `portfolio.json`. |

## Contrat de la campagne

### Cas commun gelé

Avant tout calcul, créer un cas fictif comprenant :

1. une question et une conclusion concurrente ;
2. une procédure témoin et une procédure évaluée ;
3. deux lignages complets, sans source, générateur, hypothèse, code ou mode
   d'échec commun déclaré ;
4. un reçu de provenance minimal, sa portée et une condition de retrait ;
5. un manifest de transition et deux interpréteurs écrits séparément ;
6. des versions incluant collision, duplication, extension inconnue et
   lignage incomplet.

Le cas, les critères de réussite et les conditions d'échec sont gelés avant
les implémentations et les exécutions.

### Quatre contrôles requis

| Contrôle | Dossier responsable | Résultat requis | Échec utile |
| --- | --- | --- | --- |
| Indépendance | `independent-evidence-arena` | Les deux lignages restent séparés selon des empreintes déclarées et auditables. | Une dépendance commune est détectée ou reste indécidable. |
| Interopérabilité | `provenance-interoperability-lab` | Un échange aller-retour conserve attribution, transformation, portée et retrait avec un décodeur séparé. | Collision, duplication ou extension produit une perte localisée. |
| Migration | `semantic-migration-lab` | Deux interpréteurs distincts donnent la même conclusion justifiée dans les deux directions. | Une divergence est reliée à une règle déclarée ou demeure inexpliquée. |
| Modes communs | `epistemic-diversity-and-common-mode-failure-lab` | Le graphe distingue les voies indépendantes des grappes partageant un risque. | Lignage incomplet : verdict `independence_unknown`, sans assimilation à l'indépendance. |

## Séquence et portes de décision

1. **Cadrage.** Écrire et geler le cas commun, les rôles de chaque dossier,
   les artefacts échangés et la règle d'arrêt.
2. **Construction indépendante.** Chaque dossier construit seulement son
   composant, à partir du contrat gelé ; les implémentations des interpréteurs
   et du décodeur restent séparées.
3. **Exécution et audit croisé.** Rejouer les contrôles et consigner les
   réussites comme les échecs.
4. **Revue de portefeuille.** Classer le verdict :
   - `passage` : aucune perte inexpliquée ni dépendance commune non déclarée ;
   - `réparation ciblée` : une perte est localisée et une correction peut être
     définie sans déplacer le contrat ;
   - `arrêt / reprise` : le contrat ou l'indépendance échoue ; aucune
     intégration produit ne suit.
5. **Seulement après passage.** Constituer le jeu pré-enregistré du Corpus
   Open Model et rejouer la surface native sur les paquets scellés issus de la
   campagne.

Le cadrage est maintenant gelé dans
[`FOUNDATIONS_OF_EVIDENCE_PROTOCOL_v0.1.md`](FOUNDATIONS_OF_EVIDENCE_PROTOCOL_v0.1.md).

## Clôture de campagne

Le manifeste pré-exécution et son scellé sont dans
[`foe_001_transversal_campaign/`](foe_001_transversal_campaign/). La campagne
est close : ne pas la relancer, ni ajuster ses adaptateurs à partir du reçu.
Les dossiers en veille conservent leurs conditions déjà inscrites dans
`portfolio.json`.

## Critère de succès de pilotage

Le reçu contient le contrat gelé, les quatre observations, les écarts, les
dépendances déclarées et la décision explicite `passage`. Il ne dépasse pas les
mondes et implémentations testés ; les dépendances hôte non observées restent
une limite explicite.
