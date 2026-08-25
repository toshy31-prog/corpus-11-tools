# Laboratoire des revendications contestées

Étudie quand plusieurs conclusions restent légitimes face aux mêmes preuves, et
comment conserver un désaccord explicite plutôt que fabriquer un consensus.

Premier test : cas à interprétations rivales, preuves communes et règles de
révision visibles. Une sortie établit seulement la représentation du désaccord
dans le protocole testé.

## Cycle synthétique initial

Un monde sous-déterminé et un contrôle contradictoire sont rejouables avec
`python3 tests/test_initial_protocol.py`. Voir
[`protocols/initial_synthetic_protocol.md`](protocols/initial_synthetic_protocol.md).
Le verdict est formel et ne classe pas une controverse réelle.

## Compatibilité conjointe v0.2

`python3 tests/test_joint_compatibility.py` sépare survie individuelle,
pluralité, intersection conjointe et couverture, puis exécute chaque trace de
révision. Une mutation à identifiants de claim dupliqués est rejetée avant tout
calcul pour empêcher l'écrasement silencieux des statuts; voir
[`protocols/joint_compatibility_v0.2.md`](protocols/joint_compatibility_v0.2.md).
