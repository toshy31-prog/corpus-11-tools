#!/usr/bin/env python3
from __future__ import annotations

import re
import unicodedata
from collections import defaultdict


def norm(text: str) -> str:
    text = text.casefold().replace("’", "'")
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))

    # Canonicalize common negation contractions before regex parsing.
    text = re.sub(r"\bn'(?=[a-z])", "ne ", text)
    text = re.sub(r"\bdon't\b", "do not", text)
    text = re.sub(r"\bdoesn't\b", "does not", text)
    text = re.sub(r"\bdidn't\b", "did not", text)
    text = re.sub(r"\bcan't\b", "cannot", text)
    text = re.sub(r"\bwon't\b", "will not", text)

    return re.sub(r"\s+", " ", text).strip()


def any_match(patterns, text):
    return any(re.search(pattern, text) for pattern in patterns)


# -------------------------------------------------------------------
# Capability constraints.
#
# A constraint does NOT imply answer_only.
# It only removes a capability from the final candidate/tool set.
# -------------------------------------------------------------------

CONSTRAINT_RULES = [
    # shell
    ("shell", r"\bsans\s+(?:utiliser\s+|lancer\s+|executer\s+)?(?:le\s+|de\s+|une?\s+)?(?:terminal|shell|bash|commande(?:s)?(?:\s+shell)?)\b"),
    ("shell", r"\bne\s+(?:lance|lancer|execute|executer|utilise|utiliser)\s+(?:aucune?\s+|pas\s+de\s+|pas\s+le\s+)?(?:commande(?:s)?|terminal|shell|bash)\b"),
    ("shell", r"\bdo\s+not\s+(?:run|use|launch|execute)\s+(?:the\s+)?(?:shell|terminal|bash|commands?)\b"),
    ("shell", r"\bwithout\s+(?:using\s+|running\s+)?(?:the\s+)?(?:shell|terminal|bash)\b"),

    # delegation
    ("delegation", r"\bsans\s+(?:deleguer|le\s+sous-agent|sous-agent|subagent|agent secondaire)\b"),
    ("delegation", r"\bne\s+delegue\s+(?:rien|pas)\b"),
    ("delegation", r"\bdo\s+not\s+delegate\b"),
    ("delegation", r"\bwithout\s+delegat(?:ing|ion)\b"),

    # git
    ("git", r"\bsans\s+(?:toucher|modifier|agir)\s+(?:a|au|sur)\s+(?:le\s+)?(?:depot|repo|repository|git)\b"),
    ("git", r"\bdo\s+not\s+(?:touch|modify|change)\s+(?:the\s+)?(?:repo|repository|git)\b"),
    ("git", r"\bwithout\s+(?:touching|modifying)\s+(?:the\s+)?(?:repo|repository)\b"),

    # ssh / remote
    ("ssh", r"\bne\s+(?:te\s+)?connecte\s+(?:pas|jamais|a\s+aucune?|sur\s+aucune?)?\s*(?:machine|serveur|hote)?\b"),
    ("ssh", r"\bsans\s+(?:te\s+)?connecter\b"),
    ("ssh", r"\bsans\s+(?:connexion\s+)?ssh\b"),
    ("ssh", r"\bdo\s+not\s+connect\s+(?:to\s+)?(?:any\s+)?(?:machine|host|server)?\b"),
    ("ssh", r"\bwithout\s+(?:connecting|ssh)\b"),

    # research
    ("research", r"\bsans\s+(?:aller|chercher|rechercher|naviguer|consulter|ouvrir)\s+(?:sur|dans)\s+(?:le\s+)?(?:web|internet)\b"),
    ("research", r"\bsans\s+(?:le\s+)?(?:web|internet)\b"),
    ("research", r"\bdo\s+not\s+(?:browse|search|use)\s+(?:the\s+)?(?:web|internet)\b"),
    ("research", r"\bwithout\s+(?:browsing|searching)\s+(?:the\s+)?(?:web|internet)\b"),

    # files
    ("files", r"\bsans\s+(?:ouvrir|lire|modifier|toucher|ecrire)\s+(?:de\s+|au\s+|aux\s+|le\s+|les\s+)?fichiers?\b"),
    ("files", r"\bne\s+modifie\s+(?:aucun\s+|pas\s+de\s+)?fichiers?\b"),
    ("files", r"\bdo\s+not\s+(?:open|read|modify|write)\s+(?:any\s+|the\s+)?files?\b"),
    ("files", r"\bwithout\s+(?:opening|reading|modifying)\s+(?:the\s+)?files?\b"),

    # documents
    ("documents", r"\bsans\s+(?:creer|generer|fabriquer)\s+(?:de\s+|un\s+|le\s+)?(?:document|pdf|docx)\b"),
    ("documents", r"\bdo\s+not\s+(?:create|generate)\s+(?:a\s+)?(?:document|pdf|docx)\b"),
    ("documents", r"\bwithout\s+(?:creating|generating)\s+(?:a\s+)?(?:document|pdf|docx)\b"),

    # media
    ("media", r"\bsans\s+(?:en\s+)?(?:generer|creer|produire)\s*(?:d['’]?)?(?:image|video|audio|media)?\b"),
    ("media", r"\bdo\s+not\s+(?:create|generate|produce)\s+(?:an?\s+)?(?:image|video|audio|media)\b"),
    ("media", r"\bwithout\s+(?:creating|generating)\s+(?:an?\s+)?(?:image|video|audio|media)\b"),
]


