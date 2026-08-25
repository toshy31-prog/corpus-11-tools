# Résultat — coupures et reprise

- Portée : `pipeline_verified`.
- Générateur : quatre étapes et artefacts SHA-256 déterministes.
- Résultat positif : 4/4 coupures reconstruisent exactement les champs
  matériels quand la dépendance est sérialisée.
- Contrôle négatif : omettre `execution_dependency` change les hashes et fait
  passer la décision de `retain-two-rivals` à `collapse-to-one`.

Conclusion : la reprise est vérifiée seulement pour l’état complet déclaré.
L’ancienne égalité de deux objets fournis était une fixture tautologique.
