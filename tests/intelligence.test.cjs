const test=require('node:test'),assert=require('node:assert/strict'),M=require('../dist/intelligence-model.js');

test('host prompt and output schema stay in the workspace domain layer',()=>{
  const context={memories:[{title:'表达偏好',body:'先说结论'}],projects:[],tasks:[],events:[],documents:[]};
  const messages=M.messages(context,'帮我规划工作');
  assert.equal(messages[0].role,'system');
  assert.match(messages[0].content,/回答前必须先阅读/);
  assert.match(messages[1].content,/先说结论/);
  assert.match(messages[1].content,/帮我规划工作/);
  assert.equal(M.responseSchema.name,'yuanliu_answer');
});
const today='2026-10-04',state={projects:[{id:'p',title:'A',status:'doing'},{id:'q',title:'B',status:'planning'},{id:'r',title:'Finished',status:'done'}],tasks:[{id:'t',title:'T',projectId:'p',plannedDate:today},{id:'u',title:'U',projectId:'q',due:'2026-10-10'},{id:'r1',title:'old',projectId:'r'},{id:'loose',title:'Loose'}],events:[{id:'e',date:today,projectId:'q'},{id:'future',date:'2026-10-08',projectId:'p'},{id:'old',date:'2026-10-01',projectId:'p'}],notes:[{id:'doc',projectId:'p',title:'方案',body:'secret content',url:'https://example.test/private'}],memories:[{id:'g',kind:'rule',title:'global',body:'global',status:'confirmed',allowAI:true,updatedAt:'2026-10-01'},{id:'p',kind:'project',projectId:'p',title:'A memory',body:'a',status:'confirmed',allowAI:true},{id:'q',kind:'decision',projectId:'q',title:'B memory',body:'b',status:'confirmed',allowAI:true},{id:'r',kind:'project',projectId:'r',title:'old memory',body:'r',status:'confirmed',allowAI:true},{id:'x',status:'confirmed',allowAI:true,expiresAt:today},{id:'n',status:'pending',allowAI:true},{id:'z',status:'confirmed',allowAI:false}]};
test('automatic scope combines stable memory with active current work without document bodies',()=>{
 const before=JSON.stringify(state),c=M.context(state,{today});
 assert.deepEqual(c.projects.map(p=>p.id),['p','q']);assert.deepEqual(c.tasks.map(t=>t.id),['t','u','loose']);assert.deepEqual(c.events.map(e=>e.id),['e','future']);
 assert.deepEqual(c.memories.map(m=>m.id),['g','q','p']);assert.equal(c.memories[0].kindLabel,'长期规则');
 assert.equal(c.contextPolicy.longTermMemory,'required-before-answering');assert.equal(JSON.stringify(c).includes('secret content'),false);assert.equal(JSON.stringify(c).includes('https://'),false);assert.equal(JSON.stringify(state),before);
});
test('project scopes include global and matching project memory but exclude unrelated work',()=>{
 const c=M.context(state,{scope:'project:p',today});
 assert.deepEqual(c.tasks.map(t=>t.id),['t']);assert.deepEqual(c.memories.map(m=>m.id),['g','p']);assert.equal(c.events.length,2);
 assert.throws(()=>M.context(state,{scope:'project:missing',today}));
});
test('today and all scopes bring in the matching short-term and long-term layers',()=>{
 const c=M.context(state,{scope:'today',today});assert.deepEqual(c.tasks.map(t=>t.id),['t']);assert.deepEqual(c.events.map(e=>e.id),['e']);assert.deepEqual(c.memories.map(m=>m.id),['g','q','p']);
 assert.deepEqual(M.context(state,{scope:'all',today}).memories.map(m=>m.id),['g','q','p','r']);
});
test('long-term memory is never silently omitted when the complete context exceeds its budget',()=>{
 const memories=Array.from({length:6},(_,i)=>({id:String(i),kind:'rule',title:'rule',body:'x'.repeat(12000),status:'confirmed',allowAI:true}));
 assert.throws(()=>M.context({...state,memories},{scope:'auto',today}),/不遗漏/);
});
test('untrusted model action cannot mutate existing records or set hidden fields',()=>{
 const ctx={projects:[{id:'p',modules:[{id:'m'}]}]};
 const a=M.answer(JSON.stringify({text:'草稿',action:{type:'task',data:{title:'task',id:'old',done:true,projectId:'foreign',moduleId:'m',due:'2026-02-30',plannedDate:'2026-10-04',__proto__:{polluted:true}}}}),ctx);
 assert.equal(a.action.data.done,undefined);assert.equal(a.action.data.id,undefined);assert.equal(a.action.data.projectId,undefined);assert.equal(a.action.data.moduleId,undefined);assert.equal(a.action.data.due,'');assert.equal(a.action.data.plannedDate,today);
 assert.equal(M.answer('{"text":"x","action":{"type":"delete","data":{"title":"x"}}}',ctx).action,null);
});
test('valid project/module links are preserved and plain text is usable without guessed actions',()=>{
 const c={projects:[{id:'p',modules:[{id:'m'}]}]};const a=M.answer('```json\n'+JSON.stringify({text:'草稿',action:{type:'task',data:{title:'Task',projectId:'p',moduleId:'m'}}})+'\n```',c);
 assert.equal(a.action.data.moduleId,'m');assert.equal(a.action.data.projectId,'p');assert.deepEqual(M.answer('当前进度需要更多信息。',c),{text:'当前进度需要更多信息。',action:null});
});
