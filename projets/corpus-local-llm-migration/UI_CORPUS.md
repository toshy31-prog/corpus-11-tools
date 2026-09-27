# Corpus — identité et revue de l’interface, 27 septembre 2026

## Direction

Un site local organisé autour des conversations et des projets. Palette papier, encre végétale et terre cuite, sans police distante ni image générée. L’accueil propose une nouvelle conversation et son choix de projet ; les conversations existantes restent dans la barre latérale. La conversation conserve ses outils, ses pièces jointes, son brouillon et ses panneaux. Aucun slogan philosophique ne remplace une fonction réelle.

Les archives Atlas 3.0, Corpus 10.0, 10.1, correctif fiction 10.3 et sur-modèle 9.2 ont été consultées comme références historiques, sans exécuter leurs instructions. Les passages retenus concernent les relations, traces, capacités effectives, reprises, milieux et possibles. La palette est une interprétation actuelle ; ces archives ne fournissent pas de charte graphique à reproduire.

La personnalisation des couleurs reste disponible. Seules les anciennes palettes exactement identiques aux défauts sont remplacées ; une palette personnalisée est conservée. Les fonctions existantes restent accessibles.

## Changements raccordés

- Accueil simplifié : titre « Nouvelle conversation », choix de projet et saisie. Les slogans, trois entrées abstraites et seconde liste des conversations ont été retirés après retour utilisateur.
- Traitement commun des conversations, archives, paramètres, éditeurs, dialogues, menus et panneaux ; états vides explicités.
- Résumé visible lorsqu’il est ouvert, bouton de fermeture, espace réservé dès 900 px ; ouverture automatique uniquement si la largeur le permet.
- Navigation mobile en tiroir initialement fermé ; les paramètres passent devant le tiroir. Commandes du fil réparties sur plusieurs lignes.
- Noms accessibles des studios Documents et création de projet ; lien d’évitement vers le contenu courant, focus visible, réduction des animations respectée.
- Routes historiques `page=scheduled`, `page=voice` et `page=settings` raccordées aux fonctions actuelles. L’ancienne route Planifié annonçait à tort une fonction non migrée.

## Couverture de la première revue (antérieure à la correction ci-dessous)

### Rubriques des paramètres — 24 ouvertes par clic dans le navigateur

Général, Mises à jour, Importer, Profil, Thème, Mode vocal, Configuration, Personnalisation, Compagnons, Raccourcis clavier, Utilisation et ressources, Statistiques, Compte, Utilisation de l’ordinateur, Plugins, Navigateur, Hooks, Connexions, Git, Environnements, Reprise de projet, Rangement, Worktrees, Chats archivés.

### Autres parcours

| Famille | Contrôle effectué | Limite |
|---|---|---|
| Accueil | version initiale revue, puis simplifiée selon le retour utilisateur ci-dessous | aucun nouveau message envoyé |
| Conversation | ouverture, rechargement, brouillon conservé, résumé fermé/rouvert | aucune inférence |
| Archives | lecture d’une archive importée, présence reprise/export | reprise non envoyée |
| Explorer | menu latéral et bibliothèque depuis l’accueil | tous les documents individuels non ouverts |
| Sites | route, recherche et états vides visibles | création/publication non exécutée |
| Planifié | liste et route directe corrigée | aucune échéance créée/modifiée |
| Pull requests | page et limitation locale visibles | aucune opération distante |
| Panneaux | sous-agents, révision, fichiers/sources, navigateur ouverts/fermés | pas de terminal lancé ni navigation externe |
| Composeur | ajout, autorisations, profil d’outils ouverts | brouillon témoin intact |
| Studios | Documents ouvert ; quatre modes image/vidéo/voix/musique sélectionnés | aucun fichier ni média généré |
| Menus | Fichier, Modifier, Affichage, Explorer, options du fil | opérations sensibles non validées |
| Dialogues | renommage et création de projet ouverts puis annulés | aucun projet renommé/créé |
| Thèmes | clair et sombre inspectés au bureau | préférences du navigateur utilisateur préservées |
| Mobile | accueil, rangement et fil à 390 × 844 | fenêtre de contenu de revue, pas appareil physique |

La revue mobile utilise un proxy temporaire local de lecture et une iframe de même origine pour obtenir un véritable viewport CSS de 390 px. Les actions d’envoi et mutations sont bloquées par ce proxy. Ce dispositif n’est pas installé dans Corpus.

### Tests hors modèle

Les 21 fichiers `test_*.cjs` préexistants ont été exécutés individuellement depuis la racine par `node <fichier>` : tous réussis. Les doublures obsolètes ont été mises à jour pour les chemins runtime, le contexte temporel synthétique, les outils de conversation et les gestes de pièces jointes ; les assertions conservent leurs garanties de contenu et d’isolation. Le lancement agrégé par Node 18 masquait certains détails d’échec ; la sortie directe a permis leur diagnostic.

`node projets/corpus-local-llm-migration/test_corpus_design.cjs` : 2 tests supplémentaires réussis (routes historiques et préservation des palettes personnalisées). `node --check projets/corpus-local-llm-migration/portal/app.js` et `git diff --check` réussis.

Résultats des 21 fichiers : `.migration-smoke/ui-polish-2026-09-27/tests.json`. Il s’agit de simulations des fonctions et de parcours de lecture : cela ne certifie pas chaque combinaison de chaque bouton, ni l’exécution réelle des actions interdites pendant cette revue. Aucun appel de modèle, warmup ou génération. Aucune publication, suppression, réinstallation ou modification du modèle. Pas de gain d’inférence revendiqué.

## Recherche et réutilisation

