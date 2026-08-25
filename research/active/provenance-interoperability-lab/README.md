# Laboratoire d’interopérabilité des preuves

## Objet

Tester si une conclusion Corpus, ses sources, ses transformations, sa portée et
sa condition de retrait survivent à un échange entre outils et formats de
provenance externes.

## Premier test

Exporter un cas minimal dans PROV et RO-Crate, le réimporter par un adaptateur
indépendant, puis comparer attribution, transformations, portée synthétique et
condition de renversement.

## Conclusion autorisée

Une réussite établit seulement une conservation sémantique pour les formats,
adaptateurs et champs effectivement testés. Elle n’établit pas une
interopérabilité universelle.

Voir [`state/current_state.md`](state/current_state.md).

## Cycle synthétique initial

Le reçu minimal, les deux profils locaux et leur limite sont documentés dans
[`protocols/initial_synthetic_protocol.md`](protocols/initial_synthetic_protocol.md).
Exécution : `python3 tests/test_initial_protocol.py`. Le résultat est limité à
la vérification de pipeline des adaptateurs locaux.
