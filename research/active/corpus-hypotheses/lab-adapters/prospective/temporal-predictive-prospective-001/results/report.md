# Frustration temporelle — validation prédictive prospective

## Question

Dans une famille où un ordre latent commun génère deux tournois indépendants avec un nombre fixé de renversements, l'ordre minimisant exactement `F_T` sur le tournoi d'apprentissage prédit-il le tournoi tenu à l'écart mieux qu'un ordre aléatoire indépendant ? Son erreur augmente-t-elle avec le bruit injecté ?

Ce protocole teste une propriété prédictive mathématique. L'ordre latent est injecté par le générateur ; le test ne démontre donc ni son émergence ni une interprétation physique du temps.

## Antériorité et empreintes

- Runner scientifique fixé avant manifeste : commit `71f07d0c49db68ea72428e16cd78a9acb2d59540`.
- Manifeste et verrous sans résultat : commit A `4b64bc59d9fb243deca7a712fea040d93bd40d4f`.
- `protocol_hash` : `sha256:ea20865b179e39f07134ec9775a9b72c08fe54f9ccf8d47623b237f3db8af998`.
- `experiment_fingerprint` : `sha256:ad9abc3e4ca08f94e2b5b70e919393839c37f434e436d9f6a477578dd72ebad5`.
- `raw_hash` : `sha256:bac82b27c5de1d2fc41841a5bcdf45473a022bde5ae6b76971e5231ac67ec1e3`.
- `classification_hash` : `sha256:82b8e35f29f019809861094a46531b739d503b80080f97f500b1684945fc7cdc`.

## Résultat

| Renversements injectés | Paires | Violations test, ordre appris | Violations test, contrôle aléatoire | Violations oracle |
|---:|---:|---:|---:|---:|
| 0 | 48 | 0 | 461 | 0 |
| 3 | 48 | 221 | 491 | 144 |
| 6 | 48 | 355 | 489 | 288 |
| 9 | 48 | 452 | 500 | 432 |

- Total ordre appris : `1028`.
- Total contrôle aléatoire : `1941`.
- Avantage prédictif exact : `913` violations.
- Violations de monotonie : `0`.
- Écarts sous renommage transporté : `0`.
- Écarts du générateur face à l'oracle : `0`.
- Classification mécanique : `not_triggered`.

L'unique reconstruction autorisée régénère les cinq artefacts machine à l'identique octet par octet.

## Effet sur l'hypothèse

La composante prédictive mathématique de `F_T` est **renforcée dans cette famille préenregistrée** : aucune condition d'affaiblissement n'est atteinte. La portée temporelle ou physique reste **inconnue**, car le générateur fournit lui-même l'ordre latent et le contrôle ne compare pas encore `F_T` à d'autres estimateurs standards du même ordre.