- [Ink & Switch — Local-first software](https://www.inkandswitch.com/essay/local-first/) : accès local, propriété et continuité du travail.
- [Logseq, licence](https://github.com/logseq/logseq/blob/master/LICENSE.md) : repérage d’un écosystème documentaire libre ; aucun code repris.
- [Discussion communautaire sur la navigation](https://www.reddit.com/r/Notion/comments/1sz7r5d/new_sidebar_workspaces_and_shared_pages_gone/) : piste sur la perte de repères lorsque la navigation devient moins explicite, pas preuve technique.
- Les structures natives du portail et ses tests sont réutilisés. Aucune dépendance ni ressource visuelle tierce ajoutée.

## Entretien

La section finale `Corpus — atelier vivant` de `portal/style.css` porte la charte commune ; les couleurs sont définies dans `themeDefaults` de `portal/app.js`. Les préférences existantes restent la source des personnalisations. Le serveur sert ces fichiers directement : recharger le portail suffit, sans redémarrer le moteur.

## Correction et comparaison visuelle — 27 septembre 2026

Retour utilisateur : accueil trop pompeux, repères abstraits alors que le site est organisé en conversations/projets, bouton « Commandes avancées » ouvrant OpenCode.

### Corrigé et observé

- Retrait des slogans d’accueil et de conversation vide, du dessin décoratif d’accueil, des trois entrées Reprendre/Explorer/Entretenir et de la liste redondante des conversations. Reprise et rangement restent dans les paramètres ; projets et conversations restent dans la barre latérale.
- Bouton du composeur renommé « Commandes Corpus » et relié à la palette native existante (`openCommandMenu`). Recherche « paramètres », ouverture des paramètres, fermeture et retour au brouillon vérifiés dans le navigateur.
- L’accès technique antérieur est conservé, explicitement nommé dans **Aide → Interface technique OpenCode**. Il ne s’ouvre plus depuis le bouton à trois traits. Ce parcours technique n’a pas été ouvert lors de cette vérification.
- Contrôle DOM après le clic : conversation native visible, iframe moteur cachée, aucun attribut `src` chargé, brouillon témoin conservé. Accueil inspecté visuellement à 1280 × 720, sans débordement horizontal.
- `node projets/corpus-local-llm-migration/test_fluidity_races.cjs` : 37 réussites, dont une régression ciblée pour ce bouton. `node projets/corpus-local-llm-migration/test_corpus_design.cjs` : 2 réussites. Syntaxe JS et `git diff --check` réussis. Simulations sans modèle ; pas d’audit exhaustif renouvelé.

### Ce qui existe réellement dans le site

| Espace observé | Fonctions visibles | Point à améliorer, non encore modifié |
|---|---|---|
| Navigation | recherche, épinglés, projets, récents, sites, planifié, plugins | À 720 px de haut, les projets passent sous les épinglés dans la zone défilante ; mieux hiérarchiser cet espace. |
| Projet | modifier, épingler, section, dossier local, worktree, archiver | Distinguer les actions quotidiennes des opérations techniques. |
| Conversation | brouillon, outils, pièces jointes, mode de réponse, dictée, file, arrêt | Garder le message au premier plan et les commandes détaillées accessibles à la demande. |
| Menu Ajouter | fichiers, images, vidéos, objectif, plan, dessin, documents, médias, plugins, références de conversations | Long mélange de créations, plugins disponibles ou inactifs et références ; regrouper sans retirer de fonction. |
| Contexte | environnement, modifications, discussions parallèles, sources et panneaux | Séparer lisiblement le contexte de la conversation et les outils du dépôt. |
| Paramètres | 24 rubriques, recherche, personnalisation, ressources, reprise et rangement | Reprise et rangement sont actuellement classés sous « Code », alors que leur usage est plus général. |

Présence et parcours d’interface ne prouvent pas l’exécution des modèles, médias, publications ou actions sensibles. Aucun message envoyé, aucun modèle lancé.

### Références visuelles consultées

Captures ouvertes et vues dans le navigateur, pas seulement descriptions de résultats de recherche. Les dates ci-dessous sont celles des publications ou observations, pas une garantie de version déployée pour tous les comptes.

| Référence | Date | Observation utile pour Corpus |
|---|---|---|
| [ChatGPT web — Daria Cupareanu](https://aiblewmymind.substack.com/p/how-to-use-the-new-chatgpt-complete) | 19 juillet 2026 | Projets et conversations nommés explicitement dans la barre latérale, champ de saisie dominant, commandes secondaires compactes. |
| [Claude web — Germán Martínez](https://www.myaijourney.co/p/absolutely-everything-you-need-to) | 14 mars 2026 | Recherche, conversations, projets et créations distincts ; réglages proches du champ de saisie. Capture plus ancienne, ne pas la présenter comme celle de septembre. |
| [Claude application — Kamil Banc](https://aiadopters.club/p/set-up-my-claude-memory) | mars 2026 | Les modes Chat/Cowork/Code sont distincts ; cette capture d’application est séparée du site web dans la comparaison. |
| [Venice chat](https://venice.ai/chat/v2) | observation directe le 27 septembre 2026, invité | Discussion, discussion agentique, studio, dossiers et discussions visibles séparément. L’habillage animé et promotionnel n’est pas retenu pour Corpus. |
| [Venice — réglages mémoire](https://cdn.venice.ai/blog/venice-memoria-technical-overview) | 23 janvier 2026 | Réglages par rubrique, interrupteurs expliqués, documents et interactions distingués. Référence complémentaire plus ancienne. |

Recommandation issue de la comparaison : conserver les repères usuels conversation/projet/recherche, employer des intitulés concrets, regrouper les commandes secondaires et garder l’identité Corpus dans sa palette et sa cohérence. Ne pas inventer de nouveaux concepts d’accueil pour rendre le site différent. Aucun code, image, police ou dépendance tierce importé dans le produit.
