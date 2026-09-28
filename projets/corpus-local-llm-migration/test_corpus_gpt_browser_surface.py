import ast
import base64
import json
import unittest
from pathlib import Path

HERE=Path(__file__).resolve().parent
SOURCE=HERE/"corpus_gpt_mcp.py"

def load_helpers():
    tree=ast.parse(SOURCE.read_text())
    keep=[]
    wanted={"result","browser_result"}
    for node in tree.body:
        if isinstance(node,(ast.Import,ast.ImportFrom)):
            if any(alias.name in {"base64","json"} for alias in node.names):
                keep.append(node)
        elif isinstance(node,ast.FunctionDef) and node.name in wanted:
            keep.append(node)
    module=ast.Module(body=keep,type_ignores=[])
    ns={}
    exec(compile(module,str(SOURCE),"exec"),ns)
    return ns

class BrowserSurfaceTests(unittest.TestCase):
    def test_png_becomes_mcp_image_content(self):
        ns=load_helpers()
        raw=b"\x89PNG\r\n\x1a\nfixture"
        uri="data:image/png;base64,"+base64.b64encode(raw).decode()
        out=ns["browser_result"]({"url":"http://fixture/","title":"Fixture","image":uri})
        self.assertFalse(out["isError"])
        self.assertEqual(out["content"][1]["type"],"image")
        self.assertEqual(out["content"][1]["mimeType"],"image/png")
        self.assertEqual(base64.b64decode(out["content"][1]["data"]),raw)
        meta=json.loads(out["content"][0]["text"])
        self.assertEqual(meta["title"],"Fixture")
        self.assertNotIn("image",meta)

    def test_invalid_image_fails_closed(self):
        ns=load_helpers()
        out=ns["browser_result"]({"image":"data:image/png;base64,%%%"})
        self.assertTrue(out["isError"])

if __name__=="__main__":
    unittest.main()
