# CCT-EXEC 6.2 — cohérence générale du journal (candidate)

La couche 6.1 ne vérifiait qu'une extension spéciale de taille 2 vers 3. Cette candidate introduit la construction et l'algorithme de vérification des preuves de cohérence Merkle de la RFC 9162 pour toute paire `0 < ancienne_taille < nouvelle_taille`. La première feuille du nouvel arbre engage explicitement la racine 6.1 et une preuve d'inclusion relie cette ancre à l'ancienne tête ; la nouvelle tête reste signée par la clé de journal épinglée avant l'accès aux résultats.

Les tests couvrent six couples de tailles, dont des arbres complets et non complets. Trois vecteurs numériques figés dérivent en outre de l'exemple symbolique `d0…d6` de la [section 2.1.5 de la RFC 9162](https://www.rfc-editor.org/rfc/rfc9162.html#section-2.1.5). Un second vérificateur Python, écrit sans importer le runtime ni le générateur JavaScript, consomme ces mêmes vecteurs. Il accepte les trois chemins et refuse chaque corruption d'un nœud, ainsi que les mutations de racines, tailles et longueur de preuve. Cette réplication inter-runtime réduit le risque qu'une même erreur d'implémentation s'auto-confirme ; elle reste bornée à trois vecteurs et ne vaut ni revue indépendante ni interopérabilité avec un journal externe. La confrontation tenue à l'écart conserve par ailleurs un checkpoint correctement signé qui passe 6.1, mais corrompt un nœud du chemin de cohérence : 6.2 le refuse.

Les feuilles, clés et ticks restent synthétiques. Le mécanisme établit l'exécution locale de la vérification générale, pas l'existence d'un journal externe, une horloge fiable, la résistance aux partitions, l'autorisation, le déploiement ou la robustesse externe.

## Vérification

```bash
node --test test.mjs
python3 -m unittest -v test_independent_verifier.py
node held-out/run-confrontation.mjs
```
