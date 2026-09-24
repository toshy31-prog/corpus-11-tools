"""Transport local TCP ↔ socket Unix ; aucune destination distante configurable."""
import selectors
import socket
import socketserver
import json
import http.client

PORT = 18743
BACKEND_PORT = 18744


def error_response(status, message):
    body=json.dumps({'error':message},ensure_ascii=False).encode()
    return (f'HTTP/1.1 {status}\r\nContent-Type: application/json; charset=utf-8\r\n'
            f'Content-Length: {len(body)}\r\nCache-Control: no-store\r\n'
            + ('Retry-After: 2\r\n' if status.startswith('503') else '')
            + 'Connection: close\r\n\r\n').encode()+body


def backend_ready(socket_path):
    connection = http.client.HTTPConnection('localhost', timeout=.5)
    try:
        connection.sock = socket.socket(socket.AF_UNIX)
        connection.sock.settimeout(.5)
        connection.sock.connect(str(socket_path))
        connection.request('GET', '/corpus/api/health', headers={'Host': f'127.0.0.1:{BACKEND_PORT}'})
        response = connection.getresponse()
        if response.status != 200 or 'application/json' not in response.getheader('Content-Type', ''):
            return False
        body = response.read(1025)
        if len(body) > 1024:
            return False
        data = json.loads(body)
        return isinstance(data, dict) and data.get('ready') is True and data.get('state') == 'ready'
    except (OSError, ValueError, http.client.HTTPException):
        return False
    finally:
        connection.close()


def health_response(ready):
    body=json.dumps({'ready':ready,'state':'ready' if ready else 'starting_or_unavailable'}).encode()
    status='200 OK' if ready else '503 Service Unavailable'
    return (f'HTTP/1.1 {status}\r\nContent-Type: application/json\r\nContent-Length: {len(body)}\r\nCache-Control: no-store\r\nRetry-After: 2\r\nConnection: close\r\n\r\n').encode()+body


def relay(left, right, restrict_browser=False):
    response_header = bytearray()
    header_done = not restrict_browser
    with selectors.DefaultSelector() as selector:
        selector.register(left, selectors.EVENT_READ, right)
        selector.register(right, selectors.EVENT_READ, left)
        while True:
            for key, _ in selector.select():
                data = key.fileobj.recv(65536)
                if not data:
                    return
                if key.fileobj is right and not header_done:
                    response_header.extend(data)
                    if b'\r\n\r\n' not in response_header:
                        if len(response_header) > 65536:
                            return
                        continue
                    head, body = bytes(response_header).split(b'\r\n\r\n', 1)
                    # Politique additionnelle : même le navigateur ne charge pas
                    # le changelog, des images ou des serveurs extérieurs.
                    policy = (b"Content-Security-Policy: connect-src 'self' ws://127.0.0.1:18743 ws://localhost:18743; "
                              b"img-src 'self' data: blob:; media-src 'self' data: blob:; "
                              b"font-src 'self' data:; frame-src 'self'; "
                              b"form-action 'self'; object-src 'none'; base-uri 'self'")
                    # Ne pas laisser une connexion relayée réutilisée contourner le routage Corpus.
                    upgraded = head.split(b'\r\n',1)[0].split(b' ')[1] == b'101'
                    head = head if upgraded else b'\r\n'.join(line for line in head.split(b'\r\n') if not line.lower().startswith((b'connection:', b'keep-alive:')))
                    data = head + (b'\r\n' if upgraded else b'\r\nConnection: close\r\n') + policy + b'\r\n\r\n' + body
                    header_done = True
                key.data.sendall(data)


