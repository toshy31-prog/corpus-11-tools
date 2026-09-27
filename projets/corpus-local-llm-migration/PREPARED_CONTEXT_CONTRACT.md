# Contexte préparé Corpus

`prepared_context.py` produit hors ligne un paquet inspectable pour un futur tour modèle. Il retient le profil d’outils déjà déclaré demandé par l’appelant, garde les règles stables dans le préfixe de cache et place la demande et les passages locaux dans le suffixe.

Les passages identiques octet pour octet ne sont inclus qu’une fois seulement dans la même frontière de confiance : type déclaré, provenance et périmètre de permission. Un passage identique issu d’une autre provenance ou soumis à une autre permission est conservé séparément. L’ordre du reste est celui fourni. Chaque retrait indique son passage conservé et son empreinte SHA-256 ; aucun texte de travail n’apparaît dans le reçu.

Ce contrat ne fait pas de retrieval, classement sémantique, persistance, appel modèle, exécution d’outil ni changement de permission. Une empreinte de cache identifie un préfixe stable ; elle ne prouve jamais que le runtime a lu ou écrit un cache.
