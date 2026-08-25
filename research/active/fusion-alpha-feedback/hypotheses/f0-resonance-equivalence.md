# Hypothèse : équivalence de distribution alpha au voisinage résonant

## Formulation

Dans un modèle isotrope sans géométrie, comparer :

\[
F_{SD}(v)=\frac{A}{v^3+v_c^3}\,\mathbf{1}_{0\le v\le v_b}
\]

à une Maxwellienne `F_M` qui a le même nombre et le même second moment.
L'observable est le ratio de pentes énergétiques au point résonant :

\[
R(c,s)=\frac{\partial_E F_{SD}(v=s v_b)}
              {\partial_E F_M(v=s v_b)},
\qquad c=\frac{v_c}{v_b},\quad s=\frac{v_{res}}{v_b}.
\]

Les deux pentes sont négatives dans le modèle ; le script rapporte le ratio de
leurs modules. `R=1` serait une correspondance locale parfaite de cet unique
facteur, pas une preuve d'équivalence physique.

## Statut

active, mais seulement comme **critère de sélection** pour un test contrôlé.
Les comparaisons élémentaires SD/Maxwellienne sont déjà publiées ; ce fichier
ne les présente pas comme une innovation.

## Hypothèses concurrentes

- **M :** l'appariement en nombre et second moment conserve assez bien le
  facteur de pente dans la fenêtre résonante.
- **SD :** il ne le conserve pas, car les distributions ont des formes et des
  coupures de naissance différentes.

## Prédictions discriminantes

- M prédit `R` proche de 1 dans la fenêtre de résonance pertinente.
- SD prédit des régions avec un écart net ; le signe du gain TAE total reste
  inconnu car il dépend aussi des gradients, du pitch, de l'amortissement et de
  la géométrie.

## Condition de renversement

Une convergence des deux pentes sur un domaine de paramètres relié à un
scénario réel affaiblirait SD pour cet observable. Un écart de grande ampleur
affaiblirait M et imposerait le test global à `F0_alpha` explicite. Le test à
valeur ajoutée serait spécifiquement la matrice `{SD, M canonique}` ×
`{représentation ZOW, représentation FOW}` à profils et mode TAE identiques,
avec une règle de matching déclarée. Elle n'a pas été trouvée dans l'audit
public, sans que cela démontre sa nouveauté.

## Méthodes nécessaires

- intégration numérique 1D déterministe, sans dépendance externe ;
- contrôles de normalisation et de second moment ;
- ultérieurement, paramètres de scénario et calcul gyrocinétique seulement si
  le résultat de l'écran peut changer la décision.

## Sources

- Di Siena et al., *How Fusion-Born Alpha Particles Suppress Microturbulence in
  Burning Plasmas* (2026), https://arxiv.org/pdf/2605.10694
- Vannini et al., *Nuclear Fusion* 62, 126042 (2022),
  https://doi.org/10.1088/1741-4326/ac8b1e
- Wilkie et al., *Journal of Plasma Physics* 81, 905810306 (2015),
  https://doi.org/10.1017/S002237781400124X
- Fitzgerald et al., *Nuclear Fusion* 63, 112006 (2023),
  https://doi.org/10.1088/1741-4326/acee14
- Di Siena et al., *Physics of Plasmas* (2018),
  https://doi.org/10.1063/1.5020122

## Dernière mise à jour

2026-08-24
