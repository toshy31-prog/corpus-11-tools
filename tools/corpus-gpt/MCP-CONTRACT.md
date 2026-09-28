# corpus-gpt MCP

Serveur MCP local borné déclaré par `corpus_local.py`.

Outils :
- `status` : lecture de l'état backend, CDP, Firefox et verrou runner.
- `runtime_probe` : diagnostic lecture seule du processus MCP lui-même.
- `doctor` : diagnostic de l'infrastructure.
- `jobs` : liste des jobs enregistrés et autorisés.
- `run_job(job)` : exécute uniquement un nom de job présent dans `jobs`.
- `install_managed_job(name, content)` : installe ou met à jour un job Bash
  borné ; nom strict, destination imposée dans le registre, backup en cas de
  remplacement et validation `bash -n` avant publication.
- `latest_evidence` : liste les dernières preuves BugBounty.

`run_job` n'accepte ni chemin arbitraire ni commande shell fournie par le
modèle. `install_managed_job` n'est pas un shell général : il ne publie que
dans le registre géré des jobs.

Le runner Corpus GPT reste responsable du lock, de CDP, des preuves et du
transport. Les jobs lancés via MCP utilisent `CORPUS_BB_SKIP_GPT=1` afin de
retourner leur résultat par le canal MCP sans double envoi navigateur.

## Résilience

Outils complémentaires :

- assess_blocker : classification déterministe d'un incident déjà observé ;
- start_job : lancement asynchrone d'un job enregistré ;
- async_jobs : liste persistante des derniers lancements asynchrones ;
- job_status : état et sortie d'un lancement par token.

start_job conserve la même liste blanche que run_job et refuse les noms non
enregistrés. Le même job encore actif est renvoyé comme existant au lieu d'être
dupliqué. Ces primitives n'accordent aucune permission supplémentaire.


### Écriture bornée du dépôt

`write_repo_file` permet une écriture texte atomique strictement confinée au dépôt Corpus. Elle refuse les chemins absolus et traversal ; `require_clean` peut imposer un working tree propre. Elle ne remplace ni les validations métier ni les jobs d’exécution.

## Capability lifecycle handoff
capability_handoff produit un receipt structuré et resume_handoff vérifie la compatibilité HEAD/working-tree avant reprise. Les états source, validé, reload demandé et loaded sont distincts ; seul un reload réussi après validation promeut loaded_digest.

La preuve loaded appartient au nouveau processus MCP via confirmation au démarrage. Le succès de la requête systemctl restart ne promeut pas loaded_digest. Le handoff expose séparément runtime_reload_complete, plugin_refresh_required et new_chat_required.

### Continuation après checkpoint
Un handoff borné est un point de reprise persistant, pas une obligation de changer de conversation. Continuer dans le chat courant si contexte/stream, surface MCP et runtime sont sains. Ne demander reload/refresh/nouveau chat que lorsque les indicateurs du receipt l'exigent et avec new_chat_reason explicite. À la reprise, consommer exact_jobs, async_tokens, baselines et stop_conditions avant toute redécouverte.
