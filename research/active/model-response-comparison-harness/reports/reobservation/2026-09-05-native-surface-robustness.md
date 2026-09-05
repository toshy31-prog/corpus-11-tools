# Robustesse d'usage — `corpus-native-conversation` développement

## Portée

Le plugin stable `corpus-11-tools` est inchangé. Seul le plugin de
développement `corpus-native-conversation-dev` a été mis à jour et réinstallé,
en version `0.1.0+codex.20260904235116`.

Le nouvel outil `tools/conversation_run.py` ne route ni n'analyse. Il tient un
journal local, par question brute, avec des tentatives immuables :

`prepared` → `analysis_started` → `verified`

Une nouvelle préparation réutilise une tentative `verified` après vérification
du paquet et du rendu ; une tentative incomplète reste en place et mène à une
nouvelle tentative numérotée.

## Tests

| Cas | Résultat | Établi |
|---|---|---|
| interruption après `analysis_started` | `attempt-001` conservée, nouvelle `attempt-002` réservée et terminée | oui |
| reprise | même question → `resume_verified`, même rendu, aucune nouvelle tentative | oui |
| affichage tronqué simulé | `recover` relit le rendu vérifié et restitue sa conversation | oui |
| espace non inscriptible | `prepare --root /sys/...` refuse avant analyse | oui |
| tour Codex lecture seule | le skill chargé appelle `prepare`, reçoit l'échec, et répond qu'aucune analyse Corpus n'a été produite | oui |
| tour Codex après affichage antérieur tronqué | `prepare` retourne `resume_verified` et Codex affiche la conversation vérifiée sans router | oui |

Les 15 tests Python de `native_surface/tests` passent. Ils couvrent en plus
l'altération de paquet/rendu, les trois niveaux de détail, le refus de champs
critiques manquants ou dupliqués, et le journal de robustesse.

## Erreur trouvée et corrigée

Le premier essai du skill mis à jour appelait `prepare` sans
`--raw-prompt`. L'agent recevait donc une erreur d'arguments avant analyse.
Les instructions du skill indiquent maintenant la commande complète, puis le
plugin de développement a été rechargé. L'essai suivant charge cette version et
exécute le prévol correctement.

## Limites restantes

- La reprise est locale au répertoire de journal et à une question brute
  identique ; elle ne fusionne jamais deux analyses distinctes.
- Une tentative qui échoue pendant `complete` n'est pas écrasée. La reprise
  crée une autre tentative ; elle ne reconstitue pas l'analyse interrompue.
- Le flux JSONL de `codex exec` peut encore tronquer son affichage. Le rendu
  vérifié permet la récupération, mais l'observabilité du flux client n'est pas
  elle-même corrigée.
- Le déclenchement reste explicitement demandé par
  `$corpus-native-conversation`, conformément au périmètre actuel.

## Statut

Statut : **`observed`**.

La reprise, le refus en lecture seule et la restitution d'un rendu existant
sont observés à la fois par tests déterministes et, pour les deux derniers,
dans un tour Codex réel. Ce n'est toujours ni portable ni stable : il faut
encore multiplier les observations sur machines et environnements Codex
indépendants avant toute promotion.
