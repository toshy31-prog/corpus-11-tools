#!/usr/bin/env bash
# Create a concise, Corpus-aware brief for one of five research workflows.
# The script prints by default; it writes a file only with --output.
set -Eeuo pipefail

usage() {
  cat <<'EOF'
Usage:
  scripts/corpus-flow.sh MODE "question or task" [--output FILE]

Modes:
  analyse      Examine a question, claim, situation, or transformation.
  audit        Audit sources, evidence, provenance, and dependencies.
  conclude     Produce a bounded, reviewable conclusion or report.
  explore      Generate serious candidates before choosing an analytic frame.
  experiment   Design or run a reproducible comparison or simulation.

Examples:
  scripts/corpus-flow.sh analyse "Le programme X a-t-il réduit les émissions ?"
  scripts/corpus-flow.sh audit "Évaluer l'indépendance de ces cinq sources" --output ~/Documents/Corpus-Notes/audit.md
EOF
}

[[ $# -ge 2 ]] || { usage >&2; exit 2; }

mode="$1"
shift
output_file=""
arguments=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --output)
      [[ $# -ge 2 ]] || { echo "--output requires a file path." >&2; exit 2; }
      output_file="$2"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      arguments+=("$1")
      shift
      ;;
  esac
done

question="${arguments[*]}"
[[ -n "${question}" ]] || { usage >&2; exit 2; }

case "${mode}" in
  analyse)
    title="Analyser"
    method=$'Préserve la question dans ses propres termes. Route seulement les skills Corpus pertinents. Distingue explicitement les observations, les attributions, les hypothèses et les inférences. Compare les explications sérieuses lorsque plusieurs mécanismes restent compatibles avec les éléments. Indique ce qui pourrait renverser la conclusion.'
    deliverable="Conclusion bornée, éléments observés, interprétations, alternatives, limites et condition de révision."
    ;;
  audit)
    title="Auditer"
    method=$'Cartographie les sources, leurs chaînes de reprise, leur provenance et leurs dépendances possibles. Ne compte pas comme indépendantes des sources qui réemploient le même document, les mêmes données ou la même hypothèse. Établis ce qui est directement étayé, indirectement étayé ou inconnu.'
    deliverable="Registre des sources, dépendances, éléments manquants, contradictions et contrôles prioritaires."
    ;;
  conclude)
    title="Conclure"
    method=$'Appuie-toi uniquement sur les éléments fournis ou clairement recherchés. Formule la conclusion la plus forte que les preuves permettent, sans étendre une réussite locale à une robustesse générale. Sépare le résultat, sa portée, ses limites et les faits qui imposeraient une révision.'
    deliverable="Rapport structuré : question, conclusion, éléments décisifs, incertitudes, périmètre et condition de révision."
    ;;
  explore)
    title="Explorer"
    method=$'Applique explore-first : génère plusieurs mécanismes ou hypothèses indépendants avant de les auditer. Ne laisse pas le vocabulaire Corpus prédéterminer les candidats. Pour chaque candidat, note des prédictions ou observations qui le distingueraient des autres.'
    deliverable="Ensemble de candidats distincts, prédictions discriminantes et proposition du prochain test à forte valeur d'information."
    ;;
  experiment)
    title="Expérimenter"
    method=$'Définis une comparaison ou simulation reproductible : scénario gelé, hypothèses concurrentes, informations et budgets d\'action identiques, prédictions préenregistrées et résultats vectoriels. Ne transforme pas un test synthétique en preuve générale ; précise ce qu\'il teste réellement.'
    deliverable="Protocole exécutable, hypothèses rivales, variables contrôlées, métriques, résultats attendus et limites de transportabilité."
    ;;
  *)
    echo "Unknown mode: ${mode}" >&2
    usage >&2
    exit 2
    ;;
esac

brief=$(cat <<EOF
# ${title} avec Corpus 11

## Demande

${question}

## Consigne à Codex

Utilise Corpus 11 comme architecture opérationnelle, sans le présenter comme une preuve ni comme une théorie du monde.

${method}

## Livrable attendu

${deliverable}
EOF
)

if [[ -n "${output_file}" ]]; then
  mkdir -p "$(dirname -- "${output_file}")"
  printf '%s\n' "${brief}" > "${output_file}"
  printf 'Brief written to %s\n' "${output_file}"
else
  printf '%s\n' "${brief}"
fi
