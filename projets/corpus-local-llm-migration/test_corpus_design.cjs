'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {source,production}=require('./frontend_test_dom.cjs');
test('Public legacy routes reach the active local UI instead of obsolete placeholders',()=>{
 const calls=[],ctx=vm.createContext({goHome:()=>calls.push('home'),history:{replaceState:(_,__,url)=>calls.push(url)},showChatSchedules:()=>calls.push('schedules'),openSettings:key=>calls.push(key)});
 vm.runInContext(production('showPanel').split('\nfor(const b')[0],ctx);
 ctx.showPanel('scheduled');assert.deepEqual(calls,['home','/corpus/index.html?page=scheduled','schedules']);
 calls.length=0;ctx.showPanel('voice');ctx.showPanel('settings');ctx.showPanel('plugins');assert.deepEqual(calls,['voice','general','plugins']);
});
test('Exact legacy palettes migrate while custom colors survive',()=>{
 const start=source.indexOf('const themeDefaults='),end=source.indexOf('function applyPreferences(){',start);
 const old={light:{bg:'#ffffff',ink:'#1a1c1e',accent:'#8060c0',contrast:45,ui:'system',content:'inherit',code:'mono',weight:'400'}};
 function palette(saved){const c=vm.createContext({structuredClone,localStorage:{getItem:()=>JSON.stringify(saved)}});vm.runInContext(source.slice(start,end),c);return JSON.parse(vm.runInContext('JSON.stringify(themePalettes)',c));}
 assert.equal(palette(old).light.bg,'#f6f3eb');assert.equal(palette({light:{...old.light,accent:'#112233'}}).light.accent,'#112233');
});
