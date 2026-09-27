# RecordLinkage : installation isolée autorisée

27 septembre 2026. L'utilisateur a explicitement autorisé l'installation du comparateur et de ses dépendances dans un environnement temporaire. L'autorisation antérieure du corpus (100 Mo maximum) reste distincte : aucun corpus supplémentaire téléchargé ici.

## État vérifié

- Racine : `/tmp/scout-recordlinkage-w4-wu8kXE`.
- Python 3.12.3 dans `venv`, sans paquets système hérités ; `sys.prefix` vérifié.
- RecordLinkage 0.16 installé et importé ; licence BSD-3-Clause vérifiée dans la distribution et sur [PyPI](https://pypi.org/project/recordlinkage/0.16/).
- `pip check` : aucune dépendance cassée.
- Empreinte disque de l'environnement : environ 367 Mio (`du -sh`, arrondi), incluant dépendances et Python du venv. Ce n'est pas la taille du corpus, inchangé à 2 170 333 octets.
- Aucun modèle, compte, bibliothèque personnelle ou serveur Scout utilisé. Aucun paquet ajouté au Python système, aucun changement de dépendances du projet.

## Installation exécutée

```sh
python3 -m venv /tmp/scout-recordlinkage-w4-wu8kXE/venv
/tmp/scout-recordlinkage-w4-wu8kXE/venv/bin/python -m pip --isolated install --only-binary=:all: --no-cache-dir --disable-pip-version-check --index-url https://pypi.org/simple --report /tmp/scout-recordlinkage-w4-wu8kXE/install-report.json recordlinkage==0.16
```

Premier essai empêché par la résolution réseau du sandbox ; second essai avec accès réseau autorisé réussi. Uniquement distributions binaires, pas de compilation de sources. `--isolated` ignore configuration utilisateur et variables pip ; pas de cache pip persistant demandé. L'environnement n'est pas une sandbox système ni une garantie de sécurité des paquets tiers.

Les 14 versions et SHA256 des distributions sont conservés dans `scripts/recordlinkage-w4-requirements.txt`, généré depuis le rapport pip. Ce verrou est réservé au benchmark Python 3.12 Linux x86_64, pas aux dépendances applicatives. Pour reproduire dans un autre venv isolé : `python -m pip --isolated install --only-binary=:all: --require-hashes -r scripts/recordlinkage-w4-requirements.txt` après autorisation réseau appropriée. Le rapport complet avec URLs reste dans le dossier temporaire.

Paquets : RecordLinkage, jellyfish, numpy, pandas, scikit-learn, scipy, joblib, cloudpickle, narwhals, python-dateutil, pytz, threadpoolctl, tzdata et six. Leurs licences restent celles des distributions ; aucune redistribution de leurs fichiers dans Scout. Installer une bibliothèque classique ne constitue ni l'installation d'un modèle ni une comparaison SOTA exécutée.

## Conservation

Le dossier temporaire est conservé pour reproduction pendant cette mission. Aucune suppression n'a été faite. Il peut disparaître lors d'un nettoyage de `/tmp` ; les versions et empreintes restent dans le dépôt, mais pas les paquets. Résultats et limites de l'expérience : `SOTA_RECORDLINKAGE_W4.md`.
