# Évaluation A v0.1 — baseline lexical fermé

Le routeur lexical existant sélectionne des capacités mais ne fournit pas les
trois champs exigés par A (route déclarée, limite de portée, retrait). Le
routeur neuronal disponible est explicitement non retenu. Cette campagne utilise
donc un baseline minimal : six catégories synthétiques gelées, des ancres
lexicales FR/EN/DE et des gabarits de sortie déclarés.

Ce n’est ni un modèle, ni une interprétation intelligente, ni une évaluation
de robustesse. Il ne lit ni identifiant de requête ni attente pendant le
routage ; il ne sait produire aucune sortie hors des six catégories gelées.
Toute entrée inconnue s’arrête fermée.

`pre_execution_manifest_v0.1.json` et son sceau lient le protocole, fixture,
code, inventaire, attentes, runtime et versions avant la seule exécution des
18 requêtes. Le runner s’arrête au premier écart éliminatoire, refuse
l’écrasement et interdit une conclusion factuelle dans la sortie A.

La sortie ne peut pas justifier d’intégration plugin, de déploiement, de
validation externe ni d’assertion sur la robustesse conversationnelle.
