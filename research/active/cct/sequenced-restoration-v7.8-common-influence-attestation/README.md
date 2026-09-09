# CCT-EXEC 7.8 — attestation des influences communes (candidate)

La 7.7 distinguait les centres de contrôle ultimes, mais deux centres distincts pouvaient encore agir sous un financeur, un contrat de récompense ou une pénalité commune. La 7.8 exige deux attestations indépendantes du profil d'influences matérielles de chaque découvreur. Si un même digest d'influence apparaît dans tous les profils du quorum, le quorum perd son veto. Des audits divergents ou incomplets ne permettent aucune conclusion.

La confrontation tenue à l'écart relie deux centres distincts au même financeur : leur indépendance juridique ne suffit plus. Les fixtures éprouvent la règle, mais ne prouvent ni l'exhaustivité des profils ni la découverte d'accords secrets.

```bash
node --test test.mjs
node held-out/run-confrontation.mjs
```