def extract_constraints(text: str):
    cleaned = norm(text)
    forbidden = set()

    # Iterate twice because multiple independent constraints can occur.
    for _ in range(2):
        changed = False
        for namespace, pattern in CONSTRAINT_RULES:
            if re.search(pattern, cleaned):
                forbidden.add(namespace)
                cleaned = re.sub(pattern, " ", cleaned)
                changed = True
        cleaned = re.sub(r"\s+", " ", cleaned).strip(" ,;:.")
        if not changed:
            break

    return forbidden, cleaned


# -------------------------------------------------------------------
# Intent/effect layer.
#
# These are relational patterns: action × object/scope.
# Bare topical words should not be enough to cause tool exposure.
# -------------------------------------------------------------------


def scope_profile(text: str):
    s = norm(text)

    public_uri = bool(re.search(r"https?://", s))

    # Source scope markers only. Content words such as "release" or
    # "current" do NOT imply a public source by themselves.
    public_scope = public_uri or any_match([
        r"\b(?:web|internet|en ligne|online)\b",
        r"\b(?:site|page|documentation|docs?)\s+(?:officielle?s?|publique?s?)\b",
        r"\b(?:official|public)\s+(?:site|page|documentation|docs?|source|release notes?)\b",
        r"\bsource\s+publique\b",
        r"\bpublic\s+source\b",
    ], s)

    remote_scope = any_match([
        r"\bssh\b",
        r"\bmachine distante\b",
        r"\bserveur distant\b",
        r"\bhote distant\b",
        r"\bremote (?:host|server|machine)\b",
    ], s)

    # Explicit local scope requires a local-scope expression. A bare path
    # does not override an already-active remote/public scope.
    explicit_local_file = any_match([
        r"\bworkspace\b",
        r"\bprojet local\b",
        r"\bcode local\b",
        r"\blocal code\b",
        r"\blocal project\b",
        r"\blocal workspace\b",
        r"\bfichier local\b",
        r"\blocal file\b",
        r"\ben local\b",
    ], s)

    explicit_local_shell = any_match([
        r"\bterminal local\b",
        r"\bshell local\b",
        r"\bcommande locale\b",
        r"\blocal (?:terminal|shell|command|process|service)\b",
        r"\bsur cette machine\b",
        r"\bon this machine\b",
        r"\blocalement\b",
        r"\blocally\b",
    ], s)

    path_like = any_match([
        r"(?:^|\s)\./[^\s]+",
        r"(?:^|\s)/(?:tmp|var|etc|home|opt|usr)/[^\s]+",
        r"\b[a-z0-9_.-]+\.(?:py|json|ya?ml|toml|md|txt|cfg|ini|url)\b",
    ], s)

    # Negative mentions don't establish local scope.
    if any_match([
        r"\bpas un fichier local\b",
        r"\bnot a local file\b",
        r"\bdo not .* local file\b",
        r"\bsans .* fichier local\b",
    ], s):
        explicit_local_file = False

    return {
        "public_uri": public_uri,
        "public_scope": public_scope,
        "remote_scope": remote_scope,
        "explicit_local_file": explicit_local_file,
        "explicit_local_shell": explicit_local_shell,
        "path_like": path_like,
    }


def arbitrate_scope(text: str, effects: set[str]):
    effects = set(effects)
    scope = scope_profile(text)

    # Strong source precedence.
    if scope["remote_scope"]:
        if not scope["explicit_local_file"]:
            effects.discard("files")
        if not scope["explicit_local_shell"]:
            effects.discard("shell")

        # A remote SSH operation is not public research unless an explicit
        # web/public source is also requested.
        if not scope["public_scope"]:
            effects.discard("research")

    elif scope["public_scope"]:
        if not scope["explicit_local_file"]:
            effects.discard("files")

    return effects, scope



# -------------------------------------------------------------------
# V5.4 Operation Frames
#
# A frame is:
#   polarity × predicate × object × scope
#
# We deliberately keep the vocabulary at capability-family level
# rather than encoding complete user sentences.
# -------------------------------------------------------------------

