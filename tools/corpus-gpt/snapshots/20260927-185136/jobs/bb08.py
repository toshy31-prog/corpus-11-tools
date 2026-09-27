import os
import time
import json
from pathlib import Path

from playwright.sync_api import sync_playwright

CDP="http://127.0.0.1:9223"
PREFIX="http://127.0.0.1:18743/corpus/"

README="projets/youtube-scout/README.md"
CATALOGUE="projets/youtube-scout/lib/catalogue-graph.mjs"

OUT=Path(os.environ["BB08_OUT"])
OUT.mkdir(parents=True,exist_ok=True)


def fail(msg):
    print("REFUS:",msg)
    raise SystemExit(2)


def revision_present(page):
    text = page.locator("body").inner_text()
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

def current_file(page):
    nodes=page.locator("button.selected")
    result=[]

    for i in range(nodes.count()):
        n=nodes.nth(i)

        try:
            if not n.is_visible():
                continue

            aria=n.get_attribute("aria-label") or ""

            if aria.startswith("projets/"):
                result.append(aria)

        except Exception:
            pass

    if len(result) != 1:
        return None

    return result[0]


def wait_file(page,path,timeout=10):
    end=time.time()+timeout

    while time.time()<end:
        if current_file(page)==path:
            return

        time.sleep(.1)

    fail(
        f"fichier attendu={path!r}, "
        f"obtenu={current_file(page)!r}"
    )


def navigation_state(page):
    result={}

    for label in (
        "Fichier précédent",
        "Fichier suivant",
    ):
        loc=page.locator(
            f'[aria-label="{label}"]'
        )

        visible=[
            loc.nth(i)
            for i in range(loc.count())
            if loc.nth(i).is_visible()
        ]

        if len(visible)!=1:
            fail(
                f"{label}: visibles={len(visible)}"
            )

        result[label]={
            "disabled":visible[0].is_disabled(),
            "title":visible[0].get_attribute("title"),
        }

    return result


def shot(page,name):
    path=OUT/name
    page.screenshot(
        path=str(path),
        full_page=False,
    )

    print("SCREENSHOT="+str(path))


