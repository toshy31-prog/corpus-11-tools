# Survie individuelle et compatibilité conjointe v0.2

Le protocole a été fixé avant exécution. Sa portée est `formal_exact`.

Le générateur construit trois espaces finis de mondes, calcule séparément la
survie de chaque claim, le nombre de survivants, leur intersection conjointe et
la couverture de l'espace. Une trace de révision est une opération exécutable
`intersect` ou `union`, jamais une chaîne descriptive. Les invariants sont la
non-réintroduction implicite d'un monde, l'unicité des identifiants de claim et
le recalcul complet après révision.

Les contrôles distinguent survivants mutuellement exclusifs, survivants avec un
monde commun, contradiction rouverte et duplication d'identifiants rejetée
avant création du dictionnaire de statuts. Le protocole définit lui-même les
mondes; il ne mesure aucune légitimité de désaccord hors modèle. Retirer le
résultat si une pluralité exclusive est dite conjointement compatible ou si la
trace exécutée ne produit pas le verdict annoncé, ou si deux claims de même ID
sont silencieusement fusionnés.
