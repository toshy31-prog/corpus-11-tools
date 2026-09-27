# État local de Corpus — 27 septembre 2026

## 27 septembre — première chaîne agentique bornée vérifiée

L’épreuve locale durable `ses_f1f8db498ffeHEKBAr9yuiVmFt` a terminé après
**334,172 secondes**. Ses reçus établissent, dans l’ordre : lecture du contexte,
lecture de la copie de travail, édition de cette copie uniquement, puis la
commande exacte `test_budget.py` terminée avec le code 0 et
`MIGRATION_SMOKE_PASS`. La réponse cite bien la décision locale : aucun modèle
distant ni contournement de l’isolation réseau. La copie contient désormais
`fits_context`; aucun autre fichier n’a été édité par ce tour.

La chaîne `intention → lecture → édition → test → reçu` est donc validée pour
ce scénario étroit, via `.migration-smoke/durable-e2e-20260927.json` et
`durable-e2e-verdict.json`. Elle ne valide ni une autonomie générale, ni la
qualité de toutes les réponses, ni une latence acceptable : 334 secondes pour
ce travail court restent un problème de performance. L’accusé de réception
asynchrone HTTP 204 a été pris à tort pour une erreur par la première version
du lanceur, sans doublon d’envoi ; ce classement est corrigé pour la suite.
Le détail mesuré et les pistes non activées sont dans
[PERFORMANCE_E2E.md](PERFORMANCE_E2E.md) ; une synthèse sans transcript est
consultable dans Paramètres → Statistiques.

## 27 septembre — épreuve agentique, reçu absent après 202 secondes

Une unique session bornée `read/edit/bash` a créé son message et une entrée
assistant vide. Le transcript OpenCode enregistre zéro token et zéro outil,
mais le journal llama-server établit une réponse Qwen HTTP 200 après **202,08
secondes**. La réponse n’a pas été reçue ni transformée en reçu agentique avant
l’arrêt contrôlé : aucune chaîne agentique ou résultat de tâche n’est déclaré.
La copie de test, le contexte et la source sont intacts. Les reçus sont dans
`.migration-smoke/bounded-e2e-latest.json` et `bounded-e2e-verdict.json`.

## 27 septembre — vérification du travail reliée à la conversation

Le menu d’un chat propose désormais « Vérifier le travail effectué ». Pour le
seul exercice local de migration défini, cette action lit les reçus du dernier
tour, vérifie séparément l’état actuel de la copie de travail et affiche les
étapes strictement manquantes. Elle ne relance ni commande, ni test, ni modèle,
et ne juge pas la qualité de la réponse. Le parcours UI et l’endpoint ont été
contrôlés sur un historique interrompu ; aucune preuve d’exécution complète
n’est donc déclarée. Détails et limites : [WORKFLOW_VERIFICATION.md](WORKFLOW_VERIFICATION.md).

## 27 septembre — suivi continu de la fiabilité agentique

Les statistiques locales distinguent maintenant, par demande, le dernier état
assistant normal, interrompu/en erreur ou incomplet. La source est la base
OpenCode locale en lecture seule et aucun texte de conversation n’est affiché.
Cette mesure ne prouve pas la qualité des réponses ni l’effet d’un outil ; elle
rend visibles les échecs à réduire avant toute autonomie plus large. Voir
[AGENT_RELIABILITY.md](AGENT_RELIABILITY.md).

## 27 septembre — périmètre d’outils réduit avant l’envoi

Le profil « Outils · automatiques » ne transmet plus tout le catalogue par
défaut. Le navigateur détermine immédiatement un périmètre minimal à partir de
mots explicites : aucun outil, lecture/exploration, lecture/édition/test, puis
recherche ou mémoire lorsqu’elles sont demandées. Les profils manuels restent
prioritaires. Cette étape ne lance ni modèle, ni outil, ni requête réseau et ne
modifie aucune autorisation ; les brouillons et la file restent locaux. Les
messages planifiés, qui ne passent pas par le composeur, reçoivent eux aussi un
masque explicite sans outil ; le warmup KV désactivé suit la même règle s’il est
réactivé. Les tests de file, pièces jointes et envois concurrents passent. Le
gain de latence reste à mesurer sur une épreuve Qwen séparée. Détails :
[AUTO_TOOL_SCOPE.md](AUTO_TOOL_SCOPE.md).

L’inventaire des quatre voies d’inférence locale (composeur, échéance, warmup,
chat temporaire) est consigné dans cette même note. Il sépare le périmètre
d’outils réellement transmis des résultats de performance encore à mesurer.

