from pathlib import Path
import os
import time

from playwright.sync_api import sync_playwright

CDP = "http://127.0.0.1:9223"
PREFIX = "http://127.0.0.1:18743/corpus/"
OUT = Path(os.environ["BB07_OUT"])

README = "projets/youtube-scout/README.md"
CATALOGUE = "projets/youtube-scout/lib/catalogue-graph.mjs"
EPHEMERAL = "projets/youtube-scout/lib/ephemeral-exploration.mjs"

OUT.mkdir(parents=True, exist_ok=True)


def fail(msg):
    print("REFUS:", msg)
    raise SystemExit(2)


def corpus_pages(browser):
    result = []

    for context in browser.contexts:
        for page in context.pages:
            try:
                if page.url.startswith(PREFIX):
                    result.append(page)
            except Exception:
                pass

    return result


def body(page):
    return page.locator("body").inner_text()


def current_file(page):
    """
    Source de vérité native de Révision :
    le fichier courant est le bouton de l'arbre portant
    la classe `selected`; son aria-label contient le chemin complet.
    """
    selected = page.locator("button.selected")

    visible = []

    for i in range(selected.count()):
        node = selected.nth(i)

        try:
            if not node.is_visible():
                continue

            aria = node.get_attribute("aria-label") or ""

            if aria.startswith("projets/"):
                visible.append((node, aria))

        except Exception:
            pass

    if len(visible) == 0:
        return None

    if len(visible) > 1:
        fail(
            "plusieurs fichiers sélectionnés dans Révision : "
            + repr([aria for _, aria in visible])
        )

    return visible[0][1]

def wait_file(page, expected, timeout=15):
    deadline = time.time() + timeout

    while time.time() < deadline:
        if current_file(page) == expected:
            return
        time.sleep(.1)

    fail(
        f"fichier attendu={expected!r}, "
        f"obtenu={current_file(page)!r}"
    )


def visible_unique(page, selectors, label):
    # On préfère aria-label/title exacts.
    for selector in selectors:
        loc = page.locator(selector)
        visible = []

        for i in range(loc.count()):
            node = loc.nth(i)
            try:
                if node.is_visible():
                    visible.append(node)
            except Exception:
                pass

        if len(visible) == 1:
            print(f"{label}_SELECTOR={selector!r}")
            return visible[0]

        if len(visible) > 1:
            fail(f"{label}: {len(visible)} éléments visibles")

    return None


def click_text_unique(page, text, label):
    loc = page.get_by_text(text, exact=True)
    visible = []

    for i in range(loc.count()):
        node = loc.nth(i)
        try:
            if node.is_visible():
                visible.append(node)
        except Exception:
            pass

    if len(visible) != 1:
        fail(
            f"{label}: texte {text!r}, "
            f"éléments visibles={len(visible)}"
        )

    visible[0].click()
    print(f"{label}=CLICKED")


def revision_present(page):
    text = body(page)
    return (
        "Non validées" in text
        and "Affichage des modifications suivies uniquement" in text
    )


