# Reprise de projet — première liaison des trois chantiers

La commande `python3 scripts/corpus resume checkpoint.json --project /chemin/du/projet --output paquet.json` prépare une reprise sans appeler le modèle. Le fichier de sortie doit être nouveau. Les fichiers restent lisibles et peuvent être suivis par le Git du projet ; aucun commit automatique.

Checkpoint éditable :

```json
{
  "schema_version": 1,
  "objective": "Mettre à jour la documentation du projet",
  "next_step": "Lire la décision, puis proposer la modification",
  "completed": ["Inventaire effectué ; résultat déclaré à confirmer si nécessaire"],
  "memory": [{"path": "DECISIONS.md"}],
  "tools": ["read", "edit"],
  "agent": "corpus"
}
```

`session_id` peut désigner une session OpenCode existante. Le paquet conserve cet identifiant mais ne contacte pas la session. Le checkpoint retourné contient les empreintes des notes : les réutiliser permet de détecter un changement avant une reprise. Les notes restent la source éditable ; le paquet est une photographie. Aucun remplacement du retrieval existant.

Trois capacités raccordées : objectif/étape persistés dans un fichier, mémoire sélectionnée avec provenance et empreinte, masque natif des outils via tool_scope.py. Les actions déjà déclarées ne sont pas rejouées ; leur inscription ne prouve pas leur exécution. Les permissions de session restent indépendantes du masque d’outils.

Interface : Paramètres → Reprise de projet. Enregistrer conserve une photographie sous STATE/project-resume ; retrouver recharge les champs ; préparer relit les notes actuelles ; ouvrir comme brouillon crée une conversation locale sans inférence. Le masque des outils accompagne le prochain envoi explicite. Chaque enregistrement crée un nouveau point, sans écraser le précédent.

Limites : pas de capture automatique des étapes, de transactions sur les effets des outils ou de consolidation autonome de mémoire. Ouvrir comme brouillon crée une nouvelle conversation ; Retrouver la conversation ouvre le fil existant lorsqu’un lien a été enregistré. Le contrôle d’empreinte est conservé en CLI et dans le site lors du chargement et de la préparation. Une note modifiée demande une revue explicite. Ce n’est pas un moteur d’exécution durable complet. Notes texte limitées à 64 Kio chacune et 128 Kio au total, refus explicite sans troncature silencieuse.

## Sources consultées le 27 septembre 2026

- LangGraph, séparation checkpoints de tâche / stores de mémoire : https://docs.langchain.com/oss/python/langgraph/persistence
- Letta Code, mémoire sous forme de fichiers consultables et versionnables : https://github.com/letta-ai/letta-code/blob/main/src/agent/prompts/letta_local_memfs.md
- Qwen-Agent, sélection function_list : https://github.com/QwenLM/Qwen-Agent/blob/main/qwen-agent-docs/website/content/en/guide/get_started/configuration.md

Il s’agit d’une sélection d’architectures pertinentes, pas d’un classement exhaustif de performances SOTA. Aucun code amont copié ni nouvelle dépendance installée. L’intégration des frameworks eux-mêmes et de leurs licences n’est pas nécessaire pour cette liaison native.

## Veille élargie

- Anthropic, contexte sélectionné et outils explicites : https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- Microsoft Research, mémoire persistante : https://www.microsoft.com/en-us/research/publication/human-inspired-memory-architecture-for-llm-agents/
- Retour communautaire de découverte, pas preuve de performance : https://www.reddit.com/r/LocalLLaMA/comments/1rmp1dx/are_there_opensource_projects_that_implement_a/

Contrôle navigateur effectué : formulaire, sauvegarde locale et transfert au brouillon, sans envoi au modèle. La création de conversation seule n’appelle pas Qwen.

## Notes modifiables depuis le site

Dans Reprise de projet, « Consulter et modifier les notes » ouvre les fichiers sélectionnés. Enregistrer modifie la source ; les reprises doivent ensuite être préparées à nouveau. Les versions précédentes sont conservées sous STATE/project-resume/memory-history, avec leur chemin, date et empreinte. L’interface montre les vingt dernières et permet d’en charger une dans l’éditeur ; la restauration nécessite ensuite Enregistrer. Aucun commit ni synchronisation distante.

Écritures atomiques, verrou entre éditeurs Corpus et comparaison de l’empreinte avant écriture. Un fichier modifié depuis son ouverture est refusé ; le texte saisi reste visible. Un outil extérieur ignorant le verrou peut toujours intervenir pendant la toute dernière fenêtre de remplacement : aucune garantie transactionnelle universelle. Fichiers existants .md/.txt non cachés, sans liens symboliques/multiples, 64 Kio maximum. Pas de suppression automatique d’historique.

Contrôle ciblé hors modèle : sauvegarde, conservation de l’ancienne version et rejet d’une empreinte périmée. Parcours navigateur bureau : lecture et modification de la fixture memory-ui.md, sauvegarde et historique affiché ; rendu inspecté. Aucun appel Qwen. Mobile non contrôlé dans cette étape.

