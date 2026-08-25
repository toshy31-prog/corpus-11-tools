# Protocole — écran M vs slowing-down à faible coût

## Question

Un appariement en densité et second moment suffit-il à préserver la pente
énergétique locale pertinente pour une résonance alpha ?

## Objets comparés

- `SD` : distribution isotrope classique `1/(v^3+v_c^3)` tronquée à la vitesse
  de naissance ;
- `M` : Maxwellienne de même densité et même second moment.

Les deux fonds sont calculés en unités `v_birth = n_alpha = m_alpha = 1`.

## Observable

Le seul observable est le ratio de modules de `m dF/dE` à `v_res`.
Il n'est pas un taux de croissance TAE : la géométrie, le pitch, les gradients
radiaux, la structure de mode et l'amortissement ne sont pas contenus ici.

## Fenêtres

- **Balayage mathématique :** `0.05 < v_c/v_birth < 0.95`,
  `0.05 < v_res/v_birth < 0.95`.
- **Fenêtre de sensibilité déclarée :** `0.31–0.53` pour `v_c/v_birth` et
  `0.50–0.65` pour `v_res/v_birth`.

La seconde fenêtre est un test de sensibilité, non un ajustement certifié à
SPARC ou ITER. Elle est motivée seulement par : (i) la formule 50/50 D–T pour
`v_c`, qui donne environ cette plage lorsque `T_e` varie de 10 à 30 keV ;
(ii) un calcul d'ordre de grandeur de `v_A/v_birth` à partir des paramètres
de scénario publiés. Tout usage prédictif exigerait les profils réels.

## Hypothèses rivales et résultat qui les sépare

| Hypothèse | Prédiction sur le ratio |
|---|---|
| M | proche de 1 dans la fenêtre pertinente |
| SD | écart local matériel dans au moins une zone résonante possible |

Un écart n'établit pas le signe d'un TAE. Il renverse seulement l'affirmation
plus faible selon laquelle l'appariement en deux moments rend les deux fonds
cinétiquement interchangeables.

## Sources de modèle

- Vannini et al. 2022, équations 21–22 pour la distribution de ralentissement
  isotrope et `v_c` : https://doi.org/10.1088/1741-4326/ac8b1e
- Di Siena et al. 2026, distributions maxwelliennes dans GENE et paramètres de
  scénarios : https://arxiv.org/pdf/2605.10694
