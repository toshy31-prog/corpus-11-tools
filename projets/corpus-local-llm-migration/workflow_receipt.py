"""Read-only acceptance of a local migration workflow from explicit tool receipts.

Snapshots and an idle session are not proof of model actions. This checker does
not infer semantic correctness of the final answer or execute model-produced code.
"""
import argparse
import json
from pathlib import Path


def evaluate(report, *, context_path, fixture_path, test_command, success_marker='MIGRATION_SMOKE_PASS'):
    calls = report.get('tool_calls')
    if calls is None:
        calls = [{'tool': p['tool'], 'state': p['state']}
                 for m in report.get('messages', [])
                 if m.get('info', {}).get('role') == 'assistant'
                 for p in m.get('parts', []) if p.get('type') == 'tool']
    completed = [c for c in calls if c['state'].get('status') == 'completed']
    reads = {c['state'].get('input', {}).get('filePath') for c in completed
             if c['tool'] == 'read'}
    edits = [c for c in completed if c['tool'] in ('edit', 'write', 'apply_patch')]
    allowed_edits = [c for c in edits if c['tool'] in ('edit', 'write')
                     and c['state'].get('input', {}).get('filePath') == fixture_path]
    tests = [c for c in completed if c['tool'] == 'bash'
             and c['state'].get('input', {}).get('command', '').strip() == test_command]
    test_pass = any(c['state'].get('metadata', {}).get('exit') == 0
                    and success_marker in c['state'].get('output', '').splitlines()
                    for c in tests)
    ordered = bool(allowed_edits) and any(
        all(edit_index < test_index
        and any(c['tool'] == 'read' and c['state'].get('input', {}).get('filePath') == fixture_path
                for c in completed[:edit_index])
        and any(c['tool'] == 'read' and c['state'].get('input', {}).get('filePath') == context_path
                for c in completed[:edit_index])
        for edit_index, edit in enumerate(completed) if edit in allowed_edits)
        for test_index, test in enumerate(completed) if test in tests
        and test is tests[-1]
        and test['state'].get('metadata', {}).get('exit') == 0
        and success_marker in test['state'].get('output', '').splitlines())
    checks = {
        'session_completed': report.get('outcome') == 'completed',
        'context_read': context_path in reads,
        'fixture_read': fixture_path in reads,
        'fixture_edit_completed': bool(allowed_edits),
        'no_other_completed_edits': len(edits) == len(allowed_edits),
        'no_unfinished_or_failed_tools': len(completed) == len(calls),
        'exact_test_command_passed': test_pass,
        'read_edit_test_order_verified': ordered,
    }
    return {'execution_chain_verified': all(checks.values()), 'checks': checks,
            'semantic_answer_review': 'required_separately',
            'elapsed_seconds': report.get('elapsed_seconds'),
            'tool_states': [{'tool': c['tool'], 'status': c['state'].get('status')}
                            for c in calls],
            'scope': 'tool_receipts_only_not_whole_migration_or_independent_filesystem_validation'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('report', type=Path)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[2])
    args = parser.parse_args()
    project = args.root / 'projets/corpus-local-llm-migration'
    print(json.dumps(evaluate(json.loads(args.report.read_text()),
          context_path=str(project / 'CONTEXTE_LOCAL.md'),
          fixture_path=str(project / '.migration-smoke/runtime_limits.py'),
          test_command='python3 ' + str(project / '.migration-smoke/test_budget.py')),
          ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
