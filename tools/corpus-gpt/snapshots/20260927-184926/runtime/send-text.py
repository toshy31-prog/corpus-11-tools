import sys
import time
from pathlib import Path

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.common.exceptions import StaleElementReferenceException

WEBDRIVER="http://127.0.0.1:4444"
CHAT="https://chatgpt.com/c/6ab91a67-81d4-83ed-8718-3c4edba911da"

def die(msg):
    print("REFUS:",msg,file=sys.stderr)
    raise SystemExit(2)

if len(sys.argv) != 2:
    die("usage: send-text.py FILE")

path=Path(sys.argv[1]).expanduser().resolve()
if not path.is_file():
    die(f"fichier absent: {path}")

text=path.read_text(errors="replace")

# Borne volontaire : le rapport complet reste sur disque.
MAX=12000
if len(text) > MAX:
    text=text[:MAX] + "\n\n[TRONQUE — rapport complet conservé localement]"

driver=webdriver.Remote(
    command_executor=WEBDRIVER,
    options=Options(),
)

matches=[]
for handle in driver.window_handles:
    driver.switch_to.window(handle)
    try:
        if driver.current_url.startswith(CHAT):
            matches.append(handle)
    except Exception:
        pass

if len(matches) != 1:
    die(f"exactement 1 onglet ChatGPT cible requis, trouvé={len(matches)}")

driver.switch_to.window(matches[0])

def editor(d):
    selectors=[
        '#prompt-textarea',
        '[contenteditable="true"][data-lexical-editor="true"]',
        'div[contenteditable="true"]',
        'textarea',
    ]

    for selector in selectors:
        nodes=d.find_elements(By.CSS_SELECTOR,selector)
        nodes=[n for n in nodes if n.is_displayed()]
        if len(nodes)==1:
            return nodes[0]
    return False

box=WebDriverWait(driver,30).until(editor)

tag=box.tag_name.lower()

if tag == "textarea":
    box.clear()
    box.send_keys(text)
else:
    driver.execute_script("""
const e=arguments[0], text=arguments[1];
e.focus();
const sel=window.getSelection();
const range=document.createRange();
range.selectNodeContents(e);
sel.removeAllRanges();
sel.addRange(range);
document.execCommand('delete', false, null);
document.execCommand('insertText', false, text);
e.dispatchEvent(new InputEvent('input',{
    bubbles:true,
    inputType:'insertText',
    data:text
}));
""",box,text)

def send_button(d):
    selectors=[
        'button[data-testid="send-button"]',
        'button[data-testid="composer-submit-button"]',
    ]

    for selector in selectors:
        nodes=d.find_elements(By.CSS_SELECTOR,selector)
        nodes=[n for n in nodes if n.is_displayed() and n.is_enabled()]
        if len(nodes)==1:
            return nodes[0]

    candidates=[]
    for node in d.find_elements(By.TAG_NAME,"button"):
        try:
            if not node.is_displayed() or not node.is_enabled():
                continue
            aria=(node.get_attribute("aria-label") or "").lower()
            title=(node.get_attribute("title") or "").lower()
            testid=(node.get_attribute("data-testid") or "").lower()
            key=f"{aria} {title} {testid}"
            if "envoyer" in key or "send" in key or "submit" in key:
                candidates.append(node)
        except StaleElementReferenceException:
            pass

    return candidates[0] if len(candidates)==1 else False

for attempt in range(20):
    send=WebDriverWait(driver,10).until(send_button)
    try:
        send.click()
        print("TEXT_SEND_CLICK=PASS")
        break
    except StaleElementReferenceException:
        time.sleep(.2)
else:
    die("bouton Envoyer instable")

print("TEXT_SENT=PASS")

# Firefox est externe : pas de quit().