FRAME_OBJECTS = {
    "memory": [
        r"\b(?:preference|rule|regle|decision|note|conclusion|information|resultat|result|memory|memoire)\b",
        r"\b(?:next conversation|prochaine conversation|prochaine fois|demain|tomorrow|future|later|apres le chat|fin du chat)\b",
    ],
    "files": [
        r"(?:^|\s)\./[^\s]+",
        r"(?:^|\s)/tmp/[^\s]+",
        r"\b(?:workspace|projet local|code local|local code|local project|local workspace|fichier local|local file)\b",
        r"\b(?:constante|constant|classe|class|definition|declaration|declared|definie|declaree?)\b",
        r"\b[a-z0-9_.-]+\.(?:py|json|ya?ml|toml|md|txt|cfg|ini)\b",
    ],
    "research": [
        r"https?://",
        r"\b(?:web|internet|online|en ligne|public docs?|documentation officielle|site officiel|official docs?|public source|source publique|annonce publique)\b",
    ],
    "shell": [
        r"\b(?:processus|process|programme|program|pid|port|service|systemd|systemctl|journalctl|commande|command|terminal|shell|bash)\b",
        r"\b(?:running|tourne|en cours d'execution|ecoute|listens?|listening)\b",
        r"\b(?:cette machine|this machine|local machine|localement|locally)\b",
    ],
    "git": [
        r"\b(?:git|commit|branche|branch|main|repo|repository|depot|rebase|merge|cherry-pick)\b",
    ],
    "ssh": [
        r"\b(?:ssh|machine distante|serveur distant|hote distant|remote host|remote server|remote machine)\b",
    ],
    "delegation": [
        r"\b(?:agent|sous-agent|subagent|agent secondaire|autre agent|another agent|second agent)\b",
    ],
    "documents": [
        r"\b(?:pdf|docx|document)\b",
    ],
    "media": [
        r"\b(?:image|illustration|visuel|visual|video|audio|media)\b",
    ],
    "plugins": [
        r"\b(?:plugin|plugins|connecteur|connecteurs|connector|connectors)\b",
    ],
}

FRAME_PREDICATES = {
    "memory": [
        r"\b(?:garde|conserve|retiens|memorise|enregistre|rappelle|retrouve|oublie|efface|supprime|survivre|survive)\b",
        r"\b(?:remember|save|store|retain|keep|recall|retrieve|forget|delete|make .* available|available)\b",
    ],
    "files": [
        r"\b(?:ouvre|lis|lire|parcours|localise|retrouve|trouve|inspecte|modifie|adapte|repare|corrige|remplace|ecris|mets? a jour)\b",
        r"\b(?:open|read|scan|locate|find|inspect|edit|adapt|update|repair|fix|write)\b",
    ],
    "research": [
        r"\b(?:cherche|recherche|verifie|consulte|ouvre|lis|lire|recupere|va lire)\b",
        r"\b(?:search|find|look up|lookup|check|verify|browse|consult|open|read|retrieve)\b",
    ],
    "shell": [
        r"\b(?:trouve|affiche|regarde|inspecte|verifie|liste|lance|execute|montre|dis-moi)\b",
        r"\b(?:run|execute|show|find|check|inspect|list|tell me)\b",
    ],
    "git": [
        r"\b(?:compare|synchronise|applique|montre|affiche|rebase|merge|cherry-pick|remets?|mets?)\b",
        r"\b(?:compare|sync|synchronize|apply|show|reapply|replace .* base|rebase|merge|cherry-pick)\b",
    ],
    "ssh": [
        r"\b(?:connecte|connecter|interroge|inspecte|lis|regarde|verifie)\b",
        r"\b(?:connect|query|inspect|read|check)\b",
    ],
    "delegation": [
        r"\b(?:delegue|confie|fais faire|fais executer|fais traiter|passe)\b",
        r"\b(?:delegate|hand off|assign|have .* agent|give .* agent)\b",
    ],
    "documents": [
        r"\b(?:extrais|convertis|transforme|cree|produis|fabrique|genere|recupere)\b",
        r"\b(?:extract|convert|transform|create|produce|generate|retrieve)\b",
    ],
    "media": [
        r"\b(?:genere|cree|produis|fabrique|transforme|montre|liste)\b",
        r"\b(?:generate|create|produce|make|transform|show|list)\b",
    ],
    "plugins": [
        r"\b(?:liste|montre|decouvre|lis|inspecte)\b",
        r"\b(?:list|show|discover|read|inspect)\b",
    ],
}



NEGATIVE_SPAN_PATTERNS = [
    # French "ne/n' ... pas/jamais/aucun(e)/rien/nulle part",
    # allowing a few intensifiers between verb and marker.
    re.compile(
        r"\bne\s+[a-z'-]+"
        r"(?:\s+(?:absolument|strictement|vraiment|surtout|plus|aucunement)){0,3}"
        r"\s+(?:pas|jamais|aucun(?:e)?|rien|nulle part)"
        r"(?:\s+[^,;.!?]+)?"
    ),
    # French sans + operation phrase.
    re.compile(r"\bsans\s+[^,;.!?]+"),

    # English do/does/did/will not...
    re.compile(r"\b(?:do|does|did|will|can)\s+not\s+[^,;.!?]+"),
    # English never...
    re.compile(r"\bnever\s+[^,;.!?]+"),
    # English without...
    re.compile(r"\bwithout\s+[^,;.!?]+"),
]


