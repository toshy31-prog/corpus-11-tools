"""Read-only bounded storage inventory; no content reads, deletion or inference.

Uses os.scandir metadata and directory descriptors (Linux Corpus runtime).
Reference: https://docs.python.org/3/library/os.html#os.scandir
"""
import os
from pathlib import Path
import stat
import time


def summary(base, *, max_entries=10000, max_depth=8, max_seconds=0.2):
    """Count logical bytes per regular file; hard links count per entry.

    Non-atomic snapshot. Limits are cooperative, not an I/O timeout. Missing
    base is empty; errors and exceeded limits explicitly mark partial results.
    Directory symlinks are not traversed, including replacement races.
    """
    if max_entries < 1 or max_depth < 0 or max_seconds <= 0:
        raise ValueError('Invalid inventory limits')
    result = {'checkpoints': {'files': 0, 'bytes': 0},
              'memory_history': {'files': 0, 'bytes': 0},
              'other': {'files': 0, 'bytes': 0},
              'total_files': 0, 'total_bytes': 0, 'scanned_entries': 0,
              'skipped_symlinks': 0, 'errors': 0, 'partial': False,
              'reasons': [], 'missing': False,
              'limits': {'entries': max_entries, 'depth': max_depth,
                         'seconds': max_seconds},
              'measurement': 'logical_bytes_non_atomic_snapshot'}
    deadline = time.monotonic() + max_seconds
    flags = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | os.O_CLOEXEC

    def partial(reason):
        result['partial'] = True
        if reason not in result['reasons']:
            result['reasons'].append(reason)

    def walk(fd, parts):
        with os.scandir(fd) as entries:
            for entry in entries:
                if result['scanned_entries'] >= max_entries:
                    partial('entry_limit')
                    return
                if time.monotonic() >= deadline:
                    partial('time_limit')
                    return
                result['scanned_entries'] += 1
                try:
                    info = entry.stat(follow_symlinks=False)
                    if stat.S_ISLNK(info.st_mode):
                        result['skipped_symlinks'] += 1
                    elif stat.S_ISDIR(info.st_mode):
                        if len(parts) >= max_depth:
                            partial('depth_limit')
                            continue
                        child = os.open(entry.name, flags, dir_fd=fd)
                        try:
                            walk(child, parts + (entry.name,))
                        finally:
                            os.close(child)
                        if 'entry_limit' in result['reasons'] or 'time_limit' in result['reasons']:
                            return
                    elif stat.S_ISREG(info.st_mode):
                        category = ('checkpoints' if not parts and entry.name.endswith('.json')
                                    else 'memory_history' if parts and parts[0] == 'memory-history'
                                    and entry.name.endswith('.json') else 'other')
                        result[category]['files'] += 1
                        result[category]['bytes'] += info.st_size
                        result['total_files'] += 1
                        result['total_bytes'] += info.st_size
                except OSError:
                    result['errors'] += 1
                    partial('io_error')

    try:
        fd = os.open(Path(base), flags)
    except FileNotFoundError:
        result['missing'] = True
        return result
    except OSError:
        result['errors'] += 1
        partial('root_unavailable')
        return result
    try:
        walk(fd, ())
    except OSError:
        result['errors'] += 1
        partial('io_error')
    finally:
        os.close(fd)
    return result
