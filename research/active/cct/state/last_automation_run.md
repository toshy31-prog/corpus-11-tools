# Routine de portefeuille

## Exécutée : 2026-09-05T20:43:59Z — confrontation 1.6 tenue à l'écart

- Projet : `cct`
- Mode : `internal-synthetic-evidence-hold`
- Lacune traitée : 1.6 devait être confrontée à une scène où toute action de
  continuité déplace une dette ouverte, et non seulement vérifiée par filtre.
- Gain concret : la confrontation `CCT-EVIDENCE-HOLD-HO-001` fait échouer 1.6
  explicitement plutôt que de choisir une clôture partielle. Le rival ferme une
  dette en exposant l'autre ; les trois axes restent séparés, sans vainqueur.
- Vérification : le test runtime, la confrontation et le gel 1.4 passent. Le
  monde est `internal_synthetic_adversarial`, non une preuve externe.
- Prochaine lacune prioritaire : concevoir une capacité additionnelle
  admissible qui protège les deux dettes pendant la contestation, puis la
  confronter sans dégrader la preuve ni déplacer le coût.

## Exécutée : 2026-09-05T20:43:59Z — candidate continuité de preuve

- Projet : `cct`
- Mode : `evidence-hold-candidate`
- Lacune traitée : après le refus prudent d'un reçu, la continuation 1.4
  pouvait préserver le vital et l'écologie tout en ne protégeant pas chaque
  dette ouverte.
- Gain concret : CCT-EXEC 1.6 n'autorise l'attente de preuve que si l'action
  retenue protège tous les axes de dette ouverts. Sinon elle échoue
  explicitement, sans présenter l'attente comme sûre.
- Vérification : la couverture complète des dettes est acceptée, une action
  qui en omet une est refusée ; les tests 1.5 et 1.6 passent, le gel 1.4 reste
  intact.
- Prochaine lacune prioritaire : confronter 1.6 à un monde distinct où une
  preuve est contestée et où la seule action de continuité déplace un autre
  coût, afin de tester son refus plutôt que son seul filtrage local.

## Exécutée : 2026-09-05T20:43:59Z — confrontation provenance interne

- Projet : `cct`
- Mode : `internal-synthetic-adversarial-confrontation`
- Lacune traitée : la couche 1.5 avait une attaque de preuve isolée, sans
  comparaison vectorielle de son coût de sûreté.
- Gain concret : `CCT-RECEIPT-PROVENANCE-HO-001`, gelée avant exécution,
  confronte 1.5 à un accepteur formel de reçus sur deux axes séparés : intégrité
  de preuve et clôture de dette. 1.5 préserve le premier et retient la seconde;
  le rival fait l'inverse. Aucun vainqueur scalaire n'est déclaré.
- Vérification : le script de confrontation, les tests 1.5 et le gel 1.4
  passent. Le monde est explicitement `internal_synthetic_adversarial`.
- Prochaine lacune prioritaire : un monde complet distinct doit tester les
  conséquences matérielles et la réparation après un refus de preuve ; cette
  confrontation n'établit ni robustesse externe ni efficacité institutionnelle.

## Exécutée : 2026-09-05T20:43:59Z — provenance réparation et épreuve tenue à l'écart

- Projet : `cct`
- Mode : `receipt-provenance-held-out`
- Lacune traitée : un reçu de réparation pouvait rester formellement complet
  sans provenance contrôlée ; deux exports distincts pouvaient aussi masquer
  une collecte commune.
- Gain concret : 1.5 applique maintenant un `provenanceBundle` aux reçus de
  réparation. La provenance exige acteurs, domaines, artefacts, empreintes et
  racines de collecte distincts. L'épreuve séparée rejette deux exports issus
  d'une même enquête malgré leurs identifiants et empreintes distincts.
- Vérification : les tests 1.5 et l'épreuve `internal_synthetic_adversarial`
  passent ; le gel 1.4 est intact. Cette épreuve peut réfuter le filtre, pas
  établir une indépendance institutionnelle réelle.
- Prochaine lacune prioritaire : faire passer 1.5 par un nouveau monde complet
  dont la dynamique d'action et les résultats sont gelés avant l'exécution ;
  l'attaque présente n'évalue que la couche de preuve.

## Exécutée : 2026-09-05T20:43:59Z — intégration candidate 1.5

