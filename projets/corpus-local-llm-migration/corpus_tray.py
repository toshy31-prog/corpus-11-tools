#!/usr/bin/python3
"""Native StatusNotifierItem and DBusMenu, using the installed Gio runtime."""
import json
import os
import subprocess
import threading
import urllib.request
import urllib.parse
from gi.repository import Gio, GLib

BASE = 'http://127.0.0.1:18743'
ITEM = '''<node><interface name="org.kde.StatusNotifierItem">
<property name="Category" type="s" access="read"/><property name="Id" type="s" access="read"/><property name="Title" type="s" access="read"/><property name="Status" type="s" access="read"/><property name="IconName" type="s" access="read"/><property name="Menu" type="o" access="read"/><property name="ItemIsMenu" type="b" access="read"/>
<method name="Activate"><arg type="i" direction="in"/><arg type="i" direction="in"/></method><method name="ContextMenu"><arg type="i" direction="in"/><arg type="i" direction="in"/></method><method name="SecondaryActivate"><arg type="i" direction="in"/><arg type="i" direction="in"/></method><signal name="NewIcon"/></interface></node>'''
MENU = '''<node><interface name="com.canonical.dbusmenu">
<property name="Version" type="u" access="read"/><property name="TextDirection" type="s" access="read"/><property name="Status" type="s" access="read"/><property name="IconThemePath" type="as" access="read"/>
<method name="GetLayout"><arg type="i" direction="in"/><arg type="i" direction="in"/><arg type="as" direction="in"/><arg type="u" direction="out"/><arg type="(ia{sv}av)" direction="out"/></method>
<method name="GetGroupProperties"><arg type="ai" direction="in"/><arg type="as" direction="in"/><arg type="a(ia{sv})" direction="out"/></method>
<method name="Event"><arg type="i" direction="in"/><arg type="s" direction="in"/><arg type="v" direction="in"/><arg type="u" direction="in"/></method>
<method name="AboutToShow"><arg type="i" direction="in"/><arg type="b" direction="out"/></method><signal name="LayoutUpdated"><arg type="u"/><arg type="i"/></signal></interface></node>'''

