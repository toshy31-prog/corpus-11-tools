"""Bounded, process-local JSON metadata cache; edits remain visible next call.

Only use for small catalog/configuration files, not sessions or user documents.
Design reference: https://docs.python.org/3/library/functools.html
Unlike bare memoization, file identity and nanosecond timestamps invalidate values.
No upstream code copied; no dependencies, watcher, inference or background work.
"""
from collections import OrderedDict
from copy import deepcopy
import json
from pathlib import Path
from threading import RLock


def _signature(stat):
    return (stat.st_dev, stat.st_ino, stat.st_size,
            stat.st_mtime_ns, stat.st_ctime_ns)


class JsonMetadataCache:
    def __init__(self, max_entries=16):
        if max_entries < 1:
            raise ValueError('max_entries must be positive')
        self._max_entries = max_entries
        self._entries = OrderedDict()
        self._lock = RLock()

    def read(self, path):
        """Return a private copy, or propagate missing/invalid/unstable file errors.

        Atomic file replacement is recommended for concurrent writers. A file
        changing during a read is retried once, never served from an old cache.
        """
        path = Path(path).absolute()
        with self._lock:
            try:
                signature = _signature(path.stat())
                entry = self._entries.get(path)
                if entry is not None and entry[0] == signature:
                    self._entries.move_to_end(path)
                    return deepcopy(entry[1])
                self._entries.pop(path, None)
                for _ in range(2):
                    before = _signature(path.stat())
                    raw = path.read_text(encoding='utf-8')
                    after = _signature(path.stat())
                    if before != after:
                        continue
                    value = json.loads(raw)
                    self._entries[path] = (after, value)
                    if len(self._entries) > self._max_entries:
                        self._entries.popitem(last=False)
                    return deepcopy(value)
                raise OSError(f'Metadata changed during read: {path}')
            except Exception:
                self._entries.pop(path, None)
                raise

    def clear(self):
        with self._lock:
            self._entries.clear()


_cache = JsonMetadataCache()
read_json = _cache.read
