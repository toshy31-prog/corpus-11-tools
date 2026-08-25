# Limites adversariales des agents de recherche

## Objet

Mesurer si un agent outillé conserve la question, les sources admissibles, les
limites de conclusion et les autorisations face à des documents, outils ou
instructions qui cherchent à détourner son processus.

## Premier test

Construire des paires appariées d’entrées ordinaires et adversariales, puis
vérifier les changements de cible, de source, d’action et de conclusion.

## Conclusion autorisée

Un échec ou une résistance établit une propriété du scénario, de l’agent et de
l’outillage testés ; ce n’est pas une garantie générale de sécurité.

Voir [`state/current_state.md`](state/current_state.md).

## Cycle synthétique initial

Le corpus de quatre entrées et l'oracle de frontière déterministe sont décrits
dans [`protocols/initial_synthetic_protocol.md`](protocols/initial_synthetic_protocol.md).
Exécution : `python3 tests/test_initial_protocol.py`. Il ne formule aucune
garantie de sécurité d'un agent réel.
