# CCT-EXEC 5.9 — inclusion dans un journal de transparence (candidate)

Cette couche ferme une lacune de 5.8 : deux gardiens pouvaient signer un paquet avant les résultats sans que son existence soit inscrite dans un engagement append-only vérifiable. Elle exige désormais la chaîne ordonnée suivante : digest du paquet gardé → feuille → preuve de Merkle → racine signée → intégration antérieure à l'accès aux résultats.

Le vérificateur contrôle une preuve bornée à un arbre de deux feuilles, la signature Ed25519 de la tête d'arbre, l'empreinte d'une clé de journal épinglée et la séparation du contrôleur et du domaine de défaillance du journal par rapport aux gardiens. Une confrontation tenue à l'écart altère le chemin de Merkle : la garde 5.8 demeure valide, mais le statut 5.9 est refusé.

Toutes les identités, données, clés et horloges de cette fixture sont **synthétiques**. La candidate vérifie un mécanisme local ; elle n'établit ni l'existence d'un journal externe réel, ni une horloge de confiance, ni l'indépendance réelle de l'opérateur, ni la résistance aux vues divergentes, ni le passage à des arbres plus grands, ni une autorisation ou un déploiement.

## Vérification

```bash
node --test test.mjs
node held-out/run-confrontation.mjs
```
