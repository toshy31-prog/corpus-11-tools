import unittest
from maintenance_proposal import MaintenanceProposalError, create, evaluate_preconditions, finalize


def spec(**changes):
    value = {
        'id': 'organizer-layout-001',
        'summary': 'Classer une copie de diagnostic devenue stable.',
        'change': {'kind': 'copy', 'targets': ['/state/logs/source.json', '/state/organizer/archive/source.json']},
        'preconditions': [{'id': 'doctor.organizer.pass', 'expected': 'PASS'}, {'id': 'source.sha256', 'expected': 'abc'}],
        'rollback': {'strategy': 'restore_copy', 'artifacts': ['/state/backup/source.json']},
        'postconditions': [{'id': 'archive.sha256', 'expected': 'abc'}, {'id': 'doctor.organizer.pass', 'expected': 'PASS'}],
    }
    value.update(changes)
    return value


class MaintenanceProposalTests(unittest.TestCase):
    def test_creation_is_proposed_and_deterministic(self):
        first = create(spec())
        second = create(spec())
        self.assertEqual(first['state'], 'proposed')
        self.assertEqual(first['execution'], 'not_started')
        self.assertEqual(first['approval'], 'required')
        self.assertEqual(first['proposal_sha256'], second['proposal_sha256'])

    def test_preconditions_block_missing_or_mismatched_observations(self):
        proposal = create(spec())
        blocked = evaluate_preconditions(proposal, {'doctor.organizer.pass': 'PASS'})
        self.assertEqual(blocked['state'], 'blocked')
        ready = evaluate_preconditions(proposal, {'doctor.organizer.pass': 'PASS', 'source.sha256': 'abc'})
        self.assertEqual(ready['state'], 'ready_for_authorization')
        self.assertEqual(ready['execution'], 'not_started')

    def test_final_receipt_never_verifies_cancelled_or_failed_postcondition(self):
        proposal = create(spec())
        observations = {'archive.sha256': 'abc', 'doctor.organizer.pass': 'PASS'}
        cancelled = finalize(proposal, {'proposal_sha256': proposal['proposal_sha256'], 'status': 'cancelled', 'evidence_id': 'op-1'}, observations)
        self.assertEqual(cancelled['verification'], 'not_verified')
        failed = finalize(proposal, {'proposal_sha256': proposal['proposal_sha256'], 'status': 'executed', 'evidence_id': 'op-2'}, {'archive.sha256': 'wrong', 'doctor.organizer.pass': 'PASS'})
        self.assertEqual(failed['verification'], 'not_verified')
        passed = finalize(proposal, {'proposal_sha256': proposal['proposal_sha256'], 'status': 'executed', 'evidence_id': 'op-3'}, observations)
        self.assertEqual(passed['verification'], 'verified')
        self.assertEqual(passed['rollback']['strategy'], 'restore_copy')

    def test_tampered_proposal_is_never_evaluated_or_finalized(self):
        proposal = create(spec())
        proposal['change']['targets'].append('/unexpected')
        with self.assertRaisesRegex(MaintenanceProposalError, 'Empreinte'):
            evaluate_preconditions(proposal, {})
        with self.assertRaisesRegex(MaintenanceProposalError, 'Empreinte'):
            finalize(proposal, {'proposal_sha256': proposal['proposal_sha256'], 'status': 'executed', 'evidence_id': 'op'}, {})

    def test_material_change_requires_rollback_and_cross_proposal_receipt_fails(self):
        with self.assertRaisesRegex(MaintenanceProposalError, 'retour arrière'):
            create(spec(rollback={'strategy': 'restore_copy', 'artifacts': []}))
        first, second = create(spec()), create(spec(id='other'))
        with self.assertRaisesRegex(MaintenanceProposalError, 'autre proposition'):
            finalize(first, {'proposal_sha256': second['proposal_sha256'], 'status': 'executed', 'evidence_id': 'op'}, {})


if __name__ == '__main__':
    unittest.main()
