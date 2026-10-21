const {test}=require('node:test'),assert=require('node:assert/strict'),M=require('../dist/memory-model.js');
const projects=[{id:'p1'},{id:'p2'}];
const record=(input={})=>M.build({title:'方案偏好',body:'优先采用案例研讨',kind:'decision',status:'confirmed',allowAI:true,...input},null,projects,'m1','2026-09-24T00:00:00Z');
test('memory retrieval respects permission, expiry, confirmation and project boundaries',()=>{
 const state={projects,memories:[record(),record({projectId:'p1'}),record({projectId:'p2'}),record({status:'pending'}),record({status:'expired'}),record({expiresAt:'2026-09-24'}),record({allowAI:false}),M.remove(record()),{...record(),projectId:'removed'}]};
 assert.equal(M.eligible(state,'','2026-09-24').length,1);assert.equal(M.eligible(state,'p1','2026-09-24').length,2);
 assert.equal(M.eligible({...state,projects:[]},'p1','2026-09-24').length,1);
});
test('editing preserves identity, origin and creation time while validating scopes and source URLs',()=>{
 const old={...record(),sourceText:'原始输入'};
 const edited=M.build({...old,title:'已调整'},old,projects,'unused','2026-09-25T00:00:00Z');
 assert.equal(edited.id,old.id);assert.equal(edited.createdAt,old.createdAt);assert.equal(edited.sourceText,'原始输入');assert.equal(edited.updatedAt,'2026-09-25T00:00:00Z');
 for(const input of [{projectId:'missing'},{title:''},{body:''},{sourceUrl:'javascript:alert(1)'},{sourceUrl:'file:///etc/passwd'},{expiresAt:'2026-02-31'}])assert.throws(()=>record(input));
});
test('long-term memory categories preserve their semantic role for the AI context',()=>{
 for(const kind of ['profile','preference','rule','project','decision','habit'])assert.equal(record({kind}).kind,kind);
});
test('recoverable deletion and backup roundtrip preserve the record and do not revive expired context',()=>{
 const item=record({expiresAt:'2026-09-25'}),deleted=M.remove(item);assert.equal(M.status(deleted),'deleted');
 const state=JSON.parse(JSON.stringify({projects,memories:[deleted]}));M.initialize(state);
 const restored=M.restore(state.memories[0]);assert.equal(restored.body,item.body);assert.equal(M.status(restored,'2026-09-26'),'expired');
 const legacy={tasks:[{id:'t'}]};M.initialize(legacy);assert.deepEqual(legacy.memories,[]);assert.deepEqual(legacy.tasks,[{id:'t'}]);
});