def ensure_revision(page):
    if revision_present(page):
        print("REVISION_ALREADY_OPEN=YES")
        return

    # ---------------------------------------------------------
    # 1. Nous pouvons être sur la landing "Nouvelle conversation".
    #    Le DOM observé distingue :
    #
    #    button#corpus-quick-menu-button = déclencheur
    #    div.corpus-quick-menu[role=menu] = menu
    #
    #    Le menu landing indique "Aucune conversation" et expose
    #    des boutons "Conversation Corpus".
    # ---------------------------------------------------------

    if current_file(page) is None:
        menu = page.locator(
            'div.corpus-quick-menu[role="menu"]'
        )

        menu_visible = (
            menu.count() == 1
            and menu.is_visible()
        )

        if not menu_visible:
            trigger = page.locator(
                'button#corpus-quick-menu-button'
            )

            visible_trigger = [
                trigger.nth(i)
                for i in range(trigger.count())
                if trigger.nth(i).is_visible()
            ]

            if len(visible_trigger) != 1:
                fail(
                    "déclencheur quick-menu visible="
                    + str(len(visible_trigger))
                )

            visible_trigger[0].click()
            print("QUICK_MENU_TRIGGER=CLICKED")

            deadline = time.time() + 5

            while time.time() < deadline:
                menu = page.locator(
                    'div.corpus-quick-menu[role="menu"]'
                )

                if (
                    menu.count() == 1
                    and menu.is_visible()
                ):
                    break

                time.sleep(.1)
            else:
                fail("quick-menu ne s'est pas ouvert")

        print("QUICK_MENU=VISIBLE")

        # Sur la landing, ouvrir une conversation existante.
        if "Aucune conversation" in menu.inner_text():
            conversations = menu.get_by_role(
                "menuitem",
                name="Conversation Corpus",
                exact=True,
            )

            visible_conversations = [
                conversations.nth(i)
                for i in range(conversations.count())
                if conversations.nth(i).is_visible()
            ]

            print(
                "QUICK_MENU_CONVERSATIONS="
                + str(len(visible_conversations))
            )

            if not visible_conversations:
                fail(
                    "aucune Conversation Corpus "
                    "dans le quick-menu"
                )

            # Choix déterministe : première conversation de la
            # section Récents telle qu'ordonnée par l'application.
            visible_conversations[0].click()

            print(
                "QUICK_MENU_FIRST_CONVERSATION=CLICKED"
            )

            deadline = time.time() + 10

            while time.time() < deadline:
                if "?session=" in page.url:
                    print(
                        "CONVERSATION_URL="
                        + page.url
                    )
                    break

                # Certaines implémentations conservent l'URL
                # mais remplacent la landing.
                try:
                    if "Nouvelle conversation" not in (
                        page.locator("article#detail")
                        .inner_text()
                    ):
                        print(
                            "CONVERSATION_CONTENT=LOADED"
                        )
                        break
                except Exception:
                    pass

                time.sleep(.1)
            else:
                fail(
                    "conversation sélectionnée "
                    "mais non chargée"
                )

    # ---------------------------------------------------------
    # 2. Sur une conversation existante, rechercher directement
    #    Modifications du projet.
    # ---------------------------------------------------------

    deadline = time.time() + 5

    visible_mods = []

    while time.time() < deadline:
        mods = page.get_by_text(
            "Modifications du projet",
            exact=True
        )

        visible_mods = []

        for i in range(mods.count()):
            node = mods.nth(i)

            try:
                if node.is_visible():
                    visible_mods.append(node)
            except Exception:
                pass

        if len(visible_mods) == 1:
            break

        if len(visible_mods) > 1:
            fail(
                "Modifications du projet ambigu : "
                + str(len(visible_mods))
            )

        time.sleep(.1)

    # ---------------------------------------------------------
    # 3. Si le contrôle n'est pas immédiatement visible,
    #    utiliser le déclencheur quick-menu EXACT, jamais le menu.
    # ---------------------------------------------------------

    if not visible_mods:
        trigger = page.locator(
            'button#corpus-quick-menu-button'
        )

        visible_trigger = [
            trigger.nth(i)
            for i in range(trigger.count())
            if trigger.nth(i).is_visible()
        ]

        if len(visible_trigger) != 1:
            fail(
                "déclencheur quick-menu conversation="
                + str(len(visible_trigger))
            )

        # Fermer un éventuel menu encore ouvert, puis le rouvrir
        # si nécessaire afin de provoquer l'état attendu.
        menu = page.locator(
            'div.corpus-quick-menu[role="menu"]'
        )

        if menu.count() == 1 and menu.is_visible():
            close = menu.get_by_role(
                "menuitem",
                name="Fermer le menu",
                exact=True,
            )

            if close.count() == 1 and close.is_visible():
                close.click()
                print("QUICK_MENU=CLOSED")

        # Le panneau de modifications n'est pas le quick-menu :
        # à ce stade on refuse de cliquer arbitrairement ailleurs.
        # Inventaire ciblé des contrôles liés aux modifications.
        candidates = page.locator(
            'button, [role="button"], [aria-label], [title]'
        )

        matches = []

        for i in range(candidates.count()):
            node = candidates.nth(i)

            try:
                if not node.is_visible():
                    continue

                key = " ".join([
                    node.inner_text() or "",
                    node.get_attribute("aria-label") or "",
                    node.get_attribute("title") or "",
                ]).lower()

                if (
                    "modification" in key
                    or "révision" in key
                    or "revision" in key
                    or "diff" in key
                ):
                    matches.append(node)

            except Exception:
                pass

        print(
            "REVISION_CONTROL_CANDIDATES="
            + str(len(matches))
        )

        for i, node in enumerate(matches):
            try:
                print(
                    "REVISION_CANDIDATE",
                    i,
                    "text=",
                    repr(node.inner_text()),
                    "aria=",
                    repr(
                        node.get_attribute(
                            "aria-label"
                        )
                    ),
                    "title=",
                    repr(
                        node.get_attribute(
                            "title"
                        )
                    ),
                )
            except Exception:
                pass

        if len(matches) != 1:
            fail(
                "contrôle Révision/Modifications "
                "non univoque après ouverture conversation"
            )

        matches[0].click()
        print("REVISION_CONTROL=CLICKED")

    else:
        visible_mods[0].click()
        print(
            "OPEN_PROJECT_MODIFICATIONS=CLICKED"
        )

    deadline = time.time() + 15

    while time.time() < deadline:
        if revision_present(page):
            print("REVISION_OPEN=PASS")
            return

        time.sleep(.1)

    fail("Révision ne s'est pas ouverte")

