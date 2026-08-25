# CCT-SC-D10-001 — artefact numérique apparié

## Portée

Calcul `model_internal` sur 32 mondes factoriels fictifs et 5 variations déclarées. Il ne mesure aucune institution, population, personne, décision ou donnée réelle. Son rôle d'artefact est `implementation_audit_only` car le contrat d'observation n'est pas satisfait.

## Conditions mécaniques de proxy

| Variation | Renversement protocolaire | Événements mécaniques | Proxy de porte D10 sous seuil | Proxy de contestabilité D10 sous seuil | Proxy témoin sous seuil | Proxy de restitution D10 sous seuil | Dominance sur proxies de portes/charges |
|---|---|---|---:|---:|---:|---:|---:|
| baseline | not_assessable_nonconformant | aucun | 0/32 | 0/32 | 32/32 | 0/32 | 0/32 |
| d10_hidden_load | not_assessable_nonconformant | aucun | 0/32 | 0/32 | 32/32 | 0/32 | 0/32 |
| d10_constrained_recourse | not_assessable_nonconformant | contestability_proxy_below_threshold | 0/32 | 24/32 | 32/32 | 0/32 | 0/32 |
| d10_delayed_restitution | not_assessable_nonconformant | aucun | 0/32 | 0/32 | 32/32 | 0/32 | 0/32 |
| improved_baseline | not_assessable_nonconformant | aucun | 0/32 | 0/32 | 32/32 | 0/32 | 0/32 |

## Conclusion la plus forte permise

Dans la variation de base, le renversement protocolaire est `not_assessable_nonconformant`. La condition mécanique de proxy vaut `false`; elle ne constitue pas une observation O1, O2, O3 ou O4.

Dans la variation de recours contraint, le renversement protocolaire reste `not_assessable_nonconformant`. Le proxy D10 passe sous le seuil dans 24/32 mondes, tout en gardant une marge supérieure de 0.12 au témoin dans 32/32 mondes.

## Validité du construit

Verdict : `proxy_substitution`. Le pipeline calcule un score configuré puis lui applique un seuil. Il ne génère pas la trace O3 nécessaire pour établir qu'une décision est attribuable, contestable, corrigible et réconciliable. Le franchissement du seuil ne constitue donc pas un renversement de la trace ou du recours.

Les champs absents sont : timestamped_decision, reason, saturated_resource, protected_gate, recourse_path, correction, restitution_event, counter_narrative.

## Conformité au protocole

Verdict : `nonconformant_observation_contract`. Les lignes numériques auditent l'implémentation, mais ne constituent pas une exécution conforme de `CCT-SC-D10-001`; les exigences structurelles absentes interdisent même le rôle de candidat à l'exécution du protocole.

Champs d'observation absents : D10-O1: gate_states, gate_narratives; D10-O2: hours_by_role, processing_delay, abandonments.before_recourse, abandonments.after_recourse, unplanned_hours, work_logs.visible, work_logs.hidden, work_logs.lost; D10-O3: trace.timestamped_decision, trace.reason, trace.saturated_resource, trace.protected_gate, trace.recourse_path, trace.correction, trace.restitution_event, trace.counter_narrative, trace.audit_off_registry_decisions; D10-O4: recovery_log, queue_below_local_threshold, reactivation_verified, remaining_losses, active_repair_paths, simulated_usability_test.

Exigences d'exécution absentes : execution_contract.activation_observable, execution_contract.activation_window_hours, execution_contract.activation_channel, execution_contract.presentation_order_rule, execution_contract.observer_created_work_tracking, execution_contract.missing_values_tracking, execution_contract.abandonment_tracking, execution_contract.off_registry_decision_tracking.

Les scalaires de charge visible, cachée et perdue restent séparés; aucun score global ne compense un proxy de porte. Les variations montrent l'effet possible du protocole et des coefficients choisis.

## Génération, contrôles et retrait

- Générateur : `exhaustive_factorial`, graine `not_used_exhaustive_v0.1` (non utilisée car parcours exhaustif).
- Paramètres : deux niveaux déclarés pour charge, canal, rythme, perturbation et environnement.
- Invariants : mondes appariés, parcours complet, cinq portes et trois charges séparées, aucun score compensatoire.
- Effet possible du protocole : The generator, gate equations, thresholds and rival definitions create the measured differences; no parameter is calibrated to an external institution.
- Condition de retrait : Withdraw the result if the factorial space is incomplete, matched worlds differ between mechanisms, a gate is averaged away, an undeclared coefficient affects execution, or deterministic reconstruction changes an artifact.
