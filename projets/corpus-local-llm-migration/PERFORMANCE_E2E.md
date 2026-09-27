# Latence de l’épreuve agentique locale

## Mesure observée

Le reçu durable du 27 septembre est analysé localement par `e2e_timing.py`.
Il sépare le temps des tours assistant du temps réellement attribuable aux
outils, sans reconstruire de tokens ni appeler le modèle.

Pour `durable-e2e-20260927.json` :

- durée du transcript : 332,187 s ;
- tours assistant : 332,143 s ;
- exécution des quatre appels d’outils : 0,174 s ;
- tours assistant hors exécution d’outil : 331,969 s.

Les journaux du fournisseur enregistrent quatre appels : 208,766 s, 113,960 s,
3,159 s et 5,243 s. Les deux premiers représentent 322,726 s. Le goulot est
donc bien le calcul Qwen autour des premières décisions, pas l’édition ni le
test. Les durées de tours incluent encore une part inconnue de protocole : elles
ne sont pas des débits de tokens.

## Réglages observés

Le profil en cours garde `-np 1`, `-b 256`, `-ub 256`, `-ngl 99`, `--cpu-moe`,
`--load-mode none`, contexte 16 384 et `--reasoning-budget 512`. La fusion CUDA
reste désactivée car elle contournait un chemin de plantage observé. Aucun de
ces réglages n’est modifié par cette note.

## Pistes classées, pas activées

1. **Raisonnement direct** — le binaire local indique que `--reasoning-budget
   0` clôt immédiatement le raisonnement, alors que le profil direct désactive
   déjà le thinking dans le template. Une épreuve future devra comparer 512 et
   0 sur le même scénario avec les mêmes critères de réussite ; aucune baisse
   de qualité ne peut être présumée.
2. **Préfixe partagé** — llama.cpp active le cache de prompt par défaut, mais
   `--cache-reuse` vaut 0 par défaut. Une mesure devra établir si les requêtes
   successives d’OpenCode présentent un préfixe réutilisable avant d’activer ce
   levier. Le cache RAM existe déjà par défaut dans le serveur ; sa présence ne
   prouve pas une réutilisation dans cette conversation.
3. **Lots** — les valeurs courantes, 256/256, sont sous les valeurs par défaut
   annoncées par le binaire. Les augmenter peut accélérer le prefill mais risque
   de dépasser la VRAM ou de rouvrir le plantage CUDA ; test isolé seulement,
   jamais combiné avec les deux pistes précédentes.

Les sources amont confirment les options de cache et de lots ; elles ne donnent
aucun résultat garanti pour cette RTX 4070 Laptop ou ce modèle MoE. Références :
[serveur llama.cpp](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md),
[réglages CUDA llama.cpp](https://github.com/ggml-org/llama.cpp/blob/master/docs/build.md),
[configuration llama-swap](https://github.com/mostlygeek/llama-swap/blob/main/docs/configuration.md).

## Observation du préfixe, sans inférence

Le pont local enregistre désormais seulement des compteurs agrégés de
continuités de conversation : une continuité devient un **candidat** lorsque
son modèle, masque d’outils, variante et instructions système sont identiques.
Le tour en cours (horodatage, question, résultat d’outil, documents) reste du
suffixe et ne fausse donc pas ce signal. Le texte, les pièces jointes, les
identifiants de session et leurs empreintes ne sont jamais écrits. Un candidat
ne prouve ni que llama.cpp a reconnu le préfixe rendu, ni qu’il a lu son cache
KV ; il indique uniquement qu’une future épreuve `--cache-reuse` peut être
justifiée.

Les mêmes compteurs retiennent seulement la taille agrégée des corps JSON
routés (moyenne et maximum). Ce n’est ni un décompte de tokens ni une mesure du
contexte finalement traité par le serveur, mais cela permet de relier les
futures latences observées à la taille de la demande sans conserver le texte.

Les statistiques distinguent également les tokens ordinaires des lectures et
écritures de cache déclarées par le moteur. Ces valeurs peuvent signaler une
réutilisation effective, mais ne prouvent pas seules le cache KV : elles restent
une télémétrie fournisseur à rapprocher de l’épreuve A/B et de son reçu. Le
nombre de tours qui déclarent chaque lecture ou écriture est affiché avec le
volume, pour éviter qu’un unique échange massif soit interprété comme un gain
généralisé.

Les durées médianes des étapes avec et sans lecture de cache déclarée sont aussi
calculées localement sur l’historique disponible. Elles servent à repérer une
différence à étudier, pas à attribuer cette différence au cache : les demandes,
leurs contextes, sorties et outils ne sont pas contrôlés dans ces données.

Le compteur est consultable dans **Paramètres → Utilisation et ressources**.
La décision A/B et ses critères de refus sont documentés dans
`PERFORMANCE_EXPERIMENT_PROTOCOL.md`. Ces deux éléments n’activent aucun
réglage et ne lancent aucune requête modèle.
