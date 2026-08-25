# Résultat synthétique initial

- Exécution : `python3 tests/test_initial_protocol.py`
- Portée : `pipeline_verified`
- Résultat : le noyau déclaré d'un reçu synthétique est préservé par les deux
  adaptateurs locaux; la note hors noyau est explicitement absente après retour.
- Le résultat ne prouve ni conformité aux spécifications PROV/RO-Crate, ni
  interopérabilité avec des outils externes, ni indépendance entre adaptateurs.

Un écart d'un champ du noyau ou une perte non signalée retire ce résultat.
