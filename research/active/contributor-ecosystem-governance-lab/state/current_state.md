# État courant

L’ancien verdict `trace_complete` est `weakened` : la fixture ne portait aucun
horodatage et ses verdicts d’autorité étaient constants. L’automate fictif
valide le cycle complet, rend le veto utilisable dans 6/6 états actifs et rejette
42/42 mutations de rôle. Le veto et le recours restent deux chemins distincts.
Portée `formal_exact`.

## Prochaine action interne utile

Ajouter doubles rôles et abandon, puis modéliser séparément une éventuelle voie
de contestation du veto sans supposer qu'elle existe dans l'automate courant.
