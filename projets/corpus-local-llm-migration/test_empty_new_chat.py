from pathlib import Path
import unittest


APP = Path(__file__).with_name("portal") / "app.js"


class EmptyNewChatRegressionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = APP.read_text()

    def test_new_chat_reuses_loaded_empty_current_session(self):
        self.assertIn("function reusableEmptyConversation()", self.source)
        self.assertIn("!state.ready", self.source)
        self.assertIn("state.queue.length", self.source)
        self.assertIn("state.messages.length", self.source)
        self.assertIn("const existing=reusableEmptyConversation();", self.source)
        self.assertIn("openSession(existing.id,existing.title);", self.source)

    def test_new_chat_still_creates_when_current_session_is_not_reusable(self):
        self.assertIn("start(null,null,$('new'));", self.source)


if __name__ == "__main__":
    unittest.main()