## 27 septembre — contournement CUDA et conservation du cache

À la demande de résolution : fusion CUDA désactivée pour Qwen via environnement
llama-swap ; conservation après usage portée de cinq à trente minutes.
Accélération GPU et modèle inchangés. Réglages reliés au panneau des ressources.
Service redémarré avec warmup off et sessions inactives ; configuration générée,
santé et API vérifiées. Aucun appel de modèle : **panne non déclarée résolue,
gain de vitesse non mesuré**. Détails, sources et retour arrière dans
[DIAGNOSTIC_PREFILL.md](DIAGNOSTIC_PREFILL.md).

## 27 septembre — protection contre les étapes rejouées

Garde `inference_guard.mjs` ajoutée avant les requêtes du fournisseur local :
refus des reprises d’une étape déjà commencée et des continuations après fin
anormale du même tour. File du site mise en pause sur erreur, brouillons conservés.
Contrôles hors inférence réussis ; service redémarré inactif, warmup off, santé
ready et configuration déclarant la garde observées. L’ancien échec apparaît
en pause dans le navigateur. Aucun appel Qwen ni gain de vitesse mesuré ; CUDA
et le prefill restent non résolus. Portée, sources et retour arrière dans
[INFERENCE_GUARD.md](INFERENCE_GUARD.md).

Objectif : établir tout l’Organisme Corpus sur sa machine, avec continuité des projets, mémoire, méthodes, création, action et maintenance. Le fonctionnement local reste compatible avec une intervention de Codex sur les sources. Aucun repli d’inférence distant ajouté.

## Matériel et implantation

Observés : Intel i7-13620H, 16 processeurs logiques, environ 32 Go RAM, RTX 4070 Laptop 8188 Mio VRAM. Dépôt local : /home/olivier/Documents/ChatGPT/Corpus ; remote configuré : https://github.com/toshy31-prog/corpus-11-tools.git (pas de vérification distante ni publication).

Le contrat sépare runtime, modèles HOT, toolchains, données, état, caches et configuration. Le Vault configuré est /media/olivier/KINGSTON/CorpusVault. Les contrôles présents n’équivalent pas à une restauration complète.

## Runtime rétabli

Les deux modèles retrieval occupaient 2642 + 3026 Mio GPU malgré -ngl 0. Qwen échouait à allouer 5861,76 Mio. Le correctif --device none pour embedding/reranker est activé après redémarrage autorisé. Les deux endpoints répondent HTTP 200 sans processus GPU associé ; Qwen a ensuite répondu CPU_OK. Configuration principale et contexte 16384 conservés.

Preuve : [.migration-smoke/activation-validation.json](.migration-smoke/activation-validation.json). Un test unitaire vérifie la configuration générée. Ce résultat ne valide pas encore un travail complet avec outils.

## Implantation : contrôles exécutés

- python3 scripts/corpus doctor --json : 44 PASS, aucun WARN/FAIL.
- python3 scripts/corpus drift --json : aucune dérive reconnue.
- python3 scripts/corpus coverage --gaps-only --json : deux écarts.
- python3 scripts/corpus gc --dry-run --json : aucune proposition de nettoyage.

Écarts conservés sans déplacement ni suppression :

1. RUNTIME/corpus-local/logs : captures du routage et des payloads, à traiter comme preuves locales de diagnostic ; ne pas publier les payloads bruts.
2. STATE/backups : sauvegardes tool-router-v6, tool-router-v61 et retrieval-residency-v9 ; leur rôle de restauration doit entrer dans le registre de cycle de vie.

Preuves : [.migration-smoke/establishment-checks.json](.migration-smoke/establishment-checks.json). Une absence de dérive connue ne signifie pas absence de tout défaut ; les deux écarts de couverture restent visibles.

## Épreuve arrêtée : limite de temps

Une épreuve bornée demande au modèle de lire une décision existante, modifier une copie temporaire de runtime_limits.py, puis exécuter son test. Aucun succès déclaré ; cette seule session a été arrêtée avant le premier appel d’outil pour respecter le temps disponible. L’envoi a dépassé le timeout de 15 secondes du client de test pendant le routage (16,98 secondes observées) ; la requête est bien arrivée et n’a pas été renvoyée.

Le bilan de migration globale demeure partiel. Les médias, documents, historique et scheduler disposent de validations datées à conserver ; les champs historiques de state.json ne doivent pas être pris pour un inventaire actuel exhaustif.

