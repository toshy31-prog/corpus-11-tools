# CCT-EXEC 7.1 — clôture de réparation réobservée (candidate)

La 7.0 exigeait correction et réparation mais acceptait encore un simple identifiant. La 7.1 exige un engagement adressé par contenu, puis deux attestations signées indépendantes sur un même artefact d'exécution et sur trois effets séparés : éligibilité restaurée, correction publiée et compensation transférée. Les deux attestations doivent emprunter des canaux et domaines de panne distincts, sans contrôleur commun avec observateurs, sélecteurs ou adjudicateurs.

La confrontation tenue à l'écart restaure l'accès et publie la correction mais nie le transfert compensatoire : la clôture est refusée. Les fixtures établissent seulement une barrière synthétique contre la clôture documentaire ; elles ne prouvent ni observation réelle, ni adéquation de la compensation, ni indépendance institutionnelle effective.

```bash
node --test test.mjs
node held-out/run-confrontation.mjs
```