Recherche préalable : Letta MemFS pour la mémoire accessible dans le filesystem, https://github.com/letta-ai/letta-code/blob/main/src/agent/prompts/letta_local_memfs.md ; retours communautaires de découverte https://www.reddit.com/r/LocalLLaMA/comments/1nffpfj ; Microsoft Memora https://www.microsoft.com/en-us/research/blog/memora-a-harmonic-memory-representation-balancing-abstraction-and-specificity/ pour distinguer contenu riche conservé et index de récupération. Cette étape implémente l’édition/historique, pas le retriever Memora. Aucun code tiers copié.

## Profils d’outils — tirage 5

Le sélecteur « Type de tâche » propose : répondre sans outil, lire une note, explorer des fichiers, modifier et vérifier, rechercher des sources, retrouver un souvenir. « Ajuster les outils individuellement » conserve le contrôle précis. Les profils sont éditables dans tool_profiles.json ; le checkpoint sauvegarde la liste explicite pour qu’un changement ultérieur de profil ne réécrive pas une ancienne reprise.

Le masque déterministe conserve les noms triés. Aucun routeur IA supplémentaire. Le volume affiché est un comptage de caractères des descriptions et schémas capturés dans le catalogue, pas une mesure du payload actuel, de tokens, de cache ou de vitesse. Le profil de modification expose trois outils ; le shell n’est pas limité à tester par ce seul profil. Les permissions restent indépendantes.

Recherche : https://www.anthropic.com/engineering/advanced-tool-use ; https://github.com/QwenLM/Qwen-Agent/blob/main/qwen_agent/agent.py ; piste communautaire sur le compromis sélection/cache https://www.reddit.com/r/LocalLLaMA/comments/1sl13rr/dynamic_tool_lists_vs_kv_cache_how_do_you_handle/ . Aucun code amont copié. Ne pas ajouter un outil de recherche d’outils ni un modèle routeur avant que le bénéfice justifie leur coût.

Validation ciblée : les six profils ne contiennent que des outils connus ; le résumé reste identique si leur ordre change ; trois tests existants de sélection native réussis. Navigateur : sélection « Modifier et vérifier », préparation et affichage de trois outils et 8624 caractères. Aucun message envoyé, aucun appel Qwen. La sélection s’applique au message de reprise ; elle n’est pas imposée aux messages suivants.

## Conversation liée — tirage 2

Ouvrir un brouillon enregistre désormais un nouveau point de reprise lié à la conversation créée. Charger ce point permet « Retrouver la conversation » : ouvrir le fil réel sans générer un message, remplacer le brouillon ou réinjecter les notes. L’ouverture d’un nouveau brouillon reste possible séparément. Les points plus anciens sans identifiant ne sont pas reliés par supposition.

Le lien conserve l’identifiant natif OpenCode et le dossier de travail. Si l’enregistrement échoue, l’interface signale que le brouillon existe mais que son lien n’a pas été sauvegardé. Il n’y a ni reprise automatique d’outils, ni garantie de cache KV : conserver une conversation ne signifie pas conserver son état GPU.

Références : https://docs.langchain.com/oss/python/langgraph/persistence pour l’association état/fil ; https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents pour la continuité explicite ; découverte communautaire https://www.reddit.com/r/LocalLLaMA/comments/1rawvpj/release_localagent_v011_localfirst_agent_runtime/ . Aucun framework installé ni code amont copié.

Contrôle navigateur du lien : création d’un brouillon, rechargement du site, sélection du point enregistré, réouverture du même fil et conservation du texte personnalisé « Brouillon conservé — ne pas envoyer. ». Aucun envoi au modèle.

## Outils conservés par conversation — tirage 6

Le bouton « Outils » dans le composeur permet de fixer un profil pour les prochains messages de cette conversation, ou revenir à « Automatique selon la demande ». Le choix est enregistré avec le brouillon dans ce navigateur ; il n’est pas synchronisé entre navigateurs. Les anciennes reprises restent à usage unique tant que l’utilisateur n’a pas explicitement appliqué un profil durable. Le mode plan garde son chemin sans outils.

La sélection de chaque message est copiée au moment de sa mise en file, dans un ordre stable : changer le profil ne modifie pas les messages déjà en attente. L’envoi natif transmet ce masque explicite au routeur existant. Aucune nouvelle dépendance, aucun appel de classement par IA et aucun redémarrage de service nécessaire pour cette modification d’interface.

Piste d’efficacité : une liste d’outils stable peut éviter des changements de préfixe inutiles ; cela ne garantit ni un cache hit ni une accélération, car d’autres parties du prompt changent. Sources : https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md ; https://www.anthropic.com/engineering/advanced-tool-use ; découverte communautaire https://www.reddit.com/r/LocalLLaMA/comments/1sl13rr/dynamic_tool_lists_vs_kv_cache_how_do_you_handle/ . Aucune implémentation de cache ou de recherche d’outils Anthropic copiée.


## 27 septembre — cinq tirages complémentaires : 1, 5, 6, 3, 4