## Classement des sauvegardes

STATE/backups est désormais déclaré dans CORPUS_LIFECYCLE.json, sous la responsabilité recovery-manager : sauvegardes et preuves préalables aux changements, à conserver tant que leur remplacement n’a pas de restauration vérifiée. Cette déclaration documente le rôle ; elle ne crée pas un nouveau mécanisme de suppression/protection. Aucun fichier déplacé.

Les 13 tests de test_corpus_control.py passent. Le contrôle coverage rejoué conserve un écart : les captures sous RUNTIME/corpus-local/logs. Elles restent présentes et explicitement non résolues.

## Limite de confort observée

La requête a exposé dix outils (dont SSH et écriture mémoire superflus pour cet essai). Le journal Qwen indique environ 10,3 tokens/s et 1536 tokens traités pour 27 % du prompt : environ 5700 tokens d’entrée estimés. L’ordre de grandeur de neuf minutes avant génération est une extrapolation, pas une latence finale mesurée. L’épreuve est arrêtée avant tout outil ; copie et original inchangés. Le routeur V5.5 n’a pas été modifié. Résultat : .migration-smoke/end-to-end-result.json.

Prochaine étape ciblée : réduire ce coût des tâches avec outils, sans supprimer les capacités, puis reprendre cette même épreuve jusqu’à son effet vérifié.

## Candidat de réduction du contexte

COMPACT_TOOL_DESCRIPTIONS.md décrit un hook OpenCode facultatif testé sur le payload provider : −44,34 % de caractères dans les définitions, −28,22 % dans la requête complète, mêmes dix outils et mêmes paramètres. Activé pour une épreuve bornée puis désactivé : tâche incomplète, maintien de la qualité et gain de latence non démontrés. Recherche récente consultée et choix sourcés dans cette note.

## Épreuve réelle du mode compact et retour arrière

Activation autorisée, puis une seule épreuve Qwen locale : lire la décision concernant les modèles distants, modifier uniquement une copie de runtime_limits.py et exécuter son test. Première entrée : 4225 tokens ; cache réutilisé aux étapes suivantes. Le modèle a effectué deux lectures, un glob et une lecture supplémentaire de DECISIONS.md. Il a affirmé ne pas avoir trouvé la décision pourtant présente dans CONTEXTE_LOCAL.md, lignes 17–18.

La borne configurée de vingt minutes a été atteinte (1219,51 s observées, routage et sondages inclus) sans modification ni exécution du test. Un appel edit était pending, sans arguments, à l’arrêt ; aucune édition exécutée n’est attestée. Copie et source restent identiques. L’épreuve est incomplète et non admise ; aucun gain de qualité ou de latence finale n’est démontré. Sans exécution comparable avec les descriptions originales, ce défaut ne peut pas être attribué causalement à leur compression.

Le réglage antérieur a été restauré et le service redémarré ; health.ready=true vérifié. Le correctif CPU du retrieval est conservé. Le candidat compact reste disponible, désactivé. Preuves : .migration-smoke/compact-e2e-result.json et compact-rollback.json. Les snapshots OpenCode peuvent inclure les modifications concurrentes de Codex : seuls les appels d’outils établissent les actions de Qwen.

Prochaine priorité : qualifier le suivi des consignes et la latence sur une tâche locale représentative avant toute promotion. Ce résultat ne valide pas l’ensemble de l’Organisme Corpus.

## Diagnostic suivant : compréhension isolée

Deux contrôles directs locaux montrent la compréhension des trois extraits courts (41,842 s) et de la décision dans le fichier complet (174,852 s, lignes exactes retrouvées). Des contraintes de forme restent manquées : JSON entouré de Markdown et paraphrase au lieu de citation exacte. L’échec avec outils reste non résolu. Voir DIAGNOSTIC_SUIVI_CONSIGNES.md. Un contrôleur de preuves workflow_receipt.py, couvert par cinq tests, distingue chaîne exécutée et simple fin de session ; il reste séparé du runtime. Aucun redémarrage ni changement de modèle ou de sampling dans ce diagnostic.

## Réutilisation sans inférence

Sélection explicite d’outils inspirée de Qwen-Agent, réalisée avec l’API native déjà présente : utilitaire tool_scope.py et message préparé pour read/edit/bash. Trois tests réussis ; définitions originales, 10 → 3 outils et −34,77 % de caractères de schémas calculés hors ligne. Aucun essai Qwen ni activation globale. Voir REUSE_TOOL_SCOPE.md pour les sources, licences et limites.

