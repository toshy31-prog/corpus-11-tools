# CCT-EXEC 10.17 — signature indépendante et attestation temporelle

## Lacune fermée

Une liaison SHA-256 prouvait l’intégrité relative du contenu, mais aucun tiers ne
liait encore l’artefact à une déclaration antérieure au gel du registre.

## Gain concret

Chaque source reçoit une attestation Ed25519 sur son identifiant, l’empreinte du
paquet, l’horodatage déclaré et le témoin. Toutes les signatures sont vérifiées,
les attestations postérieures au gel sont rejetées et au moins deux témoins
distincts doivent subsister.

Les clés et dates de test sont synthétiques. La vérification établit la
possession de clés et la cohérence de l’ordre déclaré ; elle ne prouve ni
l’identité civile, ni une horloge de confiance, ni la vérité de l’observation.

## Condition de retrait

Retirer cette couche si une signature altérée, une substitution d’artefact, une
attestation tardive ou un témoin unique conserve l’admission.
