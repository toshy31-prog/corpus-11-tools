"""Navigateur Corpus distinct : commandes JSON, réseau limité à l'origine approuvée."""
import base64
import json
import os
import sys
import uuid
from pathlib import Path
from urllib.parse import urlsplit
from corpus_paths import LOCAL_RUNTIME_ROOT
BASE = LOCAL_RUNTIME_ROOT
os.environ['PLAYWRIGHT_BROWSERS_PATH'] = str(BASE/'browsers')


def origin(url):
    p = urlsplit(url)
    if p.port == 18743:
        raise ValueError('Le navigateur piloté ne peut pas accéder au portail de ses propres autorisations.')
    if p.scheme not in ('http', 'https') or not p.hostname or p.username or p.password:
        raise ValueError('URL HTTP(S) sans identifiants requise.')
    return f'{p.scheme}://{p.hostname}:{p.port or (443 if p.scheme == "https" else 80)}'


class Controller:
    def __init__(self, playwright, base=BASE):
        self.pw, self.base = playwright, base
        self.browser = self.context = self.page = None
        self.allowed = set()
        self.visible = False
        self.action = None
        self.blocked = set()
        self.tabs = []
        self.creating = False
        self.history = []
        self.downloads = []

    def alive(self):
        return bool(self.browser and self.browser.is_connected() and self.page and not self.page.is_closed())

    def close(self):
        if self.browser:
            self.browser.close()
        self.browser = self.context = self.page = None
        self.allowed.clear()
        self.tabs.clear(); self.history.clear(); self.downloads.clear()

    def route(self, route):
        try:
            record = next((t for t in self.tabs if t['page'] == route.request.frame.page), None)
            allowed = record['allowed'] if record else self.allowed
            permitted = route.request.url.startswith('data:') or origin(route.request.url) in allowed
        except ValueError:
            permitted = False
        if not permitted:
            try: (record['blocked'] if record else self.blocked).add(origin(route.request.url))
            except ValueError: pass
        route.continue_() if permitted else route.abort()

    def ensure(self, visible=False):
        if self.alive():
            if visible and not self.visible:
                raise ValueError('Une session sans fenêtre est active. Fermez-la avant d’ouvrir une fenêtre dédiée ; ses données temporaires seront effacées.')
            return
        self.close()
        self.visible = visible
        self.browser = self.pw.chromium.launch(
            executable_path=str(self.base/'browsers/chromium-local/chrome-linux64/chrome'),
            headless=not visible,
            args=['--disable-background-networking', '--disable-features=OptimizationHints,MediaRouter'])
        self.context = self.browser.new_context(accept_downloads=True, service_workers='block', viewport={'width':1100,'height':800})
        self.context.route('**/*', self.route)
        self.context.route_web_socket('**/*', lambda ws: ws.close())
        self.context.on('page', lambda page: page.close() if not self.creating else None)
        self.new_tab()

    def new_tab(self):
        if len(self.tabs)>=12: raise ValueError('Maximum 12 onglets.')
        self.creating=True
        try: page=self.context.new_page()
        finally: self.creating=False
        page.set_default_timeout(10000)
        page.on('download', lambda download: download.cancel() if self.action != 'download' else None)
        record={'id':uuid.uuid4().hex,'page':page,'allowed':set(),'blocked':set(),'zoom':1,'viewport':{'width':1100,'height':800}}
        self.tabs.append(record);self.select_tab(record)

    def select_tab(self,record):
        self.page=record['page'];self.allowed=record['allowed'];self.blocked=record['blocked']
        self.page.bring_to_front()

    def handle(self, data):
        action = data['action']
        self.action = action
        if action == 'status':
            return {'running': self.alive(), 'visible': self.visible if self.alive() else False,
                    'url': self.page.url if self.alive() else None}
        if action == 'frame' and not self.alive():
            return {'running':False}
        if action in ('close', 'clear'):
            self.close()
            return {'closed': True, 'running': False, 'visible': False}
        if action not in ('launch','navigate','download','click','fill','back','forward','reload','snapshot','screenshot','frame','pointer','type','key','scroll','allow-origin','tab-new','tab-select','tab-close','find','zoom','device','pdf','history','downloads'):
            raise ValueError('Commande inconnue.')
        if action in ('navigate','download'):
            destination = origin(data['url'])  # Valider avant de démarrer le navigateur.
        visible = data.get('visible', False)
        if not isinstance(visible, bool):
            raise ValueError('Le mode fenêtre doit être un booléen.')
        had_session=self.alive()
        if action in ('tab-select','tab-close') and not had_session:raise ValueError('Aucune session active.')
        self.ensure(visible)
        if action == 'tab-new' and had_session: self.new_tab()
        elif action in ('tab-select','tab-close'):
            record=next((t for t in self.tabs if t['id']==data.get('tab')),None)
            if record is None: raise ValueError('Onglet introuvable.')
            if action=='tab-select': self.select_tab(record)
            else:
                self.tabs.remove(record);record['page'].close()
                if not self.tabs:self.new_tab()
                elif self.page==record['page']:self.select_tab(self.tabs[-1])
        record=next(t for t in self.tabs if t['page']==self.page)
        extra={}
        if action=='find':
            text=data.get('text','')
            if not isinstance(text,str) or len(text)>300: raise ValueError('Recherche limitée à 300 caractères.')
            extra['found']=self.page.evaluate('(text)=>window.find(text,false,false,true)',text) if text else False
        elif action=='zoom':
            zoom=float(data.get('zoom',1))
            if not .5<=zoom<=2:raise ValueError('Zoom entre 50 et 200 %.')
            self.page.evaluate('(zoom)=>{document.documentElement.style.zoom=String(zoom)}',zoom);record['zoom']=zoom
        elif action=='device':
            record['viewport']={'width':390,'height':844} if data.get('mobile') is True else {'width':1100,'height':800}
            self.page.set_viewport_size(record['viewport'])
        elif action=='pdf':extra['document']='data:application/pdf;base64,'+base64.b64encode(self.page.pdf(print_background=True)).decode()
        elif action=='history':extra['history']=self.history[-100:]
        elif action=='downloads':extra['downloads']=self.downloads[-100:]
        if action == 'launch':
            self.page.bring_to_front()
        elif action == 'navigate':
            self.allowed.clear();self.allowed.add(destination); self.blocked.clear()
            self.page.goto(data['url'], wait_until='domcontentloaded', timeout=25000)
        elif action == 'download':
            self.allowed.clear();self.allowed.add(destination)
            with self.page.expect_download(timeout=25000) as pending:
                try:
                    self.page.goto(data['url'], wait_until='domcontentloaded', timeout=25000)
                except Exception as exc:
                    if 'download' not in str(exc).lower() and 'ERR_ABORTED' not in str(exc): raise
            download = pending.value
            directory = self.base/'browser-downloads'; directory.mkdir(exist_ok=True)
            file = directory/(uuid.uuid4().hex+'-'+Path(download.suggested_filename).name)
            download.save_as(file)
        elif action == 'allow-origin':
            self.allowed.add(origin(data['url'])); self.blocked.discard(origin(data['url']))
            self.page.reload(wait_until='domcontentloaded')
        elif action == 'pointer':
            x,y=float(data['x']),float(data['y'])
            if not 0<=x<=record['viewport']['width'] or not 0<=y<=record['viewport']['height']: raise ValueError('Coordonnées hors page.')
            self.page.mouse.click(x,y)
        elif action == 'type':
            text=data.get('text','')
            if not isinstance(text,str) or len(text)>8000: raise ValueError('Texte invalide.')
            self.page.keyboard.insert_text(text)
        elif action == 'key':
            key=data.get('key')
            if key not in ('Enter','Tab','Shift+Tab','Backspace','Delete','Escape','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End','PageUp','PageDown','Control+a'): raise ValueError('Touche non autorisée.')
            self.page.keyboard.press(key)
        elif action == 'scroll':
            dy=float(data.get('dy',0))
            if not -2000<=dy<=2000: raise ValueError('Défilement hors limites.')
            self.page.mouse.wheel(0,dy)
        elif action == 'forward': self.page.go_forward(wait_until='domcontentloaded')
        elif action == 'click': self.page.locator(data['selector']).click()
        elif action == 'fill': self.page.locator(data['selector']).fill(data['text'])
        elif action == 'back': self.page.go_back(wait_until='domcontentloaded')
        elif action == 'reload': self.page.reload(wait_until='domcontentloaded')
        result = {'url': self.page.url, 'title': self.page.title(), 'running': True, 'visible': self.visible,
                  'text': self.page.locator('body').inner_text(timeout=5000)[:18000] if self.page.url != 'about:blank' else ''}
        if action == 'snapshot':
            result['elements'] = self.page.locator('a,button,input,textarea,select,[role=button]').evaluate_all('''nodes => nodes.filter(e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden').slice(0,100).map(e => {
                let parts=[], n=e;
                while(n && n.nodeType===1){
                    if(n.id){parts.unshift('#'+CSS.escape(n.id));break;}
                    let index=1,s=n.previousElementSibling;
                    while(s){if(s.tagName===n.tagName)index++;s=s.previousElementSibling;}
                    parts.unshift(n.tagName.toLowerCase()+':nth-of-type('+index+')');n=n.parentElement;
                }
                return {selector:parts.join(' > '),tag:e.tagName.toLowerCase(),type:e.getAttribute('type'),label:(e.getAttribute('aria-label')||e.getAttribute('placeholder')||e.innerText||'').slice(0,160)};
            })''')
        if action == 'download': result['download'] = str(file)
        result['blocked']=sorted(self.blocked)[:20]
        if action in ('navigate','back','forward','reload'):
            record['zoom']=1
        if self.page.url.startswith(('http://','https://')) and record.get('last_url')!=self.page.url:
            self.history.append({'url':self.page.url,'title':result['title']});self.history=self.history[-100:];record['last_url']=self.page.url
        if action=='download':self.downloads.append({'name':file.name,'path':str(file)})
        result['tabs']=[{'id':t['id'],'title':t['page'].title() or 'Nouvel onglet','url':t['page'].url,'active':t['page']==self.page} for t in self.tabs if not t['page'].is_closed()]
        result['viewport']=record['viewport'];result['zoom']=record['zoom'];result.update(extra)
        if action in ('screenshot','frame'): result['image'] = 'data:image/png;base64,'+base64.b64encode(self.page.screenshot()).decode()
        return result


def main():
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        controller = Controller(pw)
        for line in sys.stdin:
            try: response = {'result': controller.handle(json.loads(line))}
            except Exception as exc: response = {'error': str(exc)[:1200]}
            print(json.dumps(response), flush=True)


if __name__ == '__main__': main()
