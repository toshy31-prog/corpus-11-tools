# Choisir pour le niveau requis, puis vérifier le matériel

Correction du 22 septembre 2026 après retour utilisateur. **Aucun nouveau modèle
choisi, téléchargé ou testé.**

**Note historique de réouverture.** La [recherche élargie suivante](COMPARAISON-CANDIDATS.md)
remplace la liste exploratoire ci-dessous : Qwen3.8-27B devient prioritaire pour
l'essai sur le PC ; DeepSeek-V4-Flash-0731 est la piste ambitieuse de machine dédiée.
Les licences exactes de plusieurs autres nouveautés empêchent leur admission
comme socle libre par défaut. Aucun modèle n'est encore admis après essai.

## Décision corrigée

L'utilisateur indique que le modèle local déjà présent ne lui suffit pas et que
c'est la raison de son usage de Codex. Qwen3 8B est donc **retiré de la sélection
du pilote de remplacement**. Son intégrité sur disque reste un fait d'inventaire.
Il n'est pas nécessaire de refaire un essai de ce modèle pour accepter ce retour.
Ce constat d'usage n'est pas un benchmark universel de Qwen3 8B.

L'erreur de la sélection précédente était de privilégier un démarrage facile
avec un poids déjà téléchargé. La cible est une capacité suffisante pour les
usages Corpus, avec une perte explicitement discutée avant toute bascule.
La mémoire, les méthodes et les outils aident un modèle ; leur ajout ne garantit
pas de combler une insuffisance de compréhension ou de raisonnement.

**En simple :** on choisit d'abord un ensemble à la hauteur du travail ; on vérifie
ensuite ce qu'il faut pour le faire tourner chez soi. Le PC actuel sert de premier
terrain possible, sans devenir le plafond implicite du projet. Aucun achat n'est décidé.

## Nouvelles pistes documentaires

Sources officielles consultées le 22 septembre 2026. Liste courte exploratoire,
non exhaustive ; aucune supériorité sur Corpus ni parité GPT/Codex n'est établie.
Les résultats publiés par les fournisseurs orientent les essais et ne remplacent
pas leur exécution sur nos tâches, avec le format quantifié réellement utilisé.

| Candidat à examiner | Ce que documente la source primaire | Rôle possible et limite |
| --- | --- | --- |
| Qwen3.6-35B-A3B | Apache-2.0 ; texte/image ; 35 milliards de paramètres au total, 3 milliards activés ; améliorations annoncées du travail de code agentique | Piste généraliste et outils à examiner pour le poste actuel en version quantifiée. Qualité française, quantification exacte, latence et compatibilité moteur à qualifier. |
| Qwen3-Coder-Next | Apache-2.0 ; 80 milliards au total, 3 milliards activés ; modèle spécialisé pour agents de code | Piste de spécialiste, pas remplacement automatique de la conversation et de la création. Besoin mémoire nettement supérieur à celui du modèle actuellement présent. |
| Mistral Small 4, 119B-2603 | Apache-2.0 ; texte/image, français, raisonnement et appels de fonctions ; 119 milliards au total, 6,5 milliards activés | Piste polyvalente à étudier avec une machine locale plus dotée. L'adjectif « Small » ne décrit pas son besoin mémoire sur ce PC. |

Sources : [Qwen3.6-35B-A3B](https://huggingface.co/Qwen/Qwen3.6-35B-A3B),
[Qwen3-Coder-Next](https://huggingface.co/Qwen/Qwen3-Coder-Next),
[Mistral Small 4](https://huggingface.co/mistralai/Mistral-Small-4-119B-2603).
Les licences des poids ne prouvent pas une recette d'entraînement intégralement
reproductible ni la liberté de toutes les dépendances du poste.

## Faisabilité : ne pas confondre calcul et stockage

Le relevé local conservé indique environ 31 Gio de RAM ; l'accélération GPU n'y
est pas qualifiée. Voir [OBSERVATIONS-2026-09-22.json](OBSERVATIONS-2026-09-22.json).
Pas de nouveau relevé de disponibilité ou de vitesse effectué pour cette note.

Ordres de grandeur calculés, **pas tailles de fichiers ni besoins RAM mesurés** :
à exactement 4 bits par paramètre, 35 milliards représentent environ 16,3 Gio,
80 milliards 37,3 Gio, 119 milliards 55,4 Gio. Il faut encore compter métadonnées,
précisions mixtes, caches de contexte, moteur, système et autres applications.
Une quantification plus agressive peut diminuer la taille et aussi dégrader les
résultats ; elle ne résout pas gratuitement le compromis de qualité.

Le petit nombre de paramètres *activés* réduit certains calculs ; il ne signifie
pas que seuls ces paramètres doivent être disponibles en mémoire ou sur disque.
Le dépôt officiel Mistral NVFP4 affiche à lui seul environ **70,8 GB** de fichiers.
Cette variante ne constitue pas une solution chargée entièrement dans les 31 Gio
de RAM observés. Le chargement réparti et la vitesse resteraient des questions
distinctes. [Fichiers officiels](https://huggingface.co/mistralai/Mistral-Small-4-119B-2603-NVFP4/tree/main).

## Deux voies à comparer

1. **Poste actuel** : vérifier une quantification précise de la piste 35B, son
   support réel et sa marge mémoire avec un contexte utile. Ne pas confondre
   « arrive à charger » avec « permet de travailler confortablement ».
2. **Machine dédiée locale** : dimensionner RAM/VRAM, débit mémoire, stockage,
   énergie et pile logicielle libre autour des candidats qui passent les critères
   de qualité. Aucun devis, achat ou remplacement matériel n'est encore proposé.

La décision doit retenir simultanément qualité, temps jusqu'au résultat utile,
maîtrise hors ligne et coût matériel. Un ensemble de petits modèles n'est pas
présumé égal à un modèle plus capable ; cette composition doit faire ses preuves.

Les [24 scénarios](SCENARIOS.json) restent le point de départ. Les défauts concrets
déjà rencontrés avec le modèle local pourront les enrichir, sans obliger
l'utilisateur à refaire un diagnostic pour justifier son insatisfaction.
Prochaine étape : vérifier les artefacts précis et conditions matérielles de la
liste courte, puis préparer un lot d'essai représentatif. OpenCode et llama.cpp
restent des candidats d'atelier/moteur dont l'admission dépendra du modèle retenu.
