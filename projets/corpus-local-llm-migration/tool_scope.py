"""Prepare an explicit OpenCode tool scope offline; never send or execute it.

Uses the existing caller-owned tools mask supported by Corpus/OpenCode.
Pattern: Qwen-Agent function_list (Apache-2.0); no upstream code copied.
A tool mask controls exposure, not execution permissions.
"""
import argparse
import copy
import json
from pathlib import Path
from metadata_cache import read_json

CATALOG = Path(__file__).with_name('tool_router_catalog_v2.json')


def with_tools(body, selected, catalog):
    if not isinstance(body, dict):
        raise ValueError('Message must be an object')
    if 'tools' in body:
        raise ValueError('Existing caller-owned tools must not be overwritten')
    selected = set(selected)
    unknown = selected - set(catalog['tools'])
    if unknown:
        raise ValueError('Unknown tools: ' + ', '.join(sorted(unknown)))
    if body.get('agent') == 'corpus-plan' and selected:
        raise ValueError('Plan must remain zero-tool')
    result = copy.deepcopy(body)
    result['tools'] = {name: name in selected for name in sorted(catalog['tools'])}
    return result


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('message', type=Path, help='OpenCode message JSON')
    p.add_argument('--tool', action='append', default=[])
    args = p.parse_args()
    print(json.dumps(with_tools(json.loads(args.message.read_text()), args.tool,
                               json.loads(CATALOG.read_text())), ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()


def profiles(catalog):
    """Deterministic task presets; no inference and no permission changes."""
    rows = read_json(Path(__file__).with_name('tool_profiles.json'))
    from tool_profile_catalog import validate_profiles
    return validate_profiles(rows, catalog)


def scope_summary(selected, catalog):
    """Offline description size, never an inference latency/token estimate."""
    import hashlib
    names = sorted(set(selected))
    with_tools({}, names, catalog)
    def size(name):
        tool = catalog['tools'][name]
        return len(tool.get('captured_description', '')) + len(json.dumps(
            tool.get('captured_schema', {}), ensure_ascii=False, sort_keys=True, separators=(',', ':')))
    return {'names': names, 'count': len(names), 'catalog_count': len(catalog['tools']),
            'captured_definition_chars': sum(size(name) for name in names),
            'scope_sha256': hashlib.sha256(json.dumps(names).encode()).hexdigest(),
            'measurement': 'captured_catalog_characters_not_live_tokens_or_latency'}
