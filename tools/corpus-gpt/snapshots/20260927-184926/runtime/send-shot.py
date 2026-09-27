import sys
import time
from pathlib import Path

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.remote.file_detector import UselessFileDetector
from selenium.webdriver.support.ui import WebDriverWait
from selenium.common.exceptions import (
    StaleElementReferenceException,
    ElementNotInteractableException,
    TimeoutException,
)

WEBDRIVER = "http://127.0.0.1:4444"
CHAT_PREFIX = "https://chatgpt.com/c/6ab91a67-81d4-83ed-8718-3c4edba911da"


def refuse(message, code=2):
    print("REFUS:", message, file=sys.stderr)
    raise SystemExit(code)


def conversation_handles(driver):
    result = []

    for handle in driver.window_handles:
        driver.switch_to.window(handle)

        try:
            if driver.current_url.startswith(CHAT_PREFIX):
                result.append(handle)
        except Exception:
            pass

    return result


def select_target_chat(driver):
    matches = conversation_handles(driver)

    if len(matches) != 1:
        refuse(
            "invariant onglets violé : exactement 1 onglet "
            f"de la conversation cible requis, trouvé={len(matches)}"
        )

    handle = matches[0]
    driver.switch_to.window(handle)

    if not driver.current_url.startswith(CHAT_PREFIX):
        refuse("l'onglet contrôlé a changé d'URL")

    print("CHAT_SELECTION=UNIQUE_MANAGED")
    return handle

def image_input_or_none(driver):
    try:
        nodes = driver.find_elements(
            By.CSS_SELECTOR,
            'input[type="file"]'
        )

        exact = []

        for node in nodes:
            try:
                accept = (
                    node.get_attribute("accept") or ""
                ).strip().lower()

                if accept == "image/*":
                    exact.append(node)
            except StaleElementReferenceException:
                pass

        if len(exact) == 1:
            return exact[0]

        return None

    except Exception:
        return None


def wait_image_input(driver, timeout=40):
    node = WebDriverWait(driver, timeout).until(
        lambda d: image_input_or_none(d)
    )

    print("FILE_INPUT_SELECTION=EXACT_IMAGE")
    return node


def composer_from_input(inp):
    try:
        return inp.find_element(
            By.XPATH,
            "./ancestor::form[1]"
        )
    except Exception:
        return None


def enabled_send_in_form(form):
    selectors = [
        'button[data-testid="send-button"]',
        'button[data-testid="composer-submit-button"]',
    ]

    for selector in selectors:
        try:
            nodes = form.find_elements(
                By.CSS_SELECTOR,
                selector
            )

            nodes = [
                node
                for node in nodes
                if node.is_displayed()
                and node.is_enabled()
            ]

            if len(nodes) == 1:
                return nodes[0]

        except StaleElementReferenceException:
            pass

    candidates = []

    try:
        buttons = form.find_elements(By.TAG_NAME, "button")
    except StaleElementReferenceException:
        return None

    for node in buttons:
        try:
            if not node.is_displayed():
                continue

            if not node.is_enabled():
                continue

            aria = node.get_attribute("aria-label") or ""
            title = node.get_attribute("title") or ""
            testid = node.get_attribute("data-testid") or ""

            key = f"{aria} {title} {testid}".lower()

            if (
                "envoyer" in key
                or "send" in key
                or "submit" in key
            ):
                candidates.append(node)

        except StaleElementReferenceException:
            pass

    if len(candidates) == 1:
        return candidates[0]

    return None


def current_composer(driver):
    inp = image_input_or_none(driver)

    if inp is None:
        return None

    return composer_from_input(inp)


def explicit_upload_failure(driver):
    form = current_composer(driver)

    if form is None:
        return False

    try:
        text = form.text.lower()
    except StaleElementReferenceException:
        return False

    failures = [
        "échec du chargement",
        "echec du chargement",
        "upload failed",
        "failed to upload",
    ]

    return any(x in text for x in failures)


def wait_attachment_ready(driver, timeout=40):
    deadline = time.time() + timeout

    while time.time() < deadline:
        if explicit_upload_failure(driver):
            refuse(
                "ChatGPT affiche explicitement "
                "un échec du chargement",
                30
            )

        form = current_composer(driver)

        if form is not None:
            send = enabled_send_in_form(form)

            if send is not None:
                print("ATTACHMENT_READY=PASS")
                return True

        time.sleep(0.25)

    refuse(
        "timeout : pièce jointe chargée "
        "mais bouton Envoyer non disponible",
        31
    )