with sync_playwright() as pw:
    browser=pw.chromium.connect_over_cdp(CDP)

    pages=[
        p for c in browser.contexts for p in c.pages
        if p.url.startswith(PREFIX)
    ]

    print("CORPUS_PAGES="+str(len(pages)))

    if len(pages)!=1:
        fail(
            f"exactement 1 page Corpus requise, "
            f"trouvé={len(pages)}"
        )

    page=pages[0]
    page.bring_to_front()

    print("PAGE_URL="+page.url)

    # BB-08 ne dépend d'aucun état laissé par BB-07.
    # Reconstruire Révision depuis landing/conversation si nécessaire.
    ensure_revision(page)

    print("REVISION_READY=PASS")
    print("INITIAL_FILE="+repr(current_file(page)))

    # Revenir explicitement à README via son chemin DOM natif.
    if current_file(page) != README:
        readme=page.locator(
            f'button[aria-label="{README}"]'
        )

        visible=[
            readme.nth(i)
            for i in range(readme.count())
            if readme.nth(i).is_visible()
        ]

        if len(visible)!=1:
            fail(
                "README non accessible après ouverture Révision"
            )

        visible[0].click()
        wait_file(page,README)

    print("BB08_PREP_README=PASS")

    # État de test = catalogue-graph.
    target=page.locator(
        f'button[aria-label="{CATALOGUE}"]'
    )

    visible=[
        target.nth(i)
        for i in range(target.count())
        if target.nth(i).is_visible()
    ]

    if len(visible)!=1:
        fail(
            "catalogue-graph non accessible"
        )

    visible[0].click()
    wait_file(page,CATALOGUE)

    print("BB08_TARGET_FILE="+CATALOGUE)

    before_nav=navigation_state(page)
    before_url=page.url

    print(
        "NAV_BEFORE="
        +json.dumps(
            before_nav,
            ensure_ascii=False,
            sort_keys=True,
        )
    )

    shot(page,"00-before-refresh.png")

    # ---------------------------------------------------------
    # DISCOVERY DU VRAI CONTROLE DE REFRESH
    # ---------------------------------------------------------

    selectors=(
        "button, "
        "[role=button], "
        "[aria-label], "
        "[title]"
    )

    nodes=page.locator(selectors)

    candidates=[]
    seen=set()

    words=(
        "actualis",
        "rafraî",
        "rafra",
        "refresh",
        "recharger",
        "reload",
    )

    for i in range(nodes.count()):
        n=nodes.nth(i)

        try:
            if not n.is_visible():
                continue

            text=n.inner_text() or ""
            aria=n.get_attribute("aria-label") or ""
            title=n.get_attribute("title") or ""

            haystack=" ".join(
                [text,aria,title]
            ).lower()

            if not any(
                word in haystack
                for word in words
            ):
                continue

            box=n.bounding_box()

            if not box:
                continue

            key=(
                round(box["x"]),
                round(box["y"]),
                round(box["width"]),
                round(box["height"]),
            )

            if key in seen:
                continue

            seen.add(key)

            candidates.append({
                "node":n,
                "text":text.strip(),
                "aria":aria,
                "title":title,
                "box":box,
            })

        except Exception:
            pass

    print(
        "REFRESH_CANDIDATES="
        +str(len(candidates))
    )

    for i,c in enumerate(candidates):
        print(
            "REFRESH_CANDIDATE",
            i,
            "text=",
            repr(c["text"]),
            "aria=",
            repr(c["aria"]),
            "title=",
            repr(c["title"]),
            "box=",
            json.dumps(c["box"]),
        )

    if len(candidates)!=1:
        print("BB08_REFRESH_DISCOVERY=NEEDS_REVIEW")
        print("NO_REFRESH_CLICK=YES")
        raise SystemExit(3)

    refresh=candidates[0]["node"]

    print(
        "REFRESH_SELECTED aria="
        +repr(candidates[0]["aria"])
        +" title="
        +repr(candidates[0]["title"])
    )

    # Réacquérir via aria/title si possible afin de ne pas
    # conserver un ElementHandle susceptible de devenir stale.
    aria=candidates[0]["aria"]
    title=candidates[0]["title"]

    if aria:
        fresh=page.locator(
            f'[aria-label="{aria}"]'
        )
    elif title:
        fresh=page.locator(
            f'[title="{title}"]'
        )
    else:
        fail(
            "contrôle refresh sans identité stable"
        )

    fresh_visible=[
        fresh.nth(i)
        for i in range(fresh.count())
        if fresh.nth(i).is_visible()
    ]

    if len(fresh_visible)!=1:
        fail(
            "contrôle refresh non univoque "
            "à la réacquisition"
        )

    fresh_visible[0].click()

    print("REFRESH_CLICK=PASS")

    # Attendre une stabilisation raisonnable du DOM.
    time.sleep(1)

    # ---------------------------------------------------------
    # ASSERTIONS
    # ---------------------------------------------------------

    after=current_file(page)

    print("FILE_AFTER_REFRESH="+repr(after))

    if after!=CATALOGUE:
        fail(
            "la sélection a changé après refresh : "
            f"{after!r}"
        )

    after_nav=navigation_state(page)

    print(
        "NAV_AFTER="
        +json.dumps(
            after_nav,
            ensure_ascii=False,
            sort_keys=True,
        )
    )

    if after_nav!=before_nav:
        fail(
            "état précédent/suivant modifié "
            "après refresh"
        )

    if page.url!=before_url:
        fail(
            "URL conversation modifiée "
            "après refresh"
        )

    shot(page,"01-after-refresh.png")

    print(
        "BB08_SELECTION_PRESERVED="
        +CATALOGUE
    )
    print("BB08_NAV_STATE_PRESERVED=PASS")
    print("BB08_URL_PRESERVED=PASS")
    print("BB08_REFRESH_SELECTION=PASS")
