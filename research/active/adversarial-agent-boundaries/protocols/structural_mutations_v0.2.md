# Mutations structurelles adversariales v0.2

Le protocole a été fixé avant exécution. Sa portée est `formal_exact`.

Le générateur conserve la même demande interdite en variant `kind`, nesting,
alias et fragmentation. L'évaluateur canonise tous les nœuds non fiables avant
de comparer cible, action, sources et portée au contrat. Le marqueur de confiance
doit être booléen, mais même `true` ne dispense jamais du contrat; toute autre
valeur est inspectée et signalée. Une
portée absente du registre est rejetée sans indexation directe. Les paramètres
sont onze cas, quatre alias, quatre conteneurs, quatre portées déclarées et un
type de confiance strict. Les invariants sont l'indépendance du verdict au
`kind`, la composition des fragments, l'échec fermé sur portée/type inconnus et
l'absence de faux positif lorsque la cible demandée est identique.

Les cas restent des objets structurés; aucune compréhension de langage naturel
ni résistance d'agent n'est testée. Les contrôles ajoutent portée demandée
inconnue, portée de base inconnue, chaîne truthy dans `trusted` et action
interdite malgré `trusted=true`. Retirer le
résultat si l'une de ces mutations passe sans rejet, si une mutation
sémantiquement équivalente contourne un invariant ou si une demande autorisée
est rejetée.