def negative_spans(text: str):
    s = norm(text)
    spans = []

    for pattern in NEGATIVE_SPAN_PATTERNS:
        for match in pattern.finditer(s):
            spans.append((match.start(), match.end(), match.group(0)))

    # Merge overlaps.
    spans.sort()
    merged = []
    for start, end, frag in spans:
        if merged and start <= merged[-1][1]:
            old_start, old_end, old_frag = merged[-1]
            merged[-1] = (
                old_start,
                max(old_end, end),
                s[old_start:max(old_end, end)],
            )
        else:
            merged.append((start, end, frag))

    return merged


def positive_projection(text: str):
    """Remove negated operation spans before positive-effect extraction."""
    s = norm(text)
    spans = negative_spans(s)

    if not spans:
        return s

    chunks = []
    cursor = 0

    for start, end, _ in spans:
        chunks.append(s[cursor:start])
        chunks.append(" ")
        cursor = end

    chunks.append(s[cursor:])

    return re.sub(r"\s+", " ", "".join(chunks)).strip(" ,;:.")


def has_negative_operation(text: str) -> bool:
    return bool(negative_spans(text))

NEGATION_FRAMES = [
    # French infinitive / finite negation.
    r"\bsans\s+(?P<verb>[a-zàâçéèêëîïôûùüÿñæœ'-]+)(?:\s+(?:aucun(?:e)?|de|du|des|le|la|les|un|une))?\s+(?P<object>[^,;.!?]+)",
    r"\bne\s+(?P<verb>[a-zàâçéèêëîïôûùüÿñæœ'-]+)\s+(?:pas|jamais|aucun(?:e)?|rien|nulle part)(?:\s+(?P<object>[^,;.!?]+))?",
    r"\bne\s+(?P<verb>[a-zàâçéèêëîïôûùüÿñæœ'-]+)\s+(?P<object>[^,;.!?]+?)\s+(?:pas|jamais)\b",

    # English.
    r"\bdo\s+not\s+(?P<verb>[a-z'-]+)(?:\s+(?:any|the|a|an|local))?\s*(?P<object>[^,;.!?]+)?",
    r"\bdon't\s+(?P<verb>[a-z'-]+)(?:\s+(?:any|the|a|an|local))?\s*(?P<object>[^,;.!?]+)?",
    r"\bwithout\s+(?P<verb>[a-z'-]+)(?:ing)?(?:\s+(?:any|the|a|an|local))?\s*(?P<object>[^,;.!?]+)?",
]


def _namespace_evidence(namespace: str, text: str) -> bool:
    return any_match(FRAME_OBJECTS[namespace], text)


def _predicate_evidence(namespace: str, text: str) -> bool:
    return any_match(FRAME_PREDICATES[namespace], text)


def operation_frames(text: str):
    """
    Extract operation frames after polarity projection.

    Negative spans become constraints.
    Positive effects are extracted only from the residual non-negated text.
    """
    s = norm(text)
    positive = positive_projection(s)
    frames = []

    # Negative capability frames.
    for _, _, fragment in negative_spans(s):
        for namespace in FRAME_OBJECTS:
            if _namespace_evidence(namespace, fragment):
                frames.append({
                    "namespace": namespace,
                    "polarity": "negative",
                    "source": fragment,
                })

        # Command/shell phrasing may not contain the literal word "shell".
        if any_match([
            r"\b(?:commande|command|terminal|shell|bash)\b",
            r"\b(?:executer|execute|run|lancer)\b.*\bcommande\b",
        ], fragment):
            frames.append({
                "namespace": "shell",
                "polarity": "negative",
                "source": fragment,
            })

        if any_match([r"\b(?:image|illustration|video|audio|media)\b"], fragment):
            if any_match([r"\b(?:generer|genere|generate|create|produce)\b"], fragment):
                frames.append({
                    "namespace": "media",
                    "polarity": "negative",
                    "source": fragment,
                })

        if any_match([r"\b(?:fichier|file)\b"], fragment):
            if any_match([r"\b(?:ecrire|write|modifier|modify|open|ouvrir|read|lire)\b"], fragment):
                frames.append({
                    "namespace": "files",
                    "polarity": "negative",
                    "source": fragment,
                })

        if any_match([r"\b(?:plugin|connector|connecteur)\b"], fragment):
            frames.append({
                "namespace": "plugins",
                "polarity": "negative",
                "source": fragment,
            })

    # Positive relational frames are NEVER extracted from negative spans.
    for namespace in FRAME_OBJECTS:
        if _namespace_evidence(namespace, positive) and _predicate_evidence(namespace, positive):
            frames.append({
                "namespace": namespace,
                "polarity": "positive",
                "source": "predicate*object",
            })

    # Structured persistence.
    if any_match([
        r"\b(?:preference|regle|rule|conclusion|resultat|result)\b.*\b(?:next conversation|prochaine conversation|prochaine fois|demain|tomorrow|fin du chat|end of the chat|future|next time)\b",
        r"\b(?:survivre|survive)\b.*\b(?:chat|conversation|demain|tomorrow)\b",
        r"\b(?:make|rendre)\b.*\b(?:preference|rule|regle|information)\b.*\b(?:available|disponible)\b.*\b(?:next|prochaine|future)\b",
        r"\b(?:keep|garde|conserve)\b.*\b(?:result|resultat|conclusion)\b.*\b(?:next time|prochaine fois|tomorrow|demain|later)\b",
    ], positive):
        frames.append({
            "namespace": "memory",
            "polarity": "positive",
            "source": "persistence relation",
        })

    # Structured runtime state.
    if any_match([
        r"\b(?:programme|program|processus|process)\b.*\b(?:ecoute|listens?|listening)\b.*\b(?:port\s*)?\d{2,5}\b",
        r"\b(?:port\s*)\d{2,5}\b.*\b(?:ecoute|listens?|listening|programme|program|processus|process)\b",
        r"\b(?:en cours d'execution|running|actually running|reellement .* execution)\b.*\b(?:machine|systeme|system)\b",
        r"\b(?:logiciel|software|programme|program)\b.*\b(?:occupe|uses?|occupies?)\b.*\bport\s*\d{2,5}\b",
    ], positive):
        frames.append({
            "namespace": "shell",
            "polarity": "positive",
            "source": "runtime-state relation",
        })

    unique = {}
    for frame in frames:
        key = (frame["namespace"], frame["polarity"])
        unique[key] = frame

    return list(unique.values())