## Rangement et contrôle UI du 26 septembre

README.md relie désormais les états récents, sources, diagnostics et contrats d’implantation ; .migration-smoke/README.md distingue preuves, fixtures et demandes non exécutées. Contrôles rejoués : drift=[], coverage conserve un écart de 60 Kio dans runtime/corpus-local/logs. Aucun déplacement ni suppression de données ou d’environnement actif.

Contrôle navigateur réel de /corpus/ à 1280×720 : accueil, menu Ajouter, ouverture du studio Documents, historique affiché et fermeture par Échap. Pas d’erreur console observée au contrôle. Défaut reproduit : perte du focus après fermeture du studio ; corrigé dans portal/app.js en rendant le focus au bouton Ajouter d’origine, seulement s’il est encore connecté. Après rechargement : zéro dialogue ouvert et focus Ajouter au message, vérifiés dans le DOM. Syntaxe JavaScript et git diff --check réussis. Aucun message envoyé, fichier généré ou appel Qwen. Contrôle limité à ces écrans sur bureau : rendu mobile et autres parcours non validés ici.

## 27 septembre — classement des dernières captures

Le dernier dossier non classé, RUNTIME/corpus-local/logs (trois captures historiques), est désormais attribué à local-runtime comme exception legacy-state-in-runtime. Destination prévue : STATE/logs/corpus-local/legacy-captures ; déplacement encore à effectuer après vérification des références. Zéro écart de couverture ne signifie donc pas zéro dette d’implantation.

Le producteur payload_capture_only_TEMP.py écrit dorénavant ses nouvelles captures sous STATE/logs/corpus-local/payload-capture, conformément au contrat existant ; import et destinations vérifiés sans démarrer le serveur. Les anciennes captures ne sont ni déplacées ni supprimées. Les 13 tests de test_corpus_control.py passent, coverage --gaps-only et drift renvoient []. Aucun appel Qwen, redémarrage ou publication.

## 27 septembre — rangement automatique activé

Paramètres → Rangement et CLI `python3 scripts/corpus organize` donnent accès aux règles, à la fréquence, au quota, à l’aperçu et à l’historique. Premier passage automatique : 3 copies (53421 octets) classées et vérifiées ; originaux intacts, second passage manuel : 0 doublon. Fréquence actuelle : 60 minutes, quota : 64 Mio. Le périmètre initial est limité aux captures de diagnostic et n’effectue aucune suppression ni déplacement des sources.

Service redémarré après contrôle d’inactivité. Réglages enregistrés, pause persistante vérifiée puis automatisme réactivé. UI vérifiée à 1280×720 et 390×844 ; navigation des paramètres corrigée sur mobile par un sélecteur de rubrique. 8 tests du rangement, 13 du registre et 11 du pont/protections réussis ; ces 11 derniers ont requis l’accès aux sockets locaux, interdit dans le bac à sable de test initial. Aucun appel Qwen. Détails, commandes et limites dans ORGANIZER.md.

## 27 septembre — épreuve à trois outils : plantage CUDA

Une épreuve autorisée avec les descriptions originales et seulement read/edit/bash a effectué les deux lectures, puis le moteur llama.cpp b10964 a planté : `CUDA error: invalid argument`, pile passant par `ggml_cuda_mul_mat_vec_q` et `ggml_cuda_try_fuse`. Aucune édition ni exécution du test. Les empreintes du contexte, de la source et de la copie sont inchangées. Durée totale jusqu’à arrêt : 822,19 s (13 min 42 s).

La première inférence comptait 4504 tokens d’entrée, 107 de sortie ; le traitement du prompt a pris environ 421,52 s. Le plantage survient à l’étape suivante. OpenCode a automatiquement relancé le moteur ; cette reprise a été interrompue dès son identification. Le contrôleur de durée ne détectait pas cette reprise via le seul statut retry : avant toute nouvelle épreuve, il faut aussi interrompre sur une étape terminée avec finish=unknown. Aucun nouvel essai lancé après cet arrêt.

Priorité actuelle : stabilité du moteur CUDA, puis seulement nouvelle validation lire → modifier → tester. Le code installé reconnaît `GGML_CUDA_DISABLE_FUSION=1`, candidat de diagnostic cohérent avec la pile, mais ni activé ni validé comme correctif. Référence amont : https://github.com/ggml-org/llama.cpp/blob/master/ggml/src/ggml-cuda/ggml-cuda.cu . Aucun changement de modèle ou de configuration active dans cette épreuve.

