# Audit des écarts de chaîne de développement Corpus

Date : 2026-09-05
Statut : audit documentaire local. Aucune campagne, aucun test historique et aucun transfert n'ont été relancés ou modifiés.

## Conclusion : `workflow_candidate`

Les trois incidents ne démontrent pas qu'il manque un orchestrateur général, ni que les contrôles existants sont inopérants. Ils révèlent plus étroitement qu'il n'existe pas encore de **contre-revue séparée et attestée du chemin d'acceptation exact** pour les outils locaux nouveaux ou modifiés : chemin de montage effectivement présenté au processus, chemin d'émission du verdict, ou chemin de l'auto-test.

Les composants existent déjà : cadrage des recherches, règles de frontière, tests unitaires, gates de structure, découverte de tests, CI et statuts de changement. Ils ne sont pas composés, pour ces outils de worktree, en une porte qui exige avant une exécution rare ou une déclaration de préparation :

1. l'inspection du chemin terminal qui porte l'affirmation ;
2. un critère d'acceptation observable pour ce chemin ;
3. un test ou auto-test exécuté de ce chemin ;
4. une contre-revue distincte de l'auteur de la modification ;
5. un statut qui n'excède pas la trace obtenue.

Cette conclusion est un **candidat de workflow**, pas une capability, un orchestrateur, une release, ni une instruction d'implémentation. Les trois incidents ne suffisent pas à imposer ce contrat à tout changement Corpus ; ils le justifient seulement pour une modification qui traverse un environnement hôte, transforme une exécution en reçu/verdict, ou introduit un contrôle qui prétend vérifier le dépôt.

## Périmètre et sources

L'audit lit seulement le dépôt local et les traces de travail fournies pour les incidents. Il n'a consulté, téléchargé ni installé aucun skill ou source externe. Le terme « vidéo » n'est connu ici qu'à travers les cinq fonctions nommées dans la demande ; aucune propriété supplémentaire de cette vidéo ne peut donc être attribuée.

Sources principales examinées :

- [`corpus-11-tools/AGENTS.md`](../corpus-11-tools/AGENTS.md) : frontières, distinction test / déploiement / robustesse et discipline de recherche ;
- [`Makefile`](../Makefile) et [`.github/workflows/post-merge-full-validation.yml`](../.github/workflows/post-merge-full-validation.yml) : gates locales et CI déclarées ;
- [`research/scripts/portfolio_cycle.py`](scripts/portfolio_cycle.py) et [`research/AUTOMATION.md`](AUTOMATION.md) : contrôles de portefeuille ;
- [`corpus-11-tools/tools/check_test_inventory.py`](../corpus-11-tools/tools/check_test_inventory.py) : inventaire attesté des tests suivis ;
- [`corpus_labs.independent_replication`](../corpus-11-tools/labs/python/corpus_labs/independent_replication.py), ses [tests](../corpus-11-tools/labs/python/tests/test_independent_replication.py) et sa [documentation](../corpus-11-tools/labs/python/INDEPENDENT_REPLICATION.md) ;
- [`research/scripts/test_foe_001_independent_replication.py`](scripts/test_foe_001_independent_replication.py) et le [reçu Bubblewrap](INDEPENDENT_REPLICATION_BUBBLEWRAP_REOBSERVATION_2026-09-05.md) ;
- [`research/scripts/check_research_inventory.py`](scripts/check_research_inventory.py), [`research/README.md`](README.md) et [`research/active/README.md`](active/README.md).

Le harnais, ses tests et le contrôle d'inventaire sont des fichiers non suivis dans le worktree actuel. Les défauts antérieurs ne possèdent donc pas tous un diff Git conservé. Quand la chronologie n'est établie que par le reçu ou par le récit d'incident, elle est marquée comme telle ; aucune ancienne version de code n'est reconstituée comme un fait.

## Mécanismes déjà présents

| Mécanisme local | Ce qu'il couvre réellement | Ce qu'il ne prouve pas ici |
| --- | --- | --- |
| `AGENTS.md` | frontière produit/recherche, refus de confondre test, déploiement et robustesse | qu'un chemin précis a été testé ou relu séparément |
| `Makefile` et CI | structure, tests Python/Node, portefeuille, CCT et installation propre quand les commandes sont lancées sur le tree concerné | qu'un outil non suivi est inscrit dans une gate, ou qu'un hôte de développement autorise Bubblewrap |
| `portfolio_cycle.py --check --run-safe-checks` | contrat des dossiers actifs et liste explicite de tests sûrs | le harnais, le reçu post-exécution ou `check_research_inventory.py` : ils ne figurent pas dans `SAFE_CHECKS` |
| `check_test_inventory.py` | dérive silencieuse des surfaces de tests **suivies et attestées** | les nouveaux tests non suivis avant leur entrée explicite dans l'inventaire |
| tests unitaires du harnais et de FOE | les comportements couverts par le fichier courant, y compris les deux régressions réparées | que ces tests existaient et avaient été exécutés avant chacun des incidents |
| reçu Bubblewrap | une exécution locale précise sur l'hôte Ubuntu indiqué, avec `process_isolation_exercised` | une généralisation à Codex, à d'autres hôtes, ou une indépendance externe |

