# Invariants de sécurité d'état

1. Explorer peut fonctionner avec `resumableDig != null` et `activeDig.seed == null`.
2. Restaurer un backup ne doit jamais mettre `activeDig.seed`.
3. Un ancien `activeDig` importé ne reçoit pas automatiquement un timestamp présent.
4. `renderActiveSeed()` doit accepter l'état vide.
5. Le graphe ne doit pas être effacé quand Explorer est neutralisé.
6. Le Carnet ne doit pas être effacé.
7. Les caches fournisseur ne doivent pas être effacés.
8. `useVideoAsSeed()` doit continuer à créer un état actif normalement.
9. Une reprise explicite future doit être la seule transition recovery -> active.
10. Les tests doivent distinguer présence d'une reprise et activation d'une reprise.