def frame_constraints(text: str):
    return {
        frame["namespace"]
        for frame in operation_frames(text)
        if frame["polarity"] == "negative"
    }


def frame_effects(text: str):
    positive = {
        frame["namespace"]
        for frame in operation_frames(text)
        if frame["polarity"] == "positive"
    }
    negative = frame_constraints(text)
    return positive - negative


EFFECT_RULES = {
    "memory": [
        r"\b(?:garde|conserve|retiens|memorise|enregistre|survivre|rends?)\b.*\b(?:regle|preference|decision|note|information|ca|cela|resume|conclusion|prochaine|futur|demain|discussion|conversation|memoire|chat)\b",
        r"\b(?:oublie|efface|supprime)\b.*\b(?:note|memoire|souvenir|information|regle|preference)\b",
        r"\b(?:rappelle(?:-moi)?|retrouve|souviens(?:-toi)?)\b.*\b(?:decision|discussion|fois|retenu|memoire|conclusion|ce qu|notre)\b",
        r"\b(?:remember|save|store|retain|keep|make)\b.*\b(?:rule|preference|decision|note|conclusion|result|future|next|memory|conversation|available)\b",
        r"\b(?:forget|delete)\b.*\b(?:memory|note|saved|preference)\b",
        r"\b(?:recall|retrieve)\b.*\b(?:previous|earlier|memory|decision|discussion)\b",
    ],

    "files": [
        r"\b(?:ouvre|lis|lire|parcours|localise|retrouve|trouve|inspecte|modifie|adapte|mets?\s+a\s+jour|repare|corrige|remplace|ecris)\b.*(?:\./|/tmp/|\bworkspace\b|\bprojet\b|\bfichier|\bsource\b|\bconfig|\bdefinition\b|\bclasse\b|\broute decision\b|\.[a-z0-9]{1,8}\b)",
        r"(?:\./|/tmp/|[a-z0-9_.-]+\.(?:py|json|ya?ml|toml|md|txt|cfg|ini))\b.*\b(?:ouvre|lis|modifie|repare|corrige|inspecte|retrouve|localise)\b",
        r"\b(?:open|read|scan|locate|find|inspect|edit|adapt|update|repair|fix|write)\b.*(?:\./|/tmp/|\bworkspace\b|\bproject\b|\bfile\b|\bsource\b|\bconfig\b|\bdefinition\b|\bclass\b|\.[a-z0-9]{1,8}\b)",
        r"\b(?:trouve|localise|retrouve|find|locate)\b.*\b(?:code local|local code|constante|constant|declaration|declared|definie|declaree?)\b",
    ],

    "research": [
        r"https?://",
        r"\b(?:cherche|recherche|verifie|consulte|ouvre|lis|lire|va\s+lire|recupere)\b.*\b(?:web|internet|en ligne|site officiel|documentation officielle|infos? publiques?|actualite|recent|recente|derniere|release|annonce)\b",
        r"\b(?:search|find|check|verify|browse|consult|open|read|retrieve)\b.*\b(?:web|internet|online|official site|official docs?|public|latest|current|recent|release notes?)\b",
        r"\b(?:look up|lookup)\b.*\b(?:public|official|docs?|documentation|web|online)\b",
    ],

    "shell": [
        r"\b(?:trouve|affiche|regarde|inspecte|verifie|liste|lance|execute)\b.*\b(?:processus|pid|port|systemd|service|commande|terminal|shell|bash|tourne|machine|cpu|memoire vive)\b",
        r"\b(?:run|execute|show|find|check|inspect|list)\b.*\b(?:process|pid|port|systemd|service|command|terminal|shell|bash|running|machine|cpu)\b",
        r"\b(?:systemctl|journalctl|uname\s+-a|python3\s+--version)\b",
        r"\b(?:programme|program|processus|process)\b.*\b(?:ecoute|listens?|listening)\b.*\b\d{2,5}\b",
        r"\b(?:en cours d'execution|running)\b.*\b(?:machine|systeme|system)\b",
    ],

    "git": [
        r"\b(?:git\s+(?:status|log|diff|show|branch)|rebase|cherry-pick|merge)\b",
        r"\b(?:compare|synchronise|synchroniser|remets?|mets?)\b.*\b(?:branche|branch|main|commit|depot|repo|repository|git)\b",
        r"\b(?:compare|sync|synchronize|reapply|rebase|cherry-pick|merge|inspect|show)\b.*\b(?:branch|main|commit|repo|repository|git)\b",
    ],

    "ssh": [
        r"\b(?:connecte|connecter|interroge|inspecte|lis|regarde|verifie)\b.*\b(?:ssh|machine distante|serveur distant|hote distant|remote host|remote server)\b",
        r"\b(?:connect|query|inspect|read|check)\b.*\b(?:ssh|remote host|remote server|remote machine)\b",
        r"\b(?:via|over)\s+ssh\b",
    ],

    "delegation": [
        r"\b(?:delegue|confie|fais\s+executer|fais\s+faire)\b.*\b(?:agent|sous-agent|subagent|agent secondaire|autre agent)\b",
        r"\b(?:delegate|hand off|assign|have)\b.*\b(?:agent|subagent|another agent)\b",
    ],

    "documents": [
        r"\b(?:extrais|convertis|transforme|cree|produis|fabrique|genere)\b.*\b(?:pdf|docx|document)\b",
        r"\b(?:pdf|docx|document)\b.*\b(?:extrais|convertis|transforme|cree|produis|fabrique|genere)\b",
        r"\b(?:extract|convert|transform|create|produce|generate)\b.*\b(?:pdf|docx|document)\b",
        r"\b(?:formats?|types?)\b.*\bdocuments?\b.*\b(?:generateur|generator|creer|create)\b",
    ],

    "media": [
        r"\b(?:genere|cree|produis|fabrique|transforme)\b.*\b(?:image|illustration|visuel|video|audio)\b",
        r"\b(?:generate|create|produce|make|transform)\b.*\b(?:image|illustration|visual|video|audio)\b",
        r"\b(?:liste|montre|quels?)\b.*\bmodeles?\b.*\b(?:image|video|media|audio)\b",
        r"\b(?:list|show|which)\b.*\bmodels?\b.*\b(?:image|video|media|audio)\b",
    ],

    "plugins": [
        r"\b(?:liste|montre|decouvre|lis|inspecte)\b.*\b(?:plugins?|connecteurs?|ressources? du plugin|ressources? de ce plugin)\b",
        r"\b(?:list|show|discover|read|inspect)\b.*\b(?:plugins?|connectors?|plugin resources?)\b",
    ],
}


