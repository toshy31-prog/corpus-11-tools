# CCT-EXEC 9.5 — affectation aveugle des sondes de puits (candidate)

La 9.4 permettait au moteur de reconnaître une sonde et de réserver le contrôle strict au chemin de test. La 9.5 engage l'affectation valide ou non frappée avant observation, la révèle seulement après le reçu du puits et exige deux audits indépendants des caractéristiques invariantes. La validité du jeton doit être la seule différence de protocole.

La confrontation tenue à l'écart ajoute un en-tête visible uniquement sur les sondes. L'évidence 9.4 devient inadmissible. Cette barrière synthétique ne prouve pas l'absence d'empreintes latentes ni la résistance à une détection adaptative après répétition.

```bash
node --test test.mjs
node held-out/run-confrontation.mjs
```