def tree_file(page, basename):
    # L'arbre affiche les basenames.
    loc = page.get_by_text(basename, exact=True)
    visible = []

    for i in range(loc.count()):
        n = loc.nth(i)
        try:
            if n.is_visible():
                visible.append(n)
        except Exception:
            pass

    if len(visible) != 1:
        fail(
            f"arbre: {basename!r}, visibles={len(visible)}"
        )

    return visible[0]


def next_button(page):
    node = visible_unique(
        page,
        [
            '[aria-label="Fichier suivant"]',
            '[title="Fichier suivant"]',
        ],
        "NEXT",
    )

    if node is None:
        fail("bouton Fichier suivant introuvable")

    return node


def previous_button(page):
    node = visible_unique(
        page,
        [
            '[aria-label="Fichier précédent"]',
            '[title="Fichier précédent"]',
        ],
        "PREVIOUS",
    )

    if node is None:
        fail("bouton Fichier précédent introuvable")

    return node


def shot(page, name):
    path = OUT / name
    page.screenshot(path=str(path), full_page=False)

    if not path.is_file() or path.stat().st_size == 0:
        fail(f"capture absente: {path}")

    print(f"SCREENSHOT={path}")


with sync_playwright() as pw:
    browser = pw.chromium.connect_over_cdp(CDP)

    pages = corpus_pages(browser)

    print("CORPUS_PAGES=" + str(len(pages)))

    # Politique conservatrice : aucune fermeture automatique.
    if len(pages) != 1:
        fail(
            "exactement 1 page Corpus requise ; "
            f"trouvé={len(pages)}"
        )

    page = pages[0]
    page.bring_to_front()

    print("PAGE_TITLE=" + page.title())
    print("PAGE_URL=" + page.url)

    # ---------------------------------------------------------
    # PREPARATION AUTONOME
    # ---------------------------------------------------------

    ensure_revision(page)

    # Revenir explicitement à README via l'arbre.
    tree_file(page, "README.md").click()
    wait_file(page, README)

    print("PREP_0=" + README)

    # Avancer vers catalogue.
    next_button(page).click()
    wait_file(page, CATALOGUE)

    print("PREP_1=" + CATALOGUE)

    # Avancer vers ephemeral.
    next_button(page).click()
    wait_file(page, EPHEMERAL)

    print("PREP_2=" + EPHEMERAL)
    print("BB07_PRECONDITION=PASS")

    # ---------------------------------------------------------
    # A PARTIR D'ICI COMMENCE BB-07
    # ---------------------------------------------------------

    shot(page, "00-ephemeral.png")

    initial = current_file(page)

    if initial != EPHEMERAL:
        fail(f"état initial BB07 incorrect: {initial!r}")

    previous_button(page).click()
    wait_file(page, CATALOGUE)

    print("BB07_AFTER_1=" + CATALOGUE)
    shot(page, "01-catalogue-graph.png")

    # Réacquisition après rerender.
    previous_button(page).click()
    wait_file(page, README)

    print("BB07_AFTER_2=" + README)
    shot(page, "02-readme.png")

    final = current_file(page)

    if final != README:
        fail(f"état final incorrect: {final!r}")

    print("BB07_SEQUENCE=ephemeral->catalogue-graph->README")
    print("BB07_NAVIGATION_PREVIOUS=PASS")