- Projet : `cct`
- Mode : `receipt-provenance-runtime`
- Lacune traitée : la première candidate 1.5 définissait la provenance, mais
  ne l'appliquait pas encore au chemin d'exécution des gains de capacité.
- Gain concret : le runtime 1.5 retire les reçus réutilisés ou auto-attestés
  avant la confirmation plurielle de capacité ; il inscrit le rejet dans la
  trace et bascule vers la vérification en attente.
- Vérification : le test d'intégration établit qu'un paquet réutilisant son
  artefact ne produit aucun gain vérifié ; les tests 1.5 passent et le gel 1.4
  demeure vérifié sans modification.
- Prochaine lacune prioritaire : appliquer une règle de provenance analogue
  aux reçus de réparation, dans une extension distincte et sans présumer que
  la provenance suffit à établir leur vérité.

## Exécutée : 2026-09-05T20:14:03Z — candidate de provenance

- Projet : `cct`
- Mode : `receipt-provenance-candidate`
- Lacune traitée : CCT-EXEC 1.4 exigeait des reçus indépendants, sans rendre
  détectable la réutilisation visible d'un même artefact de preuve.
- Gain concret : CCT-EXEC 1.5 candidate exige maintenant deux observateurs,
  domaines de panne, artefacts et empreintes de source distincts, chacun avec
  une limite de collecte déclarée. Un opérateur ne peut pas s'auto-attester.
- Vérification : un paquet séparé passe ; la réutilisation d'artefact ou
  d'empreinte, et l'auto-attestation, échouent localement.
- Prochaine lacune prioritaire : intégrer cette porte à une future exécution
  CCT sans modifier le gel 1.4, puis l'exposer à un nouveau monde tenu à
  l'écart.

## Exécutée : 2026-09-05T19:13:31Z — relance récurrente

- Projet : `cct`
- Mode : `vital-service-finance-boundary`
- Lacune traitée : l'offre de CCT-RV interdisait textuellement l'exclusivité
  et le transfert d'autorité, mais le contrat exécutable ne les refusait pas.
- Gain concret : CCT-RV-01 interdit maintenant qu'un financeur conditionne
  l'accès vital ou l'autorité de service, et qu'une continuité vitale crée une
  dépendance exclusive à un fournisseur ou à une plateforme. Cela borne la
  compatibilité avec un financement privé sans rendre marchand le service.
- Vérification : la mutation qui retire ces protections échoue ; tous les
  contrats, l'arène et leurs suites passent.
- Prochaine lacune prioritaire : traduire les plafonds de financement en
  conditions observables pour un éventuel hébergeur légal, sans déclarer que
  cet hébergeur ou ces fonds existent.

## Exécutée : 2026-09-05T18:43:31Z — relance récurrente

- Projet : `cct`
- Mode : `public-context-admission`
- Lacune traitée : les sources publiques sur l'eau et l'action anticipée au
  Mozambique restaient dispersées et ne déterminaient pas ce qu'elles
  autorisent réellement pour CCT-MIN-01.
- Gain concret : une matrice sourcée distingue maintenant l'alignement national
  possible, les limites de données, les interdictions d'inférence et la
  condition précise qui rendrait une prochaine étape admissible.
- Vérification : contrat et tests CCT-MIN-01 passent ; les quatre sources sont
  primaires ou institutionnelles et liées depuis la matrice.
- Prochaine lacune prioritaire : une soumission distincte avec site, baseline,
  responsabilités, ressources et recours attestés ; le contexte public ne
  remplace aucun de ces éléments.

## Exécutée : 2026-09-05T18:13:31Z — relance récurrente

- Projet : `cct`
- Mode : `independence-classification`
- Lacune traitée : une soumission à relation d'auteur `unknown` satisfaisait
  les champs minimaux sans classement explicite, ce qui pouvait laisser croire
  à une épreuve indépendante.
- Gain concret : la porte d'admission classe désormais une soumission valide
  comme `eligible_for_independent_arena` seulement si la relation est
  `independent`; les relations `unknown` et `dependent` restent admises pour
  le développement interne uniquement. Une soumission incomplète est rejetée.