Cinq chantiers intégrés, réalisés par quatre agents délégués (dont un réaffecté au cinquième chantier après la limite de création) et coordination principale. Doublons de tirage relancés.

- Reprises : recherche insensible aux accents, tri et pagination de 25 résultats ; recherche avant pagination. Cache des métadonnées borné à 1024 entrées ; parcours des signatures de fichiers encore linéaire.
- Catalogue et profils : cache RAM partagé de 16 fichiers, invalidation par signature stat, copies défensives, aucune ancienne valeur servie après une erreur de lecture.
- Dialogues : noms accessibles, focus initial sur le titre, couleurs du thème et retours à la ligne adaptés aux petites largeurs.
- Outils : 26 libellés français, identifiants techniques conservés, validation stricte des six profils configurables.
- Rangement : espace des checkpoints et versions des notes consultable et actualisable depuis les paramètres. Lecture des métadonnées bornée, liens symboliques ignorés, résultat partiel signalé. Aucune purge ni limite de rétention ajoutée.

Validation consolidée : `python3 -m unittest test_metadata_cache.py test_resume_index.py test_tool_scope.py` depuis ce dossier : 9 tests réussis. Syntaxe JS et `git diff --check` réussis. Contrôles ciblés des profils et du stockage réalisés par les agents. API locale : 2 reprises, 26 libellés, 8177 octets logiques au total. Service rechargé à vide, warmup off.

Navigateur bureau : « continuite » retrouve « Continuité de Corpus », tri A–Z sélectionnable, libellés français présents ; dialogue Notes du projet nommé et titre focalisé, rendu inspecté ; section de stockage présente dans Rangement. Rendu mobile et second dialogue des outils non recontrôlés visuellement dans ce lot. Aucun appel modèle ; accélération d’inférence non mesurée.

Sources consultées pour les décisions : SQLite query planner https://www.sqlite.org/queryplanner.html ; JSON Schema https://json-schema.org/understanding-json-schema/reference/object ; W3C dialogue natif https://www.w3.org/WAI/WCAG22/Techniques/html/H102 ; APG https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/ ; reflow https://www.w3.org/WAI/WCAG22/Understanding/reflow.html . Index fichier retenu sans ajouter SQLite. Aucun code tiers copié.


## Contexte sélectionné et contrôle des versions — 27 septembre 2026

Objectif : réduire la lecture inutile à la reprise, sans résumé généré ni troncature automatique. La sélection reste explicite ; l’absence de plage conserve le texte entier.

- Site, champ **Notes à retrouver** : `DECISIONS.md:L10-L25` sélectionne les lignes 10 à 25 incluses. **Consulter et modifier les notes** ouvre toujours le fichier complet.
- CLI/API : `{"path":"DECISIONS.md","start_line":10,"end_line":25}` dans `checkpoint.memory`. Champs optionnels, compatibles avec les checkpoints de version 1 existants.
- Le contexte porte le chemin, la plage, le nombre de lignes du fichier, le marqueur `excerpt` et l’empreinte SHA-256 du fichier complet. Les caractères du passage sont conservés exactement ; une plage invalide est refusée, jamais raccourcie silencieusement.
- Les références identiques au même fichier et à la même plage sont dédupliquées. Les plages distinctes ne sont pas fusionnées. La sérialisation JSON compacte retire la mise en forme JSON, pas le contenu des notes.
- Le checkpoint sauvegarde les plages et les empreintes. Le site conserve les empreintes d’une préparation ou d’un point chargé : une modification même hors extrait invalide le contrôle. Pour retenir une nouvelle version, ouvrir la note, la revoir et cliquer **Enregistrer la note** (sans changement possible) puis préparer à nouveau.
- Le résultat `context_budget` et le site affichent les caractères préparés, les caractères sélectionnés/complets des références et les doublons retirés. Ce n’est ni un comptage de tokens ni une mesure de latence. Les autres éléments du prompt système, de l’historique et des outils sont hors de cette mesure.

Validation : `python3 -m unittest discover -s projets/corpus-local-llm-migration -p 'test_resume_context.py'` (4 réussites), `node projets/corpus-local-llm-migration/test_resume_context.cjs` (1 réussite). Préparation réelle par le site avec le chapitre Mémoire locale hybride de `CONTEXTE_LOCAL.md` : 9596 caractères de message avec la note entière, 1576 avec les lignes 56–74 ; notes 8763 → 785 caractères. Ce cas ne prouve pas une sélection automatiquement pertinente pour toute tâche. Aucun envoi, nouvelle conversation ou point permanent créé pendant cette vérification.

Service rechargé après vérification d’absence de sessions actives et de `kv-warmup-mode=off`. Le nouveau préparateur est servi par l’API et le résultat a été observé dans le navigateur. Aucun appel modèle, aucune mesure de stabilité CUDA ou d’inférence.

Sources : [Anthropic, contexte à la demande](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents), [OpenHands, couches de vérification](https://www.openhands.dev/blog/20260506-the-verification-stack). Principes adaptés au préparateur existant, aucun code tiers ni nouvelle dépendance.
