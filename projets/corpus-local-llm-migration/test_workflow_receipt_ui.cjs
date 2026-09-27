'use strict';
const {readFileSync}=require('node:fs');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const source=readFileSync(__dirname+'/portal/app.js','utf8');
function load(name,ctx){const start=source.indexOf('function '+name+'(');assert.ok(start>=0,'missing '+name);const end=source.indexOf('\nfunction ',start+1);vm.runInContext(source.slice(start,end<0?source.length:end),ctx);}
function copied(value){return JSON.parse(JSON.stringify(value));}
test('Workflow receipt is limited to the last user turn and preserves the actual finish state',()=>{
 const ctx=vm.createContext({Date,messageDate:m=>m.info.time?.created===undefined?null:new Date(m.info.time.created)});load('workflowReceiptReport',ctx);
 const old={info:{id:'old',role:'user',time:{created:1}}},fresh={info:{id:'new',role:'user',time:{created:2000}}};
 const messages=[old,{info:{role:'assistant',parentID:'old',time:{completed:1000},finish:'stop'},parts:[{type:'tool',tool:'bash',state:{status:'completed',input:{command:'old'}}}]},fresh,{info:{role:'assistant',parentID:'new',time:{created:2500,completed:3000},finish:'stop'},parts:[{type:'tool',tool:'read',state:{status:'completed',input:{filePath:'/context'}}},{type:'text',text:'ignore'}]}];
 assert.deepEqual(copied(ctx.workflowReceiptReport(messages)),{outcome:'completed',elapsed_seconds:1,tool_calls:[{tool:'read',state:{status:'completed',input:{filePath:'/context'}}}]});
});
test('Unknown, interrupted and malformed conversations never become a verified outcome',()=>{
 const ctx=vm.createContext({Date,messageDate:m=>m.info.time?.created===undefined?null:new Date(m.info.time.created)});load('workflowReceiptReport',ctx);
 assert.deepEqual(copied(ctx.workflowReceiptReport([])),{outcome:'unknown',tool_calls:[]});
 const user={info:{id:'u',role:'user',time:{created:1}}};
 for(const info of [{finish:'unknown',time:{completed:2}},{error:{name:'Error'},time:{completed:2}},{finish:'stop'}])assert.notEqual(ctx.workflowReceiptReport([user,{info:{role:'assistant',parentID:'u',...info},parts:[]}]).outcome,'completed');
});
