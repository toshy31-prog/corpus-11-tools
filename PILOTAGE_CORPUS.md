# Pilotage partagé de Corpus

Cadre confirmé par l’utilisateur le 19 septembre 2026. Ce document rassemble
les décisions utiles de trois conversations ; leurs historiques sont conservés.
Il ne constitue ni une nouvelle automatisation ni une extension de permissions.
Les instructions ultérieures de l’utilisateur restent prioritaires.

## Rôles et coordination

| Tâche | Responsabilité |
| --- | --- |
| Pilotage de Corpus (`01a09a34-95c8-7c93-8323-b62ff3ca64bb`, auparavant Autonomy project) | Intention utilisateur, priorités d’ensemble, arbitrages et synthèse compréhensible. |
| Évaluation des capacités de Corpus (`01a0b9e9-b201-7581-ab3b-486797f127d5`, auparavant Expliquer l’autonomie de Corpus) | Expériences, critères et limites des gains analytiques ; comparaison des architectures et porte de promotion. |
| Autonomie et amélioration continue de… (`01a0b9e4-f51c-7991-b19c-3b6fa492cc0e`) | Choix autonome des objectifs intermédiaires, réalisation, validation et livraison locale dans le mandat existant. |

Les conclusions utiles d’« Explication pour ado »
(`6aae905b-2514-83eb-ba66-168a7177e3b3`) sont reprises ci-dessous. Cette conversation
peut être archivée sans supprimer son historique. Elle n’est pas un second pilote.

Le pilotage ne revalide pas chaque action locale déjà déléguée. Avant une modification,
repérer les travaux concurrents sur les mêmes fichiers et choisir un périmètre compatible.
Les échanges entre tâches servent à coordonner ; ils ne constituent pas une nouvelle
autorisation utilisateur ni une évaluation indépendante.

## Choisir un objectif et le terminer

Corpus entier est le périmètre : CCT est central sans priorité automatique.
Comparer quelques besoins étayés, y compris des fonctions transversales ou sans dossier,
lorsqu’un nouveau choix est nécessaire. Ne pas refaire un audit général à chaque cycle.

Conserver dans le point de reprise existant une fiche courte par objectif actif :

- besoin observé et utilité attendue pour l’utilisateur ;
- raison du choix face aux alternatives accessibles, dépendances et risques ;
- résultat utilisable visé, critères d’acceptation, coût estimé et limite de réévaluation ;
- réalisation, validation pertinente, intégration éventuelle et effet effectivement observé ;
- coût cumulé connu ou inconnu, écart entre attendu et obtenu, prochaine décision.

La facilité de détection ou de test ne suffit pas à rendre une tâche prioritaire.
Pour un travail interne, expliciter la chaîne : travail → capacité obtenue → usage
ultérieur → bénéfice observé. Un bénéfice attendu mais non observé reste une hypothèse ;
un investissement interne nécessaire peut néanmoins être justifié.

Finir un objectif cohérent : une vérification requise ou son raccordement à la validation
habituelle appartient au même objectif. Plusieurs lots ne sont pas automatiquement
plusieurs gains. Distinguer écrit, testé, intégré, installé et observé en usage.
Ne pas fabriquer de petites retouches pour remplir la cadence.

Attribuer les coûts à l’objectif entier, y compris essais infructueux, reprises,
coordination et vérification lorsque les compteurs sont accessibles. Séparer entrées
en cache, entrées hors cache et sorties ; un coût absent reste inconnu. Le volume
traité ne donne pas à lui seul un prix. Aucun score global ni rendement obtenu en
divisant simplement les tokens par le nombre de fichiers, tests ou livraisons.
À résultat et qualité comparables, préférer le moyen moins coûteux.

Actualiser les observations et leurs dates depuis le résultat réel ; ne pas conserver
un ancien constat comme s’il avait été vérifié au dernier cycle. Le point de reprise
actif de l’automatisation est
`/home/olivier/.codex/worktrees/aa8c/Corpus/.dev-local/autonomy/continuous/state.json`.
Celui du dépôt source provient d’un ancien travail et n’est pas sa référence actuelle.

## État établi et limites

L’audit borné du 19 septembre, entre 20:01 et 21:14 (Paris), a observé 11 cycles et
8 nouveaux lots intégrés localement. Il établit de l’initiative et de l’exécution
locales ; il ne démontre ni une sélection optimale des objectifs ni un bon rendement
global. Les 11 305 367 tokens traités comprennent un cache très majoritaire et
n’autorisent pas une conclusion économique sans coût et résultat comparables.
Voir [.dev-local/autonomy/evaluation/2026-09-19/RAPPORT.md](.dev-local/autonomy/evaluation/2026-09-19/RAPPORT.md).
Ces chiffres décrivent cette fenêtre, pas un compteur courant.