def create_server(socket_path, *, inside, readiness=None):
    ephemeral = None
    if not inside:
        from ephemeral_chat import EphemeralChats
        ephemeral = EphemeralChats(socket_path)
    class Handler(socketserver.BaseRequestHandler):
        def handle(self):
            try:
                with socket.socket(socket.AF_INET if inside else socket.AF_UNIX) as peer:
                    if not inside:
                        # Bloque les origines web tierces et le DNS rebinding.
                        # Une connexion transporte une requête HTTP ou son WebSocket.
                        header = bytearray()
                        self.request.settimeout(10)
                        while b'\r\n\r\n' not in header and len(header) <= 65536:
                            block = self.request.recv(1)
                            if not block:
                                return
                            header.extend(block)
                        if len(header) > 65536:
                            return
                        lines = bytes(header).decode('latin1').split('\r\n')
                        fields = {k.lower(): v.strip() for line in lines[1:] if ':' in line
                                  for k, v in [line.split(':', 1)]}
                        hosts = {f'127.0.0.1:{PORT}', f'localhost:{PORT}'}
                        if fields.get('host') not in hosts or (
                            'origin' in fields and fields['origin'] not in {'http://' + h for h in hosts}
                        ):
                            self.request.sendall(b'HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\nConnection: close\r\n\r\n')
                            return
                        from portal_server import response
                        method, target, _ = lines[0].split(' ', 2)
                        if target == '/corpus/api/health' and method == 'GET':
                            ready=backend_ready(socket_path)
                            self.request.sendall(health_response(ready))
                            return
                        if target in ('/corpus/api/ephemeral','/corpus/api/worktrees','/corpus/api/environments','/corpus/api/git-settings','/corpus/api/browser','/corpus/api/plugins','/corpus/api/statistics','/corpus/api/resources','/corpus/api/voice','/corpus/api/chat-actions','/corpus/api/schedules','/corpus/api/shares','/corpus/api/media','/corpus/api/generation','/corpus/api/documents','/corpus/api/updates','/corpus/api/file-import'):
                            if method not in ('GET','POST'):
                                self.request.sendall(error_response('405 Method Not Allowed','Utiliser GET ou POST.'));return
                            if method == 'POST' and (fields.get('origin') not in {'http://' + h for h in hosts} or fields.get('content-type') != 'application/json' or 'transfer-encoding' in fields):
                                self.request.sendall(b'HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\nConnection: close\r\n\r\n');return
                            try:size=int(fields.get('content-length','0'))
                            except ValueError:
                                self.request.sendall(error_response('400 Bad Request','Taille de requête invalide.'));return
                            limit=85000000 if target.endswith(('/file-import','/media')) else 6000000 if target.endswith('/generation') else 7200000 if target.endswith('/voice') else 1000000 if target.endswith('/shares') else 200000 if target.endswith('/documents') else 18000000 if target.endswith('/ephemeral') else 32000
                            if not 0<=size<=limit:
                                self.request.sendall(error_response('413 Content Too Large','Requête trop volumineuse.'));return
                            body=bytearray()
                            while len(body)<size:
                                chunk=self.request.recv(size-len(body))
                                if not chunk: return
                                body.extend(chunk)
                            import worktree_manager, environment_manager
                            import scheduled_messages, local_shares, media_analysis, media_generation, document_generation, update_manager, file_import
                            import git_settings, tool_gateway, plugin_manager, local_statistics, local_resources, local_voice, chat_actions
                            handler = ephemeral if target.endswith('/ephemeral') else file_import if target.endswith('/file-import') else update_manager if target.endswith('/updates') else document_generation if target.endswith('/documents') else media_generation if target.endswith('/generation') else media_analysis if target.endswith('/media') else local_shares if target.endswith('/shares') else scheduled_messages if target.endswith('/schedules') else chat_actions if target.endswith('/chat-actions') else local_voice if target.endswith('/voice') else local_resources if target.endswith("/resources") else local_statistics if target.endswith('/statistics') else plugin_manager if target.endswith('/plugins') else tool_gateway if target.endswith('/browser') else git_settings if target.endswith('/git-settings') else environment_manager if target.endswith('/environments') else worktree_manager
                            self.request.settimeout(1800 if target.endswith('/media') else 150)
                            self.request.sendall(handler.response(method,bytes(body)));return
                        if target == '/corpus/api/parallel' and (method != 'POST' or fields.get('origin') not in {'http://' + h for h in hosts} or fields.get('content-type') != 'application/json' or 'transfer-encoding' in fields or not 0 < int(fields.get('content-length', '0')) <= 300000):
                            self.request.sendall(b'HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\nConnection: close\r\n\r\n');return
                        page = None if target == '/corpus/api/parallel' else response(method, target, fields.get('sec-fetch-dest'))
                        if page is not None:
                            self.request.sendall(page)
                            return
                        if fields.get('upgrade', '').lower() != 'websocket':
                            lines = [line for line in lines[:-2]
                                     if not line.lower().startswith('connection:')]
                            header = ('\r\n'.join(lines) + '\r\nConnection: close\r\n\r\n').encode('latin1')
                        self.request.settimeout(None)
                        try:peer.connect(str(socket_path))
                        except OSError:
                            self.request.sendall(error_response('503 Service Unavailable','Le moteur démarre ou se reconnecte. Réessayez dans quelques instants.'));return
                        peer.sendall(header)
                    else:
                        # Intercept only the bounded, stateless side-chat route.
                        self.request.settimeout(10)
                        header = bytearray()
                        while b'\r\n\r\n' not in header and len(header) <= 65536:
                            chunk = self.request.recv(1)
                            if not chunk: return
                            header.extend(chunk)
                        if len(header) > 65536: return
                        lines = bytes(header).decode('latin1').split('\r\n')
                        if lines[0].split(' ')[:2] == ['GET', '/corpus/api/health']:
                            self.request.sendall(health_response(bool(readiness and readiness())))
                            return
                        if lines[0].split(' ')[1].split('?',1)[0] == '/corpus/api/ephemeral':
                            # This socket is reachable by model tools. The registry
                            # exists only outside their process/network namespace.
                            self.request.sendall(error_response('403 Forbidden','Accès au registre temporaire interdit depuis le moteur.'))
                            return
                        if lines[0].split(' ')[:2] == ['POST', '/corpus/api/parallel']:
                            fields = {k.lower(): v.strip() for line in lines[1:] if ':' in line for k, v in [line.split(':', 1)]}
                            size = int(fields.get('content-length', '0'))
                            if not 0 < size <= 75000000 or 'transfer-encoding' in fields: return
                            body = bytearray()
                            while len(body) < size:
                                chunk = self.request.recv(size-len(body))
                                if not chunk: return
                                body.extend(chunk)
                            import parallel_chat
                            self.request.settimeout(250)
                            parallel_chat.respond_to_client(bytes(body), self.request)
                            return
                        self.request.settimeout(None)
                        peer.connect(('127.0.0.1', BACKEND_PORT))
                        peer.sendall(header)
                    relay(self.request, peer, restrict_browser=not inside)
            except (OSError, ValueError):
                return

    class TCP(socketserver.ThreadingTCPServer):
        allow_reuse_address = True
        daemon_threads = True

        def server_close(self):
            if ephemeral is not None:
                ephemeral.close()
            super().server_close()

    class Unix(socketserver.ThreadingUnixStreamServer):
        daemon_threads = True

    if inside:
        socket_path.unlink(missing_ok=True)
    return Unix(str(socket_path), Handler) if inside else TCP(('127.0.0.1', PORT), Handler)