Preuves locales : .migration-smoke/scoped-e2e-result.json, scoped-execution-verdict.json, scoped-cuda-crash.log et scoped-files-unchanged.json. Le service était disponible après arrêt ; cela ne prouve pas que l’inférence fonctionne. L’échec du moteur ne permet pas de conclure à une incapacité du modèle à effectuer la modification demandée.

## 27 septembre — priorité latence, sans nouvel appel

Recherche amont confrontée au code installé : la limite de 20 couches GPU laisse des opérations hors experts côté CPU ; lots physiques limités à 64. Deux pistes distinctes, sans gain encore mesuré. Voir DIAGNOSTIC_PREFILL.md pour les preuves, sources et protocole court proposé. Aucun réglage actif modifié. Les essais longs sont suspendus à la demande utilisateur.

## 27 septembre — profil CUDA ajusté

À la demande utilisateur, application directe du candidat sans campagne de tests : -ngl 99 --cpu-moe et lots -b 256 -ub 256 pour CUDA. Experts en RAM, priorité GPU pour les autres couches. Même modèle, contexte et paramètres de génération. Syntaxe Python vérifiée ; aucune inférence, aucun redémarrage. Prise en compte au prochain lancement du service. Gain de vitesse, consommation mémoire et stabilité CUDA restent non mesurés ; le plantage précédent n’est pas déclaré corrigé. Retour au profil précédent : -ngl 20 --n-cpu-moe 30 -b 256 -ub 64.

## 27 septembre — trois pistes raccordées en CLI

project_resume.py et `scripts/corpus resume` préparent un paquet de reprise : objectif/étape, notes lisibles avec empreintes, sélection native des outils. Contrôle ciblé hors inférence réussi. Aucun service activé, envoi de message ou appel Qwen. Interface site et capture automatique des étapes restent à raccorder. Sources et contrat : REPRISE_PROJET.md.

## 27 septembre — reprise reliée au site

Paramètres → Reprise de projet : objectifs, prochaine étape, notes et outils ; sauvegarde persistante sous STATE/project-resume, préparation puis transfert dans une nouvelle conversation comme brouillon. Contrôle réel navigateur : sauvegarde et brouillon constatés, rendu bureau inspecté. Aucune soumission, aucun appel Qwen. Masque des outils transmis par le chemin d’envoi explicite existant ; exécution au modèle non testée. Le service a été redémarré après constat des sessions inactives et warmup désactivé : le profil CUDA précédent est maintenant configuré au lancement, toujours sans mesure d’inférence.

## 27 septembre — tirage 4, mémoire lisible

Édition des notes reliée au site et à la préparation de reprise, avec sauvegardes de versions et comparaison d’empreinte. Parcours navigateur vérifié sur la fixture memory-ui.md : lecture, modification, sauvegarde, historique. Service rechargé à vide, warmup off ; aucune inférence. Voir REPRISE_PROJET.md.

## 27 septembre — tirage 5, profils d’outils

Six profils natifs reliés à la préparation, au checkpoint et au brouillon depuis Paramètres → Reprise de projet. Sélection détaillée toujours accessible ; volume calculé hors modèle affiché. Service rechargé après contrôle d’inactivité et warmup off. Parcours de préparation vérifié dans le navigateur, sans envoi ni inférence. Gain de latence non mesuré.

## 27 septembre — tirage 2, conversation liée

L’ouverture d’un brouillon sauvegarde son lien de session dans un nouveau point de reprise. Retrouver la conversation réouvre ce fil sans remplacer son brouillon ni envoyer du contexte. Parcours vérifié après rechargement du site, texte personnalisé conservé. Aucun appel modèle. Aucun gain KV ou de latence inféré de cette seule continuité.

## 27 septembre — tirage 6, outils conservés dans le chat

Réglage du profil directement dans le composeur, persistant par conversation dans le navigateur. Copie indépendante du masque pour chaque message en file ; mode automatique disponible et mode plan préservé. Contrôle ciblé de copie, syntaxe JS et parcours navigateur après rechargement. Aucun appel Qwen ni redémarrage. Gain de cache/latence non mesuré.


## 27 septembre — cinq améliorations complémentaires

Recherche/tri/pagination des reprises, cache des catalogues, accessibilité des dialogues, libellés et validation des profils, visibilité du stockage intégrés au portail. Service rechargé, parcours bureau ciblés observés, 9 tests consolidés réussis. Aucun appel modèle. Rendu mobile et gain de latence non mesurés. Détails : REPRISE_PROJET.md, section cinq tirages.


