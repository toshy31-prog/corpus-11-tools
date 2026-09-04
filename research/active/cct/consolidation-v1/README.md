# CCT 1.0 candidate — consolidation auditée

Ce dossier devient la source de vérité pour l'identité, la lignée et les
frontières entre le projet CCT, son modèle politique, sa constitution locale,
son noyau exécutable et ses laboratoires.

Il ne duplique pas les sources spécialisées. Il les compose en déclarant leur
autorité, leurs restes et leurs contradictions :

- `cct-1.0-candidate.json` — identité, couches, invariants et blocages ;
- `lineage-ledger.json` — registre 0.1→CCT-NCE 0.14 ;
- `NON-REGRESSION.md` — résultat humain de l'audit ;
- `validate_consolidation.py` — validation de structure, sources et gel ;
- `test_consolidation.py` — mutations négatives.
- `validation.json` — résultats locaux et incident de gel détecté puis réparé.

```bash
python3 validate_consolidation.py
python3 -m unittest -v test_consolidation.py
python3 verify_freeze.py
```

Le statut maximal est `written_and_locally_validated_composite`. Une source de
vérité cohérente ne constitue pas encore un exécutable total ni une validation
politique ou territoriale.
Le gel `cct-1.0-freeze.json` fixe l'état audité, sans en augmenter le statut.

La révision politique candidate postérieure est
[`../CCT-POL-1.1-apports-2026-09-04.md`](../CCT-POL-1.1-apports-2026-09-04.md).
Elle ne modifie pas ce gel et n'est pas encore intégrée au candidat exécutable.
