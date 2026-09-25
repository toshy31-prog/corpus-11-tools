# Critères d'acceptation

Le patch est accepté uniquement si :

- `node --check public/app.js` passe ;
- tests cibles passent ;
- suite complète passe ;
- audit dit `READY FOR UI SMOKE TEST` ;
- au reload, Explorer est neutre ;
- Kosh n'est pas actif sans action ;
- le graphe reste présent ;
- la bibliothèque reste présente ;
- le Carnet reste présent ;
- choisir un nouveau seed fonctionne ;
- aucune écriture destructive n'est nécessaire.

Si l'un de ces points échoue : rollback.
