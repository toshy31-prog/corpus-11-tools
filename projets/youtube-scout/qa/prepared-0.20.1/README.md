# Scout 0.20.1 — correctif activé

Activé après accord explicite le 22 septembre 2026. Version 0.20.1 et cinq modules front servis vérifiés ; les deux fichiers de données conservent leurs empreintes. Sauvegarde et processus consignés dans ACTIVATION.json. Le manifeste reste celui du paquet initial préparé.

724 tests réussis sous Node 18.19.1 ; syntaxe et contrôles navigateur sur fixture isolée réussis. Voir le rapport inclus dans le patch (`docs/QUALITY_0.20.1_2026-09-22.md`).

Le correctif permet de réafficher les artistes inconnus avec avertissement, d'inclure séparément les collaborations et de voir les pistes masquées. Le comportement strict reste le défaut. Le seul serveur Scout 4181 a été redémarré avec sa configuration conservée. Aucun rechargement de l'onglet utilisateur ni recherche externe pendant l'activation.

Activation : obtenir l'accord de redémarrage, vérifier toutes les empreintes initiales du manifeste, sauvegarder les données, arrêter uniquement le processus Scout identifié, appliquer changes.patch avec apply_patch, contrôler les empreintes finales puis redémarrer avec la configuration existante. Vérifier version, modules servis et données conservées. Ne pas appliquer à chaud : les modules front sont servis directement.