def click_send_fresh(driver, attempts=20):
    for attempt in range(1, attempts + 1):

        try:
            form = current_composer(driver)

            if form is None:
                time.sleep(0.20)
                continue

            send = enabled_send_in_form(form)

            if send is None:
                time.sleep(0.20)
                continue

            aria = send.get_attribute("aria-label")
            testid = send.get_attribute("data-testid")

            print(
                f"SEND_FRESH_ATTEMPT={attempt} "
                f"aria={aria!r} "
                f"testid={testid!r}"
            )

            # Aucun délai ici : clic immédiatement
            # après acquisition de la WebElement.
            send.click()

            print("SEND_CLICK=PASS")
            return

        except StaleElementReferenceException:
            print(f"SEND_STALE_RETRY={attempt}")
            time.sleep(0.20)

    refuse(
        "bouton Envoyer instable après retries",
        32
    )


def response_is_busy(driver):
    # Détecte le bouton Stop/Arrêter éventuel.
    try:
        for node in driver.find_elements(By.TAG_NAME, "button"):
            try:
                if not node.is_displayed():
                    continue

                aria = (
                    node.get_attribute("aria-label") or ""
                ).lower()

                title = (
                    node.get_attribute("title") or ""
                ).lower()

                testid = (
                    node.get_attribute("data-testid") or ""
                ).lower()

                key = f"{aria} {title} {testid}"

                if (
                    "arrêter" in key
                    or "stop generating" in key
                    or "stop-button" in key
                ):
                    return True

            except StaleElementReferenceException:
                pass

    except Exception:
        pass

    return False


def wait_response_idle(driver, timeout=120):
    start = time.time()

    # Laisser le DOM basculer vers l'état "génération".
    time.sleep(1)

    while time.time() - start < timeout:
        # Le retour d'un input image stable est requis.
        inp = image_input_or_none(driver)

        if inp is not None and not response_is_busy(driver):
            print("CHAT_IDLE=PASS")
            return

        time.sleep(0.5)

    refuse(
        "timeout en attente de la fin "
        "de la réponse ChatGPT",
        33
    )


if len(sys.argv) < 2:
    refuse(
        "usage: send-shot.py image.png [image2.png ...]"
    )

files = [
    Path(arg).expanduser().resolve()
    for arg in sys.argv[1:]
]

for path in files:
    if not path.is_file():
        refuse("fichier absent: " + str(path))


driver = webdriver.Remote(
    command_executor=WEBDRIVER,
    options=Options(),
    file_detector=UselessFileDetector(),
)

target = select_target_chat(driver)

driver.switch_to.window(target)

print("CHAT_TITLE=" + driver.title)
print("CHAT_URL=" + driver.current_url)
print("FILE_COUNT=" + str(len(files)))


for index, path in enumerate(files, 1):

    driver.switch_to.window(target)

    if index > 1:
        print()
        print("WAIT_PREVIOUS_RESPONSE=YES")
        wait_response_idle(driver)

    print()
    print(
        f"=== MESSAGE {index}/{len(files)} ==="
    )
    print("FILE=" + str(path))

    inp = wait_image_input(driver)

    try:
        inp.send_keys(str(path))

    except ElementNotInteractableException:

        # Rare : input volontairement caché.
        driver.execute_script(
            """
const e=arguments[0];
e.style.display='block';
e.style.visibility='visible';
e.style.opacity='1';
e.style.position='fixed';
e.style.left='0';
e.style.top='0';
""",
            inp,
        )

        # L'élément peut avoir été recréé :
        # le réacquérir avant send_keys.
        inp = wait_image_input(driver)
        inp.send_keys(str(path))

    print("UPLOAD_COMMAND=PASS")

    wait_attachment_ready(driver)

    click_send_fresh(driver)

    print("MESSAGE_SENT=" + path.name)

    # Stabilisation minimale avant le tour suivant.
    time.sleep(1)


print()
print("CHATGPT_DOM_TRANSPORT=PASS")

# Pas de driver.close() / quit().
# On ne ferme ni l'onglet utilisateur ni Firefox.