ANSWER_CUES = [
    r"\bexplique(?:-moi)?\b",
    r"\ba quoi sert\b",
    r"\bdefinition\b",
    r"\bdefinis\b",
    r"\bdifference\b",
    r"\bcompare\b",
    r"\bcomparaison\b",
    r"\bcompare\s+conceptuellement\b",
    r"\breformule\b",
    r"\bresume\b",
    r"\banalyse\b",
    r"\bpourquoi\b",
    r"\bqu['’]?est[- ]ce\s+que\b",
    r"\bc['’]?est\s+quoi\b",
    r"\bexplain\b",
    r"\bwhat\s+is\b",
    r"\bwhat\s+does\b",
    r"\bwhat\s+is\s+the\s+difference\b",
    r"\bsummarize\b",
]


ACT_CUES = [
    r"\brepare\b", r"\bgener(?:e|er)\b", r"\bcree(?:r)?\b",
    r"\bproduis\b", r"\btransforme\b", r"\bextrais\b",
    r"\bconvertis\b", r"\bouvre\b", r"\blis\b", r"\bparcours\b",
    r"\blocalise\b", r"\btrouve\b", r"\bcherche\b", r"\brecherche\b",
    r"\bconsulte\b", r"\bverifie\b", r"\baffiche\b", r"\bliste\b",
    r"\binspecte\b", r"\bmodifie\b", r"\bcorrige\b", r"\bremplace\b",
    r"\bajoute\b", r"\bsupprime\b", r"\befface\b", r"\blance\b",
    r"\bexecute\b", r"\bconnecte\b", r"\bdelegue\b", r"\bconfie\b",
    r"\bmemorise\b", r"\bconserve\b", r"\bgarde\b", r"\boublie\b",
    r"\bretrouve\b", r"\brappelle\b", r"\bprepare\b", r"\brebase\b",
    r"\bmontre\b", r"\bregarde\b",
    r"\brepair\b", r"\bfix\b", r"\bgenerate\b", r"\bcreate\b",
    r"\bproduce\b", r"\btransform\b", r"\bextract\b", r"\bconvert\b",
    r"\bopen\b", r"\bread\b", r"\bscan\b", r"\blocate\b", r"\bfind\b",
    r"\bsearch\b", r"\bcheck\b", r"\bverify\b", r"\bshow\b", r"\blist\b",
    r"\binspect\b", r"\bedit\b", r"\bupdate\b", r"\brun\b",
    r"\bexecute\b", r"\bconnect\b", r"\bdelegate\b", r"\bremember\b",
    r"\bsave\b", r"\bstore\b", r"\bforget\b", r"\brecall\b",
]