La CI est une garde de dépôt, non une preuve d'une contre-revue humaine ou indépendante. Aucune trace locale ne montre qu'un reviewer distinct a validé les trois changements avant leur première exécution. L'absence de cette trace ne permet pas d'affirmer qu'aucune lecture humaine n'a eu lieu ; elle interdit de l'inscrire comme contrôle observé.

## Incident 1 — destination `/lib64` perdue sur hôte merged-/usr

| Étape | Reconstruction |
| --- | --- |
| Demande | Le backend Bubblewrap devait être fermé, sans fallback, réseau désactivé, et limité à `independence_unknown`. La reprise autorisée demandait explicitement l'état corrigé « source hôte résolue / destination invitée lexicale ». |
| Conception | Le contrat correct doit distinguer la source hôte résolue, utilisée pour valider et ouvrir le bind, de la destination invitée lexicale demandée par le runtime. Réduire les deux à `Path.resolve()` détruit cette distinction si `/lib64` renvoie vers `/usr/lib64` sur merged-/usr. |
| Code | Le code courant formalise cette paire par `RuntimeMount(host_path, guest_path)`. `_validate_runtime_mounts` résout seulement la source ; `build_bubblewrap_command` émet `--ro-bind host_path guest_path`. Le code fautif antérieur n'est pas conservé dans Git : son mécanisme est inféré du correctif et du reçu, jamais présenté comme un diff historique. |
| Tests | Le test courant `test_runtime_mounts_keep_lexical_guest_paths_for_merged_usr_layouts` vérifie `/usr`, `/lib` et `/lib64` avec une source résolue et une destination lexicale. Le reçu atteste ensuite 15 tests génériques, dont le test Bubblewrap réel, depuis le Terminal Ubuntu. |
| Revue | Aucun reçu de contre-revue distincte n'est conservé avant la correction. Les checks de structure ne peuvent pas déduire la sémantique du chemin invité de la seule présence de `--ro-bind`. |
| Exécution | Le reçu du 2026-09-05 conserve la commande corrigée : `--ro-bind /usr/lib64 /lib64`, ainsi que `--unshare-net` et une sortie FOE concordante. Cela atteste une isolation de processus locale sur cet hôte seulement. |
| Détection | L'incident et sa correction sont établis par la consigne de reprise et le reçu. Aucun log de l'échec initial de montage n'est archivé : sa date et son symptôme exact ne sont pas réobservables. |

**Détection la plus précoce.** À la conception, en modélisant le montage comme `(source_hôte_résolue, destination_invitée_lexicale)` ; au plus tard, dans un test de commande avec layout merged-/usr. Ce test existe désormais.

**Qualification.** Test ciblé manquant au moment de la faute ; problème propre au runtime Linux/Bubblewrap ; contre-revue indépendante non observée ; règle de statut pertinente mais insuffisante pour ce cas ; absence d'orchestration seulement partielle, car aucun passage ne demandait explicitement l'inspection hôte/invité avant l'exécution rare.

## Incident 2 — appel de `_attestation` sans instance après l'exécution

| Étape | Reconstruction |
| --- | --- |
| Demande | Une soumission FOE-001 gelée devait produire un reçu d'isolation observable. Après incident, la correction a été bornée à l'appel d'attestation, son test unitaire devait précéder toute reprise, et une seule reprise identique a été autorisée. |
| Conception | L'exécution du sous-processus et l'émission de son attestation sont deux maillons : un sous-processus réussi n'est pas un résultat si le reçu et le verdict ne peuvent pas être émis. L'aide devait être appelable sans instance `unittest.TestCase`. |
| Code | Le fichier courant rend `_attestation` `@staticmethod`. Le reçu conserve le défaut antérieur : `TypeError: ... missing 1 required positional argument: 'self'`. |
| Tests | `test_attestation_helper_is_callable_without_a_test_instance` appelle `type(self)._attestation(...)`, sans lancer FOE-001. C'est le test ajouté avant la reprise ; les 15 contrôles génériques ont ensuite été rejoués. |
| Revue | Aucun artefact n'atteste une revue distincte du chemin « exécution → capture → attestation → verdict » avant la première tentative. |
| Exécution | La première tentative a exécuté la soumission, mais a échoué avant trace et verdict : elle ne compte pas comme observation. La reprise unique a produit `process_isolation_exercised`, `matching_output` et `independence_unknown`. |
| Détection | Le `TypeError` est conservé dans le reçu Bubblewrap. La détection est tardive : l'opération rare avait déjà eu lieu sans observable utilisable. |

