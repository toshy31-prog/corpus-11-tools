import socket,threading,unittest
import local_bridge
class RelayConnections(unittest.TestCase):
 def check(self,reply):
  client,left=socket.socketpair();right,server=socket.socketpair()
  t=threading.Thread(target=local_bridge.relay,args=(left,right,True),daemon=True);t.start()
  try:
   client.settimeout(2);server.sendall(reply);return client.recv(8192)
  finally:client.close();server.close();t.join(2);left.close();right.close()
 def test_close_http(self):
  out=self.check(b'HTTP/1.1 200 OK\r\nConnection: keep-alive\r\nContent-Length: 2\r\n\r\n{}')
  self.assertIn(b'Connection: close',out);self.assertNotIn(b'keep-alive',out)
 def test_preserve_websocket(self):
  out=self.check(b'HTTP/1.1 101 Switching Protocols\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n')
  self.assertIn(b'Connection: Upgrade',out);self.assertNotIn(b'Connection: close',out)
