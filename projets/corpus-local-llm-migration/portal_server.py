"""Bibliothèque locale en lecture seule ; chemins autorisés explicitement."""
import json
import http.client
import socket
from pathlib import Path
import re
import sqlite3
from urllib.parse import urlsplit, unquote, parse_qs

from corpus_paths import LOCAL_RUNTIME_ROOT

HERE = Path(__file__).resolve().parent
DATA = LOCAL_RUNTIME_ROOT / 'continuity/library'


def engine_page(target):
    class UnixHTTP(http.client.HTTPConnection):
        def connect(self):
            self.sock = socket.socket(socket.AF_UNIX)
            self.sock.settimeout(10)
            self.sock.connect(str(DATA.parents[1] / 'web.sock'))
    connection = UnixHTTP('localhost')
    try:
        connection.request('GET', target, headers={'Host': '127.0.0.1:18744', 'Accept-Encoding': 'identity'})
        reply = connection.getresponse()
        if reply.status != 200 or 'text/html' not in reply.getheader('Content-Type', ''):
            raise OSError('Page assistant indisponible')
        body = reply.read(2_000_001)
        if len(body) > 2_000_000:
            raise OSError('Page assistant trop volumineuse')
        return body.replace(b'</head>', b'<script src="/corpus/opencode-corpus.js" defer></script></head>')
    finally:
        connection.close()


def response(method, target, destination=None):
    path = unquote(urlsplit(target).path)
    if path.startswith('/corpus/documents/') and method == 'GET':
        import document_generation
        return document_generation.asset(path)
    if path.startswith('/corpus/generated/') and method == 'GET':
        import media_generation
        return media_generation.asset(path)
    if path.startswith('/corpus/share/') and method == 'GET':
        import local_shares
        return local_shares.page(path.removeprefix('/corpus/share/')) or b'HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n'
    if path == '/' and method in ('GET', 'HEAD'):
        return b'HTTP/1.1 302 Found\r\nLocation: /corpus/\r\nCache-Control: no-store\r\nContent-Length: 0\r\nConnection: close\r\n\r\n'
    if method == 'GET' and (path.startswith('/server/') or path == '/new-session' or re.fullmatch(r'/[A-Za-z0-9_-]+/session(?:/[^/]+)?', path)):
        if parse_qs(urlsplit(target).query).get('corpus_embed') != ['1']:
            return response(method, '/corpus/')
        try:
            body = engine_page(target)
        except OSError:
            return b'HTTP/1.1 503 Service Unavailable\r\nContent-Length: 0\r\nConnection: close\r\n\r\n'
        policy = "connect-src 'self' ws://localhost:18743 ws://127.0.0.1:18743; img-src 'self' data: blob:; media-src 'self' data: blob:; font-src 'self' data:; object-src 'none'; base-uri 'self'"
        return (f'HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {len(body)}\r\nCache-Control: no-store\r\nContent-Security-Policy: {policy}\r\nConnection: close\r\n\r\n'.encode() + body)
    if path == '/favicon.ico':
        return b'HTTP/1.1 204 No Content\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n'
    if path != '/corpus' and not path.startswith('/corpus/'):
        return None
    status, content_type, body = '404 Not Found', 'text/plain; charset=utf-8', b'Introuvable'
    if path == '/corpus/search' and method in ('GET', 'HEAD'):
        query = parse_qs(urlsplit(target).query).get('q', [''])[0][:300]
        terms = re.findall(r'[^\W_]+', query, flags=re.UNICODE)[:12]
        ids = []
        if terms:
            try:
                with sqlite3.connect(f'file:{DATA / "search.sqlite"}?mode=ro', uri=True) as db:
                    match = ' AND '.join('"' + t + '"*' for t in terms)
                    ids = [r[0] for r in db.execute('SELECT id FROM texts WHERE texts MATCH ? LIMIT 1000', (match,))]
                status = '200 OK'
            except sqlite3.Error:
                status = '503 Service Unavailable'
        else:
            status = '200 OK'
        body = json.dumps(ids).encode()
        content_type = 'application/json; charset=utf-8'
    elif method not in ('GET', 'HEAD'):
        status, body = '405 Method Not Allowed', b'Lecture seule'
    else:
        static = {'/corpus': ('index.html', 'text/html'), '/corpus/': ('index.html', 'text/html'), '/corpus/index.html': ('index.html', 'text/html'),
                  '/corpus/opencode-corpus.js': ('opencode-corpus.js', 'text/javascript'),
                  '/corpus/app.js': ('app.js', 'text/javascript'), '/corpus/style.css': ('style.css', 'text/css')}
        file = None
        base = None
        if path in static:
            name, content_type = static[path]
            base = HERE / 'portal'
            file = base / name
        elif path == '/corpus/data/index.json':
            file, base, content_type = DATA / 'index.json', DATA, 'application/json'
        elif re.fullmatch(r'/corpus/data/(threads/[a-f0-9-]{36}|documents/[a-f0-9]{20})\.json', path):
            file, base, content_type = DATA / path.removeprefix('/corpus/data/'), DATA, 'application/json'
        if file and file.resolve().is_relative_to(base.resolve()):
            try:
                body = file.read_bytes()
                status = '200 OK'
                content_type += '; charset=utf-8'
            except OSError:
                pass
    policy = "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; frame-src 'self' blob:; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
    headers = f'HTTP/1.1 {status}\r\nContent-Type: {content_type}\r\nContent-Length: {len(body)}\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\nReferrer-Policy: no-referrer\r\nContent-Security-Policy: {policy}\r\nConnection: close\r\n\r\n'.encode()
    return headers + (body if method != 'HEAD' else b'')
