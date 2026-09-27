# Manifeste de livraison local

`DELIVERY_MANIFEST.json` est l’index auditable du lot de migration préparé pour
Git. Il relie chaque contrat, document, validateur ou test à une empreinte
SHA-256 et à un statut borné :

- `verified_static` : validé localement sans modèle ni runtime ;
- `observed_bounded` : preuve observée sur fixture isolée ;
- `prepared_not_executed` : plan contrôlé, sans exécution.

Il ne lance rien et ne contient pas de contenu conversationnel, session, chemin
absolu, commande ou sortie d’outil.

Validation locale :

```bash
python3 delivery_manifest.py
python3 -m unittest test_delivery_manifest.py
```

Une dérive d’empreinte, un fichier absent, un chemin sortant du projet ou une
revendication d’exécution est refusé. Mettre à jour le manifeste impose donc de
réviser explicitement les entrées modifiées avant le commit.