**Détection la plus précoce.** À l'écriture du helper, par un test d'appel au même niveau d'indirection que le collecteur de reçu, sans FOE-001. Une contre-revue de ce chemin terminal aurait aussi relevé l'incohérence méthode d'instance / appel sans instance.

**Qualification.** Test manquant au moment de la faute ; contre-revue indépendante non observée ; la règle existante a été correctement appliquée après coup en refusant de compter l'exécution sans verdict ; défaut Python d'interface, non problème FOE ; absence d'orchestration partielle, car le workflow n'exigeait pas d'exécuter le reçu avant l'opération gelée.

## Incident 3 — fixture d'auto-test : liste au lieu d'ensemble

| Étape | Reconstruction |
| --- | --- |
| Demande | Après la maintenance de l'Atlas, un contrôle documentaire minimal devait vérifier inclusions/exclusions déclarées et contradictions littérales, sans décider un statut scientifique. |
| Conception | `coverage_errors` reçoit trois ensembles et applique `governed & excluded`, différences et union. La fixture d'exclusion doit donc être un `set[str]`. |
| Code | Le code courant emploie `set()` dans le cas négatif de `self_test`. L'incident rapporté était `[]`, incompatible avec `set & list`; la version fautive n'est pas conservée dans Git car le script est non suivi. |
| Tests | `self_test()` couvre une couverture complète, un chemin manquant et une contradiction littérale. Son premier lancement a produit `TypeError: unsupported operand type(s) for &: 'set' and 'list'`; après `[]` → `set()`, l'auto-test et le contrôle réel ont passé selon la trace de travail. |
| Revue | Aucune trace d'une contre-revue distincte de cette fixture n'est disponible. |
| Exécution | La défaillance est survenue dans l'auto-test local, avant toute recherche, résultat scellé ou release. |
| Détection | Elle est directe au premier `--self-test`. Aucun reçu séparé n'a été conservé, mais le mécanisme actuel porte le test ciblé. |

**Détection la plus précoce.** Immédiatement après l'écriture du contrôle, en lançant son auto-test. Le mécanisme était déjà suffisant : la dérive vient de son exécution tardive, non de l'absence d'un nouveau framework.

**Qualification.** Règle/test existant non appliqué assez tôt ; pas de test manquant pour ce symptôme précis ; contre-revue indépendante non observée mais non nécessaire après exécution de l'auto-test ; défaut Python local, non problème de domaine ; trou d'orchestration limité à l'absence d'une attestation que l'auto-test a été lancé avant de présenter ce contrôle comme protection.

## Comparaison bornée avec les cinq fonctions nommées

| Fonction nommée | Couverture actuelle observée | Écart révélé |
| --- | --- | --- |
| Cadrage | Fort pour les recherches : protocoles gelés, règles d'arrêt, reçus et limites. | Partiel pour les petits changements d'outillage : aucune fiche courte obligatoire ne fixe le chemin terminal, son observable et son test avant une exécution rare. |
| Direction visuelle | Non applicable : aucun incident ne porte une interface visuelle, maquette ou sortie graphique. | Aucun écart ne peut être inféré. L'étendre à la direction visuelle serait une invention hors preuve. |
| Orchestration complète | Partiellement couverte par `Makefile`, CI, `portfolio_cycle.py`, inventaire de tests et statuts. | Ils ne relient pas systématiquement un nouveau fichier de worktree, son test ciblé, une contrainte d'hôte et la revue du reçu. Le harnais et le contrôle d'inventaire ne sont pas dans `SAFE_CHECKS`; les tests non suivis ne sont pas encore une surface attestée de `check_test_inventory.py`. |
| Finition d'interface | Non applicable au sens UI. Au sens de contrat de code, les commandes Bubblewrap, l'attestation et `coverage_errors` sont des interfaces. | Les trois défauts sont des défauts de finition d'interfaces non visuelles : destination invitée, liaison de méthode, type de fixture. Aucun contrôle commun ne demande de relire leur usage réel de bout en bout. |
| Contre-revue du code | Les gates automatisées apportent une revue mécanique lorsqu'elles sont exécutées. | Aucune exigence ni trace de contre-revue séparée du diff face aux critères d'acceptation n'existe pour ces trois changements. CI et auto-test ne sont pas une passe distincte. |

