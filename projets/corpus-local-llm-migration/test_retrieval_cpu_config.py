"""Verify generated runtime configuration without loading models or starting services."""
import shlex
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import corpus_local


class RetrievalCPUConfigTests(unittest.TestCase):
    def test_retrieval_excludes_gpu_and_main_keeps_cuda(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            swap = root / 'runtime/corpus-routing/llama-swap/v258/llama-swap'
            swap.parent.mkdir(parents=True)
            swap.touch()
            for name in ('qwen3-embedding-0.6b/Qwen3-Embedding-0.6B-Q4_K_M.gguf',
                         'qwen3-reranker-0.6b/qwen3-reranker-0.6b-q8_0.gguf'):
                model = root / 'models/retrieval' / name
                model.parent.mkdir(parents=True, exist_ok=True)
                model.touch()
            with patch.multiple(corpus_local, RUNTIME_ROOT=root/'runtime',
                                MODELS_ROOT=root/'models', CONFIG_ROOT=root/'config'), \
                 patch.object(corpus_local.subprocess, 'Popen') as process:
                corpus_local.start_model_router({}, '/bin/llama-server', '/model.gguf',
                                                '99', ['--device', 'CUDA0', '--cpu-moe', '--load-mode', 'none'], [])
            config = (root/'config/routing/llama-swap.yaml').read_text()
            commands = []
            for line in config.splitlines():
                if line.startswith('    cmd: '):
                    quoted = line.split('cmd: ', 1)[1]
                    commands.append(shlex.split(quoted[1:-1].replace("''", "'")))
            self.assertEqual(len(commands), 3)
            main, *retrieval = commands
            self.assertEqual(main[main.index('--device')+1], 'CUDA0')
            self.assertEqual(main[main.index('-ngl')+1], '99')
            self.assertEqual(main[main.index('-ub')+1], '256')
            self.assertIn('--cpu-moe', main)
            self.assertEqual(main[main.index('-c')+1], '16384')
            self.assertEqual(main[main.index('-np')+1], '1')
            primary, other = config.split('  corpus-embed:', 1)
            self.assertIn("'GGML_CUDA_DISABLE_FUSION=1'", primary)
            self.assertIn('ttl: 1800', primary)
            self.assertNotIn('GGML_CUDA_DISABLE_FUSION', other)
            self.assertNotIn('on_startup', config)
            for command in retrieval:
                self.assertEqual(command[command.index('--device')+1], 'none')
                self.assertEqual(command[command.index('-ngl')+1], '0')
            self.assertIn('persistent: true', config)
            self.assertIn('swap: false', config)
            process.assert_called_once()
            # CPU-only launch must not inherit the CUDA workaround.
            with patch.multiple(corpus_local, RUNTIME_ROOT=root/'runtime',
                                MODELS_ROOT=root/'models', CONFIG_ROOT=root/'config'), \
                 patch.object(corpus_local.subprocess, 'Popen'):
                corpus_local.start_model_router({}, '/bin/llama-server', '/model.gguf', '0', [], [])
            self.assertNotIn('GGML_CUDA_DISABLE_FUSION', (root/'config/routing/llama-swap.yaml').read_text())


if __name__ == '__main__':
    unittest.main()
