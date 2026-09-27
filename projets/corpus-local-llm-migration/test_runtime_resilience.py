import unittest
from runtime_resilience import assess


def snapshot(**overrides):
    value={'health': {'ready': True, 'state': 'ready'}, 'cuda_errors': [], 'active_sessions': 0,
           'observed': 'observed', 'observed_at_unix': 1000, 'evaluated_at_unix': 1002,
           'max_age_seconds': 30}
    value.update(overrides)
    return value


class RuntimeResilienceTests(unittest.TestCase):
    def test_ready_snapshot_does_not_authorize_or_start_inference(self):
        result=assess(snapshot())
        self.assertEqual(result['state'],'ready')
        self.assertEqual(result['inference_admission'],'not_authorized_by_evaluator')
        self.assertEqual(result['execution'],'not_started')

    def test_unready_or_cuda_error_prohibits_inference(self):
        for value, reason in [(snapshot(health={'ready':False,'state':'starting'}),'service_non_prêt'), (snapshot(cuda_errors=['invalid argument']),'erreur_cuda_observée')]:
            with self.subTest(value=value):
                result=assess(value)
                self.assertEqual(result['state'],'degraded')
                self.assertEqual(result['inference_admission'],'inference_prohibited')
                self.assertIn(reason,result['blocking_reasons'])

    def test_unknown_diagnostic_prohibits_inference(self):
        result=assess(snapshot(observed='unknown'))
        self.assertEqual(result['state'],'unknown')
        self.assertEqual(result['inference_admission'],'inference_prohibited')
        self.assertIn('diagnostic_non_observé',result['blocking_reasons'])

    def test_expired_diagnostic_is_unknown_even_when_last_probe_was_ready(self):
        result=assess(snapshot(evaluated_at_unix=1031))
        self.assertEqual(result['state'], 'unknown')
        self.assertEqual(result['inference_admission'], 'inference_prohibited')
        self.assertIn('diagnostic_expiré', result['blocking_reasons'])
        self.assertFalse(result['observations']['fresh'])

    def test_invalid_clock_order_or_age_policy_is_rejected(self):
        for values in ({'evaluated_at_unix': 999}, {'max_age_seconds': 0}):
            with self.subTest(values=values):
                with self.assertRaises(ValueError):
                    assess(snapshot(**values))

    def test_invalid_snapshot_is_rejected(self):
        with self.assertRaises(ValueError):
            assess({'health':{},'cuda_errors':[],'active_sessions':0,'observed':'observed'})

if __name__=='__main__': unittest.main()
