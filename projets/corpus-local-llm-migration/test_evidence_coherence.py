import unittest

from evidence_coherence import assess
from maintenance_proposal import create, finalize
from scenario_evaluation import freeze_fixtures

BANK = {'scenarios': [{'id': 'C1', 'title': 'x', 'context': 'x', 'turns': [], 'expected': [], 'failures': [], 'areas': [], 'status': 'not_run', 'evidence': [], 'user_feedback': 'not_observed'}]}
LINKS = {'schema_version': 1, 'links': [{'scenario_id': 'C1', 'required_namespaces': ['files'], 'purpose': 'Lire.'}], 'not_applicable': []}


def submission():
    fixtures = freeze_fixtures(BANK)
    return fixtures, {
        'fixture_id': 'C1', 'fixture_sha256': fixtures['fixtures'][0]['scenario_sha256'], 'declared_result': 'pass',
        'trace': {'run': {'id': 'private', 'status': 'ok'}, 'spans': [{'kind': 'tool', 'status': 'ok', 'start_ms': 0, 'duration_ms': 1, 'attributes': {'tool.name': 'read'}}]},
        'tool_policy_receipt': {'router_mode': 'enforce', 'integrity': 'verified_at_router', 'enabled_tools': [{'name': 'read', 'namespace': 'files'}], 'forbidden_namespaces': ['ssh'], 'unknown_enabled_tools': [], 'execution_permission': {'status': 'not_observed_at_router'}},
        'outcome': {'reported_status': 'completed'}, 'latency_budget': {'reported_wall_seconds': 1, 'maximum_wall_seconds': 2},
    }


def maintenance_receipt(status='executed'):
    proposal = create({'id': 'm1', 'summary': 'Copie.', 'change': {'kind': 'copy', 'targets': ['/state/a']}, 'preconditions': [{'id': 'a', 'expected': 'ok'}], 'rollback': {'strategy': 'restore_copy', 'artifacts': ['/state/backup/a']}, 'postconditions': [{'id': 'b', 'expected': 'ok'}]})
    return finalize(proposal, {'proposal_sha256': proposal['proposal_sha256'], 'status': status, 'evidence_id': 'op'}, {'b': 'ok'})


class EvidenceCoherenceTests(unittest.TestCase):
    def test_consistent_packet_stays_unverified_and_unpromoted(self):
        fixtures, value = submission()
        result = assess(BANK, fixtures, value, LINKS, {'kind': 'not_applicable', 'reason': 'Aucune maintenance dans ce scénario.'})
        self.assertEqual(result['coherence_status'], 'consistent_not_promoted')
        self.assertIsNone(result['verified_result'])
        self.assertEqual(result['promotion'], 'not_performed')
        self.assertFalse(result['execution'] != 'not_started')

    def test_trace_tool_not_in_policy_blocks_packet(self):
        fixtures, value = submission()
        value['trace']['spans'][0]['attributes']['tool.name'] = 'bash'
        result = assess(BANK, fixtures, value, LINKS, {'kind': 'not_applicable', 'reason': 'none'})
        self.assertEqual(result['coherence_status'], 'blocked')
        self.assertIn('trace_tool_not_exposed_by_policy:bash', result['blockers'])

    def test_fail_closed_policy_and_cancelled_maintenance_block_declared_pass(self):
        fixtures, value = submission()
        value['tool_policy_receipt']['integrity'] = 'unverified_fail_closed'
        result = assess(BANK, fixtures, value, LINKS, maintenance_receipt('cancelled'))
        self.assertEqual(result['coherence_status'], 'blocked')
        self.assertIn('trace_tool_present_after_policy_fail_closed', result['blockers'])
        self.assertIn('maintenance_not_executed_with_declared_pass', result['blockers'])

    def test_stale_fixture_is_blocked_not_promoted(self):
        fixtures, value = submission()
        value['fixture_sha256'] = 'stale'
        result = assess(BANK, fixtures, value, LINKS, {'kind': 'not_applicable', 'reason': 'none'})
        self.assertEqual(result['coherence_status'], 'blocked')
        self.assertIsNone(result['verified_result'])
        self.assertEqual(result['promotion'], 'not_performed')

    def test_tampered_maintenance_receipt_is_blocked(self):
        fixtures, value = submission()
        receipt = maintenance_receipt()
        receipt['action']['evidence_id'] = 'forged'
        result = assess(BANK, fixtures, value, LINKS, receipt)
        self.assertEqual(result['coherence_status'], 'blocked')
        self.assertIn('maintenance_receipt_sha256_invalid', result['blockers'])


if __name__ == '__main__':
    unittest.main()