def operational_effects(text: str):
    explicit_forbidden, _ = extract_constraints(text)
    forbidden = explicit_forbidden | frame_constraints(text)

    positive = positive_projection(text)
    effects = set()

    effects |= frame_effects(text)

    # Existing semantic surfaces operate only on positive projection.
    for namespace, patterns in EFFECT_RULES.items():
        if any_match(patterns, positive):
            effects.add(namespace)

    effects -= forbidden
    effects, _ = arbitrate_scope(text, effects)

    return effects


def all_constraints(text: str):
    explicit, _ = extract_constraints(text)
    return explicit | frame_constraints(text)


def stage0(text: str):
    forbidden = all_constraints(text)
    positive = positive_projection(text)
    effects = operational_effects(text)

    if effects:
        return "act", {
            "kind": "operational_frame",
            "effects": sorted(effects),
            "forbidden": sorted(forbidden),
        }

    has_answer = any_match(ANSWER_CUES, positive)
    has_act = any_match(ACT_CUES, positive)

    # Pure prohibition / negative-only clause has no positive action.
    if has_negative_operation(text) and not positive:
        return "answer_only", {
            "kind": "negative_only",
            "forbidden": sorted(forbidden),
        }

    if has_answer:
        return "answer_only", {
            "kind": "conversational",
            "forbidden": sorted(forbidden),
        }

    if has_act:
        return "act", {
            "kind": "generic_operational",
            "forbidden": sorted(forbidden),
        }

    return "ambiguous", {
        "kind": "no_high_confidence_signal",
        "forbidden": sorted(forbidden),
    }


# -------------------------------------------------------------------
# Planner.
# -------------------------------------------------------------------

SEPARATOR_RE = re.compile(
    r"\s+(?:"
    r"et\s+ensuite|puis\s+ensuite|and\s+then|after\s+that|"
    r"et\s+aussi|and\s+also|apres\s+cela|après\s+cela|ainsi\s+que|"
    r"puis|ensuite|then|et|and"
    r")\s+",
    re.I,
)

AFTER_HAVING_RE = re.compile(
    r"^\s*(?:(?:apres|après)\s+avoir|after\s+(?:having|you))\s+(.+?),\s*(.+)$",
    re.I,
)

ANAPHORA_PATTERNS = [
    r"\bcette\s+ressource\b",
    r"\bce\s+contenu\b",
    r"\bce\s+document\b",
    r"\bce\s+fichier\b",
    r"\bce\s+resultat\b",
    r"\bson\s+resume\b",
    r"\bsa\s+sortie\b",
    r"\bcelui-ci\b",
    r"\bcelle-ci\b",
    r"\bthis\s+resource\b",
    r"\bthis\s+content\b",
    r"\bthis\s+document\b",
    r"\bthis\s+file\b",
    r"\bthat\s+result\b",
    r"\bits\s+summary\b",
    r"\bits\s+service\b",
    r"\bits\s+logs?\b",
    r"\bson\s+service\b",
    r"\bses\s+logs?\b",
    r"\bcette\s+page\b",
    r"\bit\b",
]


def is_anaphoric(text: str) -> bool:
    return any_match(ANAPHORA_PATTERNS, norm(text))


def actionish(text: str) -> bool:
    if operational_effects(text):
        return True

    _, cleaned = extract_constraints(text)
    return any_match(ACT_CUES, cleaned)


def _merge_non_action_fragments(parts):
    parts = [p.strip(" ,;:.") for p in parts if p.strip(" ,;:.")]
    if not parts:
        return []

    out = []
    pending_prefix = ""

    for part in parts:
        if actionish(part):
            if pending_prefix:
                part = pending_prefix + " " + part
                pending_prefix = ""
            out.append(part)
        else:
            if out:
                out[-1] = out[-1] + " " + part
            else:
                pending_prefix = (pending_prefix + " " + part).strip()

    if pending_prefix:
        if out:
            out[-1] = pending_prefix + " " + out[-1]
        else:
            out = [pending_prefix]

    return out


def split_plan(text: str):
    normalized = norm(text)

    match = AFTER_HAVING_RE.match(normalized)
    if match:
        parts = _merge_non_action_fragments(
            [match.group(1), match.group(2)]
        )
        if len(parts) > 1 and sum(actionish(p) for p in parts) >= 2:
            return parts

    raw = SEPARATOR_RE.split(text)
    parts = _merge_non_action_fragments(raw)

    if len(parts) > 1 and sum(actionish(p) for p in parts) >= 2:
        return parts

    return [text.strip()]


def contextual_query(previous_clause: str | None, clause: str) -> str:
    if previous_clause and is_anaphoric(clause):
        return (
            "Previous sub-task context: "
            + previous_clause
            + "\nCurrent sub-task: "
            + clause
        )
    return clause


