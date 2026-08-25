# Équivalence modale fonctionnelle fictive

Sépare l’égalité des identifiants d’action, preuve et recours de l’exécution
effective d’une tâche simulée. Les canaux portent opérations, pertes de
transformation, budgets d’étapes et seuils de charge.

`python3 tests/test_functional_modal_tasks.py` produit 1/3 succès de base malgré
des identifiants identiques, puis 2/2 récupérations par réparations déclarées.
Il rejette aussi 4/4 mutations qui retirent ou changent action, preuve et recours
exécutables. Portée `pipeline_verified`.
