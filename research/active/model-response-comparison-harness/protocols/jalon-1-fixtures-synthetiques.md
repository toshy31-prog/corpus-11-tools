# Protocole — jalon 1

## But et portée

Valider le dispositif, non comparer des modèles. Les seuls textes admis sont
des fixtures synthétiques versionnées. Les résultats établissent uniquement les
propriétés de pipeline déclarées.

## Contrat d'indépendance procédurale

Les jobs `chatgpt` et `codex` reçoivent le même `input_sha256`. Avant que les
deux enveloppes soient scellées, aucun job ne reçoit une réponse, note
d'opérateur, source ou résumé de l'autre. Le harness ne possède aucune
commande de confrontation A↔B.

## Transitions

`draft → input_frozen → awaiting_results → both_sealed → comparison_ready →
reviewed → closed`.

Un job passe par `planned → prepared → output_received → sealed`. Les états
`failed_retryable`, `failed_terminal`, `timed_out`, `cancelled` et
`invalidated` sont terminaux pour une tentative. Une correction crée un nouvel
`attempt_id`, jamais un remplacement de sortie scellée.

## Scellement et anonymisation

Chaque artefact est haché SHA-256 et référencé dans un journal local append-only
chaîné. Cette chaîne rend une incohérence détectable ; elle ne protège pas
contre une personne contrôlant le système de fichiers. Lors de la création du
run, le harness choisit une permutation aléatoire des alias `A` et `B` et la
conserve seulement dans `sealed-manifest.json`. `manifest.json` et le paquet
de revue ne contiennent pas cette correspondance.

`operator_notes` est permis dans une enveloppe de réponse, mais est distinct de
`response_text` et ne peut jamais modifier son hash. Le paquet de revue du
jalon 1 exclut ces notes.

## Cas à vérifier

- réponse manquante : paquet de revue refusé ;
- hash de réponse corrompu : vérification refusée ;
- réponses identiques : paquet permis, divergence optionnelle ;
- différence de formulation : paquet permis, sans verdict automatique ;
- contradiction manifeste : paquet permis, sans arbitrage automatique.

## Autorité

Le mainteneur peut créer ou invalider une fixture. Le réviseur humain est seul
autorisé à écrire une divergence. Aucun résultat ne modifie Corpus, un
transfert, une évaluation produit ou une conversation externe.

## Coût et quotas

Le protocole relève de [`../COST_POLICY.md`](../COST_POLICY.md) : import manuel
depuis les surfaces incluses du compte, zéro appel API requis, zéro achat de
crédits. Atteindre une limite incluse n'autorise aucune substitution payante ;
le run attend ou s'arrête avec une trace explicite.
