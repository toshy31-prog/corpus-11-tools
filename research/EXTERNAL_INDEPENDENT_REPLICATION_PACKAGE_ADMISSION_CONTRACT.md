# Contrat d'admission d'un paquet externe de réplication

Statut : contrat documentaire de réception. Il n'est ni un protocole
scientifique, ni un fixture, ni une preuve d'indépendance, ni une autorisation
de transfert ou d'intégration produit.

Ce contrat réutilise sans les modifier :

- le motif manifeste puis scellement préalable de la campagne FOE-001 ;
- `corpus-independent-replication-package/v1` ;
- `corpus-independent-replication-output-contract/v1` ;
- `corpus-independent-replication-attestation/v1` ;
- `run_projected_submission`, `run_isolated_submission` et
  `evaluate_replication` de `corpus_labs.independent_replication`.

Aucun moteur, dépendance, cas, fixture ou verdict scientifique nouveau n'est
introduit.

## 1. Portée de l'admission

L'admission vérifie qu'un paquet externe peut être reçu, gelé, exécuté et
comparé par les harnais existants dans un périmètre déclaré. Elle sépare :

1. la conformité matérielle du paquet ;
2. l'exécution locale effectivement observée ;
3. l'accord, l'écart ou l'incomplétude des sorties ;
4. la provenance déclarée et ses inconnues ;
5. l'indépendance, que ce contrat et les harnais locaux ne certifient jamais.

Un paquet admis reste dans `research/`. Son admission ne vaut ni transfert
accepté, ni modification du produit, ni publication, ni installation.

## 2. Liste fermée des artefacts

Avant toute exécution, le répertoire reçu contient exactement :

1. `pre_execution_manifest_v0.1.json` ;
2. `pre_execution_seal_v0.1.json` ;
3. `frozen_package.json`, conforme à
   `corpus-independent-replication-package/v1` ;
4. `output_contract.json`, conforme à
   `corpus-independent-replication-output-contract/v1` ;
5. les fichiers d'entrée nommés par `frozen_package.json.inputs` ;
6. les fichiers d'implémentation nommés par
   `pre_execution_manifest_v0.1.json.implementation_files`.

Cette union est exhaustive. Chaque chemin est relatif, unique, sans `..`, et
désigne un fichier régulier sous la racine du paquet. Les répertoires, liens
symboliques, fichiers temporaires, caches, sorties préexistantes, tests,
adaptateurs, données ou dépendances non énumérés sont refusés.

Les cas et attentes appartiennent aux entrées gelées. Ils doivent être fournis
et attribués par leur auteur déclaré, ou fournis et attribués par la recherche
receveuse. Corpus ne crée, ne complète et ne corrige aucun cas au nom du
contributeur externe. Une contribution qui revendique des cas propres mais ne
les fournit pas reste incomplète et n'est pas exécutée.

Après exécution, les seuls artefacts ajoutés hors du paquet scellé sont :

1. la sortie JSON au chemin déclaré ;
2. l'attestation `separate` conforme à
   `corpus-independent-replication-attestation/v1` ;
3. le rapport produit par `evaluate_replication` ;
4. un reçu d'admission qui référence les trois empreintes précédentes et la
   décision de réception.

Le paquet scellé lui-même n'est jamais modifié pour y ranger ces résultats.

## 3. Manifeste préalable

Le manifeste reprend la structure FOE-001 et contient obligatoirement :

- `schema` : identifiant documentaire du présent contrat et version `v0.1` ;
- `submission_id` : identifiant non vide et stable de la soumission ;
- `execution_limit` : entier égal à `1` ;
- `runtime` : implémentation, version exacte et plateforme déclarées ;
- `artifacts` : liste exhaustive avec `id`, `role`, `path` et `sha256` de
  chaque artefact pré-exécution ;
- `implementation_files` : liste exacte des sources à projeter ;
- `command` : tableau fermé de jetons, avec seulement les substitutions
  `{input:ID}` et `{output}` prévues par le harnais ;
- `output_path` : chemin JSON relatif attendu ;
- `execution_mode` : `staged_local_projection` ou
  `bubblewrap_process_isolation` ;
- `runtime_mounts` : liste vide en projection locale, ou liste exhaustive des
  chemins runtime pour Bubblewrap ;
- `reference_source_files` : liste exhaustive des sources de référence que la
  soumission ne doit ni contenir ni monter ;
- `declared_input_ids` : exactement les identifiants autorisés par
  `frozen_package.json.allowed_input_ids` ;
- `declared_dependencies` : identifiants et empreintes SHA-256 au format
  attendu par l'attestation du harnais ;
