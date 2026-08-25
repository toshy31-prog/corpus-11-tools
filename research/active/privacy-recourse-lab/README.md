# Laboratoire confidentialité et recours

Teste comment rendre une preuve vérifiable et contestable sans exposer plus de
données sensibles que nécessaire.

Premier test : même dossier de recours sous divulgation complète, minimale et
graduée ; comparer capacité d’audit, protection et réparation. Une réussite ne
vaut que pour le canal et la menace testés.

## Cycle synthétique initial

Les trois profils de divulgation fictifs sont contrôlés avec
`python3 tests/test_initial_protocol.py`. Voir
[`protocols/initial_synthetic_protocol.md`](protocols/initial_synthetic_protocol.md).
Ils ne démontrent aucune confidentialité ni recours effectif hors du pipeline.

## Taints et automate v0.2

`python3 tests/test_taint_recourse_model.py` propage des taints déclarés à
travers des copies ou inclusions textuelles exactes dans le dossier fictif et
rejoue un chemin de recours jusqu'au remède. L'identité copiée sous un champ
autorisé est détectée sans annotation ajoutée au cas négatif; ce n'est pas un
classifieur général de texte sensible. Les artefacts vides ne passent plus; voir
[`protocols/taint_recourse_v0.2.md`](protocols/taint_recourse_v0.2.md).