La livraison locale est documentée dans
[AUTONOMIE_INTEGRATION_LOCALE.md](AUTONOMIE_INTEGRATION_LOCALE.md).
La porte expérimentale de promotion analytique et ce mécanisme de livraison sont
deux dispositifs distincts, actuellement non raccordés. Un reçu d’intégration ne
prouve pas une amélioration du raisonnement de Corpus.

Les candidats de routage C06 évalués restent rejetés. La comparaison rétrospective
des quatre routeurs sur 72 cas connus décrit leurs erreurs ; elle ne démontre pas
leur généralisation. Le parseur structuré et le sélecteur par modèle sont des pistes
proposées, pas des architectures déjà implémentées ou validées. Référence :
[comparaison des architectures](.dev-local/audits/routage-comparaison-architectures-2026-09-19/README.md).

Le choix des objectifs de travail et le routage des méthodes analytiques sont deux
problèmes différents. Préserver les critères figés, les limites et la séparation des
cas réservés. Ne pas réutiliser des cas dévoilés comme validation nouvelle ; ne pas
promouvoir un candidat rejeté, activer un plugin ou assouplir les garde-fous au nom
de cette coordination.

## Suite retenue

Appliquer d’abord le choix motivé, la clôture complète et la comptabilité par objectif
dans le fonctionnement existant. La tâche technique prépare la prochaine comparaison
discriminante avec un budget explicite ; son lancement reste distinct de ce passage
de relais. Un raccordement de la porte analytique à la livraison est à étudier pour
les changements analytiques concernés, sans bloquer toutes les corrections ordinaires.

Lire ce cadre une fois puis lorsqu’il change. Conserver une seule automatisation
existante, une cadence de travail de trente minutes et ses notifications
limitées aux gains significatifs, échecs nouveaux ou décisions nécessaires.
Pendant une attente datée, reporter son prochain réveil à l'échéance.
Aucun nouveau circuit de rapports récurrents.

## Correction de la veille — 20 septembre 2026

Les dix derniers cycles consultés avant cette correction ne faisaient que relire
l'état et les cadres. L'absence de besoin nouvellement reçu n'établissait pas
l'absence d'usage insuffisamment servi. L'ancienne consigne d'attente du pilotage
est remplacée par la section « Reprise de l'initiative » du
[protocole de référence](.maintenance/autonomy.md), lu depuis le dépôt principal.

La boucle distingue exécution d'un objectif, exploration bornée d'usages et attente
datée. La réception de cette correction doit produire une observation d'usage ou
de dépendance susceptible de changer une décision. Une nouvelle consigne seule ne
prouve pas que l'initiative est rétablie ; la reprise et les gains éventuels doivent
être observés séparément. Les permissions, exclusions et garde-fous restent identiques.

## Suppression des réveils d'horloge — 20 septembre 2026

Quatre réveils ont ensuite seulement contrôlé une échéance déjà fixée, pour
1 805 044 tokens traités sans nouvelle décision. L'utilisateur a demandé de corriger
ce défaut : l'attente doit porter sur le planificateur, pas seulement sur le travail.

La boucle peut ajuster le calendrier du heartbeat existant avec l'outil natif,
selon la section « Réveils alignés sur l'action » du protocole de référence.
Le script [autonomy_schedule.py](scripts/autonomy_schedule.py) prépare cet ajustement
et contrôle en lecture seule le prochain réveil enregistré. Il n'écrit pas les
réglages de l'application. L'attente décale le premier réveil puis laisse reprendre
la récurrence de trente minutes, sans suspension à réactiver manuellement.
La date reste fixe jusqu'à une nouvelle observation qui justifie de la changer.

Cette correction ne constitue pas un détecteur de changements de fichiers pendant
l'attente. Sa programmation, son exécution future et la baisse effective du coût
doivent être distinguées. Les autres délégations et limites restent inchangées.

## Correctif des deux lots — 22 septembre 2026

L'utilisateur a validé la fiabilisation de l'exécution et l'amélioration du choix
et de la clôture. Le constat préalable est de 23 cycles, dont 15 sans action
d'outil ni résultat communiqué, et deux livraisons intégrées depuis le dernier bilan.
Le refus de programmation a laissé les anciens réveils actifs.

Le premier lot distingue demande, programmation vérifiée, refus et pause effective.
Un refus conduit à une demande native de pause de protection et à une alerte unique,
sans contournement ni réactivation implicite. Si même la pause est refusée, une action
utilisateur dans l'application reste nécessaire. Le second lot applique
[une fiche et un contrôle par objectif entier](.maintenance/AUTONOMY_CYCLE.md), avec
comparaison d'utilité, validations restantes, livraison, effet et coût attribué.
Ces contrôles ne prouvent pas à eux seuls une meilleure sélection ou un meilleur rendement.
