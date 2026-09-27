import unittest
import corpus_git_compact as compact

class GitCompactionTests(unittest.TestCase):
    def test_has_absolute_free_space_floor(self):
        self.assertGreaterEqual(compact.MIN_FREE, 10 * 1024**3)

    def test_state_is_outside_repository(self):
        self.assertNotIn(str(compact.REPO), str(compact.STATE))

if __name__=="__main__":
    unittest.main()
