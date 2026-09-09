# CCT-EXEC 6.3 — résistance au retour arrière des checkpoints (candidate)

La cohérence Merkle de 6.2 prouve qu'une tête prolonge une tête antérieure, mais ne distingue pas un nouveau checkpoint d'un ancien checkpoint signé rejoué après acceptation d'une tête plus récente. Ni la signature, ni une horloge murale déclarée, ni l'accord répété des mêmes témoins ne suffisent à détecter ce retour arrière.

Cette candidate épingle localement la dernière taille et racine acceptées. Une nouvelle tête n'est admissible que si sa preuve 6.2 part exactement de cet état, augmente strictement la taille et est intégrée après l'enregistrement local. L'acceptation produit le prochain état à épingler. La confrontation tenue à l'écart rejoue une tête signée qui demeure valide sous 6.2 après avancement du pin : 6.3 la refuse.

Le gain dépend d'une mémoire locale durable et non réinitialisée. Une restauration depuis une sauvegarde ancienne, la corruption coordonnée des pins ou une partition entre observateurs ne sont pas résolues et doivent provoquer un refus plutôt qu'une prétendue fraîcheur.

## Vérification

```bash
node --test test.mjs
node held-out/run-confrontation.mjs
```