Cette comparaison est fonctionnelle, non une équivalence avec la vidéo. Elle n'autorise aucune nouvelle interface ni un « workflow complet » généralisé à partir de trois défauts locaux.

## Diagnostic transversal

Les causes immédiates sont distinctes : lien Linux, appel Python, type de fixture. Elles convergent uniquement sur le **dernier maillon qui transforme le code modifié en affirmation vérifiable**.

| Question | Réponse appuyée par les traces |
| --- | --- |
| Les règles Corpus sont-elles absentes ? | Non. Elles bornent les conclusions et ont empêché de compter une exécution sans verdict comme observation. |
| Les tests sont-ils absents ? | Non. Deux tests ciblés existent désormais et l'auto-test a attrapé le troisième défaut. Les deux premiers montrent un test ciblé absent avant incident ; le troisième, un test non exécuté assez tôt. |
| Une revue indépendante est-elle établie ? | Non. Aucun artefact inspecté ne l'atteste. Cela ne prouve pas qu'aucune lecture humaine n'a eu lieu. |
| Les causes sont-elles du même domaine ? | Non. Une seule dépend du runtime Linux/Bubblewrap. Elles ne justifient pas une abstraction de domaine ou un moteur. |
| Existe-t-il un trou d'orchestration réel ? | Oui, mais étroit : aucun contrat commun, déclenché seulement pour les frontières critiques, ne relie critère terminal, test exécuté, contre-revue distincte et statut observable. |

Limites maintenues : l'exécution Bubblewrap ne vaut que pour l'hôte Ubuntu consigné et ne rend pas `independence_unknown` plus fort ; une projection locale n'est pas un sandbox ; le contrôle d'inventaire ne décide aucun état scientifique ; un test vert n'est ni publication ni installation.

## Contrat minimal proposé — non implémenté

Ce contrat ne doit être ouvert qu'après décision séparée et seulement lorsqu'un changement traverse un environnement hôte, transforme une exécution en reçu/verdict, ou introduit un contrôle auto-déclaré.

1. **Inspection** — lister le chemin concerné, les artefacts touchés, le contexte d'exécution et les limites qui empêchent son observation locale.
2. **Critères d'acceptation** — déclarer avant le changement les observables terminaux, cas négatifs et condition d'arrêt ; distinguer contrat, exécution réelle et réobservation.
3. **Implémentation** — modifier le plus petit périmètre nécessaire, sans déplacer une règle de recherche vers le produit.
4. **Tests** — exécuter le test ciblé du chemin terminal et les contrôles pertinents ; une indisponibilité d'hôte reste `unavailable`/`skipped`, jamais un succès simulé.
5. **Contre-revue séparée** — une passe distincte confronte le diff aux critères, vérifie l'interface effectivement utilisée et consigne les lacunes non observables ; elle ne détermine aucun statut scientifique.
6. **Vérification observable** — ne lancer une opération gelée ou unique que si les étapes précédentes sont attestées ; conserver commande, entrées, résultat et absence de trace lorsqu'il y en a une.
7. **Statut exact** — rapporter séparément `proposé`, `écrit`, `testé`, `exécuté` ou `non exécutable ici`, `intégré`, `réobservé`; ne jamais substituer un état au suivant.

Condition de retrait du candidat : ne pas le créer si les contrôles actuels ont déjà produit l'observable requis, si l'incident n'est pas à frontière critique, ou si une future occurrence ne montre pas que cette passe aurait changé la décision. Il ne remplace ni protocoles de recherche, ni gates de release, ni tests spécifiques, ni revue de sécurité spécialisée.

## États de cet audit

- **Proposé** : audit des trois incidents fournis.
- **Écrit** : ce document uniquement.
- **Testé** : les sources et traces existantes ont été croisées ; aucun test n'a été relancé, conformément au périmètre d'audit.
- **Exécuté** : aucune campagne, soumission FOE ou contrôle historique n'a été exécuté par cet audit.
- **Intégré / publié / installé** : non applicable ; aucune capability, orchestration ou release n'a été créée.
- **Réobservé** : les limites et résultats déjà consignés ont été relus ; la réobservation dynamique Bubblewrap reste celle du Terminal Ubuntu décrite dans son reçu, et non une nouvelle observation réalisée ici.
