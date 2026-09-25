# État courant

Dernière mise à jour : 2026-09-19

## Statut

`weakened`. Les trois séquences initiales restent `model_internal`, mais la
politique `tombstone_wins` n’est pas confluente dans l’implémentation : 12 des
162 couples état–source–politique dépendent uniquement de l’ordre des cibles.
La projection observée est une présence de payload logique, jamais physique.

Le rival atomique v1 est désormais exécutable. Sur le même espace complet :
0 dépendance à l'ordre et 12 écarts au séquentiel. Sur 324 cas à une seule
cible : aucune différence de payload ; le nœud exclu reste inchangé.
Le contre-exemple A=payload, B=tombstone, C=payload avec contact A→B laisse
C=payload. L'atomicité ne prouve donc pas l'absence globale de payload.
Voir le [contrat et le résultat](../protocols/2026-09-19-atomic-sync-v1.md).
Le statut affaibli de la politique séquentielle reste inchangé ; le rival
ne remplace pas rétroactivement son code ni ses observations.

## Prochaine action interne utile

Avant une extension, déterminer si des suites de contacts partiels sans nouvelle
écriture peuvent changer la décision sur la réactivation. Ne pas confondre
confluence d'ordre d'une opération et convergence entre opérations. Si aucun
discriminant nouveau n'est nommé, arrêter cette série ; aucune validation externe
ou intégration produit ne découle de la comparaison locale.
