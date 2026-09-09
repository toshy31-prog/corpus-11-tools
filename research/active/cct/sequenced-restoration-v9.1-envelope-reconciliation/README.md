# CCT-EXEC 9.1 — rapprochement des enveloppes (candidate)

La 9.0 ne détectait pas une branche omise conjointement par ses deux méthodes d'inventaire. La 9.1 place des observations à l'extérieur du moteur : deux observateurs d'entrée signent les nonces des enveloppes admises et deux observateurs de sortie signent leur terminaison. Chaque nonce admis doit avoir exactement une issue, pour le même exécutable et la même exécution.

La confrontation tenue à l'écart fait traverser une branche dynamique absente de l'inventaire, puis supprime sa terminaison. Le rapprochement refuse l'admission malgré l'accord des traces internes. Il détecte une branche cachée seulement lorsqu'elle reçoit une enveloppe observée ; il ne découvre ni une branche dormante ni une voie qui contourne aussi les observateurs d'entrée.

```bash
node --test test.mjs
node held-out/run-confrontation.mjs
```
