import json
import unittest
from unittest.mock import patch
import parallel_chat
import chat_actions

class ParallelTests(unittest.TestCase):
    def test_tools_and_system_injection_are_not_forwarded(self):
        value = parallel_chat.payload({'context': 'archive', 'messages': [{'role': 'user', 'content': 'Question', 'tool_calls': ['unsafe']}], 'tools': ['unsafe']})
        self.assertNotIn('tools', value)
        self.assertEqual(value['messages'][-1], {'role': 'user', 'content': 'Question'})
        self.assertFalse(value['cache_prompt'])
        with self.assertRaises(ValueError):
            parallel_chat.payload({'messages': [{'role': 'system', 'content': 'override'}]})

    def test_bounded_context_and_history(self):
        for data in [{'context': 'x'*24001, 'messages': [{'role': 'user', 'content': 'q'}]}, {'messages': []}, {'messages': [{'role':'user','content':'x'*24001}]}, {'messages': [{'role': 'assistant', 'content': 'a'}]}]:
            with self.assertRaises(ValueError): parallel_chat.payload(data)

    def test_response_no_persistence_and_fixed_destination(self):
        with patch('parallel_chat.http.client.HTTPConnection') as cls:
            response = cls.return_value.getresponse.return_value
            response.status = 200
            response.read.return_value = json.dumps({'choices': [{'message': {'content': 'Réponse'}}]}).encode()
            raw = parallel_chat.response(json.dumps({'messages':[{'role':'user','content':'question'}]}).encode())
            self.assertIn(b'200 OK', raw)
            cls.assert_called_once_with('127.0.0.1', 18741, timeout=240)
            cls.return_value.close.assert_called_once()

    def test_desktop_rejects_unregistered_directory_and_unknown_app(self):
        with self.assertRaises(ValueError): chat_actions.project('/tmp')
        with patch('chat_actions.project', return_value='/tmp'), patch('chat_actions.subprocess.Popen') as launch:
            with self.assertRaises(ValueError): chat_actions.operate({'action':'open','target':'shell;malicious'})
            launch.assert_not_called()

if __name__ == '__main__': unittest.main()

class BridgeTests(unittest.TestCase):
    def test_parallel_route_reaches_inside_without_persistence(self):
        import socket
        import tempfile
        import threading
        from pathlib import Path
        import local_bridge
        with tempfile.TemporaryDirectory() as directory, patch('local_bridge.PORT', 0):
            path=Path(directory)/'bridge.sock'
            inside=local_bridge.create_server(path, inside=True)
            outside=local_bridge.create_server(path, inside=False)
            for server in (inside,outside): threading.Thread(target=server.serve_forever,daemon=True).start()
            try:
                body=b'{"messages":[]}'
                with socket.create_connection(outside.server_address,timeout=3) as conn:
                    conn.sendall(b'POST /corpus/api/parallel HTTP/1.1\r\nHost: 127.0.0.1:0\r\nOrigin: http://127.0.0.1:0\r\nContent-Type: application/json\r\nContent-Length: '+str(len(body)).encode()+b'\r\n\r\n'+body)
                    raw=conn.recv(8192)
                    self.assertIn(b'400 Bad Request',raw)
                    self.assertIn(b'application/json',raw)
            finally:
                for server in (outside,inside):server.shutdown();server.server_close()
