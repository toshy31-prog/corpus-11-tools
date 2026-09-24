const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const code=fs.readFileSync(__dirname+'/portal/app.js','utf8');const start=code.indexOf('const themeDefaults='),end=code.indexOf('function applyPreferences(){',start);const box={structuredClone,localStorage:{getItem:()=>null}};vm.createContext(box);vm.runInContext(code.slice(start,end),box);
const run=s=>vm.runInContext(s,box);
assert.equal(run('validatePalette(themeDefaults.light).bg'),'#ffffff');assert.equal(run("themeMix('#000000','#ffffff',0)"),'#000000');assert.equal(run("themeMix('#000000','#ffffff',1)"),'#ffffff');
for(const change of ["bg:'red'","ink:'url(https://example.test)'","contrast:101","ui:'external font'","weight:'900'"])assert.throws(()=>run('validatePalette({...themeDefaults.light,'+change+'})'));
const styles={};box.document={documentElement:{style:{setProperty:(k,v)=>styles[k]=v}}};run("applyPalette('dark')");assert.equal(styles['--bg'],'#181818');assert.equal(styles['--ink'],'#eeeeee');assert.ok(styles['--line'].startsWith('#'));
console.log('Thèmes : validation JSON, couleurs, polices et application sombre vérifiées.');
