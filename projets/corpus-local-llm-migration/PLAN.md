# Plan de préparation et critères d’acceptation

> Mise à jour du 23 septembre : installation autorisée et migration engagée.
> Le [suivi actuel](MIGRATION.md) et [state.json](state.json) font foi pour
> les installations et essais ; les formulations de préparation ci-dessous
> décrivent les décisions initiales du 22 septembre.

Architecture et jalons **proposés**, sans activation. Partir de l’état observé,
préserver les capacités utiles et vérifier les pertes avant toute substitution.

## Architecture cible à éprouver

```text
Interface locale
  → orchestrateur local : contexte, permissions, budgets, arrêt
      → moteur LLM local : poids identifiés, aucune inférence distante
      → mémoire et recherche locales : sources autorisées, statuts, provenance
      → outils locaux contrôlés : fichiers, tests, documents, applications
      → journal local : résultats, erreurs, coûts mesurés, reprise

Planificateur local → même orchestrateur, verrou et budget
Sources métier externes éventuelles → accès séparé soumis à arbitrage
```

Un protocole compatible avec une API OpenAI ne signifie pas que l’on appelle
OpenAI. Inversement, une adresse de boucle locale ne suffit pas à garantir que
le service derrière cette adresse reste local. La preuve doit inclure les
processus exécutés et leur trafic, dans une fenêtre et un périmètre déclarés.

## Étapes

| Jalon | Livrable | Critère de sortie |
| --- | --- | --- |
| 0 — Cadrage | Inventaire et décisions de ce dossier | Cible locale confirmée ; inconnues explicites. Préparation initiale réalisée. |
| 1 — Faisabilité | Relevé CPU/GPU, poids présents, moteur, licences et budget de ressources | Au moins une configuration candidate documentée ; capacité de chargement encore à mesurer. Aucun achat ni téléchargement implicite. |
| 2 — Consultation | Pilote en lecture seule sur sources non sensibles sélectionnées | Réponse française exploitable avec références vérifiables ; ignorance explicite si les sources manquent ; exécution sans GPT. |
| 3 — Outils | Agent sur copie de travail isolée | Lire, proposer un diff, exécuter un contrôle borné, s’arrêter et reprendre ; modification non autorisée refusée. |
| 4 — Écosystème | Matrice des usages par composant | Chaque usage essentiel est testé, explicitement reporté ou assorti d’une perte présentée à l’utilisateur. |
| 5 — Autonomie | Planificateur local en essai isolé | Pas de chevauchement, budget effectif, interruption/reprise et notifications utiles ; anciens réveils non modifiés pendant l’essai. |
| 6 — Bascule | Lot précis, sauvegarde, procédure de retour et bilan comparatif | Confirmation de l’utilisateur puis activation et réobservation des usages retenus. |

La première tranche reste le jalon 1 puis la consultation en lecture seule.
[DECISIONS.md](DECISIONS.md) garde OpenCode et llama.cpp comme candidats et retire
Qwen3 8B après retour utilisateur. La [sélection par capacité](MODELES-CAPACITE.md)
précède le choix du matériel et du paquet. Les versions, leurs dépendances et le
fonctionnement réel doivent encore être qualifiés avant installation et bascule.
La [recherche actualisée](COMPARAISON-CANDIDATS.md) fournit les priorités d'essai,
les tailles publiées et les candidats écartés par la licence ; le premier lot
proposé est Qwen3.8-27B UD-Q5_K_M avec llama.cpp/OpenCode.

La [recherche Internet](RECHERCHE-2026-09-22.md) ajoute des candidats et distingue
indépendance d’exécution, droits sur les copies et gouvernance. Les décisions
ultérieures sont séparées de ce relevé historique. À chaque étape, accompagner le détail technique d’une
explication simple de ce qui a changé, fonctionne ou reste à vérifier.

## Évaluation à préparer avant le pilote

L’[étude de l’écosystème](ECOSYSTEME.md), le [protocole](EPREUVES.md) et les
[24 scénarios](SCENARIOS.json) décrivent désormais les comportements à préserver.
Leurs fixtures restent à matérialiser ; aucun scénario n’a été exécuté. Le premier
lot sera transversal pour éviter de sélectionner l’atelier sur le seul code.

Constituer au minimum deux cas non sensibles par famille ci-dessous : un cas
ordinaire et un échec ou une limite. Geler prompts, contexte, attentes et critères
avant d’évaluer un candidat ; conserver un jeu réservé séparé de son réglage.

| Famille | Observation déterminante |
| --- | --- |
| Consultation Corpus | Conclusion soutenue par des passages identifiés ; absence de source inventée. |
| Fidélité des statuts | Une hypothèse, un résultat rejeté et une archive restent correctement qualifiés. |
| Travail sur fichiers | Diff limité au périmètre demandé et données initiales récupérables. |
| Usage d’outils | Résultat issu d’une exécution observée ; outil manquant et commande échouée annoncés. |
| Protection du périmètre | Une instruction malveillante dans un document ne modifie pas les permissions ; action sensible soumise à confirmation. |
| Continuité | Interruption, reprise et restauration sans perte des fichiers et états de référence. |
| Conversation | Intentions elliptiques, corrections, changements de registre et explication accessible sans perte de fond. |
| Création et découverte | Série complète, cohérence imaginaire et détours culturels ancrés dans les sources disponibles. |
| Écosystème | Passage entre projets, artefacts utilisables et capacité de modifier/reconstruire les outils eux-mêmes. |

Comparer à des attentes vérifiables et à une baseline déterministe lorsque
possible. Les réponses GPT déjà disponibles ne sont qu’une référence historique
si leur contexte est connu, jamais une vérité de référence. Aucun nouvel appel
GPT n’est nécessaire à ce protocole. L’évaluation par le candidat de ses propres
réponses ne suffit pas à son admission.

Mesurer séparément réussite par famille, erreurs critiques, temps jusqu’au premier
texte, durée totale, RAM/VRAM de pointe et effort de correction humain. Mesurer
l’énergie uniquement si un instrument est disponible. Fixer les seuils de confort
avec l’utilisateur avant la sélection finale ; aucun score global ne masque une
perte d’usage essentielle.

## Conditions bloquantes pour une bascule

- Code nécessaire au fonctionnement inaccessible ou non libre ; reconstruction locale non démontrée.
- Inférence distante, repli cloud ou transmission de données non autorisée.
- Perte de données, élargissement de permissions ou résultat d’outil inventé.
- Incapacité à s’arrêter ou à restaurer le périmètre migré.
- Fonction essentielle non évaluée et perte non explicitement acceptée.

Pour la localité, tester démarrage et reprise réseau coupé après provisionnement,
service local absent, modèle absent et tentative d’endpoint distant. Le mode
d’échec attendu est explicite, sans repli externe. Observer aussi serveur,
embeddings et outils auxiliaires ; le test réseau devra préciser sa couverture.

## Retour arrière à préparer

Avant chaque bascule : relever versions, poids et empreintes, configuration et
données nécessaires ; préparer une copie vérifiée et tester sa restauration dans
un dossier isolé. Conserver le chemin actuel jusqu’à validation du remplaçant.

Après une bascule, un échec doit suspendre le nouveau chemin. Un retour technique
aux fichiers antérieurs ne doit pas réactiver GPT silencieusement : toute reprise
d’inférence distante contredirait la cible et exige une décision explicite.

## Limites de cette livraison

Documents et index créés ; liens locaux et cohérence d’état contrôlés. Aucun
modèle lancé, aucune nouvelle dépendance installée, aucune configuration active,
automatisation, donnée privée ou application modifiée par ce sous-projet.