- `provenance` : passeport défini à la section suivante ;
- `limitations` : inconnues, dépendances communes possibles et portée de la
  conclusion ;
- `decision_rule` : renvoi aux contrôles et refus du présent contrat.

`artifacts` contient aussi les empreintes de `frozen_package.json`,
`output_contract.json`, de toutes les entrées et de tous les fichiers
d'implémentation. Deux identifiants ou deux chemins identiques sont interdits.
Un artefact absent de cette liste est non autorisé.

## 4. Champs de provenance

Le contributeur remplit lui-même chaque champ. Une information inconnue prend
la valeur explicite `unknown` ; elle n'est jamais déduite, complétée ou changée
en déclaration positive par le receveur.

Le bloc `provenance` contient :

- `contributor_identity` : personne ou collectif tel qu'il se déclare ;
- `institution` : affiliation ou `none` ;
- `mandate` : rôle et portée de la contribution ;
- `funding_and_interests` : financement, propriété, alliances et conflits
  déclarés, ou `unknown` ;
- `authorship_scope` : fichiers et parties revendiqués comme écrits par le
  contributeur ;
- `creation_date_utc` et `submission_date_utc` ;
- `source_origin` : dépôt, archive ou autre origine, avec URL ou identifiant,
  révision et empreinte quand ils existent ;
- `upstream_reuse` : données, code, générateurs, modèles, protocoles,
  hypothèses et bibliothèques réutilisés ;
- `consulted_inputs` : fichiers et documents effectivement consultés ;
- `reference_code_access` : `true`, `false` ou `unknown` ;
- `reference_output_access` : `true`, `false` ou `unknown` ;
- `case_authorship` : pour chaque cas gelé, identifiant, auteur déclaré,
  origine, date, empreinte et matériaux consultés ;
- `expectation_authorship` : mêmes champs pour les attentes comparées ;
- `implementation_language` et `runtime_version` ;
- `third_party_packages` : nom, version, origine et empreinte, ou liste vide ;
- `execution_operator` : identité déclarée de l'opérateur ;
- `execution_environment` : système, architecture et mécanisme d'exécution ;
- `known_shared_dependencies` : dépendances, données, auteurs, institutions,
  financements, outils ou environnements communs connus ;
- `unknown_lineage` : maillons que le contributeur ou le receveur ne peut pas
  établir ;
- `contest_contact` : canal par lequel le contributeur peut corriger ou
  contester la lecture de sa provenance.

Une déclaration de non-accès est conservée comme déclaration. Elle ne prouve
ni l'absence d'accès, ni l'indépendance de l'auteur, des idées, du code, de
l'environnement ou des dépendances.

## 5. Scellement avant exécution

L'ordre est obligatoire :

1. le contributeur remet tous les artefacts et sa provenance ;
2. le receveur refuse toute lacune au lieu de la remplir ;
3. le receveur calcule les SHA-256 des octets exacts de chaque fichier ;
4. le manifeste final énumère l'ensemble fermé et les conditions d'exécution ;
5. `pre_execution_seal_v0.1.json` est créé avec `manifest_path`,
   `manifest_sha256`, `status: sealed_before_execution`,
   `execution_limit: 1`, `sealed_at_utc`, `sealed_by` et les interdictions ;
6. l'absence de sortie et de reçu antérieurs est constatée ;
7. une seule exécution est autorisée.

Les interdictions du sceau sont au minimum : aucune modification des entrées,
des cas, des attentes, de la commande ou du contrat de sortie après scellement ;
aucun ajout d'artefact ; aucun remplacement silencieux de dépendance ; aucune
conclusion d'indépendance externe ; aucune intégration produit.

Le sceau porte l'empreinte des octets du manifeste, comme FOE-001. Il établit
la relation entre l'état gelé et le reçu ultérieur ; à lui seul, il ne prouve
ni la date externe, ni l'auteur, ni l'indépendance. Toute correction exige un
nouveau `submission_id`, un nouveau manifeste et un nouveau sceau avant une
nouvelle exécution autorisée.

## 6. Tests d'admission

Les contrôles sont exécutés dans cet ordre et s'arrêtent au premier refus de
contrat :

1. **Ensemble fermé** : la liste réelle des fichiers est exactement celle du
   manifeste ; aucun fichier caché, lien, cache ou résultat préalable.
2. **Sceau** : chemin, schéma documentaire, empreinte du manifeste, statut et
   limite d'exécution concordent.
3. **Empreintes** : chaque artefact correspond au SHA-256 déclaré.
4. **Paquet gelé** : `validate_frozen_package` accepte
   `frozen_package.json` et sa liste blanche nomme exactement toutes ses
   entrées.
