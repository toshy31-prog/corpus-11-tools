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