- Vérification : les trois classes sont testées ; la vérification consolidée
  passe. Les annonces récentes FAO, INGD et UNICEF confirment une préparation
  WASH et d'action anticipée au Mozambique, mais ne comblent pas les données
  locales ni la provenance d'auteur exigées par l'arène.
- Prochaine lacune prioritaire : obtenir un scénario distinct, avec lignée
  d'auteur établie et variables exécutables, plutôt que convertir des notes
  publiques en preuve indépendante.

## Exécutée : 2026-09-05T17:43:31Z — relance manuelle substantielle

- Projet : `cct`
- Mode : `external-scenario-admission`
- Lacune traitée : une soumission indépendante pour l'arène était décrite mais
  son admission restait textuelle et ne pouvait pas refuser mécaniquement une
  provenance, un état ou une comparaison incomplets.
- Gain concret : ajout d'une porte exécutable qui exige auteur et provenance,
  preuves avec limites, état lisible par machine, actions publiques, budgets et
  informations appariés, prédiction favorable à un rival, réversibilité et
  contraintes de sécurité. Elle transforme la prochaine soumission externe en
  objet contrôlable sans la confondre avec une preuve d'efficacité.
- Vérification : la soumission admissible minimale passe ; placeholders,
  provenance manquante, budget inégal et état narratif échouent ; la
  vérification consolidée passe.
- Prochaine lacune prioritaire : recevoir ou construire avec un auteur
  réellement distinct un scénario exécutable dont les variables et les
  résultats peuvent discriminer CCT d'au moins un rival sérieux.

## Exécutée : 2026-09-05T17:43:31Z — relance récurrente

- Projet : `cct`
- Mode : `local-adversarial-verification`
- Portée synthétique autorisée : `model_internal`
- Amélioration : `verify-contracts.mjs` couvre maintenant aussi les validateurs
  et mutations négatives de l'arène CCT-POL 1.1 : budget apparié, axes séparés,
  comparateurs sérieux, possibilité de perte et interdiction d'un vainqueur
  scalaire.
- Vérification : sept validateurs et sept suites Node passent. La campagne
  interne n'a pas été relancée et aucun résultat n'a été écrit.
- Prochaine décision : ne faire évoluer l'arène qu'avec un nouveau
  discriminant préenregistré ; les mondes internes peuvent réfuter, jamais
  promouvoir, la candidate.

## Exécutée : 2026-09-05T16:13:01Z — relance récurrente

- Projet : `cct`
- Mode : `local-contract-regression`
- Portée synthétique autorisée : `model_internal`
- Amélioration : le contrat racine CCT-POL 1.1 exige maintenant que ses cinq
  plafonds d'inférence restent explicites : autorisation, déploiement, effet
  institutionnel, observation après choc et robustesse externe ne sont pas
  établis.
- Vérification : la mutation qui retire l'effet institutionnel ou promeut le
  statut échoue ; les cinq contrats et leurs suites passent via
  `verify-contracts.mjs`.
- Prochaine décision : ne pas ajouter de validation locale sans nouveau
  discriminant ; les prochaines preuves utiles sont externes et régies par la
  porte de pré-adoption.

## Exécutée : 2026-09-05T15:43:01Z — relance récurrente

- Projet : `cct`
- Mode : `local-contract-verification`
- Portée synthétique autorisée : `model_internal`
- Amélioration : ajout de `verify-contracts.mjs`, point d'entrée unique des
  validateurs et mutations négatives de CCT-POL 1.1, du Ciel, du cas d'eau,
  de la porte de pré-adoption et du véhicule de ressources.
- Vérification : les cinq contrats et leurs cinq suites Node passent ; le
  script s'arrête au premier échec.
- Prochaine décision : maintenir cette vérification locale sans la confondre
  avec une autorisation, un financement, un déploiement ou une observation.

## Exécutée : 2026-09-05T15:13:01Z — relance récurrente

- Projet : `cct`
- Mode : `local-contract-regression`
- Portée synthétique autorisée : `model_internal`
- Amélioration : ajout d'une mutation négative de `CCT-MIN-01` qui refuse le
  retrait de l'opérateur responsable, l'inopérance du refus ou du recours,
  l'absence de contrôle de la qualité de l'eau et toute prétention
  d'autorisation locale.
