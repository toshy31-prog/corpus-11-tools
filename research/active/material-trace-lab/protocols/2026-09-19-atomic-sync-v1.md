# Synchronisation atomique v1 — contrat de comparaison

## Question et candidats fixés avant exécution

La dépendance à l'ordre des cibles observée le 25 août vient-elle de la
politique nommée ou de son application séquentielle ? Comparer la boucle
historique inchangée à un rival atomique exécutable, sans remplacer le modèle
historique. L'audit antérieur est connu : cette comparaison n'est pas aveugle
et ne constitue pas une réplication indépendante.

- Séquentiel : source éventuellement modifiée après chaque cible.
- Atomique v1 : lire un snapshot de la source et des seules cibles participantes.
  Sous `tombstone_wins`, un tombstone participant impose cet état à tous les
  participants ; sinon les cibles reçoivent l'état initial de la source.
  Sous `payload_wins`, diffuser la source, comme dans le modèle historique
  (ce nom ne désigne donc pas un maximum global de payloads).
- Les non-participants restent inchangés. Une partition touchant un participant
  refuse l'opération entière. Aucun snapshot d'entrée n'est modifié.

Le rival suppose un snapshot commun et une transition indivisible. Ce coût
de coordination n'est ni implémenté sur un réseau ni mesuré. Même état initial,
source, cibles et politique ; garantie d'exécution différente, explicitement
constitutive du rival. Aucun classement de performance réel n'en découle.

## Observables et prédictions

Énumérer les 27 états de trois nœuds, 3 sources, 2 politiques : deux ordres
des deux cibles (324 exécutions par modèle), puis chacune des deux cibles
seules (324 exécutions supplémentaires par modèle).

1. Sur diffusion complète : rival invariant à l'ordre sur l'état logique
   complet ; projection payload conforme à l'oracle antérieur. Les 12 écarts
   au séquentiel déjà connus devraient subsister, seulement sous `tombstone_wins`.
2. Sur une cible : mêmes payloads que la boucle séquentielle ; aucun effet sur
   le nœud exclu. Ce contrôle distingue atomicité et inclusion de tous les nœuds.
3. Réappliquer exactement la même opération atomique est idempotent dans cet
   espace sans écriture concurrente. La mutation du snapshot invalide le rival.
4. Contre-exemple fixé : A=payload, B=tombstone, C=payload ; A synchronise B
   sous `tombstone_wins`. A et B deviennent tombstones, C conserve son payload.
   L'atomicité seule ne suffit donc pas à prédire une absence globale de payload.
5. Si B est partitionné, A vers B et C doit être refusé sans modifier l'entrée.

## Retrait et décision

Toute variation à ordre seul retire la confluence déclarée du rival. Un écart
sur une cible interdit d'attribuer les différences uniquement à la simultanéité
avant explication. Un effet sur un non-participant invalide la portée locale.
Un test échoué est conservé, pas absorbé dans une prétention générale.

Verdict permis : discrimination des deux sémantiques **dans le modèle**, pas
sélection d'une loi externe ni preuve d'effacement physique. Aucun résultat
sur crash, écriture concurrente, réseau réel ou coût de coordination.

Commande : `python3 research/active/material-trace-lab/tests/test_atomic_sync_v1.py`.

## Résultat observé après implémentation

Le 19 septembre 2026 : 324 comparaisons à couverture complète, 12 différences
de payload avec le séquentiel, toutes sous `tombstone_wins` ; 0 couple dépendant
de l'ordre pour le rival. Sur 324 comparaisons à une cible : 0 différence avec
le séquentiel. Les contrôles d'idempotence, d'entrée inchangée, de non-participant
préservé et de refus passent. Les deux tests historiques passent sans modification.

Verdict `discriminates` pour les sémantiques sur la projection appariée,
`formal_exact` seulement sur cet espace fini. La conformité à l'oracle connu
vérifie l'implémentation ; elle n'est pas une preuve indépendante de supériorité.
Le contre-exemple partiel fixé avant exécution conserve C=payload : retirer toute
inférence « atomique donc absence globale de payload » sans couverture démontrée.
La confluence d'ordre d'une opération n'établit pas la convergence d'une suite
d'opérations concurrentes. Aucun passage recherche→produit n'est effectué.
