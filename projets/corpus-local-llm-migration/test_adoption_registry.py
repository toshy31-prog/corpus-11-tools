import copy
import unittest
from adoption_registry import AdoptionError, PACKET_SCHEMA, validate, validate_review_packet

class AdoptionRegistryTests(unittest.TestCase):
 def test_idea_and_native_are_explicit(self):
  value=validate([{'id':'paper','mode':'idea','source':'https://arxiv.org/abs/2601.06007'},
                  {'id':'native','mode':'local_implementation'}])
  self.assertEqual([row['state'] for row in value['entries']],['idea_only_no_code_copied','native_code_no_upstream_copy'])
 def test_code_requires_revision_license_notice_and_test(self):
  value=validate([{'id':'lib','mode':'code','source':'https://github.com/a/b','license':'Apache-2.0','revision':'abcdef123','notice_path':'licenses/lib.txt','local_test':'test_lib.py'}])
  self.assertEqual(value['entries'][0]['state'],'reviewable_code_import')
 def test_rejects_short_revision_and_non_permissive(self):
  base={'id':'lib','mode':'code','source':'https://github.com/a/b','license':'Apache-2.0','revision':'abc','notice_path':'n','local_test':'t'}
  with self.assertRaisesRegex(AdoptionError,'révision'):validate([base])
  base['revision']='abcdef1';base['license']='AGPL-3.0'
  with self.assertRaisesRegex(AdoptionError,'licence'):validate([base])

 def packet(self, source_kind='primary', mode='idea'):
  source={'schema':'corpus.research-source.v1','id':'source-1','source_kind':source_kind,
          'provenance':{'publisher':'maintainer','reference':'https://example.test/ref'},
          'published_on':'2026-01-02','accessed_on':'2026-01-03','license_status':'open_verified',
          'local_status':'metadata_only','excerpt':{'sha256':'a'*64,'chars':0,'stored':False},'claims_scope':'metadata only'}
  adoption={'id':'adoption-1','mode':mode,'source':'https://example.test/ref'}
  link={'adoption_id':'adoption-1','source_id':'source-1','reviewed_on':'2026-01-04','decision':'propose_adaptation'}
  if mode=='code':
   adoption.update(license='MIT',revision='abcdef123',notice_path='licenses/upstream.txt',local_test='test_upstream.py')
   link['decision']='propose_code_review'
  return {'schema':PACKET_SCHEMA,'sources':[source],'adoptions':[adoption],'links':[link]}

 def test_packet_preserves_community_as_idea_signal_not_code_evidence(self):
  value=validate_review_packet(self.packet('community'))
  self.assertEqual(value['reviews'][0]['state'],'community_signal_only')
  self.assertEqual(value['network'],'not_used')
  self.assertFalse(value['writes_performed'])

 def test_code_requires_primary_open_source_and_explicit_review(self):
  value=validate_review_packet(self.packet('primary','code'))
  self.assertEqual(value['reviews'][0]['state'],'code_review_pending_no_import')
  packet=self.packet('community','code')
  with self.assertRaisesRegex(AdoptionError,'primaire'):validate_review_packet(packet)
  packet=self.packet('primary','code');packet['sources'][0]['license_status']='license_unknown'
  with self.assertRaisesRegex(AdoptionError,'licence'):validate_review_packet(packet)

 def test_postdated_source_and_missing_link_are_rejected(self):
  packet=self.packet();packet['links'][0]['reviewed_on']='2026-01-01'
  with self.assertRaisesRegex(AdoptionError,'postérieure'):validate_review_packet(packet)
  packet=self.packet();packet['links']=[]
  with self.assertRaisesRegex(AdoptionError,'exactement un lien'):validate_review_packet(packet)
if __name__=='__main__':unittest.main()
