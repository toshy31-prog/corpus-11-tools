import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import plugin_manager as pm

class Plugins(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.cache = self.root/'cache'; self.package = self.cache/'source/pkg/1'
        (self.package/'.codex-plugin').mkdir(parents=True)
        (self.package/'skills/hello').mkdir(parents=True)
        (self.package/'.codex-plugin/plugin.json').write_text(json.dumps({'name':'Test','skills':'./skills'}))
        (self.package/'skills/hello/SKILL.md').write_text('Méthode de test')
        self.patches = [patch.object(pm,'BASE',self.root/'state'),patch.object(pm,'CACHE',self.cache)]
        for p in self.patches:p.start()
        self.ident = pm.catalog()['plugins'][0]['id']
    def tearDown(self):
        for p in self.patches:p.stop()
        self.tmp.cleanup()
    def test_enable_read_disable_persists(self):
        self.assertEqual(pm.model({'operation':'plugin-list'})['plugins'],[])
        pm.operate({'operation':'toggle','id':self.ident,'enabled':True})
        self.assertTrue(pm.state()['enabled'][self.ident])
        self.assertEqual(pm.model({'operation':'plugin-read','id':self.ident,'path':'skills/hello/SKILL.md'})['text'],'Méthode de test')
        pm.operate({'operation':'toggle','id':self.ident,'enabled':False})
        with self.assertRaises(ValueError):pm.model({'operation':'plugin-read','id':self.ident,'path':'skills/hello/SKILL.md'})
    def test_escape_and_symlinks_not_exposed(self):
        (self.root/'secret.txt').write_text('secret')
        (self.package/'skills/hello/out.txt').symlink_to(self.root/'secret.txt')
        self.assertNotIn('skills/hello/out.txt',pm.resources(self.ident))
        with self.assertRaises(ValueError):pm.read_resource(self.ident,'../../secret.txt')
    def test_model_cannot_activate(self):
        with self.assertRaises(ValueError):pm.model({'operation':'toggle','id':self.ident,'enabled':True})
    def test_application_cannot_fake_activation(self):
        (self.package/'.codex-plugin/plugin.json').write_text(json.dumps({'name':'App','skills':[],'apps':'./.app.json'}))
        with self.assertRaises(ValueError):pm.operate({'operation':'toggle','id':self.ident,'enabled':True})
    def test_missing_package_does_not_register(self):
        with self.assertRaises(OSError):pm.operate({'operation':'add','path':str(self.root/'missing')})
        self.assertEqual(pm.state()['paths'],[])

if __name__=='__main__':unittest.main()
