# Harness local de comparaison de réponses

Instrument local qui fige une demande, importe deux réponses isolées, les
scelle, puis prépare un paquet de revue anonymisé. Il ne lance aucun modèle,
n'appelle aucune API et ne fait pas dialoguer les deux exécutants.

La règle de coût est permanente jusqu'à décision explicite contraire :
[`COST_POLICY.md`](COST_POLICY.md). Le harness utilise l'import manuel et le
poste local ; les adaptateurs API ne sont pas prévus dans la feuille de route.

La cible produit est décrite dans [`PRODUCT_TARGET.md`](PRODUCT_TARGET.md) :
surface conversationnelle native Codex au-dessus de Corpus. Le pont avec le GPT
personnalisé est en pause ; le harness reste un contrôle R&D de non-déformation.

Le premier candidat exécutable est dans [`native_surface/`](native_surface/).
Il rend un paquet analytique scellé par gabarit déterministe et le vérifie après
production ; il ne constitue pas encore une intégration au plugin installé.

Le jalon 1 établit `pipeline_verified` sur fixtures synthétiques. Le jalon 2
admet des prompts réels explicitement confirmés non sensibles, avec exactement
le même protocole manuel ; un premier run n'établit aucune propriété générale
de ChatGPT, Codex ou de personnes.

Les bras sont `chatgpt_custom_gpt` et `codex_corpus`, pas deux instances
supposées équivalentes. Le manifest déclare une session GPT fraîche avec sa
configuration propre, ainsi que le contexte local Corpus ; le paquet A/B masque
ces identités.

## Commandes de contrôle

```bash
python3 tests/test_harness.py
python3 tools/harness.py --help
```

Les exécutions sont écrites sous `runtime/`, ignoré par Git. Un run réel exige
`--purpose real_non_sensitive --confirm-non-sensitive` et reste local.
