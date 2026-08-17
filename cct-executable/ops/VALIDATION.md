# Validation locale — CCT Ops 0.1

Date : 17 août 2026  
Environnement : Python 3.12.3, Linux x86_64  
Statut maximal établi : **patch inscrit, exécutable et tests locaux passés**  
Statuts non établis : **autorisé, déployé, réobservé, robuste en institution réelle**

## Commandes exécutées

```bash
python3 -B -m unittest -v
python3 -B examples/demo_offline.py
python3 -B cct.py --help
```

## Résultats

- 21 tests unitaires et d'intégration réussis ;
- zéro échec et zéro erreur ;
- démonstration hors ligne réussie ;
- 19 événements produits dans la démonstration ;
- audit final de la démonstration : `ok: true` ;
- export JSON produit ;
- tentative d'exercice après échéance refusée avec
  `pouvoir éteint: expired`.

## Capacités effectivement vérifiées dans cet environnement

- initialisation d'un dépôt vide ;
- sortie CLI JSON et codes de refus ;
- ajout d'acteurs avec contrôle des incompatibilités de rôles ;
- proposition, décision motivée et refus de l'auto-décision ;
- chaîne d'autorisation typée, bornée par titulaire, périmètre et date ;
- mandat programmé, activé, exercé, révoqué ou expiré ;
- recours indépendant, gel suspensif et extinction après annulation ;
- pouvoir temporaire limité à 168 heures et à des capacités fermées ;
- refus effectif d'un pouvoir expiré ;
- journal JSONL chaîné et détection d'une altération ;
- détection d'un écart entre journal et état matérialisé ;
- récupération de l'état depuis un journal valide ;
- export avec état, journal et résultat d'audit.

## Ce que le protocole de test ne prouve pas

Les tests appellent la même implémentation qui définit les règles : ils détectent
des régressions et des incohérences prévues, mais ne constituent pas une
validation institutionnelle indépendante. Ils ne testent ni plusieurs processus
concurrents, ni panne réelle du disque, ni identité hostile, ni charge longue, ni
compréhension par une population, ni usage papier, ni restauration des capacités
humaines après dommage.

La chaîne SHA-256 détecte l'altération d'un sous-ensemble du journal. Elle ne
résiste pas à un administrateur capable de réécrire tous les événements et leurs
hachages. L'option temporelle de test `--at` et l'absence d'authentification
interdisent tout classement « déployable ».

## Conditions qui invalideraient le verdict local

Le verdict « exécutable et testé localement » doit être retiré si l'un des faits
suivants est observé :

- un test échoue sur Python 3.12 dans le même environnement ;
- une action expirée peut être acceptée sans modifier directement le stockage ;
- un auteur décide sa proposition, un octroyant reçoit son pouvoir ou un requérant
  résout son recours par une commande publique ;
- un pouvoir dépasse le titulaire, le périmètre ou la date approuvés ;
- un recours suspensif laisse exercer une capacité dépendante ;
- une altération simple du journal n'est plus détectée ;
- une récupération accepte une chaîne invalide ;
- l'export prétend un statut autre que `non_deploye`.

## Prochain niveau de preuve requis

Pour passer de « testé localement » à « pilote autorisable », il faudrait au
minimum : signatures et identités, horloge de confiance, verrouillage concurrent,
chiffrement et minimisation, journal répliqué sur supports indépendants, protocole
papier, audit externe, test de restauration représentatif et autorisation
explicite d'une collectivité volontaire.
