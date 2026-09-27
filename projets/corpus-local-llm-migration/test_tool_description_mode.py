import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import corpus_local

class ToolDescriptionModeTests(unittest.TestCase):
    def test_opt_in_and_unknown_mode_preserve_guard(self):
        with tempfile.TemporaryDirectory() as folder, patch.object(corpus_local,'CONFIG_ROOT',Path(folder)):
            guards=[(corpus_local.HERE/name).as_uri() for name in ('plan_guard.mjs','inference_guard.mjs')]
            self.assertEqual(corpus_local.tool_definition_plugins(),guards)
            mode=Path(folder)/'routing/tool-descriptions-mode'
            mode.parent.mkdir()
            for value in ('off','typo',''):
                mode.write_text(value)
                self.assertEqual(corpus_local.tool_definition_plugins(),guards)
            mode.write_text('compact-v1\n')
            self.assertEqual(corpus_local.tool_definition_plugins(),guards+[(corpus_local.HERE/'compact_tool_descriptions.mjs').as_uri()])

if __name__=='__main__':unittest.main()
