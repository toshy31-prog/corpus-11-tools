'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {production}=require('./frontend_test_dom.cjs');
test('Resume UI preserves selected lines and saved source hashes across editing and reloading',()=>{
 const c=vm.createContext({});vm.runInContext(production('resumeMemoryLabel'),c);vm.runInContext(production('resumeMemoryEntries'),c);
 const prior=[{path:'notes.md',start_line:10,end_line:25,sha256:'saved-hash'}];
 const parsed=JSON.parse(JSON.stringify(c.resumeMemoryEntries(c.resumeMemoryLabel(prior[0]),prior)));
 assert.deepEqual(parsed,prior);
 assert.equal(c.resumeMemoryEntries('notes.md:L11-L24',prior)[0].sha256,'saved-hash');
 assert.deepEqual(JSON.parse(JSON.stringify(c.resumeMemoryEntries('other.md',prior))),[{path:'other.md'}]);
 for(const range of ['notes.md:L0-L2','notes.md:L3-L2','notes.md:L1-L9999999999999999999'])assert.throws(()=>c.resumeMemoryEntries(range),/invalide/);
});