class Tray:
    def __init__(self):
        self.loop = GLib.MainLoop()
        self.bus = Gio.bus_get_sync(Gio.BusType.SESSION, None)
        self.rows = [(1, 'Ouvrir Corpus', BASE+'/corpus/index.html'), (2, 'Quitter', 'quit')]
        self.revision = 1
        self.loading = False
        for path, xml in [('/StatusNotifierItem', ITEM), ('/Menu', MENU)]:
            self.bus.register_object(path, Gio.DBusNodeInfo.new_for_xml(xml).interfaces[0], self.call, self.prop, None)
        self.owner = Gio.bus_own_name_on_connection(self.bus, 'org.kde.StatusNotifierItem-'+str(os.getpid())+'-1', Gio.BusNameOwnerFlags.NONE, None, None)
        self.bus.call_sync('org.kde.StatusNotifierWatcher', '/StatusNotifierWatcher', 'org.kde.StatusNotifierWatcher', 'RegisterStatusNotifierItem', GLib.Variant('(s)', ('/StatusNotifierItem',)), None, Gio.DBusCallFlags.NONE, 5000, None)
        self.refresh()
        GLib.timeout_add_seconds(15, self.refresh)

    def prop(self, bus, sender, path, interface, name):
        values = {'Category':('s','ApplicationStatus'),'Id':('s','corpus-local'),'Title':('s','Corpus local'),'Status':('s','Active' if path != '/Menu' else 'normal'),'IconName':('s',os.path.join(os.path.dirname(os.path.abspath(__file__)), 'corpus-tray-symbolic.svg')),'Menu':('o','/Menu'),'ItemIsMenu':('b',True),'Version':('u',3),'TextDirection':('s','ltr'),'IconThemePath':('as',[])}
        return GLib.Variant(*values[name]) if name in values else None

    def all_rows(self):
        def walk(rows):
            for row in rows:
                yield row
                if len(row) > 3:
                    yield from walk(row[3])
        return list(walk(self.rows))

    def properties(self, row):
        if row[1] == '---':
            return {'type': GLib.Variant('s', 'separator')}
        props = {'label': GLib.Variant('s', row[1]),
                 'enabled': GLib.Variant('b', bool(row[2]) or len(row) > 3),
                 'visible': GLib.Variant('b', True)}
        if len(row) > 3:
            props['children-display'] = GLib.Variant('s', 'submenu')
        return props

    def layout(self, row, depth=-1):
        children = row[3] if len(row) > 3 and depth != 0 else []
        return (row[0], self.properties(row),
                [GLib.Variant('(ia{sv}av)', self.layout(child, depth-1 if depth > 0 else depth))
                 for child in children])

    def call(self, bus, sender, path, interface, method, parameters, invocation):
        args = parameters.unpack()
        if method == 'GetLayout':
            root = (0, '', None, self.rows) if args[0] == 0 else next((r for r in self.all_rows() if r[0] == args[0]), (args[0], '', None))
            invocation.return_value(GLib.Variant('(u(ia{sv}av))', (self.revision, self.layout(root, args[1]))))
        elif method == 'GetGroupProperties':
            invocation.return_value(GLib.Variant('(a(ia{sv}))',([(r[0],self.properties(r)) for r in self.all_rows() if not args[0] or r[0] in args[0]],)))
        elif method == 'AboutToShow':
            self.refresh(); invocation.return_value(GLib.Variant('(b)',(False,)))
        else:
            if method == 'Event' and args[1] == 'clicked':
                target = next((r[2] for r in self.all_rows() if r[0]==args[0]), None)
                if target == 'quit': self.stop_engine()
                elif target: subprocess.Popen(['xdg-open',target], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            elif method in ('Activate','SecondaryActivate'):
                subprocess.Popen(['xdg-open',BASE+'/corpus/index.html'])
            invocation.return_value(None)

    def stop_engine(self):
        if getattr(self, 'stopping', False):
            return
        self.stopping = True
        def work():
            try:
                subprocess.run(['systemctl', '--user', 'stop', 'corpus-local.service'],
                               check=True, timeout=120, capture_output=True)
            except (subprocess.SubprocessError, OSError):
                def failed():
                    self.stopping = False
                    self.rows = [(1, 'Arrêt échoué — réessayer', 'quit'),
                                 (2, 'Ouvrir Corpus', BASE+'/corpus/index.html')]
                    self.revision += 1
                    self.bus.emit_signal(None, '/Menu', 'com.canonical.dbusmenu',
                                         'LayoutUpdated', GLib.Variant('(ui)', (self.revision, 0)))
                    return False
                GLib.idle_add(failed)
            else:
                GLib.idle_add(self.loop.quit)
        threading.Thread(target=work, daemon=True).start()

    def refresh(self):
        if self.loading or getattr(self, 'stopping', False): return True
        self.loading = True
        def work():
            rows=[]
            try:
                def get(path):
                    with urllib.request.urlopen(BASE+path, timeout=4) as response: return json.load(response)
                sessions=get('/session'); states=get('/session/status')
                rows.append(('En cours',None))
                running=[s for s in sessions if states.get(s['id'],{}).get('type','idle')!='idle']
                rows += [(s.get('title','Conversation'),BASE+'/corpus/index.html?session='+s['id']) for s in running[:8]] or [('Aucune activité',None)]
                library=get('/corpus/data/index.json')
                rows.append(('---',None))
                rows.append(('Épinglés',None))
                rows += [(t.get('title','Conversation'),BASE+'/corpus/index.html?archive='+urllib.parse.quote(t['id'])) for t in library.get('threads',[]) if t.get('is_pinned') or t.get('section')=='Pinned']
                rows.append(('---',None))
                rows.append(('Récents',None))
                rows += [(s.get('title','Conversation'),BASE+'/corpus/index.html?session='+s['id']) for s in sorted(sessions,key=lambda s:s.get('time',{}).get('updated',0),reverse=True)[:8]]
            except Exception: rows=[('Moteur local indisponible',None)]
            rows += [('---',None), ('Nouveau chat',BASE+'/corpus/index.html?tray=new'),('---',None),('Ouvrir Corpus',BASE+'/corpus/index.html'),('---',None),('Quitter','quit')]
            def update():
                if getattr(self, 'stopping', False):
                    self.loading = False
                    return False
                # Stable IDs prevent a refresh from redirecting an already open menu item.
                if not hasattr(self, 'menu_ids'):
                    self.menu_ids = {}
                def identify(key):
                    if key not in self.menu_ids:
                        self.menu_ids[key] = len(self.menu_ids) + 1
                    return self.menu_ids[key]
                result = []
                group = ''
                extra = []
                count = 0
                def flush():
                    if extra:
                        result.append((identify('more:'+group), 'Plus', None, list(extra)))
                        extra.clear()
                for index, (label, target) in enumerate(rows):
                    if target is None:
                        flush()
                        group = label if label != '---' else ''
                        count = 0
                    shown = label if len(label) <= 42 else label[:41]+'…'
                    item = (identify(str(target) if target else 'label:'+label+':'+str(index)), shown, target)
                    if target and group in ('Épinglés', 'Récents'):
                        count += 1
                        if count > 3:
                            extra.append(item)
                            continue
                    result.append(item)
                flush()
                self.rows = result
                self.revision+=1;self.loading=False
                self.bus.emit_signal(None,'/Menu','com.canonical.dbusmenu','LayoutUpdated',GLib.Variant('(ui)',(self.revision,0)))
                return False
            GLib.idle_add(update)
        threading.Thread(target=work,daemon=True).start()
        return True

if __name__ == '__main__':
    Tray().loop.run()