## 27 septembre — identité globale du portail

Charte Corpus, accueil par activités, continuités, traitements communs, tiroir mobile et résumé utilisable sur toutes les largeurs. 24 rubriques ouvertes ; thèmes clair/sombre et vues mobiles 390 px inspectés. 21 fichiers de tests existants réussis et 2 tests de régression supplémentaires. Aucun modèle ni action externe/destructive exécutés. Couverture exacte et limites : UI_CORPUS.md.

## Interface simplifiée après retour utilisateur — 27 septembre 2026

Accueil recentré sur une nouvelle conversation et son projet ; slogans et blocs abstraits retirés. Le bouton à trois traits du composeur ouvre désormais les commandes natives Corpus. L’ancien accès technique est explicite dans Aide → Interface technique OpenCode. Brouillon conservé et iframe moteur non chargée lors du clic vérifiés au navigateur ; 37 tests de fluidité et 2 tests de design réussis sans modèle.

Comparaison visuelle avec des captures datées de ChatGPT et Claude et le chat Venice actuel, inventaire des fonctions visibles et priorités restantes dans [UI_CORPUS.md](UI_CORPUS.md). Aucun appel de modèle ni génération pendant cette correction.

## 27 septembre — contexte de reprise plus ciblé, preuves plus strictes

Après correction du périmètre par l’utilisateur, aucune nouvelle réorganisation de l’interface : la passe commencée a été annulée. Travail porté sur deux manques du bilan global, contexte et fiabilité des preuves.

Reprise CLI/API/site : plages de lignes exactes et explicites, empreintes du fichier entier, refus des plages invalides ou sources périmées, déduplication et volume visible. Exemple réel préparé via le site : texte de reprise 9596 → 1576 caractères pour la section mémoire seule ; aucun envoi. Service rechargé à vide, warmup off. Détails et limites : REPRISE_PROJET.md.

workflow_receipt.py : toutes les éditions attendues doivent précéder le dernier test exact réussi ; les outils non terminés ou en erreur invalident la chaîne. L’ancien vérificateur pouvait accepter une édition de la même copie faite après un test réussi, ou ignorer un dernier test échoué. Six tests ciblés du vérificateur réussis ; quatre du contexte et un du raccordement de sélection UI réussis. Syntaxe JS et diff vérifiés.

Aucun appel Qwen, réduction de qualité revendiquée, benchmark long ni nouveau modèle. Gain de volume observé sur une préparation ; gain de temps d’inférence et agentique fiable de bout en bout restent non mesurés. Le vérificateur de receipts reste un contrôleur hors ligne de l’épreuve définie, pas une preuve universelle de réussite ni un contrôle automatique de chaque conversation.

## 27 septembre — deux épreuves durables V2/V3, résultat borné confirmé

Deux épreuves supplémentaires ont utilisé la même fixture isolée
`runtime_limits_v2.py`, avec le profil local Qwen et la commande de test exacte
`test_budget_v2.py`. Les deux reçus déclarent une fin `completed` et le
marqueur `MIGRATION_SMOKE_V2_PASS`.

- **V2** : trois lectures, une édition de la fixture puis un test ; durée de
  tour rapportée **511,406 s**.
- **V3** : deux lectures, une édition de la fixture puis un test ; durée de
  tour rapportée **121,688 s** ; les huit contrôles du vérificateur V2 sont
  vrais (`read → edit → test`, aucun autre edit terminé, commande exacte
  réussie).

Cela confirme une seconde fois la chaîne étroite
`lecture → édition isolée → test`. Cela ne prouve ni l'autonomie générale, ni
la qualité sémantique de toutes les réponses, ni la stabilité de CUDA. La baisse
observée de durée V2→V3 est descriptive seulement : les séquences d'outils ne
sont pas identiques (cinq contre quatre) et le comparateur conclut
`insufficient_for_attribution`. Aucun réglage runtime n'a été changé à partir de
ces résultats.

Les preuves sont `.migration-smoke/durable-e2e-v2-result.json`,
`durable-e2e-v3-result.json`, `durable-e2e-v3-verdict.json` et
`durable-e2e-v2-v3-comparison.json`. La prochaine étape préparée, non exécutée,
reste le lot représentatif C14 → C12 → C05 → C11 : il devra employer des reçus
comparables, être validé cas par cas, et faire l'objet d'une autorisation avant
inférence.
