# Graphes fictifs de dépendance v0.2

Le protocole a été fixé avant exécution. Sa portée est `pipeline_verified`.

Le générateur construit quatre DAG de lignage et remonte les ancêtres de deux
terminaux de preuve. Les paramètres sont données, générateurs, seeds, codes,
oracles, résultats et empreintes de dépendance déclarées. Les invariants sont
l'acyclicité, l'unicité des identifiants, l'existence de chaque parent, la
présence d'une empreinte pour chaque dépendance matérielle et le regroupement
par `(kind, fingerprint)` plutôt que par nombre d'artefacts ou seul identifiant.

Les contrôles distinguent nouveaux seeds d'un même générateur, nouveau code sur
mêmes données, deux pipelines fictifs disjoints et deux identifiants de
générateur portant la même empreinte. L'effet de méthode vient des empreintes
déclarées : leur équivalence n'est pas découverte par le test.
`procedurally_separated` ne signifie jamais preuve indépendante extérieure.
Retirer le résultat si une empreinte commune est ignorée ou si une différence
d'identifiant suffit à établir la séparation.
