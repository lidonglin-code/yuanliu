const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../dist/intelligence-model.js'),W=require('../dist/workflow-model.js'),P=require('../dist/project-model.js');
const day='2026-10-21';
const empty=()=>({projects:[{id:'p',title:'培训',projectMode:'training',status:'doing'}],tasks:[],events:[],notes:[],memories:[],aiMessages:[]});
const context=s=>M.context(s,{today:day,modules:P.modules});
const reply=(suggestions)=>M.answer(JSON.stringify({text:'建议先澄清目标，再设计方案。',action:null,suggestions}),context(empty()));

test('multi-turn messages carry numbered proposals and their live confirmation state alongside fresh work',()=>{
 const state=empty(),answer=reply([{title:'澄清目标',projectId:'p',moduleId:'demand'}]);
 state.aiMessages=[{role:'user',text:'拆解培训项目',conversationId:'a'},{id:'reply',role:'assistant',...answer,conversationId:'a'}];
 const task=P.assignTask(state.projects[0],{id:'t',title:'澄清目标',projectId:'p',plannedDate:day,done:false},'demand');
 W.saveAssistantTasks(state,1,[{suggestionIndex:0,item:task}]);
 const messages=M.messages(context(state),'第二条要怎么做？',M.conversation(state.aiMessages,'a').map(x=>x.message));
 assert.deepEqual(messages.map(m=>m.role),['system','user','assistant','user']);
 const previous=JSON.parse(messages[2].content);assert.equal(previous.suggestions[0].number,1);assert.equal(previous.suggestions[0].confirmed,true);assert.equal(previous.suggestions[0].targetId,'t');
 assert.match(messages.at(-1).content,/"id":"t"/);assert.match(messages.at(-1).content,/第二条/);
});
test('conversation selection retains global message indices and isolates unrelated threads and legacy scopes',()=>{
 const messages=[{role:'user',text:'旧问题'},{role:'assistant',text:'旧回答',sourceScope:'project:other'},{role:'user',text:'A',conversationId:'a',sourceScope:'project:p'},{role:'assistant',text:'A回答',conversationId:'a',sourceScope:'project:p'},{role:'user',text:'B',conversationId:'b'},{role:'assistant',text:'B回答',conversationId:'b'}];
 assert.deepEqual(M.conversation(messages,'a').map(x=>x.index),[2,3]);assert.deepEqual(M.conversations(messages).map(g=>g.id),['b','a','legacy']);
 assert.equal(M.conversations(messages)[1].scope,'project:p');
 const request=M.messages({scope:'project:p'},'继续',M.conversation(messages,'a').map(x=>x.message));
 assert.equal(request.length,4);assert.equal(JSON.stringify(request).includes('B回答'),false);
 assert.equal(M.messages({scope:'project:p'},'继续',M.conversation(messages,'legacy').map(x=>x.message)).length,2);
 assert.equal(M.messages({scope:'auto'},'新问题').length,2);
});
test('history is bounded to complete recent turns, and oversized contexts never silently lose the latest turn',()=>{
 const history=Array.from({length:9},(_,i)=>[{role:'user',text:'问'+i},{role:'assistant',text:'答'+i}]).flat();
 const request=M.messages({scope:'auto'},'继续',history);assert.equal(request.length,14);assert.equal(request[1].content,'问3');assert.equal(JSON.parse(request.at(-2).content).text,'答8');
 const large=history.map(m=>({...m,text:m.text+'x'.repeat(8000)}));
 const limited=M.messages({scope:'auto',data:'x'.repeat(55000)},'继续',large);assert.ok(JSON.stringify(limited).length<=88000);assert.equal(limited[1].content.slice(0,2),'问8');
 assert.throws(()=>M.messages({data:'x'.repeat(85000)},'继续',large),/最近对话/);
});
test('structured task suggestions are capped, deduplicated and stripped of write capabilities',()=>{
 const a=reply([{title:'澄清目标',id:'existing',done:true,status:'done',projectId:'p',moduleId:'demand',due:'2026-02-30',plannedDate:day,apiKey:'secret'},{title:'澄清目标',id:'different',done:false,projectId:'p',moduleId:'demand',plannedDate:day},{title:'外部归属',projectId:'foreign',moduleId:'bad'},{type:'delete',data:{id:'t'}},null]);
 assert.equal(a.suggestions.length,2);const d=a.suggestions[0].data;
 assert.equal(d.projectId,'p');assert.equal(d.moduleId,'demand');assert.equal(d.plannedDate,day);assert.equal(d.due,'');assert.equal(d.status,'todo');assert.equal(d.done,undefined);assert.equal(d.id,undefined);assert.equal(d.apiKey,undefined);
 assert.equal(a.suggestions[1].data.projectId,undefined);
 assert.equal(reply(Array.from({length:30},(_,i)=>({title:'任务'+i}))).suggestions.length,20);
 assert.equal(M.answer('只是一段建议',context(empty())).suggestions,undefined);
});
test('bulk confirmation consumes selected proposals once and keeps the existing focus/calendar/project record',()=>{
 const state=empty();state.aiMessages=[{id:'r',role:'assistant',...reply([{title:'先澄清',projectId:'p',moduleId:'demand',plannedDate:day},{title:'再设计',projectId:'p',moduleId:'design'}])}];
 const entries=state.aiMessages[0].suggestions.map((s,n)=>({suggestionIndex:n,item:P.assignTask(state.projects[0],{...s.data,id:'t'+n,done:false},s.data.moduleId)}));
 W.saveAssistantTasks(state,0,entries);assert.equal(state.tasks.length,2);assert.equal(state.tasks.find(t=>t.id==='t0').sourceAssistantId,'r');
 assert.equal(W.dailyFocus(state,day).tasks[0].id,'t0');assert.equal(W.calendarDate(state.tasks.find(t=>t.id==='t0')),day);assert.equal(W.bucket(state.tasks.find(t=>t.id==='t1'),day),'unscheduled');assert.equal(P.taskModule(state.projects[0],state.tasks.find(t=>t.id==='t1')),'design');
 const before=JSON.stringify(state);assert.throws(()=>W.saveAssistantTasks(state,0,entries),/已保存/);assert.equal(JSON.stringify(state),before);
 state.tasks=[];assert.throws(()=>W.saveAssistantTasks(state,0,entries),/已保存/);
});
test('batch validation is atomic for duplicate tasks, repeated selections and partial prior confirmations',()=>{
 const state=empty();state.aiMessages=[{role:'assistant',...reply([{title:'A'},{title:'B'}])}];state.tasks=[{id:'existing',title:'B'}];
 const entries=[{suggestionIndex:0,item:{id:'a',title:'A'}},{suggestionIndex:1,item:{id:'b',title:'B'}}];
 let before=JSON.stringify(state);assert.throws(()=>W.saveAssistantTasks(state,0,entries),/已有相同/);assert.equal(JSON.stringify(state),before);
 assert.throws(()=>W.saveAssistantTasks(state,0,[entries[0],entries[0]]),/清单已变化/);assert.equal(JSON.stringify(state),before);
 W.saveAssistantTasks(state,0,[{suggestionIndex:1,item:{id:'b',title:'修改后的B',plannedDate:day}}]);before=JSON.stringify(state);
 assert.throws(()=>W.saveAssistantTasks(state,0,entries),/已保存/);assert.equal(JSON.stringify(state),before);assert.equal(state.aiMessages[0].suggestions[0].confirmed,undefined);
});
