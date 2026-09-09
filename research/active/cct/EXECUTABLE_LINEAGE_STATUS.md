# État canonique de la lignée exécutable CCT

Date de décision : 2026-09-10

## Décision

- **Référence autoritative de la lignée de recherche :** CCT-EXEC 10.35.
- **Référence historique gelée :** CCT-EXEC 1.4, conservée à son emplacement et
  sans modification de ses artefacts.
- **Candidates intermédiaires :** les 120 candidates de 1.5 à 10.34 forment une
  seule lignée dépendante. Leur nombre ne mesure pas une accumulation de preuves
  indépendantes.
- **Portée maximale :** validation locale et synthétique de la lignée exécutable.
- **Indépendance :** `independence_unknown`.

Le verdict de ce registre est `promotion_record_valid`. La promotion change la
référence autoritative interne à la recherche CCT ; elle ne transfère aucune
capacité vers le produit Corpus.

## Base de la décision

- Commit de consolidation :
  `87d9dfbde3a35da14661bfa286d6bbc55bc52e63`.
- Commit d'archivage autonome de la lignée, publié et réobservé sur
  `origin/main` : `9d6a498f8ff93e560aef2d94a28d9330d0a0c49f`.
- Gel historique v1.4, SHA-256 :
  `ded8a13379a8f41f7be989b5970a56b3b7467bb33e63ea00060c235edf06afe1`.
- Gel v10.35, SHA-256 :
  `9a4f5d116bf918ab3d32df885f6491c08d2e082d78b56c0930c0a802d8557331`.
- Digest de la lignée intermédiaire de 716 fichiers :
  `77ccf9aa730ccc773ba92e59ee5a667e7ceb32a944268b43c5ee55561a169b6f`.
- Digest du manifeste fermé des 824 dépendances archivées :
  `b9d5705d52cced58bfb0239420224f64dda541ebaf19bffe09f931e1a0bd5bba`.
- Digest du paquet de 841 fichiers avant cette décision documentaire :
  `4b18f8bb330f93b72d2c8055f7958ac9692f81219250b70f7c46834ae78c8eee`.
- Validation cumulative, SHA-256 :
  `b849f2cca27facc607ce4ab1a19e909f89ef527711ef04e6bafe940c598ef6dd`.
- Rapport cumulatif lié, SHA-256 :
  `124b85485e65c2200e45f1a2304d65558bd70fec70cfd845c5ae2180e5c81f5c`.

Le checkout isolé du commit d'archivage, construit uniquement depuis Git, a
repassé le gel v10.35, la validation cumulative, les 10 tests v1.4, les 4 tests
v10.35, les 9 tests réseau et le contrôle adverse attendu. Le checkout est
resté propre après ces contrôles.

## Lecture de `pending_final_seal`

Le champ `cleanCheckout.status: pending_final_seal` de `validation.json`
décrit l'état antérieur au gel final. Ce fichier appartient au paquet v10.35
gelé et n'est donc pas réécrit. Pour le statut courant de la lignée, cette
mention est supersédée par la validation isolée depuis les seuls octets Git,
l'archivage complet, la contre-revue distincte, puis la publication et la
réobservation de `origin/main` au commit `9d6a498f8ff93e560aef2d94a28d9330d0a0c49f`.
Cette supersession documentaire ne transforme pas l'ancien champ en preuve
rétroactive et ne modifie aucun octet gelé.

## Limites non levées

La promotion ne démontre explicitement :

- aucune installation dans le plugin ou un autre produit ;
- aucune séparation entre hôtes ou organisations externes ;
- aucune indépendance organisationnelle ou indépendance de génération ;
- aucune autorisation ou mise en œuvre territoriale ;
- aucun déploiement ni effet institutionnel réel ;
- aucune validité externe ni robustesse générale.

Le mot « externe » dans le nom de v10.35 décrit une interface et des rôles de
processus observés localement. Il ne prouve pas la participation d'un acteur
extérieur. L'indépendance reste strictement `independence_unknown`.

## Lignée fonctionnelle dépendante

| Intervalle | Question rendue exécutable | Plafond de conclusion |
| --- | --- | --- |
| 1.4 | Chaque dette garde son reçu et son échéance propres. | Référence historique gelée, pas effet réel. |
| 1.5–2.9 | Provenance, continuité probatoire, pannes et dépendances composées. | Fixtures et dépendances déclarées. |
| 3.0–5.4 | Transport tenu à l'écart, incertitude, perturbations et validité des axes. | Identification synthétique bornée. |
| 5.5–6.8 | Preuves, journal, anti-rejeu, quorum et rotation. | Cohérence cryptographique locale. |
| 6.9–9.6 | Suspension, réparation, contestation, couverture d'exécution et puits d'effet. | Observateurs et conséquences synthétiques. |
| 9.7–10.22 | Non-liaison, préengagement, puissance, transport des racines et adjudication. | Portée fermée au protocole testé. |
| 10.23–10.35 | Réobservation du retrait, contrôle effectif, preuves réseau, propriété et rotation d'autorité. | Identités et séparations locales, pas indépendance externe. |

## Lignes blanches historiques conservées

L'archivage a conservé neuf lignes blanches finales déjà présentes, signalées
par `git diff --check`. Elles font partie des octets couverts par le digest de
lignée et ne sont pas corrigées :

- `sequenced-restoration-v2.2-common-cause/README.md`, ligne 19 ;
- `sequenced-restoration-v2.2-common-cause/runtime.mjs`, ligne 113 ;
- `sequenced-restoration-v2.2-common-cause/test.mjs`, ligne 71 ;
- `sequenced-restoration-v2.3-dependency-detectability/README.md`, ligne 19 ;
- `sequenced-restoration-v2.3-dependency-detectability/runtime.mjs`, ligne 127 ;
- `sequenced-restoration-v2.3-dependency-detectability/test.mjs`, ligne 73 ;
- `sequenced-restoration-v2.5-cross-class-pairs/README.md`, ligne 19 ;
- `sequenced-restoration-v2.5-cross-class-pairs/runtime.mjs`, ligne 138 ;
- `sequenced-restoration-v2.5-cross-class-pairs/test.mjs`, ligne 75.

## Condition de réouverture

La décision doit être réouverte si le gel v10.35 ou la fermeture Git cesse de
se vérifier, si un invariant v1.4 régresse, ou si une preuve ultérieure contredit
un résultat promu. Une preuve externe pourrait étendre la portée ; son absence
n'annule pas la cohérence locale, mais interdit toujours de revendiquer une
indépendance ou une validité externe.

Le protocole `external-simple-rival-pilot-v0.1` reste en attente de paquets
externes admissibles. Tant qu'ils manquent, son verdict reste
`awaiting_external_inputs`.
