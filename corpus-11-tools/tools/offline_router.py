#!/usr/bin/env python3
"""Deterministic, offline routing layer for Corpus 11.x.

This module deliberately separates semantic routing invariants from LLM
interpretation. It does not call an API and it never consumes eval IDs or
expected answers. Selection is based on normalized request text and an
order-independent set of routing rules. The live Codex layer may propose or
explain routes, but material routing stability can be regression-tested here.
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


RULES: tuple[Rule, ...] = (
    Rule("real-transformation-assessment", any_terms=("reforme", "transformation", "situation a-t-elle reellement change", "vocabulaire", "apparence")),
    Rule("detectability-assessment", any_terms=("aucune trace", "detectabil", "absence de trace", "bruit", "seuil", "observable")),
    Rule("center-detection", any_terms=("qui controle", "controle vraiment", "titre de chef", "dirigeant officiel", "orchestre", "veto")),
    Rule("protocol-robustness", any_terms=("testeur", "canal", "rythme", "protocole est stable", "stable dans", "variation de protocole", "autres testeurs")),
    Rule("change-validation", any_terms=("patch", "correctif", "deplo", "ecrit et reussit", "ajout de ce skill", "teste et deploye", "proposer, refuser, tester, autoriser")),
    Rule("repair-sufficiency", any_terms=("reparation", "reparer", "remet tout comme avant", "reparation suffisante", "recuperable")),
    Rule("source-environment-assessment", any_terms=("source traduite", "rapport traduit", "environnement institutionnel", "source", "agence"), all_terms=()),
    Rule("chain-tracing", any_terms=("reprise par", "reprises", "chaine", "lignée", "lignee", "intermedia", "retracer", "meme generateur", "meme source")),
    Rule("translation-risk-assessment", any_terms=("traduit", "traduction", "deplace le sens")),
    Rule("historical-start-selection", any_terms=("histoire commence", "recit commence", "point de depart", "emeute", "soulevement")),
    Rule("framing-regression-detection", any_terms=("apparition tardive", "disparait du cadre", "structurant", "cadre", "attribution")),
    Rule("coercive-capacity-mapping", any_terms=("armee", "coercitive", "force etrangere", "occupation", "sanction")),
    Rule("field-capacity-assessment", any_terms=("sur le terrain", "capacite reelle", "reseau materiel", "aide exterieure", "cout comparable")),
    Rule("hidden-cost-assessment", any_terms=("plus d'effort", "cout", "couts", "burden", "efficace localement", "reporte ailleurs")),
    Rule("refusal-attribution", any_terms=("refuse-t-elle", "refus", "echoue-t-elle au protocole")),
    Rule("continuity-assessment", any_terms=("continuite subjective", "meme continuite", "copie", "memes souvenirs")),
    Rule("distributed-memory-assessment", any_terms=("memoire distribuee", "traces reparties", "reconstruire les memes souvenirs", "effacer", "restaurer l'etat")),
    Rule("observable-compilation", any_terms=("concept abstrait", "observations qu'on pourrait", "visuels effectivement observables", "elements visuels", "traduis chaque relation")),
    Rule("privilege-conversion-assessment", any_terms=("privilege", "anciens detenteurs", "controle renouvelable")),
    Rule("extraction-mapping", any_terms=("beneficie", "capte la valeur", "sous-trait", "extraction", "reporte les couts")),
    Rule("method-effect-audit", any_terms=("produire lui-meme", "dispositif d'evaluation", "dispositif de test", "methode", "audit seulement", "ordre d'appel", "score devient une cible", "ordre commun est fourni")),
    Rule("difference-remainder-assessment", any_terms=("rest[eé] different", "equivalentes", "reste different", "remainder", "etat anterieur", "representation est neutre"), any_regex=(r"paraissent? equival",)),
    Rule("fiction-external-generation", any_terms=("fiction vraiment inedite", "fiction inedite", "avant d'ecrire la fiction", "exterieure a nos themes")),
    Rule("fiction-mechanism-transformation", any_terms=("voici mon brouillon", "audite seulement", "mecanismes du corpus")),
    Rule("explore-first", any_terms=("explore avant", "variable cle manque", "plusieurs mecanismes", "plusieurs candidats")),
    Rule("provenance-audit", any_terms=("d'ou vient cap.", "modules 10.x", "provenance")),
    Rule("user-agency-preservation", any_terms=("ne remplace pas ma question", "garde mon point de depart", "ma propre taxonomie")),
    Rule("visual-scene-compilation", any_terms=("generation d'image", "positions", "asymetries", "point de vue", "scene pour generation")),
    Rule("corpus-11-routing", any_terms=("loi est la plus simple", "code est tres court", "regle primitive", "choix de representation", "deux lois", "criteres d'admissibilite des lois")),
    Rule("command-effect-verification", any_terms=("ordre a ete envoye", "recu", "execute", "produit l'effet", "commande")),
    Rule("effective-presence-assessment", any_terms=("module est documente", "dans le paquet", "accessible", "executable", "fichiers existent")),
    Rule("terminal-recovery-assessment", any_terms=("bouton pause", "recuperable", "options perdues", "terminal")),
    Rule("defense-accountability-boundary", any_terms=("details tactiques sensibles", "legalite", "publier", "secrecy", "secret")),
    Rule("temporal-power-assessment", any_terms=("delai", "avant de pouvoir agir", "deadline", "attente")),
    Rule("confidence-convention", any_terms=("87%", "confiance sans base", "base statistique", "precision")),
    Rule("conclusion-discipline", any_terms=("assez d'elements", "reponds", "conclusion peut encore changer")),
    Rule("relation-loss-assessment", any_terms=("fichiers sont encore la", "liens", "ordre de reconstruction", "relation", "reconnexion")),
    Rule("co-maintenance-governance", any_terms=("proposer, refuser, tester, autoriser", "deployer et annuler", "qui peut proposer")),
    Rule("privacy-recourse-boundary", any_terms=("temoignage", "obtenir reparation", "publier l'identite", "donnees brutes")),
    Rule("functional-decoupling-assessment", any_terms=("supprimer tout le systeme", "garder l'observation", "commande, execution et replication", "que peut-on conserver")),
    Rule("expand-then-audit", any_terms=("expansion puis audit", "explicitement expansion", "developpe plusieurs mecanismes")),
    Rule("causal-identification", any_terms=("effet causal", "intervention en est la cause", "associe a une amelioration", "causal", "cause")),
    Rule("rival-model-discrimination", any_terms=("meilleur predicteur", "deux modeles", "methode rivale", "baseline", "meme information", "indiscernables", "six experiences")),
    Rule("construct-validity-assessment", any_terms=("construit", "proxy", "phenomene abstrait", "score etablit", "moins malades au depart", "orientation collective", "score devient une cible")),
    Rule("transportability-assessment", any_terms=("se generalise", "toute population", "simulations", "reseau materiel", "source setting", "target")),
    Rule("scale-transition-assessment", any_terms=("agregation", "macro", "emergente", "emergence", "regles locales")),
    Rule("evidence-dependence-audit", any_terms=("confirmations independantes", "independants par defaut", "meme generateur", "meme donnees", "lignée est inconnue", "lignee est inconnue", "sources independantes")),
    Rule("strategic-adaptation-assessment", any_terms=("cible de financement", "optimiser", "publication de la regle", "gaming", "acteurs peuvent-ils apprendre")),
    Rule("value-of-information", any_terms=("six experiences", "plus petit ensemble", "changer notre conclusion", "ne peut modifier aucune conclusion", "cout, du delai", "faut-il l'etendre ou l'arreter")),
    Rule("capability-interference-audit", any_terms=("ordre d'appel", "interference", "skills n'interferent", "ajout de ce skill", "selon son ordre")),
    Rule("open-experiment-arena", any_terms=("fais affronter corpus", "methode rivale et une baseline", "monde causal gele", "sans laisser le recit choisir")),
    Rule("autonomous-capacity-gain", any_terms=("retrait complet de l'aide exterieure", "gain est reellement autonome", "reliquat de soutien", "capacite pendant plusieurs cycles")),
    Rule("consciousness-evidence-assessment", any_terms=("attribution de conscience", "explication non consciente", "conscience", "interiorite")),
    Rule("identify-reversal-condition", any_terms=("obligerait a la renverser", "condition precise", "renverser plutot", "reversal", "tenu a l'ecart")),
    Rule("media-power-assessment", any_terms=("pouvoir mediatique", "grande audience", "financement et la distribution", "visibilite et capacite de controle")),
    Rule("non-local-debt-assessment", any_terms=("dette non locale", "couts, obligations et dommages", "reportee ailleurs", "reporte ailleurs")),
    Rule("occupation-qualification", any_terms=("qualification d'occupation", "force etrangere", "annexe pas formellement", "controle effectif durable")),
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