- Vérification : validateur du contrat valide ; suite Node passe (3 tests).
- Prochaine décision : conserver `CCT-MIN-01` au statut
  `candidate_design_not_authorized` jusqu'à mandat, financement, revue
  indépendante et baseline ; ne pas engager de site ni de service.

## Exécutée : 2026-09-05T14:43:01Z — relance récurrente

- Projet : `cct`
- Mode : `local-contract-regression`
- Portée synthétique autorisée : `model_internal`
- Amélioration : ajout d'une mutation négative de `CCT-SKY-01` qui refuse le
  contournement de l'autorité locale, l'allocation fondée sur l'identité,
  l'inopérance du recours ou de l'arrêt, et la prétention d'un déploiement.
- Vérification : validateur du contrat valide ; suites Ciel et véhicule de
  ressources passent (3 tests chacune).
- Prochaine décision : conserver `CCT-SKY-01` comme architecture écrite ; ne
  pas inférer véhicule, route, financement, déploiement ou effet après choc.

## Exécutée : 2026-09-05T14:13:00Z — relance récurrente

- Projet : `cct`
- Mode : `local-contract-regression`
- Portée synthétique autorisée : `model_internal`
- Amélioration : ajout d'une mutation négative de `CCT-RV-01` qui refuse la
  centralisation financière, la collecte nominative, l'acquisition d'une
  capacité coercitive ou discriminatoire, l'absence de fonds de réparation et
  la prétention d'un effet matériel non établi.
- Vérification : validateur du contrat valide ; suite Node passe (3 tests).
- Prochaine décision : conserver `CCT-RV-01` au statut
  `design_only_no_funds_no_legal_host` jusqu'à l'existence d'attestations
  externes distinctes ; ne pas convertir le contrat en offre ou sollicitation.

## Exécutée : 2026-09-05 — relance manuelle

- Projet : `cct`
- Mode : `local-contract-verification`
- Portée synthétique autorisée : `model_internal`
- Vérifications : contrat CCT-POL 1.1, `CCT-SKY-01` et `CCT-RV-01` valides ;
  leurs suites de tests passent.
- Amélioration : l'état courant consigne désormais les plafonds de statut et
  l'absence explicite de véhicule, fonds, hôte, opérateur, déploiement ou effet
  pour les deux nouveaux artefacts de continuité.
- Prochaine décision : ne pas transformer les validations statiques en offre,
  financement ou essai ; une étape ultérieure exige des attestations externes
  distinctes et la porte de pré-adoption applicable.

- Exécutée : 2026-08-25T20:11:41+00:00
- Projet : `cct`
- Mode : `local-model-verification`
- Portée synthétique autorisée : `model_internal`
- Vérifications sûres : passées quand elles sont déclarées.
- Prochaine décision : Arrêter D10 pour cette passe ; ne rouvrir qu’avec une nouvelle machine d’état fictive et un rival construits indépendamment des 128 résultats, capables de faire perdre D10.
- Blocage : La campagne O1–O4 conclut compatible_survivors : protection supérieure pour D10 dans 70/128 paires et pour le rival dans 2/128, sans aucune dominance de Pareto avec les charges séparées.

Cette routine ne constitue ni une observation nouvelle, ni un changement de statut scientifique.
## Exécutée : 2026-09-05T21:02:29Z — relance récurrente

- Projet : `cct`
- Mode : `local-executable-capacity-candidate`
- Portée synthétique autorisée : `model_internal`
- Lacune traitée : 1.6 rendait visible l'absence d'action admissible quand une
  preuve contestée laissait ouvertes les dettes de droits et d'attribution du
  pouvoir ; elle ne proposait aucune continuité qui les protège simultanément.
- Gain concret : `CCT-EXEC 1.7` sélectionne désormais un pont de continuité à
  deux voies seulement si les voies couvrent toutes les dettes, et ne partagent
  ni contrôleur, ni domaine de panne, ni recours. Il interdit explicitement de
  transformer ce pont en clôture de dette.
- Vérification : trois tests locaux passent ; la confrontation interne tenue à
  l'écart sélectionne le pont indépendant et refuse son imitateur centralisé ;
  le gel CCT-EXEC 1.4 reste valide.
- Prochaine lacune prioritaire : définir quelles observations externes
  distinguent réellement des contrôleurs ou recours seulement déclarés, avant
  toute prétention de disponibilité ou d'effet.
