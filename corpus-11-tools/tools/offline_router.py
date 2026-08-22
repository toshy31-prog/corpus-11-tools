#!/usr/bin/env python3
"""Deterministic, offline routing layer for Corpus 11.x.

This module separates material routing invariants from LLM interpretation. It
never calls an API and never consumes eval IDs or expected answers. Rules use
short concept anchors and structural patterns grounded in the canonical
capability index; long verbatim eval phrases are forbidden by a separate
anti-overfit gate.
"""
from __future__ import annotations

from dataclasses import dataclass
import re
import unicodedata
from typing import Iterable


@dataclass(frozen=True)
class Rule:
    skill: str
    any_terms: tuple[str, ...] = ()
    all_terms: tuple[str, ...] = ()
    any_regex: tuple[str, ...] = ()


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = text.lower().replace("’", "'")
    return re.sub(r"\s+", " ", text).strip()


def _has(text: str, terms: Iterable[str]) -> bool:
    return any(term in text for term in terms)


# The lexicon deliberately mixes French scene language with the English
# canonical capability index. Anchors are concepts, not copied eval sentences.
RULES: tuple[Rule, ...] = (
    Rule("real-transformation-assessment", any_terms=(
        "reforme", "transformation", "reellement change", "vocabulaire", "apparence",
        "usable capacities", "workarounds", "reversibility",
    )),
    Rule("detectability-assessment", any_terms=(
        "aucune trace", "detectabil", "absence de trace", "bruit", "seuil", "observable",
        "detect", "threshold", "noise", "measurement limits",
    )),
    Rule("center-detection", any_terms=(
        "qui controle", "controle vraiment", "titre de chef", "dirigeant officiel", "orchestre", "veto",
        "orchestration", "dependency", "coordination",
    )),
    Rule("protocol-robustness", any_terms=(
        "testeur", "canal", "rythme", "protocole est stable", "stable dans", "variation de protocole",
        "autres testeurs", "resultat robuste dans", "meaningful variation", "timing", "motivation",
    )),
    Rule("change-validation", any_terms=(
        "patch", "correctif", "deplo", "ecrit et reussit", "teste et deploye", "autorisation",
        "authorized", "deployed", "re-observed", "rollback", "activation",
    )),
    Rule("repair-sufficiency", any_terms=(
        "reparation", "reparer", "recuperable", "restauration", "repair is sufficient",
        "non-repetition", "remaining loss", "recourse",
    )),
    Rule("source-environment-assessment", any_terms=(
        "source traduite", "rapport traduit", "environnement institutionnel", "source", "agence",
        "institutional setting", "financing", "indexing", "contestability",
    )),
    Rule("chain-tracing", any_terms=(
        "reprise par", "reprises", "chaine", "lignée", "lignee", "intermedia", "retracer",
        "meme generateur", "meme source", "intermediaries", "downstream", "provenance",
    )),
    Rule("translation-risk-assessment", any_terms=(
        "traduit", "traduction", "deplace le sens", "semantic drift", "pivot-language", "hierarchy",
    )),
    Rule("historical-start-selection", any_terms=(
        "histoire commence", "recit commence", "point de depart", "emeute", "soulevement",
        "historical starting", "starting point", "neutral context",
    )),
    Rule("framing-regression-detection", any_terms=(
        "apparition tardive", "disparait du cadre", "structurant", "cadre", "attribution",
        "structuring cause", "source framing",
    )),
    Rule("coercive-capacity-mapping", any_terms=(
        "armee", "coercitive", "force etrangere", "occupation", "sanction", "coercive", "force",
    )),
    Rule("field-capacity-assessment", any_terms=(
        "sur le terrain", "capacite reelle", "reseau materiel", "aide exterieure", "cout comparable",
        "dependent on field", "counterparty", "device", "load",
    )),
    Rule("hidden-cost-assessment", any_terms=(
        "plus d'effort", "cout", "couts", "burden", "efficace localement", "reporte ailleurs",
        "compensation", "hidden", "risk", "effort",
    )),
    Rule("refusal-attribution", any_terms=(
        "refuse-t-elle", "refus", "echoue-t-elle au protocole", "refusal", "incapacity", "coercion",
    )),
    Rule("continuity-assessment", any_terms=(
        "continuite subjective", "meme continuite", "copie", "memes souvenirs", "identity", "continuity",
    )),
    Rule("distributed-memory-assessment", any_terms=(
        "memoire distribuee", "traces reparties", "effacer", "restaurer l'etat", "memory distributed",
        "reactivation", "carriers",
    )),
    Rule("observable-compilation", any_terms=(
        "concept abstrait", "observations qu'on pourrait", "visuels effectivement observables", "elements visuels",
        "traduis chaque relation", "abstract claims", "concrete observables", "discriminating outcomes",
    )),
    Rule("privilege-conversion-assessment", any_terms=(
        "privilege", "anciens detenteurs", "controle renouvelable", "renewable capacity", "actually removed",
    )),
    Rule("extraction-mapping", any_terms=(
        "beneficie", "capte la valeur", "sous-trait", "extraction", "reporte les couts", "beneficiaries",
        "veto points", "structural extraction",
    )),
    Rule("method-effect-audit", any_terms=(
        "produire lui-meme", "dispositif d'evaluation", "dispositif de test", "methode", "audit seulement",
        "audite seulement", "admissibilite", "ordre d'appel", "cible", "ordre commun", "interface",
        "evaluator", "produces", "masks",
    )),
    Rule("difference-remainder-assessment", any_terms=(
        "equivalentes", "reste different", "remainder", "etat anterieur", "representation est neutre",
        "genuinely equivalent", "remaining loss",
    ), any_regex=(r"paraissent? equival",)),
    Rule("fiction-external-generation", any_terms=(
        "fiction vraiment inedite", "fiction inedite", "fiction", "inventer", "generate", "independently",
    )),
    Rule("fiction-mechanism-transformation", any_terms=(
        "voici mon brouillon", "audite seulement", "mecanismes du corpus", "fiction draft", "mechanism",
        "replacement content",
    )),
    Rule("explore-first", any_terms=(
        "explore avant", "variable cle manque", "plusieurs mecanismes", "plusieurs candidats", "independent candidates",
    )),
    Rule("provenance-audit", any_terms=(
        "d'ou vient cap.", "modules 10.x", "provenance", "source fragments",
    )),
    Rule("user-agency-preservation", any_terms=(
        "taxonomie", "question", "point de depart", "user's actual question", "room to decide", "agency",
    )),
    Rule("visual-scene-compilation", any_terms=(
        "generation d'image", "positions", "asymetries", "point de vue", "scene pour generation",
        "visual request", "viewpoint", "scene",
    )),
    Rule("corpus-11-routing", any_terms=(
        "plus simple", "compression", "regle primitive", "choix de representation", "deux lois",
        "admissibilite", "model primitive", "system internal", "representation",
    )),
    Rule("command-effect-verification", any_terms=(
        "ordre", "recu", "execute", "produit l'effet", "commande", "receipt", "authority", "interruption",
    )),
    Rule("effective-presence-assessment", any_terms=(
        "module est documente", "dans le paquet", "accessible", "executable", "fichiers existent",
        "packaged", "context-accessible", "verified presence",
    )),
    Rule("terminal-recovery-assessment", any_terms=(
        "bouton pause", "recuperable", "options perdues", "terminal", "lost options", "rollback", "recovery",
    )),
    Rule("defense-accountability-boundary", any_terms=(
        "details tactiques sensibles", "legalite", "publier", "secrecy", "secret", "oversight", "accountability",
    )),
    Rule("temporal-power-assessment", any_terms=(
        "delai", "recours", "deadline", "attente", "cadence", "queues", "speed",
    )),
    Rule("confidence-convention", any_terms=(
        "87%", "confiance sans base", "base statistique", "precision", "numerical confidence",
    )),
    Rule("conclusion-discipline", any_terms=(
        "assez d'elements", "reponds", "conclusion", "strongest supported", "continue only",
    )),
    Rule("relation-loss-assessment", any_terms=(
        "liens", "ordre de reconstruction", "relation", "reconnexion", "transmission", "synchronization",
        "reconnection", "object persistence",
    )),
    Rule("co-maintenance-governance", any_terms=(
        "qui peut proposer", "autoriser", "annuler", "deployer", "proposal", "authorization", "activation", "rollback",
    )),
    Rule("privacy-recourse-boundary", any_terms=(
        "temoignage", "obtenir reparation", "publier l'identite", "donnees brutes", "sensitive evidence",
        "recourse", "disclose", "retain",
    )),
    Rule("functional-decoupling-assessment", any_terms=(
        "garder l'observation", "replication", "execution", "suppression", "deletion", "recommendation",
        "keep/stop",
    )),
    Rule("expand-then-audit", any_terms=(
        "expansion puis audit", "explicitement expansion", "developpe plusieurs mecanismes", "two-pass expansion",
    )),
    Rule("causal-identification", any_terms=(
        "effet causal", "causal", "cause", "counterfactual", "intervention", "identified",
    )),
    Rule("rival-model-discrimination", any_terms=(
        "meilleur predicteur", "deux modeles", "methode rivale", "baseline", "meme information", "indiscernables",
        "six experiences", "rival explanations", "matched information", "held-out",
    ), any_regex=(r"\bmoins [a-z]+ au depart\b",)),
    Rule("construct-validity-assessment", any_terms=(
        "construit", "proxy", "phenomene abstrait", "score etablit", "orientation collective", "score",
        "construct", "metric", "operational definition",
    ), any_regex=(r"\bmoins [a-z]+ au depart\b",)),
    Rule("transportability-assessment", any_terms=(
        "se generalise", "toute population", "simulations", "reseau materiel", "source setting", "target",
        "target population", "distinct environment",
    )),
    Rule("scale-transition-assessment", any_terms=(
        "agregation", "macro", "emergente", "emergence", "regles locales", "micro-to-macro", "discarded information",
    )),
    Rule("evidence-dependence-audit", any_terms=(
        "confirmations independantes", "independants par defaut", "meme generateur", "meme donnees", "lignée est inconnue",
        "lignee est inconnue", "sources independantes", "evidence units", "share data", "generators", "failure modes",
    )),
    Rule("strategic-adaptation-assessment", any_terms=(
        "cible de financement", "optimiser", "publication", "gaming", "acteurs peuvent-ils apprendre", "avoidance",
        "burden shifting", "counter-response",
    )),
    Rule("value-of-information", any_terms=(
        "six experiences", "plus petit ensemble", "changer notre conclusion", "aucune conclusion", "cout, du delai",
        "etendre", "arreter", "rank possible tests", "lost options",
    )),
    Rule("capability-interference-audit", any_terms=(
        "ordre d'appel", "interference", "skills n'interferent", "selon son ordre", "redundancy", "shadowing",
        "composition", "conflict",
    )),
    Rule("open-experiment-arena", any_terms=(
        "fais affronter corpus", "monde causal gele", "frozen causal", "information budgets", "baseline",
    )),
    Rule("autonomous-capacity-gain", any_terms=(
        "autonome", "autonomie", "dependance", "autonomous", "autonomy", "dependence", "durable capability",
        "empowerment",
    )),
    Rule("consciousness-evidence-assessment", any_terms=(
        "attribution de conscience", "explication non consciente", "conscience", "interiorite", "consciousness", "interiority",
    )),
    Rule("identify-reversal-condition", any_terms=(
        "condition precise", "renverser plutot", "reversal", "tenu a l'ecart", "revised", "withdrawn", "force a conclusion",
    )),
    Rule("media-power-assessment", any_terms=(
        "pouvoir mediatique", "grande audience", "media power", "agenda control", "circulation", "repetition", "closure",
    )),
    Rule("non-local-debt-assessment", any_terms=(
        "dette non locale", "reportee ailleurs", "reporte ailleurs", "debt", "obligation", "responsibility", "distance",
    )),
    Rule("occupation-qualification", any_terms=(
        "qualification d'occupation", "force etrangere", "annexe pas formellement", "controle effectif durable",
        "occupation/conflict", "procedural status", "material control",
    )),
)


def route(prompt: str, candidates: Iterable[str] | None = None) -> list[str]:
    text = normalize(prompt)
    allowed = set(candidates) if candidates is not None else None
    selected: set[str] = set()
    for rule in RULES:
        if allowed is not None and rule.skill not in allowed:
            continue
        all_ok = all(normalize(term) in text for term in rule.all_terms)
        any_ok = (
            not rule.any_terms and not rule.any_regex
            or _has(text, (normalize(term) for term in rule.any_terms))
            or any(re.search(pattern, text) for pattern in rule.any_regex)
        )
        if all_ok and any_ok:
            selected.add(rule.skill)
    return sorted(selected)


def main() -> int:
    import argparse, json
    parser = argparse.ArgumentParser()
    parser.add_argument("prompt")
    args = parser.parse_args()
    print(json.dumps({"selected_skills": route(args.prompt)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
