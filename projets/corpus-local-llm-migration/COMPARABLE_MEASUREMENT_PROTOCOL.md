# Reçu de mesure comparable

Ce contrat prépare une **comparaison future** de deux épreuves déjà terminées.
Il ne lance ni Qwen ni un service et ne collecte rien lui-même.

Le reçu `corpus.comparable-measurement.v1` ne contient que :

- identité déclarative du modèle et du moteur, plus empreintes SHA-256 ;
- contexte et configuration sous forme d’entiers/empreintes ;
- backend GPU, empreinte matérielle et VRAM, sans nom de machine ;
- état de cache annoncé avant le run, identité du préfixe et tokens éventuellement rapportés ;
- empreintes du prompt, de la fixture, du profil d’outils et du contrat de vérification ;
- terminal, verdict de chaîne, durée et séquence `outil/statut`, sans arguments.

Il ne doit jamais contenir le texte du prompt, une session, un chemin, une commande,
une sortie d’outil, une pièce jointe, une réponse ou un identifiant utilisateur.
Les clés sont strictes : une clé supplémentaire est rejetée.

## Gabarit

```json
{
  "schema": "corpus.comparable-measurement.v1",
  "model": {"provider_id":"corpus-local","model_id":"qwen3.6","quantization":"q4_k_m","model_sha256":"<64 hex>"},
  "runtime": {"engine":"llama-server","engine_version":"b10964","context_tokens":16384,"configuration_sha256":"<64 hex>"},
  "gpu": {"backend":"cuda","accelerator_fingerprint_sha256":"<64 hex>","vram_mib":8188},
  "cache": {"state_before":"warm","prefix_identity_sha256":"<64 hex>","reported_read_tokens":null},
  "task": {"prompt_sha256":"<64 hex>","fixture_sha256":"<64 hex>","tool_profile_sha256":"<64 hex>","verifier_contract_sha256":"<64 hex>"},
  "outcome": {"terminal":"completed","verification":"receipt_chain_verified","wall_seconds":123.4,"tool_sequence":[{"tool":"read","status":"completed"}]}
}
```

Validation hors ligne :

```bash
python3 comparable_measurement.py mesure.json
python3 comparable_measurement.py candidat.json --compare-to reference.json
```

Une comparaison n’est déclarée exploitable que si toutes les identités, y compris
l’état de cache et la séquence d’outils, concordent et que les deux chaînes sont
terminées et vérifiées. Même alors, elle ne prouve pas l’effet causal du cache :
les identités sont déclarées, pas réobservées par ce module.
