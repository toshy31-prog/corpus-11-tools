# Protocole fixé avant exécution — journaux de décision générés

## Portée et générateur

`pipeline_verified`. Deux journaux fictifs portent le même `question_id`
explicite et partagent état initial, état final et ensemble exact d'identifiants
de sortie. Chaque événement porte décision avant/après, jetons, minutes, appels,
sortie et porteur de charge.

## Paramètres, invariants et contrôles

Le changement est calculé par différence d’état, jamais fourni comme score. Un
événement inchangé avec sortie dupliquée est conservé comme contrôle à rendement
nul. Les unités restent séparées et les sorties sont dédupliquées. Deux mutations
changent tour à tour la question et une sortie : elles doivent rendre les
journaux non appariés avant toute comparaison de coût.

## Effet et retrait

Les journaux produisent leurs propres coûts ; la dominance ne vaut que pour ces
fixtures. Retirer le verdict si `question_id`, états ou identifiants de sortie ne
sont plus appariés, si une dimension est agrégée silencieusement ou si
l’événement nul disparaît.
