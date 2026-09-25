# État courant

Le contrôle initial ne vérifiait que jetons et décisions ; sa revendication sur
quatre dimensions est `weakened`. Les nouveaux journaux dérivent le changement
depuis les états avant/après, conservent un événement à rendement nul et
attribuent la charge. Le protocole structuré domine les trois composantes de
coût avec même question explicite, mêmes états et mêmes identifiants de sortie.
Deux mutations empêchent la comparaison quand la question ou une sortie change.
Portée `pipeline_verified`.

## Prochaine action interne utile

Le [rival coût–délai](../protocols/2026-09-19-cost-delay-rival.md) a été exécuté
localement le 19 septembre 2026. À question, états et sorties identiques :
600 contre 900 jetons, 52 contre 32 minutes et 5 appels dans les deux cas.
Le verdict est `tradeoff`, dans les deux sens de comparaison. La mutation qui
perd une sortie distincte est `unmatched`, malgré une décision finale identique.
Dominance historique, égalité et refus d'une autre question restent contrôlés.
Ces valeurs sont construites, non mesurées sur une recherche réelle ; le résultat
établit le comportement du comparateur sur ces fixtures seulement.

Le [contrôle des contenus](../protocols/2026-09-19-output-content-gate.md) a
ensuite été exécuté sur quatre tests fictifs. L’ancien appariement accepte des
textes différents sous un même identifiant ; le nouveau contrôle renvoie
`unmatched_content`. Un contenu manquant ou contradictoire donne `content_unknown`
et suspend le classement. Dominance historique et compromis restent conservés
quand les contenus sont identiques. Une différence d’espace est détectée : il
s’agit d’identité des octets, pas d’équivalence de sens, qualité ou vérité.

Contrôle reproductible :
`python3 research/active/research-footprint-and-yield-lab/tests/test_output_content_gate.py`.
Ce contrôle est également déclaré dans le portefeuille sous
`footprint_output_content` et exécuté par ses validations sûres.

Arrêter cette série de variations fictives. Une prochaine extension exige un
journal réel autorisé ou un besoin distinct capable de changer la conclusion.
Aucun classement général de méthodes n’est établi.
