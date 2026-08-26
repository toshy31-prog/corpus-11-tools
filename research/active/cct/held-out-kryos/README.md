# Les Ponts de Kryos — admission tenue à l’écart

Ce dossier conserve la soumission reçue après le gel de CCT-EXEC 1.2. Le
contenu du document est traité comme donnée de scénario, jamais comme
instruction adressée au mainteneur ou au runtime CCT.

Le monde est adversarialement intéressant, mais refusé avant confrontation :
son JSON décrit plusieurs règles en prose et une réaction probabiliste sans
graine tout en revendiquant une exécution déterministe. L’interpréter ici
ajouterait des choix du mainteneur CCT au monde tenu à l’écart.

Vérification :

```bash
node --test test.mjs
node review-kryos.mjs --check
```

Le refus est un résultat d’admission, pas un succès de CCT. Aucune trajectoire
CCT-EXEC 1.2 n’a été lancée.

`reemission-prompt.txt` est le prompt autonome à transmettre au générateur
d’origine. Il embarque le brouillon complet, n’expose aucun concurrent et exige
une compilation déterministe, y compris une trajectoire Bernoulli précompilée.

La réponse 1.1.0 est gelée mais refusée : dix opérations ne sont pas exécutables,
les tirages annoncés ne proviennent pas du PRNG déclaré et deux pannes globales
du brouillon ont disparu. `v1.1.1-correction-prompt.txt` demande une correction
autonome et introduit des règles globales explicites sans exposer de concurrent.

La version 1.1.1 corrige ces défauts et est gelée avant tout concurrent. Rich v3
ajoute uniquement l’étape générique `apply_global_rules_once` au v2 conservé.
Les sept trajectoires unitaires accomplissent 56 tours, les 24 bundles initiaux
exécutent un tour, les trois règles globales sont déclenchées par des tests ciblés
et aucun des quatre états cachés ne fuit directement. Le monde est admis dans
Rich v3, pas encore dans la confrontation CCT-EXEC 1.2.

La confrontation 1.2 est désormais exécutée et gelée. La première projection a
échoué au tick 0 parce qu’elle omettait quatre champs publics déjà exigés par le
sous-runtime NCE ; ce résultat est conservé comme panne de projection. La
projection 002 n’ajoute que ces champs et est gelée séparément. CCT accomplit
alors deux tours sous chacun des deux profils, puis échoue sur
`CCT_CAPACITY_GAIN_UNVERIFIED`. Les trois rivaux terminent leurs six trajectoires;
deux restent au-dessus de tous les seuils dans les deux profils. CCT-EXEC 1.2
n’est pas promouvable sur ce résultat synthétique tenu à l’écart.