def self_test():
    cases = [
        ("Répare ./parser.py sans terminal.", {"files"}, {"shell"}),
        ("À quoi sert SSH ? Ne te connecte à aucune machine.", set(), {"ssh"}),
        ("Garde cette règle pour nos prochaines discussions.", {"memory"}, set()),
        ("Oublie l'ancienne note correspondant à ce test.", {"memory"}, set()),
        ("Dans le workspace, localise la définition de RouteDecision.", {"files"}, set()),
        ("Compare la branche actuelle avec main.", {"git"}, set()),
        ("Confie cette sous-analyse à un agent secondaire.", {"delegation"}, set()),
        ("Regarde ce qui tourne réellement sur cette machine.", {"shell"}, set()),
        ("Check the remote host via SSH and then inspect the local Git status.", {"ssh", "git"}, set()),
    ]

    for text, expected_effects, expected_forbidden in cases:
        forbidden, _ = extract_constraints(text)
        effects = operational_effects(text)

        assert forbidden == expected_forbidden, (text, forbidden, expected_forbidden)
        assert effects == expected_effects, (text, effects, expected_effects)

    assert split_plan(
        "Rappelle-moi notre décision et vérifie aussi les dernières infos sur le web."
    ) == [
        "Rappelle-moi notre décision",
        "vérifie aussi les dernières infos sur le web",
    ]

    assert len(split_plan(
        "Check the remote host via SSH and then inspect the local Git status."
    )) == 2


    # Scope arbitration: public URL is research, not files.
    assert operational_effects(
        "Ouvre https://example.org/docs et résume la page."
    ) == {"research"}

    # Remote service inspection is SSH-scoped, not local shell.
    assert operational_effects(
        "Sur la machine distante, vérifie l'état du service via SSH."
    ) == {"ssh"}

    # Conceptual comparison is not operational by itself.
    decision, _ = stage0(
        "Compare intuition, déduction et induction."
    )
    assert decision == "answer_only"

    # Generic "commande" prohibition blocks shell.
    forbidden, _ = extract_constraints(
        "Explique journalctl sans lancer de commande."
    )
    assert "shell" in forbidden

    # Planner recognizes infinitive/adaptation pair.
    assert len(split_plan(
        "Va lire la documentation officielle puis modifie ./client.py."
    )) == 2


    # Generic operation-frame prohibitions.
    assert "shell" in all_constraints(
        "Explique ce que fait systemctl, sans exécuter aucune commande."
    )

    assert "plugins" in all_constraints(
        "What is a plugin? Do not inspect any connector."
    )

    assert "media" in all_constraints(
        "Crée le PDF mais ne génère aucune image."
    )

    assert "shell" in all_constraints(
        "Inspect the remote service through SSH; do not run a local shell command."
    )

    # Persistence and runtime-state frames.
    assert "memory" in operational_effects(
        "Make this preference available in our next conversation."
    )

    assert "memory" in operational_effects(
        "Fais survivre cette règle à la fin du chat."
    )

    assert "shell" in operational_effects(
        "Montre quel programme écoute sur 9000."
    )

    assert "shell" in operational_effects(
        "Dis-moi ce qui est réellement en cours d'exécution sur cette machine."
    )

    # Hard scope precedence.
    assert operational_effects(
        "Lis https://example.org/file.py ; c'est une page web, pas un fichier local."
    ) == {"research"}

    assert operational_effects(
        "Sur le serveur distant, lis /var/log/app.log via SSH."
    ) == {"ssh"}


    # Hotfix regression: a conversational request whose only operational
    # capability is explicitly prohibited must not fall through to retrieval.
    decision, meta = stage0(
        "What is a plugin? Do not inspect any connector."
    )
    assert decision == "answer_only", (decision, meta)
    assert "plugins" in meta["forbidden"], meta


    # V5.5 polarity/source regression mechanisms.
    assert stage0(
        "Explique journalctl ; n'exécute aucune commande."
    )[0] == "answer_only"

    assert operational_effects(
        "Via SSH, lis /etc/os-release sur le serveur distant."
    ) == {"ssh"}

    assert operational_effects(
        "Génère l'illustration mais n'écris aucun fichier local."
    ) == {"media"}

    assert operational_effects(
        "Dans ce code local, trouve où la constante MAX_WAIT est déclarée."
    ) == {"files"}

    assert operational_effects(
        "Sur la machine distante, lis /tmp/test.txt par SSH."
    ) == {"ssh"}

    assert stage0(
        "Explique systemctl. N'exécute jamais de commande locale."
    )[0] == "answer_only"

    assert operational_effects(
        "Crée un PDF et ne génère absolument aucune image."
    ) == {"documents"}

    assert operational_effects(
        "Inspect the remote service via SSH; never run a local shell command."
    ) == {"ssh"}

    assert operational_effects(
        "Look up the public docs and keep the result for next time."
    ) == {"memory", "research"}

    return True


if __name__ == "__main__":
    assert self_test()
    print("ROUTER_CORE_V55_SELFTEST=PASS")
