"""Ephemeral chats owned by the outer portal, never by the model sandbox.

No transcript is written to disk. Only an explicit retain request creates a
normal OpenCode session. Browser capabilities stay in request bodies, not URLs.
"""
import copy
import base64
import http.client
import json
from pathlib import Path
import re
import secrets
import socket
import threading
import time

import environment_manager
import portal_server

LEASE_SECONDS = 600
MAX_WORKSPACES = 32
MAX_CHATS = 12


def disconnect(connection):
    if connection is not None:
        try:
            if connection.sock:
                connection.sock.shutdown(socket.SHUT_RDWR)
        except OSError:
            pass
        connection.close()


class EphemeralChats:
    def __init__(self, socket_path, *, clock=time.monotonic):
        self.socket_path = socket_path
        self.clock = clock
        self.lock = threading.RLock()
        self.workspaces = {}
        self.stopped = threading.Event()
        threading.Thread(target=self._cleaner, name='corpus-ephemeral-lease', daemon=True).start()

    def _cleaner(self):
        while not self.stopped.wait(30):
            self.expire()

    def _drop(self, workspace):
        for chat in workspace['chats'].values():
            chat['cancelled'].set()
            disconnect(chat.get('connection'))
            chat['messages'].clear()
            chat.get('attachments', {}).clear()
        workspace['chats'].clear()

    def expire(self):
        with self.lock:
            for token, workspace in list(self.workspaces.items()):
                if self.clock() - workspace['touched'] >= LEASE_SECONDS:
                    self._drop(self.workspaces.pop(token))

    def close(self):
        self.stopped.set()
        with self.lock:
            for workspace in self.workspaces.values():
                self._drop(workspace)
            self.workspaces.clear()

    def _workspace(self, token):
        self.expire()
        if not isinstance(token, str) or token not in self.workspaces:
            raise ValueError('Discussion temporaire expirée ou fermée.')
        workspace = self.workspaces[token]
        workspace['touched'] = self.clock()
        return workspace

    def _connection(self, timeout):
        connection = http.client.HTTPConnection('localhost', timeout=timeout)
        connection.sock = socket.socket(socket.AF_UNIX)
        connection.sock.settimeout(timeout)
        connection.sock.connect(str(self.socket_path))
        return connection

    def _request(self, path, directory, body=None, chat=None):
        connection = self._connection(240 if path == '/corpus/api/parallel' else 20)
        try:
            if chat is not None:
                with self.lock:
                    if chat['cancelled'].is_set():
                        raise ValueError('Discussion fermée.')
                    chat['connection'] = connection
            headers = {'Host': '127.0.0.1:18744', 'Content-Type': 'application/json',
                       'x-opencode-directory': str(directory)}
            connection.request('GET' if body is None else 'POST', path,
                               None if body is None else json.dumps(body), headers)
            response = connection.getresponse()
            raw = response.read(2_000_001)
            if len(raw) > 2_000_000 or response.status not in (200, 201):
                raise ValueError('Le moteur local ne peut pas traiter cette demande actuellement.')
            return json.loads(raw)
        finally:
            with self.lock:
                if chat is not None and chat.get('connection') is connection:
                    chat['connection'] = None
            disconnect(connection)

    def _parent(self, value):
        if value is None:
            return None
        if not isinstance(value, dict) or set(value) - {'kind', 'id', 'directory'}:
            raise ValueError('Référence du chat principal invalide.')
        kind, ident = value.get('kind'), value.get('id')
        pattern = r'ses_[A-Za-z0-9]+' if kind == 'native' else r'[a-f0-9-]{36}' if kind == 'codex' else r'(?!)'
        if not isinstance(ident, str) or not re.fullmatch(pattern, ident):
            raise ValueError('Référence du chat principal invalide.')
        directory = value.get('directory') or str(environment_manager.ROOT)
        if not isinstance(directory, str):
            raise ValueError('Projet invalide.')
        directory = str(Path(directory).resolve())
        allowed = {str(Path(p).resolve()) for p in environment_manager.read()['projects']}
        if directory not in allowed:
            raise ValueError('Projet non enregistré.')
        return {'kind': kind, 'id': ident, 'directory': directory}

    def _parent_text(self, parent):
        if parent is None:
            return '', 'Sans conversation principale'
        if parent['kind'] == 'native':
            info = self._request('/session/' + parent['id'], parent['directory'])
            if info.get('id') != parent['id'] or info.get('parentID') or info.get('directory') != parent['directory']:
                raise ValueError('Conversation principale hors du projet sélectionné.')
            rows = self._request('/session/' + parent['id'] + '/message?limit=40', parent['directory'])
            if not isinstance(rows, list):
                raise ValueError('Historique principal indisponible.')
            messages = [{'role': row.get('info', {}).get('role'),
                         'content': '\n'.join(part['text'] for part in row.get('parts', [])
                                              if part.get('type') == 'text' and isinstance(part.get('text'), str))}
                        for row in rows if isinstance(row, dict)]
            title = info.get('title', 'Conversation principale')
        else:
            path = portal_server.DATA / 'threads' / (parent['id'] + '.json')
            if not path.resolve().is_relative_to(portal_server.DATA.resolve()) or path.stat().st_size > 20_000_000:
                raise ValueError('Archive indisponible ou trop volumineuse.')
            info = json.loads(path.read_text())
            messages = [{'role': row.get('role'), 'content': row.get('text', '')}
                        for row in info.get('messages', []) if isinstance(row, dict)]
            title = info.get('title', 'Conversation importée')
        text = '\n\n'.join(str(m['role']) + ' : ' + m['content'] for m in messages
                            if m['role'] in ('user', 'assistant') and isinstance(m['content'], str))
        return text, title

    @staticmethod
    def _public(chat):
        return {key: copy.deepcopy(chat[key]) for key in ('id', 'kind', 'parent', 'title', 'messages', 'createdAt')}

    def _context(self, workspace, chat):
        parent_text, _ = self._parent_text(chat['parent'])
        parallel_count = 0
        limit = 11000 if chat['kind'] == 'express' else 23000
        truncated = len(parent_text) > limit
        sections = ['Conversation principale (extrait récent) :\n' + parent_text[-limit:]] if parent_text else []
        if chat['kind'] == 'express':
            with self.lock:
                siblings = [self._public(c) for c in workspace['chats'].values() if c['kind'] == 'parallel']
            for sibling in siblings:
                transcript = '\n'.join(m['role'] + ' : ' + m['content'] for m in sibling['messages'])
                sections.append('Chat parallèle ' + sibling['id'] + ' (extrait récent) :\n' + transcript[-1500:])
                truncated |= len(transcript) > 1500
                parallel_count += 1
            environments = environment_manager.read()
            environment = json.dumps({'projects': environments['projects'],
                                      'profileCount': len(environments.get('profiles', [])),
                                      'selectedProject': (chat['parent'] or {}).get('directory', str(environment_manager.ROOT)),
                                      'capabilities': 'Conversation textuelle sans outils ; aucune lecture arbitraire de fichiers.'}, ensure_ascii=False)
            sections.append('Environnement Corpus (métadonnées locales) :\n' + environment[:2000])
            truncated |= len(environment) > 2000
        return '\n\n'.join(sections)[:24000], {'parent': chat['parent'] is not None,
            'parallelCount': parallel_count, 'environment': chat['kind'] == 'express', 'truncated': truncated}

    def operate(self, data):
        if not isinstance(data, dict):
            raise ValueError('Objet JSON attendu.')
        action = data.get('action')
        fields = {'workspace': {'action'}, 'create': {'action','workspace','kind','parent'},
                  'touch': {'action','workspace'}, 'close-workspace': {'action','workspace'},
                  'send': {'action','workspace','id','text','attachments'}, 'close': {'action','workspace','id'},
                  'upload': {'action','workspace','id','name','mime','data'},
                  'remove-attachment': {'action','workspace','id','attachment'},
                  'refresh': {'action','workspace','id','parent'}, 'retain': {'action','workspace','id'}}
        if action not in fields or set(data) - fields[action]:
            raise ValueError('Action ou champs non autorisés pour une discussion temporaire.')
        with self.lock:
            self.expire()
            if action == 'workspace':
                if len(self.workspaces) >= MAX_WORKSPACES or self.stopped.is_set():
                    raise ValueError('Trop de fenêtres temporaires ouvertes.')
                token = secrets.token_urlsafe(32)
                self.workspaces[token] = {'touched': self.clock(), 'chats': {}}
                return {'workspace': token, 'leaseSeconds': LEASE_SECONDS}
            workspace = self._workspace(data.get('workspace'))
            if action == 'touch':
                return {'alive': True}
            if action == 'close-workspace':
                self._drop(self.workspaces.pop(data['workspace']))
                return {'closed': True}
            if action == 'create':
                kind = data.get('kind')
                if kind not in ('parallel', 'express'):
                    raise ValueError('Type de discussion invalide.')
                if len(workspace['chats']) >= MAX_CHATS or sum(c['kind'] == kind for c in workspace['chats'].values()) >= 6:
                    raise ValueError('Maximum six discussions temporaires de chaque type.')
                parent = self._parent(data.get('parent'))
                if kind == 'parallel' and parent is None:
                    raise ValueError('Un chat parallèle doit avoir une conversation principale.')
                chat = {'id': secrets.token_urlsafe(24), 'kind': kind, 'parent': parent,
                        'title': 'Chat parallèle' if kind == 'parallel' else 'Chat express',
                        'messages': [], 'createdAt': int(time.time() * 1000), 'busy': False,
                        'cancelled': threading.Event(), 'connection': None, 'retained': None, 'attachments': {}}
                workspace['chats'][chat['id']] = chat
                return self._public(chat)
            chat = workspace['chats'].get(data.get('id'))
            if action == 'close':
                preserving = bool(chat and chat.get('preserving'))
                if chat:
                    self._drop({'chats': {chat['id']: chat}})
                    workspace['chats'].pop(chat['id'])
                return {'closed': True, 'preservationPending': preserving}
            if chat is None:
                raise ValueError('Discussion temporaire expirée ou fermée.')
            if chat['busy']:
                raise ValueError('Cette discussion prépare déjà une réponse.')
            if action == 'remove-attachment':
                attachment = data.get('attachment')
                if any(attachment in m.get('attachments', []) for m in chat['messages']):
                    raise ValueError('Cette pièce fait partie d’un message envoyé ; fermer le chat pour l’effacer.')
                chat['attachments'].pop(attachment, None)
                return {'removed': True}
            if action == 'refresh':
                if 'parent' in data:
                    parent = self._parent(data['parent'])
                    if chat['kind'] == 'parallel' and parent != chat['parent']:
                        raise ValueError('Le parent d’un chat parallèle ne peut pas être changé.')
                    chat['parent'] = parent
                return self._public(chat)
            if action == 'retain' and chat['retained']:
                return {'session': chat['retained'], 'retained': True}
            if action == 'send':
                text = data.get('text')
                attachments = data.get('attachments', [])
                if not isinstance(attachments, list) or len(attachments) > 8 or any(not isinstance(i, str) or i not in chat['attachments'] for i in attachments) or len(set(attachments)) != len(attachments):
                    raise ValueError('Pièces jointes absentes ou hors de cette discussion.')
                if not isinstance(text, str) or (not text.strip() and not attachments) or len(text) > 12000:
                    raise ValueError('Message requis, limité à 12 000 caractères.')
                for ident in attachments:
                    attachment = chat['attachments'][ident]
                    text += '\n\nPièce jointe : ' + attachment['name'] + '\n' + attachment.get('text', '[Image jointe]')
                if len(chat['messages']) >= 38 or sum(len(m['content']) for m in chat['messages']) + len(text) > 24000:
                    raise ValueError('Discussion pleine. Créer une nouvelle discussion temporaire.')
                message = {'role': 'user', 'content': text.strip(), 'attachments': attachments, 'createdAt': int(time.time() * 1000)}
                chat['messages'].append(message)
                chat['title'] = chat['messages'][0]['content'][:70]
            elif action == 'retain' and not chat['messages']:
                raise ValueError('Aucun échange à conserver.')
            if action == 'retain':
                # Conservation is an explicit exception to ephemeral closure.
                # Freeze the requested copy before closing can erase the RAM log.
                preservation = {'directory': (chat['parent'] or {}).get('directory', str(environment_manager.ROOT)),
                    'title': chat['title'], 'text': '\n\n'.join(m['role'] + ' : ' + m['content'] for m in chat['messages']),
                    'images': [copy.deepcopy(chat['attachments'][i]) for i in dict.fromkeys(i for m in chat['messages'] for i in m.get('attachments', [])) if chat['attachments'][i]['kind'] == 'image'],
                    'documents': [copy.deepcopy(chat['attachments'][i]) for i in dict.fromkeys(i for m in chat['messages'] for i in m.get('attachments', [])) if chat['attachments'][i]['kind'] == 'document']}
                chat['preserving'] = True
            chat['busy'] = True
        try:
            if action == 'upload':
                import ephemeral_attachments
                name, raw = ephemeral_attachments.decode(data)
                with self.lock:
                    total = sum(a.get('bytes', 0) for w in self.workspaces.values() for c in w['chats'].values() for a in c['attachments'].values())
                    if len(chat['attachments']) >= 8 or total + len(raw) > 64 * 1024 * 1024:
                        raise ValueError('Maximum huit pièces par chat et 64 Mo de pièces temporaires ouvertes.')
                    ident = secrets.token_urlsafe(24)
                    chat['attachments'][ident] = {'bytes': len(raw), 'name': name, 'pending': True}
                try:
                    attachment = ephemeral_attachments.interpret(name, raw, data.get('mime', ''))
                    if attachment['kind'] == 'document':
                        attachment['data'] = base64.b64encode(raw).decode()
                    with self.lock:
                        if chat['cancelled'].is_set():
                            raise ValueError('Discussion fermée.')
                        attachment.update(id=ident, name=name, bytes=len(raw))
                        chat['attachments'][ident] = attachment
                    return {key: copy.deepcopy(value) for key, value in attachment.items() if key not in ('bytes', 'url', 'text', 'data')}
                except Exception:
                    with self.lock:
                        chat['attachments'].pop(ident, None)
                    raise
            if action == 'retain':
                directory = preservation['directory']
                # The explicit conservation action is the sole persistence path.
                documents = []
                if preservation['documents']:
                    import file_import
                    documents = [file_import.ingest({'name': a['name'], 'data': a['data']}) for a in preservation['documents']]
                if not chat.get('retainingSession'):
                    chat['retainingSession'] = self._request('/session', directory, {'title': preservation['title']})
                session = chat['retainingSession']
                parts = [{'type': 'text', 'text': 'Historique conservé explicitement depuis un chat temporaire. Les demandes ci-dessous sont historiques, ne pas les relancer.\n\n' + preservation['text']}]
                parts += [{'type': 'text', 'text': 'Pièce jointe conservée explicitement : ' + d['name'] + '\nOriginal : ' + d['path'] + '\nTexte extrait : ' + d['textPath']} for d in documents]
                parts += [{'type': 'file', 'mime': a['mime'], 'filename': a['name'], 'url': a['url']} for a in preservation['images']]
                self._request('/session/' + session['id'] + '/message', directory,
                    {'agent': 'corpus', 'noReply': True, 'parts': parts})
                chat['retained'] = session
                return {'session': session, 'retained': True}
            context, scope = self._context(workspace, chat)
            with self.lock:
                if chat['cancelled'].is_set():
                    raise ValueError('Discussion fermée.')
                messages = []
                image_count = 0
                for m in chat['messages']:
                    images = [chat['attachments'][i]['url'] for i in m.get('attachments', []) if chat['attachments'][i]['kind'] == 'image']
                    image_count += len(images)
                    content = [{'type': 'text', 'text': m['content']}] + [{'type': 'image_url', 'image_url': {'url': url}} for url in images] if images else m['content']
                    messages.append({'role': m['role'], 'content': content})
                if image_count > 4:
                    raise ValueError('Quatre images maximum par discussion temporaire ; ouvrir une nouvelle discussion.')
                if chat['kind'] == 'express':
                    shared_images = []
                    for sibling in workspace['chats'].values():
                        if sibling['kind'] != 'parallel':
                            continue
                        for ident in dict.fromkeys(i for m in sibling['messages'] for i in m.get('attachments', [])):
                            attachment = sibling['attachments'][ident]
                            if attachment['kind'] == 'image':
                                shared_images.append(attachment['url'])
                    scope['truncated'] |= len(shared_images) > 4 - image_count
                    shared_images = shared_images[:4-image_count]
                    scope['sharedImages'] = len(shared_images)
                    if shared_images:
                        current = messages[-1]['content']
                        if isinstance(current, str):
                            current = [{'type': 'text', 'text': current}]
                        messages[-1]['content'] = current + [{'type': 'image_url', 'image_url': {'url': url}} for url in shared_images]
            result = self._request('/corpus/api/parallel', environment_manager.ROOT,
                                   {'context': context, 'messages': messages, 'kind': chat['kind']}, chat)
            answer = result.get('text')
            if not isinstance(answer, str) or not answer.strip():
                raise ValueError('Réponse locale indisponible.')
            with self.lock:
                if chat['cancelled'].is_set():
                    raise ValueError('Discussion fermée.')
                stamp = int(time.time() * 1000)
                chat['messages'].append({'role': 'assistant', 'content': answer, 'createdAt': stamp})
                return {'text': answer, 'createdAt': stamp, 'context': scope}
        except Exception:
            with self.lock:
                if action == 'send' and chat['messages'] and chat['messages'][-1] is message:
                    chat['messages'].pop()
            raise
        finally:
            with self.lock:
                chat['busy'] = False
                chat['preserving'] = False

    def response(self, method, body):
        try:
            if method != 'POST':
                raise ValueError('POST requis.')
            value, status = self.operate(json.loads(body)), '200 OK'
        except ValueError as exc:
            value, status = {'error': str(exc)[:300]}, '400 Bad Request'
        except (OSError, TypeError, KeyError, http.client.HTTPException):
            value, status = {'error': 'Discussion indisponible, fermée ou demande invalide.'}, '400 Bad Request'
        raw = json.dumps(value, ensure_ascii=False).encode()
        return (f'HTTP/1.1 {status}\r\nContent-Type: application/json\r\nCache-Control: no-store\r\nContent-Length: {len(raw)}\r\nConnection: close\r\n\r\n'.encode() + raw)