5. **Contrat de sortie** : `validate_output_contract` accepte
   `output_contract.json`; chaque chemin comparable est un JSON Pointer
   unique et non vide.
6. **Provenance** : tous les champs obligatoires sont présents ; les inconnues
   restent `unknown` et tous les cas et attentes ont un auteur déclaré.
7. **Sources et commande** : les sources projetées, la commande, le chemin de
   sortie et les sources de référence correspondent exactement au manifeste.
8. **Exécution bornée** : appeler uniquement `run_projected_submission` ou
   `run_isolated_submission` selon le mode scellé. Bubblewrap indisponible ou
   refusé produit `isolation_unavailable`; aucun repli automatique vers la
   projection locale.
9. **Attestation** : construire l'attestation `separate` avec rôle,
   environnement, entrées déclarées et observées, dépendances déclarées et
   observées, sortie et `output_sha256`; `validate_attestation` doit l'accepter.
10. **Comparaison** : `evaluate_replication` compare uniquement les chemins
    scellés et conserve les différences, chemins manquants, dépendances
    communes et divergences d'empreinte.
11. **Invariant d'indépendance** : le rapport contient exactement
    `independence_verdict: independence_unknown`, quels que soient l'accord des
    sorties ou l'exercice local de Bubblewrap.
12. **Reçu** : le reçu référence le manifeste, le sceau, l'attestation, la
    sortie et le rapport par empreinte, sans modifier les objets scellés.

Ces tests portent sur le contrat de réception. Aucun cas scientifique négatif
ou positif n'est ajouté par Corpus au nom du contributeur. Les tests propres à
la contribution ne sont exécutés que s'ils ont été fournis, attribués,
énumérés et scellés avant l'exécution.

## 7. Motifs de refus

Le paquet est refusé avant exécution si l'un des faits suivants est observé :

- artefact obligatoire absent, artefact supplémentaire ou liste non fermée ;
- chemin absolu, échappement de racine, lien symbolique ou fichier irrégulier ;
- manifeste ou sceau absent, invalide, postérieur à une sortie connue ou dont
  l'empreinte ne concorde pas ;
- limite d'exécution différente de `1` ou exécution antérieure non déclarée ;
- entrée, protocole, fixture, cas, attente, source ou contrat modifié après le
  scellement ;
- entrée absente de la liste blanche ou entrée observée non déclarée ;
- dépendance observée absente ou différente de sa déclaration ;
- runtime réel différent du runtime scellé ;
- provenance obligatoire absente, complétée par le receveur, contradictoire ou
  cas/attente attribué au contributeur sans déclaration de celui-ci ;
- source de référence incluse dans la soumission ou montage exposant paquet,
  dépôt, répertoire utilisateur, sources ou référence ;
- commande, source, sortie ou montage différent du manifeste ;
- demande de fallback silencieux après `isolation_unavailable` ;
- revendication `independent`, `externally_independent` ou équivalente produite
  par ce contrat ou présentée comme verdict du harnais.

Après une exécution contractuellement valide :

- sortie absente, non JSON ou empreinte fausse : refus de l'exécution ;
- chemin comparable manquant : `incomplete_output`, réplication locale non
  établie ;
- valeur comparable différente : `divergent_output`, divergence conservée et
  réplication locale non établie ;
- code de référence accessible : `reference_code_accessible`, réplication
  locale non établie ;
- dépendance commune : elle reste visible dans le rapport et interdit toute
  promotion automatique de l'indépendance ;
- Bubblewrap indisponible : `isolation_unavailable`, sans succès simulé et
  sans repli ;
- accord des sorties sous projection ou Bubblewrap : seulement
  `local_replication_agrees` ou `isolated_local_replication_agrees` selon le
  rapport existant.

`independence_unknown` n'est pas un motif de refus : c'est la borne obligatoire
du contrat. En revanche, toute tentative de le convertir en preuve positive
d'indépendance est un motif de refus de la conclusion.

## 8. Décision et frontière de transfert

Le reçu d'admission conclut seulement l'un des états suivants : paquet refusé
avant exécution, exécution indisponible, exécution refusée, réplication locale
non établie, ou verdict local exact du rapport existant.

La plus forte conclusion admise par ce contrat est qu'une soumission externe
déclarée a été exécutée dans le périmètre scellé et que ses sorties concordent
localement sur les chemins comparables. Le verdict d'indépendance reste
toujours `independence_unknown`.

Toute proposition ultérieure de transfert doit être portée par un artefact
distinct sous `transfers/`, avec autorisation et validations produit séparées.
