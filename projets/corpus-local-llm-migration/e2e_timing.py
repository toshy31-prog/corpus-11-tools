"""Summarize a durable local e2e receipt without contacting a model or service."""
import argparse
import json
from pathlib import Path


def seconds(value):
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        return None
    return value / 1000 if value > 10_000_000_000 else float(value)


def duration(start, end):
    start, end = seconds(start), seconds(end)
    return round(end - start, 3) if start is not None and end is not None and end >= start else None


def summarize(receipt):
    messages = receipt.get('messages') if isinstance(receipt, dict) else None
    if not isinstance(messages, list):
        raise ValueError('Reçu durable sans messages.')
    users = [row for row in messages if isinstance(row, dict) and row.get('info', {}).get('role') == 'user']
    if not users:
        raise ValueError('Tour utilisateur absent.')
    user = users[-1].get('info', {})
    steps, tool_seconds = [], 0.0
    for row in messages:
        info = row.get('info', {}) if isinstance(row, dict) else {}
        if info.get('role') != 'assistant' or info.get('parentID') != user.get('id'):
            continue
        tools = []
        for part in row.get('parts', []):
            if not isinstance(part, dict) or part.get('type') != 'tool':
                continue
            state = part.get('state', {})
            spent = duration(state.get('time', {}).get('start'), state.get('time', {}).get('end'))
            tools.append({'tool': part.get('tool'), 'status': state.get('status'), 'seconds': spent})
            if spent is not None:
                tool_seconds += spent
        elapsed = duration(info.get('time', {}).get('created'), info.get('time', {}).get('completed'))
        steps.append({'finish': info.get('finish'), 'seconds': elapsed, 'tools': tools})
    completed = [seconds(row.get('info', {}).get('time', {}).get('completed')) for row in messages
                 if isinstance(row, dict) and row.get('info', {}).get('role') == 'assistant'
                 and row.get('info', {}).get('parentID') == user.get('id')]
    completed = [value for value in completed if value is not None]
    started = seconds(user.get('time', {}).get('created'))
    wall = round(max(completed) - started, 3) if completed and started is not None and max(completed) >= started else None
    assistant = round(sum(step['seconds'] or 0 for step in steps), 3)
    return {
        'scope': 'receipt_timing_only_not_provider_tokens_or_quality',
        'wall_seconds_from_transcript': wall,
        'assistant_turn_seconds': assistant,
        'recorded_tool_execution_seconds': round(tool_seconds, 3),
        'assistant_turn_seconds_excluding_recorded_tools': round(max(0, assistant - tool_seconds), 3),
        'assistant_steps': steps,
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('receipt', type=Path)
    args = parser.parse_args(argv)
    print(json.dumps(summarize(json.loads(args.receipt.read_text())), ensure_ascii=False, indent=2))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
