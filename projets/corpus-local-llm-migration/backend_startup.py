"""Bounded, read-only preparation of the local conversation backend."""
import http.client
import json
import threading
import time


class BackendStartup:
    def __init__(self, port, directory, *, timeout=10, retry_delay=5):
        self.port = port
        self.directory = str(directory)
        self.timeout = timeout
        self.retry_delay = retry_delay
        self._lock = threading.Lock()
        self._ready = threading.Event()
        self._stop = threading.Event()
        self._running = False
        self._retry_at = 0

    def _read(self, path):
        connection = http.client.HTTPConnection('127.0.0.1', self.port, timeout=self.timeout)
        try:
            connection.request('GET', path, headers={
                'x-opencode-directory': self.directory, 'Accept': 'application/json'})
            response = connection.getresponse()
            if response.status != 200 or 'application/json' not in response.getheader('Content-Type', ''):
                raise ValueError('Backend preparation unavailable')
            body = response.read(2_000_001)
            if len(body) > 2_000_000:
                raise ValueError('Backend preparation response too large')
            return json.loads(body)
        finally:
            connection.close()

    def _warm(self):
        try:
            # No prompts, generation, tool execution, model discovery or installs.
            # /agent initializes the local configuration and its guard plugin.
            # Three attempts at most per pass; a later health poll can retry.
            for attempt in range(3):
                if self._stop.is_set():
                    return
                try:
                    agents = self._read('/agent')
                    if not isinstance(agents, list) or not any(
                        isinstance(agent, dict) and agent.get('name') == 'corpus'
                        and agent.get('mode') == 'primary' for agent in agents
                    ):
                        raise ValueError('Corpus agent unavailable')
                    statuses = self._read('/session/status')
                    if not isinstance(statuses, dict):
                        raise ValueError('Conversation status unavailable')
                    with self._lock:
                        if not self._stop.is_set():
                            self._ready.set()
                    return
                except (OSError, ValueError, http.client.HTTPException):
                    if attempt < 2 and self._stop.wait(attempt + 1):
                        return
        finally:
            with self._lock:
                self._running = False
                self._retry_at = time.monotonic() + self.retry_delay

    def start(self):
        with self._lock:
            if (self._ready.is_set() or self._stop.is_set() or self._running
                    or time.monotonic() < self._retry_at):
                return
            self._running = True
            threading.Thread(target=self._warm, name='corpus-backend-startup', daemon=True).start()

    def is_ready(self):
        self.start()
        return self._ready.is_set()

    def close(self):
        with self._lock:
            self._stop.set()
            self._ready.clear()
